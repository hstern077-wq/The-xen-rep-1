# Stav & Chen Wedding Photo Finder

Guests take a selfie, and AI finds all the wedding photos they appear in.

## Setup (3 steps!)

### 1. Put wedding photos in the `photos/` folder
Copy all your wedding photos (JPG, PNG, WEBP) into the `photos/` folder.

### 2. Index the faces
```bash
npm run sync
```
This scans all photos and builds a face database. Run once (takes a few minutes depending on photo count).

### 3. Start the server
```bash
npm start
```
Open **http://localhost:3000** in a browser. Take a selfie and find your photos!

## Organize photos by person

Automatically sort all photos into per-person folders so you can send each guest their photos.

### 1. Copy photos into `photos/`
### 2. Build the face index (run once)
```bash
npm run sync
```
### 3. Cluster by person
```bash
npm run organize
```

This creates an `organized/` folder:
```
organized/
  index.html      ← open in browser: visual grid of every person's face thumbnail
  preview_1.jpg   ← face crop for Person 1
  preview_2.jpg   ← face crop for Person 2
  …
  1/              ← all photos Person 1 appears in
  2/              ← all photos Person 2 appears in
  …
```

- Person 1 has the most photos (usually the couple).
- A photo with multiple people is **copied into every matching person's folder**.
- Open `organized/index.html` in your browser to quickly identify who is who, then send each person their numbered folder.

**Tuning** (if grouping is off):
```bash
# Same person split across two folders → lower the threshold
node server/organize.js --threshold=0.40 --reset

# Unrelated people merged into one folder → raise the threshold
node server/organize.js --threshold=0.50 --reset

# Ignore people who appear in fewer than 3 photos
node server/organize.js --min-photos=3 --reset
```

## Commands

- `npm start` — Start the web server
- `npm run sync` — Index faces in wedding photos
- `npm run sync -- --reset` — Re-index all faces from scratch
- `npm run organize` — Organize photos into per-person folders (creates `organized/`)

## How it works

```
Guest takes selfie → Face detected → Compared against indexed wedding photos → Matching photos shown
```

All processing is local — no cloud accounts needed.
