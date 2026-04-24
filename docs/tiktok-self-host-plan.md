# Self-hosting davidteather/TikTok-Api for McWhy

**Goal:** Replace the tikwm.com third-party dependency in `netlify/functions/tiktok.js` with a self-hosted instance of `davidteather/TikTok-Api` running on free-tier infrastructure.

**Status:** Plan drafted 2026-04-23. Not yet implemented.

## Why self-host

- Removes dependency on tikwm.com (third-party, unknown operator, could disappear)
- Full control over rate limits and request shaping
- Still free at low volumes
- Trade-off: cold-start latency, ~15 min of setup, one more service to monitor

## Architecture

```
McWhy (Netlify)
  └── tiktok.js (Netlify Function)
        └── HTTP POST → tiktok-service.onrender.com/trending
              └── FastAPI wrapper
                    └── TikTok-Api (Python + Playwright + Chromium)
                          └── TikTok web endpoints
```

The wrapper service exposes one endpoint we care about:

- `GET /trending?country=US&count=60` → returns the same shape our current function builds: `{ hashtags: [...], songs: [...], sample_size }`

That lets `tiktok.js` swap its internal call from `tikwm.com` to `${TIKTOK_SERVICE_URL}/trending` with no UI change.

## Hosting choice

**Render.com Web Service (free tier)** is the best fit:
- Supports Docker, which is what TikTok-Api effectively needs (Playwright + Chromium)
- 512 MB RAM (tight but workable for headless Chromium with single tab)
- Free services spin down after 15 min idle → 30–60 s cold start
- Cold start is fine for McWhy's use case: user opens the TikTok tab, we show `loading…`, fetches resolve in under a minute

Alternative: Fly.io (`fly launch`) — better for always-on, but no free compute anymore (trial credits). Pick Render unless you outgrow it.

## Implementation steps

### 1. Create the service repo

New repo `rafaelcarlosabbariao/tiktok-service`:

**Dockerfile**
```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY app.py .

ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**requirements.txt**
```
TikTokApi==7.2.*
fastapi==0.115.*
uvicorn[standard]==0.32.*
playwright==1.47.*
```

**app.py**
```python
import asyncio
import os
import re
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from TikTokApi import TikTokApi

# ms_token is TikTok's anti-bot session cookie. Grab it manually from your browser:
#   open tiktok.com, log in or just browse, F12 → Application → Cookies → msToken
# Paste its value into the MS_TOKEN env var on Render.
MS_TOKEN = os.environ.get("MS_TOKEN", "")
HASHTAG_RE = re.compile(r"#[\wÀ-￿]+")

api: TikTokApi | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global api
    api = TikTokApi()
    await api.create_sessions(
        ms_tokens=[MS_TOKEN] if MS_TOKEN else None,
        num_sessions=1,
        sleep_after=3,
        headless=True,
    )
    yield
    if api:
        await api.close_sessions()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"ok": True, "ms_token_set": bool(MS_TOKEN)}


@app.get("/trending")
async def trending(
    country: str = Query("US"),
    count: int = Query(60, ge=1, le=100),
):
    if not api:
        raise HTTPException(503, "api not ready")
    tag_counts: dict[str, int] = defaultdict(int)
    tag_views: dict[str, int] = defaultdict(int)
    sounds: dict[tuple[str, str], dict] = {}
    sample_size = 0
    try:
        async for video in api.trending.videos(count=count):
            sample_size += 1
            text = video.as_dict.get("desc", "") or ""
            views = video.as_dict.get("stats", {}).get("playCount", 0) or 0
            for raw in HASHTAG_RE.findall(text):
                tag = raw.lower()
                tag_counts[tag] += 1
                tag_views[tag] += views
            music = video.as_dict.get("music", {}) or {}
            title = music.get("title") or ""
            author = music.get("authorName") or ""
            if title:
                key = (title, author)
                prev = sounds.setdefault(key, {"title": title, "author": author, "count": 0, "total_views": 0, "url": music.get("playUrl") or ""})
                prev["count"] += 1
                prev["total_views"] += views
    except Exception as e:
        raise HTTPException(502, f"tiktok-api error: {e}")

    hashtags = [
        {
            "tag": tag,
            "rank": i + 1,
            "publish_count": tag_counts[tag],
            "video_views": tag_views[tag],
            "url": f"https://www.tiktok.com/tag/{tag[1:]}",
        }
        for i, tag in enumerate(sorted(tag_counts, key=tag_counts.get, reverse=True)[:40])
    ]
    songs = [
        {
            "title": s["title"],
            "author": s["author"],
            "rank": i + 1,
            "uses": s["count"],
            "total_views": s["total_views"],
            "url": s["url"],
        }
        for i, s in enumerate(sorted(sounds.values(), key=lambda x: (x["count"], x["total_views"]), reverse=True)[:40])
    ]
    return {
        "source": "tiktok-selfhost",
        "country": country,
        "hashtags": hashtags,
        "songs": songs,
        "sample_size": sample_size,
    }
