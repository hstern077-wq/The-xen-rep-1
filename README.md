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

## Commands

- `npm start` — Start the web server
- `npm run sync` — Index faces in wedding photos
- `npm run sync -- --reset` — Re-index all faces from scratch

## How it works

```
Guest takes selfie → Face detected → Compared against indexed wedding photos → Matching photos shown
```

All processing is local — no cloud accounts needed.
