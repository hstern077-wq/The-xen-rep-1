/**
 * organize.js — Cluster wedding photos by person, copy into numbered folders.
 *
 * Usage:
 *   npm run organize                             # default: copy files, threshold 0.45
 *   node server/organize.js --threshold=0.40     # lower = group more faces per person
 *   node server/organize.js --threshold=0.50     # higher = stricter, more folders
 *   node server/organize.js --min-photos=3       # skip people with < 3 photos
 *   node server/organize.js --reset              # delete organized/ and re-run
 *
 * Prerequisites:
 *   npm run sync   (builds the face index — run once after adding photos)
 *
 * Output:
 *   organized/
 *     index.html        ← visual grid: open in browser to identify each person
 *     preview_1.jpg     ← face thumbnail for Person 1
 *     preview_2.jpg     ← face thumbnail for Person 2
 *     …
 *     1/                ← all photos containing Person 1
 *     2/                ← all photos containing Person 2
 *     …
 */

"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { loadIndex, loadModels, detectFaces } = require("./face-matcher");

const PHOTOS_DIR = path.join(__dirname, "..", "photos");
const ORGANIZED_DIR = path.join(__dirname, "..", "organized");

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const found = argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=")[1] : def;
};
const hasFlag = (name) => argv.includes(`--${name}`);

const THRESHOLD = parseFloat(getArg("threshold", "0.45"));
const MIN_PHOTOS = parseInt(getArg("min-photos", "1"));
const RESET = hasFlag("reset");

// ── Math helpers ──────────────────────────────────────────────────────────────

function cosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function updateCentroid(centroid, n, descriptor) {
  let normSq = 0;
  for (let i = 0; i < centroid.length; i++) {
    centroid[i] = (centroid[i] * n + descriptor[i]) / (n + 1);
    normSq += centroid[i] * centroid[i];
  }
  const norm = Math.sqrt(normSq);
  for (let i = 0; i < centroid.length; i++) centroid[i] /= norm;
}

// ── Face crop helper ──────────────────────────────────────────────────────────

