#!/usr/bin/env python3
"""
AI Digest — Daily multi-agent pipeline.

Agents:
  1. researcher  → fetches fresh AI news from RSS feeds
  2. writer      → uses Claude API to curate & write the digest
  3. renderer    → renders HTML and screenshots to PNG

Usage:
  python digest/main.py                   # run full pipeline
  python digest/main.py --dry-run         # skip screenshot, print JSON only
  python digest/main.py --open            # open the PNG after generation
"""

import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from agents import researcher, writer, renderer


def run(dry_run: bool = False, open_after: bool = False) -> Path | None:
    print("\n╔══════════════════════════════════════╗")
    print("║      AI Digest — Daily Pipeline      ║")
    print("╚══════════════════════════════════════╝\n")

    # ── Agent 1: Research ──────────────────────────────────────────────────
    print("→ [1/3] Researcher Agent: fetching news...")
    news_items = researcher.run()
    print(f"   Found {len(news_items)} items across {len(set(i['source'] for i in news_items))} sources\n")

    if not news_items:
        print("⚠  No news fetched. Check your network or RSS sources.")
        return None

    if dry_run:
        print(json.dumps(news_items[:3], indent=2, ensure_ascii=False))

    # ── Agent 2: Write ─────────────────────────────────────────────────────
    print("→ [2/3] Writer Agent: curating with Claude...")
    digest = writer.run(news_items)
    print(f"   Stories: {len(digest['stories'])}  Quick bites: {len(digest['quick_bites'])}\n")

    if dry_run:
        print(json.dumps(digest, indent=2, ensure_ascii=False))
        return None

    # ── Agent 3: Render ────────────────────────────────────────────────────
    print("→ [3/3] Renderer Agent: generating image...")
    png_path = renderer.run(digest)

    print(f"\n✅  Done! Digest image saved to:\n   {png_path}\n")

    if open_after:
        import subprocess
        subprocess.run(["xdg-open", str(png_path)], check=False)

    return png_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate daily AI digest image")
    parser.add_argument("--dry-run", action="store_true", help="Print JSON only, skip rendering")
    parser.add_argument("--open", dest="open_after", action="store_true", help="Open PNG when done")
    args = parser.parse_args()
    run(dry_run=args.dry_run, open_after=args.open_after)
