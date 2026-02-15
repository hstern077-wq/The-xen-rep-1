// Compress the JSON face index to a compact binary format
// Reduces ~156MB JSON to ~30MB binary
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const INDEX_JSON = path.join(__dirname, ".face-index.json");
const INDEX_BIN = path.join(__dirname, ".face-index.bin");

function compress() {
  console.log("Loading JSON index...");
  const data = JSON.parse(fs.readFileSync(INDEX_JSON, "utf8"));
  console.log(`  ${data.length} entries`);

  // Format: [uint32 entryCount] then for each entry:
  //   [uint16 filenameLength] [filename bytes] [uint16 descriptorCount]
  //   then for each descriptor: [512 x float32 = 2048 bytes]

  const parts = [];

  // Entry count
  const countBuf = Buffer.alloc(4);
  countBuf.writeUInt32LE(data.length, 0);
  parts.push(countBuf);

  for (const entry of data) {
    // Filename
    const nameBuf = Buffer.from(entry.photoFile, "utf8");
    const nameLenBuf = Buffer.alloc(2);
    nameLenBuf.writeUInt16LE(nameBuf.length, 0);
    parts.push(nameLenBuf, nameBuf);

    // Descriptor count
    const descCountBuf = Buffer.alloc(2);
    descCountBuf.writeUInt16LE(entry.descriptors.length, 0);
    parts.push(descCountBuf);

    // Descriptors
    for (const desc of entry.descriptors) {
      const floatBuf = Buffer.alloc(512 * 4);
      for (let i = 0; i < 512; i++) {
        floatBuf.writeFloatLE(desc[i], i * 4);
      }
      parts.push(floatBuf);
    }
  }

  const raw = Buffer.concat(parts);
  console.log(`  Raw binary: ${(raw.length / 1024 / 1024).toFixed(1)} MB`);

  const compressed = zlib.gzipSync(raw, { level: 9 });
  fs.writeFileSync(INDEX_BIN, compressed);
  console.log(`  Compressed: ${(compressed.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Saved to ${INDEX_BIN}`);
}

compress();
