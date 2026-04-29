"""
Writer Agent — uses the Claude CLI to curate and rewrite news into a digest.

Calls claude CLI as a subprocess from /tmp to avoid loading project context.
Returns structured digest content as a Python dict.
"""

import json
import subprocess
import tempfile
from pathlib import Path

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = (
    "You are a sharp, witty AI journalist writing a daily digest for developers, "
    "designers, and builders who care deeply about generative AI, large language models, "
    "Claude, Claude Code, multi-agent systems, and the broader AI tooling ecosystem. "
    "Your style: informative but punchy. Think Morning Brew meets Hacker News best-of-day. "
    "No fluff, no hype. Real signal. One crisp sentence of context per story — why it matters. "
    "Occasional dry wit is welcome. "
    "You ALWAYS return valid JSON. Nothing else. No markdown wrapping."
)

CURATION_PROMPT = """\
Here are today's raw AI news items fetched from RSS feeds:

{raw_items}

Today's date: {today}

Return a JSON object with exactly this structure:
{{
  "headline_quote": "A punchy 1-sentence insight or observation about today's AI landscape",
  "headline_author": "AI Digest",
  "stories": [
    {{
      "title": "Rewritten engaging headline (max 80 chars)",
      "body": "2-3 sentences. What happened + why it matters. Crisp.",
      "category": "one of: Claude & Anthropic | Open Source AI | Industry News | Startups & Business | Research & Analysis | Tools & Dev",
      "color": "hex color matching the category",
      "emoji": "one relevant emoji",
      "source": "source name",
      "url": "original url"
    }}
  ],
  "quick_bites": [
    {{
      "text": "One punchy sentence. Max 120 chars.",
      "emoji": "one emoji"
    }}
  ],
  "closing_thought": "One sentence to leave readers thinking. Can be a question or provocation.",
  "stats": {{
    "stories_today": <number>,
    "sources_monitored": <number>,
    "categories": ["list", "of", "categories", "covered"]
  }}
}}

Rules:
- Pick the 6 most important/interesting stories for "stories" (prioritize Claude/Anthropic/Claude Code if present)
- Pick 3 different items for "quick_bites" (not already in stories)
- Use these category colors: Claude & Anthropic=#D4A27F, Open Source AI=#FFD21E, Industry News=#FF4455, Startups & Business=#0FA37F, Research & Analysis=#6B7FD7, Tools & Dev=#A78BFA
- Return ONLY valid JSON, no markdown fences"""


def _call_claude(prompt: str) -> str:
    """Call the claude CLI from /tmp to get a clean response."""
    result = subprocess.run(
        [
            "claude",
            "--print",
            "--output-format", "text",
            "--model", MODEL,
            "--no-session-persistence",
            "--system-prompt", SYSTEM_PROMPT,
        ],
        input=prompt,
        capture_output=True,
        text=True,
        cwd="/tmp",
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Claude CLI error: {result.stderr[:500]}")
    return result.stdout.strip()


def run(raw_items: list[dict]) -> dict:
    today = __import__("datetime").date.today().strftime("%B %d, %Y")
    items_json = json.dumps(raw_items[:20], indent=2, ensure_ascii=False)

    prompt = CURATION_PROMPT.format(raw_items=items_json, today=today)
    print(f"[writer] Sending {min(len(raw_items), 20)} items to Claude ({MODEL})...")

    raw_text = _call_claude(prompt)

    # Strip markdown fences if present
    if raw_text.startswith("```"):
        raw_text = "\n".join(raw_text.split("\n")[1:])
        if raw_text.endswith("```"):
            raw_text = raw_text[: raw_text.rfind("```")]

    digest = json.loads(raw_text.strip())
    print(
        f"[writer] Got {len(digest.get('stories', []))} stories, "
        f"{len(digest.get('quick_bites', []))} quick bites"
    )

    digest["_usage"] = {"input_tokens": 0, "output_tokens": 0, "cache_read": 0}
    return digest
