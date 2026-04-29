"""
Researcher Agent — fetches fresh AI news from RSS feeds.
Returns a list of structured news items for the writer agent.
"""

import json
import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

FEEDS = [
    {
        "name": "Anthropic",
        "url": "https://www.anthropic.com/news/rss",
        "category": "Claude & Anthropic",
        "color": "#D4A27F",
    },
    {
        "name": "HuggingFace Blog",
        "url": "https://huggingface.co/blog/feed.xml",
        "category": "Open Source AI",
        "color": "#FFD21E",
    },
    {
        "name": "The Verge AI",
        "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
        "category": "Industry News",
        "color": "#FF4455",
    },
    {
        "name": "TechCrunch AI",
        "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "category": "Startups & Business",
        "color": "#0FA37F",
    },
    {
        "name": "MIT Tech Review AI",
        "url": "https://www.technologyreview.com/feed/",
        "category": "Research & Analysis",
        "color": "#6B7FD7",
    },
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AIDigest/1.0; +https://github.com/ai-digest)"
}

MAX_ITEMS_PER_FEED = 4


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "")


def _parse_date(raw: str) -> str:
    try:
        return parsedate_to_datetime(raw).isoformat()
    except Exception:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%a, %d %b %Y %H:%M:%S %z"):
        try:
            return datetime.strptime(raw.strip(), fmt).isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()


def _text(el, tag: str, ns: dict | None = None) -> str:
    child = el.find(tag, ns) if ns else el.find(tag)
    return (child.text or "").strip() if child is not None else ""


def fetch_feed(source: dict) -> list[dict]:
    try:
        resp = requests.get(source["url"], headers=HEADERS, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)

        # Handle both RSS and Atom
        ns_atom = {"atom": "http://www.w3.org/2005/Atom"}
        items = []

        # RSS
        for entry in root.findall(".//item")[:MAX_ITEMS_PER_FEED]:
            title = _text(entry, "title")
            url = _text(entry, "link")
            summary = _strip_html(_text(entry, "description"))[:400]
            pub_raw = _text(entry, "pubDate") or _text(entry, "dc:date")
            items.append({
                "title": title,
                "url": url,
                "summary": summary.strip(),
                "published": _parse_date(pub_raw) if pub_raw else datetime.now(timezone.utc).isoformat(),
                "source": source["name"],
                "category": source["category"],
                "color": source["color"],
            })

        if not items:
            # Atom
            for entry in root.findall("atom:entry", ns_atom)[:MAX_ITEMS_PER_FEED]:
                title = _text(entry, "atom:title", ns_atom)
                link_el = entry.find("atom:link", ns_atom)
                url = link_el.get("href", "") if link_el is not None else ""
                summary_el = entry.find("atom:summary", ns_atom) or entry.find("atom:content", ns_atom)
                summary = _strip_html((summary_el.text or "") if summary_el is not None else "")[:400]
                pub_raw = _text(entry, "atom:published", ns_atom) or _text(entry, "atom:updated", ns_atom)
                items.append({
                    "title": title,
                    "url": url,
                    "summary": summary.strip(),
                    "published": _parse_date(pub_raw) if pub_raw else datetime.now(timezone.utc).isoformat(),
                    "source": source["name"],
                    "category": source["category"],
                    "color": source["color"],
                })

        return items
    except Exception as e:
        print(f"[researcher] Failed to fetch {source['name']}: {e}")
        return []


def _claude_knowledge_fallback() -> list[dict]:
    """When RSS feeds are blocked, use Claude CLI to generate knowledge-based AI news."""
    import subprocess
    from datetime import date

    today = date.today().strftime("%B %d, %Y")

    prompt = f"""\
Generate 15 realistic AI news items that an expert AI journalist would cover today ({today}).
Focus on: Claude & Anthropic updates, open-source models, Claude Code & dev tools,
multi-agent systems, generative AI research breakthroughs, AI industry moves.

Return a JSON array with exactly this format:
[
  {{
    "title": "Headline (max 80 chars)",
    "url": "https://example.com/story",
    "summary": "2-3 sentence summary of what happened.",
    "published": "ISO datetime",
    "source": "source name (e.g. Anthropic Blog, HuggingFace, The Verge, ArXiv)",
    "category": "one of: Claude & Anthropic | Open Source AI | Industry News | Startups & Business | Research & Analysis | Tools & Dev",
    "color": "hex color for category"
  }}
]

Category colors: Claude & Anthropic=#D4A27F, Open Source AI=#FFD21E, Industry News=#FF4455, Startups & Business=#0FA37F, Research & Analysis=#6B7FD7, Tools & Dev=#A78BFA

Make the news realistic, informative, and interesting. Return ONLY valid JSON array."""

    result = subprocess.run(
        [
            "claude", "--print", "--output-format", "text",
            "--model", "claude-sonnet-4-6",
            "--no-session-persistence",
            "--system-prompt", "You are a JSON-only AI news generator. Return only valid JSON arrays.",
        ],
        input=prompt,
        capture_output=True, text=True, cwd="/tmp", timeout=90,
    )
    if result.returncode != 0:
        print(f"[researcher] knowledge fallback failed: {result.stderr[:200]}")
        return []

    text = result.stdout.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.endswith("```"):
            text = text[:text.rfind("```")]

    items = json.loads(text.strip())
    print(f"[researcher] knowledge fallback: generated {len(items)} items")
    return items


def run() -> list[dict]:
    """Fetch all feeds and return combined, sorted news items."""
    all_items: list[dict] = []
    for source in FEEDS:
        items = fetch_feed(source)
        all_items.extend(items)
        print(f"[researcher] {source['name']}: {len(items)} items")

    # If no RSS data, fall back to Claude knowledge
    if not all_items:
        print("[researcher] No RSS feeds available — using Claude knowledge fallback...")
        all_items = _claude_knowledge_fallback()

    # Sort by published date descending
    all_items.sort(key=lambda x: x["published"], reverse=True)
    return all_items
