#!/usr/bin/env python3
"""
Local discovery runner for GTM Pipeline.
Runs on the server (Ubuntu) where Python + Playwright + Chromium are available.
POSTs results to the deployed Vercel app.

Usage:
  python3 runners/local_discovery.py
  python3 runners/local_discovery.py --discover-only
  python3 runners/local_discovery.py --source yc,betalist,remotive,techcrunch,hackernews
"""
import argparse
import json
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
BASE_URL = "https://gtm-pipeline.vercel.app"

SOURCES = {
    "yc":        "yc",
    "betalist":  "betalist",
    "remotive":  "remotive",
    "techcrunch":"techcrunch",
    "hackernews":"hackernews",
}


def run_py_scraper(source: str) -> list[dict]:
    """Run the Python scraper and parse JSON output."""
    cmd = [
        "/usr/local/lib/hermes-agent/venv/bin/python3",
        str(SCRIPT_DIR.parent / "scrapers" / "browser_scraper.py"),
        "--source", source,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print(f"[{source}] scraper error: {result.stderr}", file=sys.stderr)
        return []
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as e:
        print(f"[{source}] JSON parse error: {e}", file=sys.stderr)
        return []


def post_json(endpoint: str, data: dict) -> bool:
    """POST JSON to Vercel API endpoint."""
    url = f"{BASE_URL}{endpoint}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"  -> {resp.status} {resp.reason}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  -> HTTP {e.code}: {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  -> Network error: {e}", file=sys.stderr)
        return False


def discover_all(sources: list[str]) -> int:
    """Run discovery for all sources, POST to Vercel, return total leads."""
    all_leads = []
    for src in sources:
        label = SOURCES.get(src, src)
        print(f"\n[Discovery] {src}...")
        leads = run_py_scraper(label)
        print(f"  -> {len(leads)} leads found")
        for lead in leads:
            lead["source"] = src
        all_leads.extend(leads)

    if not all_leads:
        print("\nNo leads found — skipping POST.")
        return 0

    print(f"\n[Discovery] Posting {len(all_leads)} leads to Vercel...")
    ok = post_json("/api/cron/discover", {"leads": all_leads})
    return len(all_leads) if ok else 0


def main():
    parser = argparse.ArgumentParser(description="GTM Pipeline local discovery runner")
    parser.add_argument(
        "--source",
        default="yc,betalist,remotive,techcrunch,hackernews",
        help="Comma-separated sources (default: all)",
    )
    parser.add_argument(
        "--discover-only",
        action="store_true",
        help="Only run discovery, skip research pipeline",
    )
    args = parser.parse_args()

    sources = [s.strip() for s in args.source.split(",") if s.strip()]
    print(f"GTM Pipeline Local Runner — sources: {sources}")

    total = discover_all(sources)
    print(f"\nDone. {total} leads discovered.")

    if not args.discover_only and total > 0:
        print("\n[Research] Triggering research pipeline on Vercel...")
        post_json("/api/cron/research", {})


if __name__ == "__main__":
    main()
