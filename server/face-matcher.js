const ort = require("onnxruntime-node");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "..", "models");
const INDEX_FILE = path.join(__dirname, ".face-index.json");
const INDEX_BIN = path.join(__dirname, ".face-index.bin");

let detSession = null;
let recSession = null;

async function loadModels() {
  if (detSession && recSession) return;
  console.log("Loading face detection model...");
  detSession = await ort.InferenceSession.create(
    path.join(MODELS_DIR, "ultraface-640.onnx")
  );
  console.log("Loading face recognition model...");
  recSession = await ort.InferenceSession.create(
    path.join(MODELS_DIR, "arcface.onnx")
  );
  console.log("Models loaded.");
}

// Preprocess image for UltraFace: resize to 640x480, normalize to 0-1, NCHW format
async function preprocessForDetection(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize(640, 480, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const float32 = new Float32Array(1 * 3 * 480 * 640);
  const pixels = new Uint8Array(data);

  // Convert HWC RGB to NCHW, normalize to [0, 1]
  for (let y = 0; y < 480; y++) {
    for (let x = 0; x < 640; x++) {
      const idx = (y * 640 + x) * 3;
      float32[0 * 480 * 640 + y * 640 + x] = (pixels[idx] - 127) / 128; // R
      float32[1 * 480 * 640 + y * 640 + x] = (pixels[idx + 1] - 127) / 128; // G
      float32[2 * 480 * 640 + y * 640 + x] = (pixels[idx + 2] - 127) / 128; // B
    }
  }

  return {
    tensor: new ort.Tensor("float32", float32, [1, 3, 480, 640]),
    originalWidth: info.width,
    originalHeight: info.height,
  };
}

// Detect faces using UltraFace
async function detectFaceBoxes(imageBuffer) {
  // Get original image dimensions before resizing
  const metadata = await sharp(imageBuffer).metadata();
  const origW = metadata.width;
  const origH = metadata.height;

  const { tensor } = await preprocessForDetection(imageBuffer);
  const result = await detSession.run({ input: tensor });

  const scores = result.scores.data; // [1, 17640, 2]
  const boxes = result.boxes.data; // [1, 17640, 4]
  const numBoxes = 17640;

  const faces = [];
  const CONFIDENCE_THRESHOLD = 0.7;

  for (let i = 0; i < numBoxes; i++) {
    const confidence = scores[i * 2 + 1]; // face score
    if (confidence > CONFIDENCE_THRESHOLD) {
      // boxes are normalized [x1, y1, x2, y2]
      const x1 = boxes[i * 4 + 0] * origW;
      const y1 = boxes[i * 4 + 1] * origH;
      const x2 = boxes[i * 4 + 2] * origW;
      const y2 = boxes[i * 4 + 3] * origH;
      faces.push({ x1, y1, x2, y2, confidence });
    }
  }

  // NMS (Non-Maximum Suppression)
  faces.sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  const suppressed = new Set();

  for (let i = 0; i < faces.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(faces[i]);
    for (let j = i + 1; j < faces.length; j++) {
      if (suppressed.has(j)) continue;
      if (iou(faces[i], faces[j]) > 0.3) {
        suppressed.add(j);
      }
    }
  }

  return kept;
}

function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter);
}