async function extractFaceCrop(photoFile, faceBox) {
  try {
    const srcPath = path.join(PHOTOS_DIR, photoFile);
    const meta = await sharp(srcPath).metadata();

    const padX = (faceBox.x2 - faceBox.x1) * 0.3;
    const padY = (faceBox.y2 - faceBox.y1) * 0.3;

    const left = Math.max(0, Math.round(faceBox.x1 - padX));
    const top = Math.max(0, Math.round(faceBox.y1 - padY));
    const width = Math.min(
      Math.round(faceBox.x2 - faceBox.x1 + padX * 2),
      meta.width - left
    );
    const height = Math.min(
      Math.round(faceBox.y2 - faceBox.y1 + padY * 2),
      meta.height - top
    );

    if (width < 20 || height < 20) return null;

    return await sharp(srcPath)
      .extract({ left, top, width, height })
      .resize(160, 160, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return null;
  }
}

// ── HTML index ────────────────────────────────────────────────────────────────

function buildIndexHtml(persons) {
  const cards = persons
    .map(
      ({ id, photoCount }) => `
    <div class="card" onclick="window.open('${id}/', '_blank')">
      <img src="preview_${id}.jpg" alt="Person ${id}" onerror="this.style.display='none'">
      <div class="label">
        <strong>Person ${id}</strong>
        <span>${photoCount} photo${photoCount !== 1 ? "s" : ""}</span>
      </div>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wedding Photos — People Index</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #111; color: #eee; padding: 24px; }
    h1 { font-size: 1.4rem; margin-bottom: 20px; color: #fff; }
    p.hint { font-size: 0.85rem; color: #888; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
    .card {
      background: #222; border-radius: 10px; overflow: hidden;
      cursor: pointer; transition: transform .15s, box-shadow .15s;
    }
    .card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.5); }
    .card img { width: 100%; height: 160px; object-fit: cover; display: block; background: #333; }
    .label { padding: 10px 12px; }
    .label strong { display: block; font-size: 0.95rem; }
    .label span { font-size: 0.8rem; color: #aaa; }
  </style>
</head>
<body>
  <h1>Wedding Photos — People Index</h1>
  <p class="hint">Click a person to open their folder. Person 1 has the most photos.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function organize() {
  console.log("=== Wedding Photo Organizer ===\n");
  console.log(`  Threshold  : ${THRESHOLD}  (lower = more faces per cluster)`);
  console.log(`  Min photos : ${MIN_PHOTOS}`);
  console.log();

  // 1. Load index ──────────────────────────────────────────────────────────────
  const index = loadIndex();
  if (index.length === 0) {
    console.error("No face index found. Run  npm run sync  first.");
    process.exit(1);
  }
  console.log(`Loaded index: ${index.length} photos with faces.\n`);

  // Flatten to individual face entries
  // Each entry: { photoFile, descriptor, box? }
  // Note: the binary index only stores descriptors, not boxes.
  // We'll re-detect faces only for the chosen representative photo per cluster.
  const allFaces = [];
  for (const entry of index) {
    for (const descriptor of entry.descriptors) {
      allFaces.push({ photoFile: entry.photoFile, descriptor });
    }
  }
  console.log(`Total face embeddings: ${allFaces.length}`);
  console.log("Clustering… (may take a minute)\n");

  // 2. Greedy nearest-centroid clustering ─────────────────────────────────────
  // clusters[i] = {
  //   centroid: Float32Array(512),
  //   count: number,
  //   photos: Set<string>,
  //   bestPhoto: string,        ← photo closest to centroid (for preview)
  //   bestSim: number,          ← similarity of bestPhoto face to centroid
  //   bestDescriptor: Float32Array
  // }
  const clusters = [];

  const reportEvery = Math.max(1, Math.floor(allFaces.length / 20));

  for (let fi = 0; fi < allFaces.length; fi++) {
    const face = allFaces[fi];
    let bestIdx = -1;
    let bestSim = THRESHOLD;

    for (let ci = 0; ci < clusters.length; ci++) {
      const sim = cosineSim(face.descriptor, clusters[ci].centroid);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = ci;
      }
    }

    if (bestIdx >= 0) {
      const c = clusters[bestIdx];
      c.photos.add(face.photoFile);
      updateCentroid(c.centroid, c.count, face.descriptor);
      c.count++;
      // Track face closest to centroid as the preview representative
      const simToCentroid = cosineSim(face.descriptor, c.centroid);
      if (simToCentroid > c.bestSim) {
        c.bestSim = simToCentroid;
        c.bestPhoto = face.photoFile;
        c.bestDescriptor = face.descriptor;
      }
    } else {
      clusters.push({
        centroid: Float32Array.from(face.descriptor),
        count: 1,
        photos: new Set([face.photoFile]),
        bestPhoto: face.photoFile,
        bestSim: 1.0,
        bestDescriptor: face.descriptor,
      });
    }

    if ((fi + 1) % reportEvery === 0) {
      process.stdout.write(
        `  ${fi + 1}/${allFaces.length} faces · ${clusters.length} clusters\r`
      );
    }
  }
  console.log(`\n\nRaw clusters: ${clusters.length}`);

  // 3. Sort + filter ───────────────────────────────────────────────────────────
  clusters.sort((a, b) => b.photos.size - a.photos.size);
  const valid = clusters.filter((c) => c.photos.size >= MIN_PHOTOS);
  const skipped = clusters.length - valid.length;
  console.log(
    `Clusters with >= ${MIN_PHOTOS} photo(s): ${valid.length}` +
      (skipped ? `  (${skipped} ignored)` : "")
  );

  // 4. Prepare output folder ───────────────────────────────────────────────────
  if (fs.existsSync(ORGANIZED_DIR)) {
    if (!RESET) {
      console.error(
        "\norganized/ already exists. Run with --reset to overwrite it, or delete it manually first."
      );
      process.exit(1);
    }
    console.log("\nRemoving existing organized/ …");
    fs.rmSync(ORGANIZED_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(ORGANIZED_DIR, { recursive: true });

  // 5. Load models for face re-detection (needed for preview crops) ───────────
  console.log("\nLoading models for face preview generation…");
  await loadModels();

  // 6. Copy photos + generate previews ─────────────────────────────────────────
  console.log(`\nBuilding folders…\n`);

  const summary = [];

  for (let i = 0; i < valid.length; i++) {
    const cluster = valid[i];
    const personId = i + 1;
    const personDir = path.join(ORGANIZED_DIR, String(personId));
    fs.mkdirSync(personDir);

    const photos = Array.from(cluster.photos).sort();

    // Copy photos
    for (const photoFile of photos) {
      const src = path.join(PHOTOS_DIR, photoFile);
      // Flatten subfolders into filename: ceremony/img001.jpg → ceremony_img001.jpg
      const flatName = photoFile.replace(/[/\\]/g, "_");
      fs.copyFileSync(src, path.join(personDir, flatName));
    }

    // Generate preview thumbnail by re-detecting faces in the best photo
    let previewBuf = null;
    try {
      const bestSrc = path.join(PHOTOS_DIR, cluster.bestPhoto);
      const imgBuf = await sharp(bestSrc)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      const detections = await detectFaces(imgBuf);

      if (detections.length > 0) {
        // Pick the detection whose embedding is closest to our cluster centroid
        let bestBox = null;
        let bestBoxSim = -1;
        for (const det of detections) {
          const s = cosineSim(det.descriptor, cluster.centroid);
          if (s > bestBoxSim) {
            bestBoxSim = s;
            bestBox = det.box;
          }
        }
        if (bestBox) {
          previewBuf = await extractFaceCrop(cluster.bestPhoto, bestBox);
        }
      }
    } catch (_) {}

    const previewPath = path.join(ORGANIZED_DIR, `preview_${personId}.jpg`);
    if (previewBuf) {
      fs.writeFileSync(previewPath, previewBuf);
    } else {
      // Fallback: save a small thumbnail of the whole photo
      try {
        await sharp(path.join(PHOTOS_DIR, cluster.bestPhoto))
          .resize(160, 160, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toFile(previewPath);
      } catch (_) {}
    }

    summary.push({ id: personId, photoCount: photos.length });
    console.log(`  Person ${String(personId).padStart(3)}: ${photos.length} photo(s)`);
  }

  // 7. Write index.html ────────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(ORGANIZED_DIR, "index.html"),
    buildIndexHtml(summary)
  );

  // 8. Write summary.json ──────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(ORGANIZED_DIR, "summary.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        settings: { threshold: THRESHOLD, minPhotos: MIN_PHOTOS },
        totalPeople: valid.length,
        persons: summary,
      },
      null,
      2
    )
  );

  console.log(`
=== Done ===
  People identified : ${valid.length}
  Output folder     : ${ORGANIZED_DIR}

Next steps:
  1. Open  organized/index.html  in your browser to see who is who.
  2. Each folder (1/, 2/, 3/…) contains copies of all photos that person appears in.
  3. To send someone their photos, just share their numbered folder.

Tuning (if results aren't right):
  • Same person split across folders → lower --threshold (e.g. --threshold=0.40 --reset)
  • Unrelated people in one folder  → raise --threshold (e.g. --threshold=0.50 --reset)
`);
}

organize().catch((err) => {
  console.error("Organize failed:", err);
  process.exit(1);
});
