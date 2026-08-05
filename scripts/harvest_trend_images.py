"""One representative thumbnail per trend term, from Wikipedia lead images.

Fills public.trend_images (migration 0004) for the landing-canon POP_TRENDS
labels baked in below plus every short signal in public.cultural_events.
Wikipedia is the zero-spend source: full-text search each term, take the
best-ranked result that has a lead image, store its thumbnail URL
(upload.wikimedia.org allows hotlinking).

Run locally with the pw-radar venv (it has requests + psycopg) and its .env:
  cd ~/pw-radar && set -a && source .env && set +a && \
  .venv/bin/python ~/cultural-archaeology/scripts/harvest_trend_images.py

Re-runs skip terms already stored; IMAGES_REFRESH=1 refetches everything.
"""

import os
import sys
import time

import psycopg
import requests

DB_URL = os.environ.get("SUPABASE_DB_URL")

CANON = [
    'Grunge', 'Spice Girls', 'Tamagotchi', 'Y2K Panic',
    'Juicy Tracksuit', 'Napster', 'Von Dutch', 'Low-Rise',
    'MySpace Top 8', 'Ugg Boots', 'Skinny Jeans', 'Emo',
    'Shutter Shades', 'Indie Sleaze', 'iPhone', 'Hipster',
    'Auto-Tune', 'Mustache Tattoo', 'Planking', 'Occupy',
    'Harlem Shake', 'Gangnam Style', 'Selfie', 'Twerking',
    'Normcore', 'Ice Bucket', 'On Fleek', 'Man Bun',
    'Dad Hat', 'The Dress', 'Dabbing', 'Pokémon GO',
    'Fidget Spinner', 'Gender Reveal', 'VSCO Girl', 'Yanny/Laurel',
    'OK Boomer', 'Dalgona Coffee', 'E-Girl', 'Cottagecore',
    'Sourdough', 'Tiger King', 'Sea Shanty', 'Y2K Revival',
    'NFT', 'Squid Game', 'Cheugy', 'Goblincore',
    'BeReal', 'Quiet Quitting', 'Corecore', 'Mob Wife',
    'Girl Dinner', 'Barbiecore', 'Rizz', 'Brat Summer',
    'Demure', 'Raw Milk', 'Aura Points', 'Coastal Grandma',
    'Aura Farming', 'Recession Pop', 'Blokecore', 'Clean Girl',
]

# Labels whose plain search lands on the wrong article; searched as written.
SEARCH_HINTS = {
    'Grunge': 'grunge fashion',
    'Emo': 'emo subculture',
    'Occupy': 'Occupy Wall Street',
    'Selfie': 'selfie',
    'Ice Bucket': 'Ice Bucket Challenge',
    'Sourdough': 'sourdough baking pandemic',
    'Sea Shanty': 'sea shanty TikTok',
    'Raw Milk': 'raw milk',
}

# Curated exact-article overrides, checked before search: full-text search
# ranks these terms onto the wrong page entirely ('Normcore' -> a racehorse,
# 'gyatt' -> a US Navy destroyer). Keys are lowercased terms.
EXACT_TITLES = {
    'aura points': 'Aura (paranormal)',
    'blokecore': 'Kit (association football)',
    # Some trends' own articles have no lead image; the canonical carrier does.
    'clean girl': 'Hailey Bieber',
    'coastal grandma': 'Nancy Meyers',
    'mob wife': 'Carmela Soprano',
    'mob wife aesthetic': 'Carmela Soprano',
    'myspace top 8': 'Myspace',
    'normcore': 'Normcore',
    'ok boomer': 'Chlöe Swarbrick',
    'pokémon go': 'Pokémon Go',
    'quiet quitting': 'R/antiwork',
    'recession pop': 'Kesha',
    'rizz': 'Kai Cenat',
    'skibidi': 'Skibidi Toilet',
    'the dress': 'The dress',
    'tiger king': 'Tiger King',
    'uniform dressing': 'Capsule wardrobe',
    'y2k panic': 'Year 2000 problem',
    'y2k revival': 'Y2K aesthetic',
    'yanny/laurel': 'Yanny or Laurel',
}

