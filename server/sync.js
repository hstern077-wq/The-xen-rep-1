const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { loadModels, detectFaces, loadIndex, saveIndex } = require("./face-matcher");

const PHOTOS_DIR = path.join(__dirname, "..", "photos");
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"]);

function findAllPhotos(dir, baseDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllPhotos(fullPath, baseDir));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        // Store relative path from photos/ dir
        const relativePath = path.relative(baseDir, fullPath);
        results.push(relativePath);
      }
    }
  }

  return results;
}

async function sync() {
  console.log("=== Wedding Photo Face Indexing ===\n");

  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    console.log(`Created photos/ folder. Put your wedding photos there and run again.`);
    console.log(`Path: ${PHOTOS_DIR}`);
    return;
  }

  // Recursively find all photos
  const files = findAllPhotos(PHOTOS_DIR, PHOTOS_DIR);

  if (files.length === 0) {
    console.log("No photos found in photos/ folder.");
    console.log(`Put your wedding photos in: ${PHOTOS_DIR}`);
    return;
  }

  console.log(`Found ${files.length} photos.\n`);

  await loadModels();

  const existingIndex = loadIndex();
  const indexedFiles = new Set(existingIndex.map((e) => e.photoFile));

  const reset = process.argv.includes("--reset");
  const index = reset ? [] : [...existingIndex];
  if (reset) {
    console.log("Resetting index...\n");
    indexedFiles.clear();
  }

  let indexed = 0;
  let noFace = 0;
  let skipped = 0;
  let errors = 0;

  // Save progress every 50 photos in case of crash
  const SAVE_INTERVAL = 50;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (indexedFiles.has(file)) {
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  [${i + 1}/${files.length}] ${file}...`);

      const filePath = path.join(PHOTOS_DIR, file);
      const imageBuffer = await sharp(filePath)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      const detections = await detectFaces(imageBuffer);

      if (detections.length > 0) {
        index.push({
          photoFile: file,
          descriptors: detections.map((d) => d.descriptor),
        });
        indexed++;
        console.log(` ${detections.length} face(s)`);
      } else {
        noFace++;
        console.log(" no faces");
      }

      // Periodic save
      if ((indexed + noFace + errors) % SAVE_INTERVAL === 0 && indexed > 0) {
        saveIndex(index);
        console.log(`  [Auto-saved progress: ${index.length} photos indexed]\n`);
      }
    } catch (err) {
      errors++;
      console.log(` ERROR: ${err.message}`);
    }
  }

  saveIndex(index);

  console.log(`\n=== Sync Complete ===`);
  console.log(`  Photos with faces indexed: ${indexed}`);
  console.log(`  Photos without faces: ${noFace}`);
  console.log(`  Skipped (already indexed): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total photos in index: ${index.length}`);
}

sync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
