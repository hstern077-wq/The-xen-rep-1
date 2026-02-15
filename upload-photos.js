// Upload local photos to the remote server in batches
// Usage: node upload-photos.js https://your-app.railway.app your-secret

const fs = require("fs");
const path = require("path");

const SERVER_URL = process.argv[2];
const SECRET = process.argv[3];
const PHOTOS_DIR = path.join(__dirname, "photos");
const BATCH_SIZE = 10;
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"]);

function findAllPhotos(dir, baseDir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllPhotos(full, baseDir));
    } else if (SUPPORTED.has(path.extname(entry.name).toLowerCase())) {
      results.push({ full, relative: path.relative(baseDir, full) });
    }
  }
  return results;
}

async function uploadBatch(files, subfolder) {
  const formData = new FormData();
  if (subfolder) formData.append("subfolder", subfolder);

  for (const f of files) {
    const buf = fs.readFileSync(f.full);
    const blob = new Blob([buf]);
    formData.append("photos", blob, path.basename(f.full));
  }

  const res = await fetch(`${SERVER_URL}/api/upload`, {
    method: "POST",
    headers: { "x-upload-secret": SECRET },
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!SERVER_URL || !SECRET) {
    console.log("Usage: node upload-photos.js <server-url> <upload-secret>");
    console.log("Example: node upload-photos.js https://my-app.up.railway.app mysecret123");
    process.exit(1);
  }

  const photos = findAllPhotos(PHOTOS_DIR, PHOTOS_DIR);
  console.log(`Found ${photos.length} photos to upload.\n`);

  // Group by subfolder
  const groups = new Map();
  for (const p of photos) {
    const dir = path.dirname(p.relative);
    const subfolder = dir === "." ? "" : dir;
    if (!groups.has(subfolder)) groups.set(subfolder, []);
    groups.get(subfolder).push(p);
  }

  let uploaded = 0;
  for (const [subfolder, files] of groups) {
    console.log(`Folder: ${subfolder || "(root)"} — ${files.length} photos`);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      process.stdout.write(`  Uploading ${i + 1}-${Math.min(i + BATCH_SIZE, files.length)}/${files.length}...`);
      try {
        await uploadBatch(batch, subfolder);
        uploaded += batch.length;
        console.log(" OK");
      } catch (err) {
        console.log(` ERROR: ${err.message}`);
      }
    }
  }

  console.log(`\nDone! Uploaded ${uploaded}/${photos.length} photos.`);
}

main().catch(console.error);
