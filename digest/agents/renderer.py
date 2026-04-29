"""
Renderer Agent — turns digest JSON into a beautiful HTML page
and screenshots it to a PNG image using Playwright.
"""

import os
import json
from datetime import date
from pathlib import Path
from jinja2 import Template

OUTPUT_DIR = Path(__file__).parent.parent / "output"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="he" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1200">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0A0A0F;
    --surface: #111118;
    --surface2: #16161F;
    --border: rgba(255,255,255,0.07);
    --text: #E8E8F0;
    --muted: #6B6B80;
    --accent: #D4A27F;
    --card-radius: 16px;
  }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    width: 1200px;
    padding: 40px;
    min-height: 100vh;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28px 36px;
    background: linear-gradient(135deg, #111118 0%, #16101A 100%);
    border: 1px solid var(--border);
    border-radius: 20px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 240px; height: 240px;
    background: radial-gradient(circle, rgba(212,162,127,0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .header-left { display: flex; flex-direction: column; gap: 4px; }
  .digest-label {
    font-size: 11px; font-weight: 700; letter-spacing: 3px;
    color: var(--accent); text-transform: uppercase;
  }
  .digest-title {
    font-size: 34px; font-weight: 900; line-height: 1;
    background: linear-gradient(135deg, #fff 40%, #D4A27F 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .digest-sub { font-size: 13px; color: var(--muted); margin-top: 2px; }
  .header-right { text-align: right; }
  .date-badge {
    background: rgba(212,162,127,0.12);
    border: 1px solid rgba(212,162,127,0.25);
    border-radius: 10px;
    padding: 8px 16px;
    font-size: 13px; font-weight: 600; color: var(--accent);
  }
  .stats-row {
    display: flex; gap: 16px; margin-top: 10px; justify-content: flex-end;
  }
  .stat { font-size: 11px; color: var(--muted); }
  .stat span { color: var(--text); font-weight: 600; }

  /* ── QUOTE BANNER ── */
  .quote-banner {
    background: linear-gradient(135deg, rgba(212,162,127,0.08) 0%, rgba(107,127,215,0.08) 100%);
    border: 1px solid rgba(212,162,127,0.2);
    border-left: 4px solid var(--accent);
    border-radius: var(--card-radius);
    padding: 22px 28px;
    margin-bottom: 24px;
    display: flex; align-items: center; gap: 20px;
  }
  .quote-icon { font-size: 32px; flex-shrink: 0; }
  .quote-text { font-size: 15px; font-weight: 500; line-height: 1.5; color: #C8C8D8; font-style: italic; }
  .quote-author { font-size: 11px; color: var(--muted); margin-top: 6px; font-style: normal; }

  /* ── MAIN GRID ── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 16px;
    margin-bottom: 16px;
  }

  /* ── STORY CARD ── */
  .story-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--card-radius);
    padding: 22px;
    display: flex; flex-direction: column; gap: 10px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s;
  }
  .story-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--card-accent);
    border-radius: var(--card-radius) var(--card-radius) 0 0;
  }
  .card-top { display: flex; align-items: center; justify-content: space-between; }
  .category-tag {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
    padding: 4px 10px; border-radius: 6px;
    background: rgba(255,255,255,0.06); color: var(--card-accent);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .card-emoji { font-size: 20px; }
  .card-title {
    font-size: 14px; font-weight: 700; line-height: 1.4; color: #EEEEF8;
  }
  .card-body { font-size: 12.5px; color: var(--muted); line-height: 1.6; flex: 1; }
  .card-source {
    font-size: 10px; color: rgba(255,255,255,0.25);
    text-transform: uppercase; letter-spacing: 1px;
    border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px;
  }

  /* ── FEATURED CARD (first story) ── */
  .story-card.featured {
    grid-column: span 2;
    padding: 28px;
  }
  .story-card.featured .card-title { font-size: 18px; }
  .story-card.featured .card-body { font-size: 13.5px; }

  /* ── SIDEBAR / QUICK BITES ── */
  .quick-bites {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--card-radius);
    padding: 22px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .qb-header {
    font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: var(--muted); margin-bottom: 12px;
  }
  .qb-item {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .qb-item:last-child { border-bottom: none; }
  .qb-emoji { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .qb-text { font-size: 12px; color: #9898A8; line-height: 1.5; }

  /* ── BOTTOM ROW ── */
  .bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }

  /* ── CLOSING CARD ── */
  .closing-card {
    grid-column: span 2;
    background: linear-gradient(135deg, rgba(107,127,215,0.1) 0%, rgba(167,139,250,0.1) 100%);
    border: 1px solid rgba(107,127,215,0.2);
    border-radius: var(--card-radius);
    padding: 24px 28px;
    display: flex; align-items: center; gap: 16px;
  }
  .closing-icon { font-size: 28px; }
  .closing-label { font-size: 10px; color: #6B7FD7; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
  .closing-text { font-size: 13px; color: #B0B0C8; line-height: 1.6; }

  /* ── POWER TAG ── */
  .power-tag {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--card-radius);
    padding: 24px;
    display: flex; flex-direction: column; justify-content: center; gap: 8px;
  }
  .power-label { font-size: 10px; color: var(--muted); font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .power-value { font-size: 22px; font-weight: 800; color: var(--text); }
  .power-sub { font-size: 11px; color: var(--muted); }
  .power-bar {
    height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; margin-top: 4px;
  }
  .power-bar-fill { height: 100%; background: linear-gradient(90deg, #D4A27F, #6B7FD7); border-radius: 2px; }

  /* ── FOOTER ── */
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 0 0;
    border-top: 1px solid var(--border); margin-top: 20px;
  }
  .footer-left { font-size: 11px; color: var(--muted); }
  .footer-left strong { color: rgba(255,255,255,0.4); }
  .footer-right { display: flex; gap: 8px; }
  .pill {
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    border-radius: 20px; padding: 4px 12px;
    font-size: 10px; color: var(--muted); font-weight: 600; letter-spacing: 0.5px;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <div class="digest-label">Daily Intelligence</div>
    <div class="digest-title">AI Digest</div>
    <div class="digest-sub">Generative AI · Claude · Multi-Agent Systems · Dev Tools</div>
  </div>
  <div class="header-right">
    <div class="date-badge">{{ today }}</div>
    <div class="stats-row">
      <div class="stat"><span>{{ stats.stories_today }}</span> stories</div>
      <div class="stat"><span>{{ stats.sources_monitored }}</span> sources</div>
      <div class="stat"><span>{{ stats.categories|length }}</span> categories</div>
    </div>
  </div>
</div>

<!-- QUOTE BANNER -->
<div class="quote-banner">
  <div class="quote-icon">💡</div>
  <div>
    <div class="quote-text">"{{ headline_quote }}"</div>
    <div class="quote-author">— {{ headline_author }}</div>
  </div>
</div>

<!-- MAIN GRID -->
<div class="main-grid">
  {% for story in stories %}
  <div class="story-card {{ 'featured' if loop.first else '' }}"
       style="--card-accent: {{ story.color }};">
    <div class="card-top">
      <span class="category-tag">{{ story.category }}</span>
      <span class="card-emoji">{{ story.emoji }}</span>
    </div>
    <div class="card-title">{{ story.title }}</div>
    <div class="card-body">{{ story.body }}</div>
    <div class="card-source">{{ story.source }}</div>
  </div>
  {% if loop.first %}
  <!-- Quick Bites sidebar after first (featured) card -->
  <div class="quick-bites">
    <div class="qb-header">⚡ Quick Bites</div>
    {% for bite in quick_bites %}
    <div class="qb-item">
      <span class="qb-emoji">{{ bite.emoji }}</span>
      <span class="qb-text">{{ bite.text }}</span>
    </div>
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}
</div>

<!-- BOTTOM ROW -->
<div class="bottom-row">
  <div class="closing-card">
    <div class="closing-icon">🧠</div>
    <div>
      <div class="closing-label">Thought for the day</div>
      <div class="closing-text">{{ closing_thought }}</div>
    </div>
  </div>

  <div class="power-tag">
    <div class="power-label">Powered by</div>
    <div class="power-value">Claude<br>Sonnet 4.6</div>
    <div class="power-sub">Multi-agent digest pipeline</div>
    <div class="power-bar"><div class="power-bar-fill" style="width:80%;"></div></div>
  </div>
</div>

<div class="footer">
  <div class="footer-left">
    Generated by <strong>AI Digest Agents</strong> · {{ today }} ·
    {{ usage.input_tokens }} tokens in / {{ usage.output_tokens }} out
    {% if usage.cache_read %} · {{ usage.cache_read }} cached{% endif %}
  </div>
  <div class="footer-right">
    {% for cat in stats.categories %}
    <span class="pill">{{ cat }}</span>
    {% endfor %}
  </div>
</div>

</body>
</html>"""


def render_html(digest: dict, today: str) -> str:
    tmpl = Template(HTML_TEMPLATE)
    return tmpl.render(
        today=today,
        headline_quote=digest["headline_quote"],
        headline_author=digest.get("headline_author", "AI Digest"),
        stories=digest["stories"],
        quick_bites=digest["quick_bites"],
        closing_thought=digest["closing_thought"],
        stats=digest["stats"],
        usage=digest.get("_usage", {"input_tokens": 0, "output_tokens": 0, "cache_read": 0}),
    )


CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def screenshot(html_content: str, output_path: Path) -> Path:
    """Use Playwright to render the HTML and save a screenshot."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROMIUM_PATH,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.set_content(html_content, wait_until="networkidle")
        # Let fonts load
        page.wait_for_timeout(1500)
        # Full-page screenshot
        page.screenshot(path=str(output_path), full_page=True)
        browser.close()

    print(f"[renderer] Screenshot saved → {output_path}")
    return output_path


def run(digest: dict) -> Path:
    today_str = __import__("datetime").date.today().strftime("%B %d, %Y")
    today_file = __import__("datetime").date.today().strftime("%Y-%m-%d")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    html = render_html(digest, today_str)

    # Save HTML for debugging
    html_path = OUTPUT_DIR / f"digest_{today_file}.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"[renderer] HTML saved → {html_path}")

    # Screenshot to PNG
    png_path = OUTPUT_DIR / f"digest_{today_file}.png"
    screenshot(html, png_path)

    # Also write latest.png symlink
    latest = OUTPUT_DIR / "latest.png"
    if latest.exists() or latest.is_symlink():
        latest.unlink()
    latest.symlink_to(png_path.name)

    return png_path