// Crop and preprocess face for ArcFace: 112x112, NCHW, normalized
async function preprocessFaceForRecognition(imageBuffer, faceBox) {
  // Add padding around face box
  const padX = (faceBox.x2 - faceBox.x1) * 0.2;
  const padY = (faceBox.y2 - faceBox.y1) * 0.2;

  const metadata = await sharp(imageBuffer).metadata();
  const left = Math.max(0, Math.round(faceBox.x1 - padX));
  const top = Math.max(0, Math.round(faceBox.y1 - padY));
  const width = Math.min(
    Math.round(faceBox.x2 - faceBox.x1 + padX * 2),
    metadata.width - left
  );
  const height = Math.min(
    Math.round(faceBox.y2 - faceBox.y1 + padY * 2),
    metadata.height - top
  );

  if (width < 10 || height < 10) return null;

  const { data } = await sharp(imageBuffer)
    .extract({ left, top, width, height })
    .resize(112, 112, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const float32 = new Float32Array(1 * 3 * 112 * 112);
  const pixels = new Uint8Array(data);

  for (let y = 0; y < 112; y++) {
    for (let x = 0; x < 112; x++) {
      const idx = (y * 112 + x) * 3;
      float32[0 * 112 * 112 + y * 112 + x] = (pixels[idx] - 127.5) / 127.5;
      float32[1 * 112 * 112 + y * 112 + x] =
        (pixels[idx + 1] - 127.5) / 127.5;
      float32[2 * 112 * 112 + y * 112 + x] =
        (pixels[idx + 2] - 127.5) / 127.5;
    }
  }

  return new ort.Tensor("float32", float32, [1, 3, 112, 112]);
}

// Get face embedding using ArcFace
async function getFaceEmbedding(imageBuffer, faceBox) {
  const tensor = await preprocessFaceForRecognition(imageBuffer, faceBox);
  if (!tensor) return null;

  const result = await recSession.run({ data: tensor });
  const embedding = result.fc1.data; // Float32Array of length 512

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);
  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / norm;
  }

  return normalized;
}

// Full pipeline: detect faces and get embeddings
async function detectFaces(imageBuffer) {
  const boxes = await detectFaceBoxes(imageBuffer);
  const results = [];

  for (const box of boxes) {
    const embedding = await getFaceEmbedding(imageBuffer, box);
    if (embedding) {
      results.push({ box, descriptor: embedding });
    }
  }

  return results;
}

function loadIndex() {
  // Try binary format first (much smaller, faster to load)
  try {
    if (fs.existsSync(INDEX_BIN)) {
      const zlib = require("zlib");
      const compressed = fs.readFileSync(INDEX_BIN);
      const raw = zlib.gunzipSync(compressed);
      let offset = 0;

      const entryCount = raw.readUInt32LE(offset);
      offset += 4;

      const entries = [];
      for (let i = 0; i < entryCount; i++) {
        const nameLen = raw.readUInt16LE(offset);
        offset += 2;
        const photoFile = raw.toString("utf8", offset, offset + nameLen);
        offset += nameLen;

        const descCount = raw.readUInt16LE(offset);
        offset += 2;

        const descriptors = [];
        for (let j = 0; j < descCount; j++) {
          const desc = new Float32Array(512);
          for (let k = 0; k < 512; k++) {
            desc[k] = raw.readFloatLE(offset);
            offset += 4;
          }
          descriptors.push(desc);
        }
        entries.push({ photoFile, descriptors });
      }
      console.log(`  Loaded binary index: ${entries.length} entries`);
      return entries;
    }
  } catch (err) {
    console.error("Error loading binary index:", err.message);
  }

  // Fallback to JSON format
  try {
    if (fs.existsSync(INDEX_FILE)) {
      const data = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
      for (const entry of data) {
        entry.descriptors = entry.descriptors.map((d) => new Float32Array(d));
      }
      return data;
    }
  } catch (err) {
    console.error("Error loading face index:", err.message);
  }
  return [];
}

function saveIndex(index) {
  const serializable = index.map((entry) => ({
    photoFile: entry.photoFile,
    descriptors: entry.descriptors.map((d) => Array.from(d)),
  }));
  fs.writeFileSync(INDEX_FILE, JSON.stringify(serializable));
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // already L2 normalized, so dot product = cosine similarity
}

function findMatches(selfieDescriptor, index, threshold = 0.6) {
  const matches = new Map();

  for (const entry of index) {
    for (const descriptor of entry.descriptors) {
      const similarity = cosineSimilarity(selfieDescriptor, descriptor);
      if (similarity > threshold) {
        const existing = matches.get(entry.photoFile);
        if (!existing || similarity > existing) {
          matches.set(entry.photoFile, similarity);
        }
      }
    }
  }

  return Array.from(matches.entries())
    .map(([photoFile, similarity]) => ({
      photoFile,
      similarity: Math.round(similarity * 1000) / 1000,
      confidence: Math.round(similarity * 100),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

module.exports = {
  loadModels,
  detectFaces,
  loadIndex,
  saveIndex,
  findMatches,
};
