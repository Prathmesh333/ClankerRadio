"""Automatic metadata and synchronized lyrics, using fixed provider endpoints and LRCLIB."""

import json
import re
import time
from difflib import SequenceMatcher
from functools import lru_cache
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api")


def fetch_json(base, params):
    request = Request(
        base + "?" + urlencode(params),
        headers={"User-Agent": "ClankerRadio/0.5 (local music visualizer)", "Accept": "application/json"},
    )
    with urlopen(request, timeout=12) as response:
        return json.loads(response.read(3_000_000))


def normalize(value):
    return " ".join(re.findall(r"\w+", value.casefold(), re.UNICODE))


def clean_title(value):
    value = re.sub(
        r"\s*[\[(](?:official.*?|lyrics?|audio|video|visuali[sz]er|hd|4k)[\])]", "", value, flags=re.I
    )
    return re.sub(r"\s*\|\s*(?:official|lyrics?).*$", "", value, flags=re.I).strip()


def metadata(url):
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().removeprefix("www.")
    title, artist = "", ""
    if host in ["youtube.com", "music.youtube.com", "youtu.be"]:
        if "list" in parse_qs(parsed.query) and not parse_qs(parsed.query).get("v") and host != "youtu.be":
            return "", ""
        data = fetch_json("https://www.youtube.com/oembed", {"url": url, "format": "json"})
        title, artist = data.get("title", ""), data.get("author_name", "").removesuffix(" - Topic")
    elif host == "open.spotify.com":
        if not re.search(r"/track/[A-Za-z0-9]{22}", parsed.path):
            return "", ""
        data = fetch_json("https://open.spotify.com/oembed", {"url": url})
        title = data.get("title", "")
    elif host == "soundcloud.com":
        data = fetch_json("https://soundcloud.com/oembed", {"url": url, "format": "json"})
        title, artist = data.get("title", ""), data.get("author_name", "")
    elif host == "music.apple.com":
        track_id = parse_qs(parsed.query).get("i", [None])[0]
        if not track_id and "/song/" in parsed.path:
            track_id = parsed.path.rstrip("/").split("/")[-1]
        if track_id and track_id.isdigit():
            data = fetch_json("https://itunes.apple.com/lookup", {"id": track_id})
            item = next(iter(data.get("results", [])), {})
            title, artist = item.get("trackName", ""), item.get("artistName", "")
    elif re.search(r"\.(mp3|wav|ogg|m4a|flac|aac|opus)$", parsed.path, re.I):
        from urllib.parse import unquote

        title = unquote(parsed.path.split("/")[-1]).rsplit(".", 1)[0].replace("_", " ")
    return title, artist


def rank_match(item, title, artist, duration):
    similarity = SequenceMatcher(None, normalize(title), normalize(item.get("trackName", ""))).ratio()
    artist_score = SequenceMatcher(None, normalize(artist), normalize(item.get("artistName", ""))).ratio()
    difference = abs(float(item.get("duration") or 0) - duration) if duration else 0
    return similarity * 0.75 + (artist_score if artist else 0.6) * 0.2 - min(difference / 100, 0.3)


@lru_cache(maxsize=512)
def lookup(url, title, artist, duration, bucket):
    del bucket
    try:
        if not title:
            title, artist = metadata(url)
        title = clean_title(title)
        if " - " in title:
            inferred_artist, title = title.split(" - ", 1)
            artist = inferred_artist
        if not title:
            return {"status": "waiting", "message": "Waiting for the current playlist track…"}
        query = {"track_name": title}
        if artist:
            query["artist_name"] = artist
        items = fetch_json("https://lrclib.net/api/search", query)
        if not items:
            items = fetch_json("https://lrclib.net/api/search", {"q": f"{artist} {title}".strip()})
        ranked = sorted(
            items if isinstance(items, list) else [],
            key=lambda i: rank_match(i, title, artist, duration),
            reverse=True,
        )
        # Avoid showing a different song merely because its title has a few common words.
        candidates = [
            i
            for i in ranked
            if SequenceMatcher(None, normalize(title), normalize(i.get("trackName", ""))).ratio() >= 0.7
        ]
        if not candidates:
            return {"status": "missing", "message": f"No lyric match found for {title}.", "title": title}
        # Prefer synchronized lyrics among equally close matches; retain versions and duration matching.
        best_score = rank_match(candidates[0], title, artist, duration)
        close = [i for i in candidates if rank_match(i, title, artist, duration) >= best_score - 0.035]
        item = next((i for i in close if i.get("syncedLyrics")), close[0])
        return {
            "status": "instrumental"
            if item.get("instrumental")
            else "synced"
            if item.get("syncedLyrics")
            else "plain"
            if item.get("plainLyrics")
            else "missing",
            "duration": item.get("duration") or 0,
            "timingWarning": (
                "Recording lengths differ; use Sync lyrics if the video has a different intro."
                if duration and abs(float(item.get("duration") or 0) - duration) > 4
                else ""
            ),
            "title": item.get("trackName"),
            "artist": item.get("artistName"),
            "lyrics": item.get("syncedLyrics") or item.get("plainLyrics") or "",
            "source": f"https://lrclib.net/api/get/{item['id']}",
            "message": "LRCLIB · synchronized lyrics"
            if item.get("syncedLyrics")
            else "LRCLIB · estimated line timing",
        }
    except Exception:
        return {
            "status": "unavailable",
            "message": "Lyric service unavailable. Retry shortly or use the optional correction field.",
        }


@router.get("/lyrics")
def lyrics(
    url: str = Query(default="", max_length=2048),
    title: str = Query(default="", max_length=300),
    artist: str = Query(default="", max_length=200),
    duration: float = Query(default=0, ge=0, le=86400),
):
    result = lookup(url, title, artist, round(duration), int(time.time() // 900))
    if result["status"] == "unavailable":
        lookup.cache_clear()
    return result
