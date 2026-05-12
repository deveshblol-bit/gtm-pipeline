#!/usr/bin/env python3
"""
Local discovery runner for GTM Pipeline.
Runs on the server (Ubuntu) where Python + Playwright + Chromium are available.
Uses cookie-based auth to talk to the Next.js app exposed via ngrok.

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
import http.cookiejar
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
BASE_URL = "https://nonplausible-librada-manipulatively.ngrok-free.dev"
APP_PASSWORD = "devesh"

SOURCES = {
    "yc":         "yc",
    "betalist":   "betalist",
    "remotive":   "remotive",
    "techcrunch": "techcrunch",
    "hackernews": "hackernews",
}


def get_opener():
    """Returns an opener with auth cookie pre-loaded."""
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    data = json.dumps({"password": APP_PASSWORD}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        opener.open(req, timeout=10)
    except Exception as e:
        print(f"  [auth] Warning: {e}", file=sys.stderr)
    return opener


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


def post_json(opener, endpoint: str, data: dict) -> bool:
    """POST JSON to the app endpoint."""
    url = f"{BASE_URL}{endpoint}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with opener.open(req, timeout=120) as resp:
            body = resp.read().decode()
            if resp.status >= 200 and resp.status < 300:
                print(f"  -> {resp.status} saved={json.loads(body).get('saved','?')}")
                return True
            else:
                print(f"  -> HTTP {resp.status}: {body[:200]}", file=sys.stderr)
                return False
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  -> HTTP {e.code}: {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  -> Network error: {e}", file=sys.stderr)
        return False


def discover_all(opener, sources: list[str]) -> int:
    """Run discovery for all sources, POST to app, return total leads."""
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

    print(f"\n[Discovery] Posting {len(all_leads)} leads to app...")
    ok = post_json(opener, "/api/leads/ingest", {"leads": all_leads})
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
    print(f"Target: {BASE_URL}")

    opener = get_opener()
    total = discover_all(opener, sources)
    print(f"\nDone. {total} leads discovered.")

    if not args.discover_only and total > 0:
        print("\n[Research] Triggering research pipeline on Vercel...")
        post_json(opener, "/api/cron/research", {})


if __name__ == "__main__":
    main()