# Terms with no honest Wikipedia image — search only finds unrelated pages
# (e.g. 'main character energy' -> a Bollywood actress). Never stored; a
# wrong image on a pill is worse than a bare pill.
SKIP = {
    'corporate irony dressing', 'damnlines.com popularity surge', 'delulu',
    'demure', 'faux fur trim accents', 'flower appliqué sandals',
    'going analogue', 'gyatt', 'low/no alcohol beverages',
    'main character energy', 'on fleek', 'tech nature fusion', 'yanny/laurel',
}

API = "https://en.wikipedia.org/w/api.php"
HEADERS = {
    # Wikimedia etiquette: descriptive UA with a contact.
    "User-Agent": "whatthefad/0.1 (https://whatthefad.netlify.app; rafael.abbariao@gmail.com)",
}


def library_terms(conn):
    with conn.cursor() as cur:
        cur.execute("select distinct signal from public.cultural_events")
        rows = [r[0] for r in cur.fetchall()]
    out = []
    for s in rows:
        s = s.strip().rstrip(".")
        if 0 < len(s.split()) <= 4 and len(s) <= 40:
            out.append(s.replace("-", " "))
    return out


def page_image(params):
    r = requests.get(API, headers=HEADERS, timeout=20, params={
        "action": "query", "format": "json", "redirects": 1,
        "prop": "pageimages|info", "piprop": "thumbnail|original",
        # pilicense any: without it pageimages only returns free-license leads,
        # which hides most logos, stills, and meme photographs (fair-use).
        "pithumbsize": 480, "pilicense": "any", "inprop": "url", **params,
    })
    r.raise_for_status()
    pages = (r.json().get("query") or {}).get("pages") or {}
    for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        thumb = (p.get("thumbnail") or {}).get("source")
        if thumb:
            return {
                "thumb_url": thumb,
                "image_url": (p.get("original") or {}).get("source"),
                "page_url": p.get("fullurl"),
                "page_title": p.get("title"),
            }
    return None


def find_image(term):
    """Curated exact article if listed, else best search result with a lead image."""
    exact = EXACT_TITLES.get(term.lower())
    if exact:
        return page_image({"titles": exact})
    return page_image({
        "generator": "search",
        "gsrsearch": SEARCH_HINTS.get(term, term),
        "gsrlimit": 4,
    })


def main():
    if not DB_URL:
        sys.exit("SUPABASE_DB_URL is not set")
    conn = psycopg.connect(DB_URL, prepare_threshold=None)
    refresh = os.environ.get("IMAGES_REFRESH") == "1"

    seen = set()
    terms = []
    for t in CANON + library_terms(conn):
        if t.lower() not in seen:
            seen.add(t.lower())
            terms.append(t)

    with conn.cursor() as cur:
        cur.execute("select lower(term) from public.trend_images")
        stored = {r[0] for r in cur.fetchall()}

    ok = skipped = missing = 0
    for term in terms:
        if term.lower() in SKIP:
            continue
        if not refresh and term.lower() in stored:
            skipped += 1
            continue
        try:
            hit = find_image(term)
        except Exception as e:
            print(f"  {term!r}: FAILED {e}")
            continue
        if not hit:
            missing += 1
            print(f"  {term!r}: no image found")
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into public.trend_images
                      (term, thumb_url, image_url, page_url, page_title, source)
                    values (%(term)s, %(thumb_url)s, %(image_url)s, %(page_url)s, %(page_title)s, 'wikipedia')
                    on conflict (term) do update
                      set thumb_url = excluded.thumb_url, image_url = excluded.image_url,
                          page_url = excluded.page_url, page_title = excluded.page_title,
                          fetched_at = now()
                    """,
                    {"term": term, **hit},
                )
            conn.commit()
            ok += 1
            print(f"  {term!r}: {hit['page_title']!r}")
        time.sleep(0.3)
    print(f"trend images: ok={ok} skipped={skipped} missing={missing} of {len(terms)} terms")
    conn.close()


if __name__ == "__main__":
    main()