```

**render.yaml** (optional but nicer for reproducibility)
```yaml
services:
  - type: web
    name: tiktok-service
    runtime: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: MS_TOKEN
        sync: false   # set manually in Render dashboard
    healthCheckPath: /health
```

### 2. Grab your `msToken`

TikTok's anti-bot session cookie. Required for most endpoints to work.

1. Open https://www.tiktok.com in Chrome (logged-in account recommended but optional)
2. Browse a bit (view a few videos) so the cookie gets minted
3. F12 → Application → Storage → Cookies → https://www.tiktok.com
4. Find `msToken`, copy its entire value (it's long)
5. You'll paste this into Render's env var UI in step 3

msTokens rotate eventually (days to weeks). When TikTok calls start failing, grab a fresh one and redeploy.

### 3. Deploy to Render

1. Push the repo to GitHub
2. render.com → New → Web Service → connect the repo
3. Pick Docker, free plan, region (Oregon is fine)
4. Environment → add `MS_TOKEN` with the value from step 2
5. Click Deploy. First build takes ~5 min (downloads Chromium)
6. Once live, test: `curl https://tiktok-service-xxxx.onrender.com/health` should return `{"ok": true, "ms_token_set": true}`
7. Then: `curl "https://tiktok-service-xxxx.onrender.com/trending?country=US&count=30"` — first call will be slow (cold start), subsequent calls < 10s

### 4. Wire McWhy to it

Add env var to Netlify:
- `TIKTOK_SERVICE_URL=https://tiktok-service-xxxx.onrender.com`

Edit `netlify/functions/tiktok.js` — new path priority:

1. **Self-hosted** (if `TIKTOK_SERVICE_URL` set) — hit `${TIKTOK_SERVICE_URL}/trending?country=${country}&count=60`, return its body directly since the shape already matches
2. tikwm.com (current free fallback)
3. Apify (paid fallback if `APIFY_TOKEN` set)

No UI change needed — `renderTikTok()` consumes the same shape.

### 5. Monitor

- First failure mode: msToken expired. Symptom: `/trending` returns 502 with "tiktok-api error" message. Fix: grab fresh msToken, update Render env var, redeploy.
- Second failure mode: Render free tier spins down. First request after idle is 30–60s. McWhy's loading spinner handles it, but consider: if this becomes annoying, either (a) upgrade Render to $7/mo starter (always-on), or (b) add a cron that pings `/health` every 10 min to keep it warm.
- Third failure mode: TikTok-Api library breaks when TikTok ships a signature change. Fix: bump the `TikTokApi` version in requirements.txt, redeploy. Watch the repo for releases.

## Effort estimate

- Repo setup + Docker + app.py: 30 min
- Render deploy + msToken grab: 15 min
- McWhy wiring + deploy: 10 min
- Total: ~1 hour first time

## Cost

- Render free tier: $0 (with cold-start tax)
- If you upgrade to always-on: $7/mo Starter plan
- Still cheaper than Apify at any meaningful volume
