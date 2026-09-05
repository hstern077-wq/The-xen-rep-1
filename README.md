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

## fal.ai MCP server (optional, for AI tooling)

This repo includes a project-scoped `.mcp.json` that wires up the [fal.ai](https://fal.ai) MCP server over HTTP for use with Claude Code:

```json
{
  "mcpServers": {
    "fal-ai": {
      "type": "http",
      "url": "https://mcp.fal.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${FAL_KEY}"
      }
    }
  }
}
```

Set your fal.ai API key as an environment variable before starting Claude Code so it can be substituted into the header:

```bash
export FAL_KEY=your_fal_api_key
```

Never commit your actual API key — only the `${FAL_KEY}` placeholder belongs in `.mcp.json`.
