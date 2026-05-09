const express = require("express");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");
const { loadModels, detectFaces, loadIndex, findMatches } = require("./face-matcher");

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

const PORT = process.env.PORT || 3000;
const PHOTOS_DIR = process.env.PHOTOS_DIR || path.join(__dirname, "..", "photos");
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || "";

// Serve static files
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json({ limit: "10mb" }));

// Load face index into memory
let faceIndex = [];

// POST /api/match — accept a selfie and return matching wedding photos
app.post("/api/match", upload.single("selfie"), async (req, res) => {
  try {
    let imageBytes;

    if (req.file) {
      imageBytes = req.file.buffer;
    } else if (req.body.image) {
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
      imageBytes = Buffer.from(base64Data, "base64");
    } else {
      return res.status(400).json({ error: "No image provided" });
    }

    // Resize for faster face detection
    imageBytes = await sharp(imageBytes)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Detect face in selfie
    const detections = await detectFaces(imageBytes);

    if (detections.length === 0) {
      return res.json({ count: 0, photos: [], noFaceDetected: true });
    }

    // Use the largest (most prominent) face
    const selfieDescriptor = detections.sort((a, b) => {
      const areaA = (a.box.x2 - a.box.x1) * (a.box.y2 - a.box.y1);
      const areaB = (b.box.x2 - b.box.x1) * (b.box.y2 - b.box.y1);
      return areaB - areaA;
    })[0].descriptor;

    // Find matches in the index
    const matches = findMatches(selfieDescriptor, faceIndex, 0.6);

    const results = matches.map((m) => ({
      photoFile: m.photoFile,
      confidence: m.confidence,
      url: `/api/photo/${encodeURIComponent(m.photoFile)}`,
      thumbnailUrl: `/api/photo/${encodeURIComponent(m.photoFile)}?w=400`,
    }));

    res.json({ count: results.length, photos: results });
  } catch (err) {
    console.error("Match error:", err);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// GET /api/photo/* — serve a wedding photo (supports subfolders)
app.get("/api/photo/*", async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params[0]);

    // Prevent path traversal
    if (filename.includes("..")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(PHOTOS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const width = parseInt(req.query.w) || null;
    const download = req.query.download === "1";

    let imageBuffer = fs.readFileSync(filePath);
    let contentType = "image/jpeg";

    const ext = path.extname(filename).toLowerCase();
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";

    // Resize if width specified (for thumbnails)
    if (width) {
      imageBuffer = await sharp(imageBuffer)
        .resize(width, width, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    if (download) {
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filename)}"`);
    }

    res.send(imageBuffer);
  } catch (err) {
    console.error("Photo serve error:", err);
    res.status(500).json({ error: "Failed to load photo" });
  }
});

// POST /api/upload — upload photos to the server (protected by secret)
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(PHOTOS_DIR, req.body.subfolder || "");
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => cb(null, file.originalname),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.post("/api/upload", photoUpload.array("photos", 50), (req, res) => {
  if (!UPLOAD_SECRET || req.headers["x-upload-secret"] !== UPLOAD_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const count = req.files ? req.files.length : 0;
  res.json({ uploaded: count });
});

// Start server
async function start() {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  try {
    console.log("Loading face detection models...");
    await loadModels();
    faceIndex = loadIndex();
    console.log(`Face index loaded: ${faceIndex.length} photos indexed.`);
  } catch (err) {
    console.warn("Face detection unavailable (models not loaded):", err.message);
    console.warn("Static files will still be served normally.");
  }

  app.listen(PORT, () => {
    console.log(`\nServer running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
