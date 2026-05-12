import json
import re
import sys
import argparse
from typing import List, Dict
from playwright.sync_api import sync_playwright


def scrape_yc_companies(max_results: int = 50) -> List[Dict]:
    """Y Combinator company directory - JS-rendered, needs headless browser."""
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('https://www.ycombinator.com/companies/', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(2000)
        html = page.content()
        browser.close()

    matches = re.findall(r'href="\/companies\/([a-z0-9\-]+)"', html)
    seen = set()
    for slug in matches:
        if slug in seen or slug in ('batch', 'industry'):
            continue
        seen.add(slug)
        results.append({
            'name': slug.replace('-', ' ').title(),
            'url': f'https://www.ycombinator.com/companies/{slug}/',
            'description': None,
            'source': 'yc',
        })
        if len(results) >= max_results:
            break

    return results


def scrape_betalist(max_results: int = 30) -> List[Dict]:
    """BetaList - headless browser to get JS-rendered startup list."""
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('https://betalist.com/', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(2000)
        html = page.content()
        browser.close()

    matches = re.findall(r'href="\/startups\/([^"]+)"', html)
    seen = set()
    for slug in matches:
        if slug in seen:
            continue
        seen.add(slug)
        results.append({
            'name': slug.replace('-', ' ').title(),
            'url': f'https://betalist.com/startups/{slug}',
            'description': None,
            'source': 'betalist',
        })
        if len(results) >= max_results:
            break

    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', choices=['yc', 'betalist'], required=True)
    args = parser.parse_args()

    if args.source == 'yc':
        leads = scrape_yc_companies()
    elif args.source == 'betalist':
        leads = scrape_betalist()

    print(json.dumps(leads))