"""Local library and preferences; no provider fetching or arbitrary filesystem access."""

import asyncio
import hashlib
import os
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from clanker_api.database import LibraryEntryRow

router = APIRouter(prefix="/api")
AUDIO_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".opus": "audio/ogg",
}


class LinkInput(BaseModel):
    url: str = Field(min_length=8, max_length=4096)
    title: str = Field(default="", max_length=200)


class MetadataInput(BaseModel):
    auto: bool = False
    title: str = Field(min_length=1, max_length=200)
    artist: str = Field(default="", max_length=200)
    album: str = Field(default="", max_length=200)
    duration: float = Field(default=0, ge=0, le=864000)
    artwork: str = Field(default="", max_length=800000)


class Spectrum(BaseModel):
    position: Literal["bottom", "top", "left", "right", "top-bottom", "left-right", "all", "custom"] = (
        "bottom"
    )
    mirror: bool = False
    size: int = Field(default=22, ge=5, le=45)
    width: int = Field(default=94, ge=20, le=100)
    x: int = Field(default=50, ge=0, le=100)
    y: int = Field(default=85, ge=0, le=100)


class PlayerPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: Literal[
        "random",
        "randomizer",
        "geometry",
        "galaxy",
        "hyperspace",
        "crystals",
        "nebula",
        "aurora",
        "prism",
        "solar",
    ] = "random"
    quality: Literal["native", "uhd", "performance"] = "native"
    intensity: float = Field(default=0.8, ge=0.1, le=1.5)
    autoEnergy: bool = True
    spectrum: bool = True
    spectrumSettings: Spectrum = Field(default_factory=Spectrum)
    gentleMotion: bool | None = None
    lyricOffsets: dict[Annotated[str, Field(max_length=600)], Annotated[float, Field(ge=-120, le=120)]] = (
        Field(default_factory=dict, max_length=128)
    )
    browserPlayback: bool = False
    showLyrics: bool = True
    beatSync: bool = True
    crossfadeS: float = Field(default=3, ge=0, le=8)
    volume: float = Field(default=0.8, ge=0, le=1)
    recordFormat: Literal["landscape", "portrait", "square"] = "landscape"
    visualSeed: int = Field(default=42, ge=0, le=4294967295)


class PresetInput(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    preferences: PlayerPreferences


def canonical_link(raw):
    parsed = urlsplit(raw.strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(422, "Use a supported HTTP or HTTPS music link without credentials.")
    host = parsed.hostname.lower().removeprefix("www.")
    query = parse_qs(parsed.query)
    if host in ("youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"):
        video = parsed.path.lstrip("/") if host == "youtu.be" else query.get("v", [""])[0]
        if not video:
            match = re.match(r"^/(?:embed|shorts)/([\w-]{11})", parsed.path)
            video = match[1] if match else ""
        playlist = query.get("list", [""])[0]
        if playlist:
            if not re.fullmatch(r"[\w-]{10,100}", playlist):
                raise HTTPException(422, "Invalid YouTube playlist ID.")
            return "YouTube", "https://www.youtube.com/playlist?" + urlencode({"list": playlist})
        if not re.fullmatch(r"[\w-]{11}", video):
            raise HTTPException(422, "Invalid YouTube video ID.")
        return "YouTube", "https://www.youtube.com/watch?" + urlencode({"v": video})
    if host == "open.spotify.com":
        match = re.fullmatch(
            r"/(?:intl-[a-z]+/)?(track|album|playlist|episode)/([a-zA-Z0-9]{22})/?", parsed.path
        )
        if not match:
            raise HTTPException(422, "Use a full Spotify track or playlist link.")
        return "Spotify", f"https://open.spotify.com/{match[1]}/{match[2]}"
    if host == "music.apple.com" and re.match(r"/[a-z]{2}/(album|song|playlist|station)/", parsed.path):
        clean = {key: query[key][0] for key in ("i",) if key in query}
        return "Apple Music", urlunsplit(("https", host, parsed.path, urlencode(clean), ""))
    if host == "soundcloud.com" and parsed.path.strip("/"):
        return "SoundCloud", urlunsplit(("https", host, parsed.path.rstrip("/"), "", ""))
    if Path(parsed.path).suffix.lower() in AUDIO_TYPES:
        return "Audio link", urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))
    raise HTTPException(422, "Supported: YouTube, Spotify, Apple Music, SoundCloud, or a direct audio URL.")


def store(request, identity, kind, payload):
    now = datetime.now(UTC)
    with request.app.state.sessions() as session:
        row = session.get(LibraryEntryRow, identity)
        if row:
            payload = {**row.payload, **payload, "createdAt": row.payload.get("createdAt", now.isoformat())}
            row.payload = payload
            row.updated_at = now
        else:
            payload = {**payload, "createdAt": now.isoformat()}
            session.add(LibraryEntryRow(id=identity, kind=kind, payload=payload, updated_at=now))
        session.commit()
    return {"id": identity, "kind": kind, **payload}


@router.get("/library")
def library(request: Request):
    with request.app.state.sessions() as session:
        rows = session.scalars(
            select(LibraryEntryRow)
            .where(LibraryEntryRow.kind.in_(["link", "file"]))
            .order_by(LibraryEntryRow.updated_at.desc())
        ).all()
        return [{"id": row.id, "kind": row.kind, **row.payload} for row in rows]


@router.post("/library/links")
def save_link(data: LinkInput, request: Request):
    provider, canonical = canonical_link(data.url)
    identity = "link_" + hashlib.sha256(canonical.encode()).hexdigest()[:32]
    with request.app.state.sessions() as session:
        old = session.get(LibraryEntryRow, identity)
        resource = parse_qs(urlsplit(canonical).query).get(
            "list", [urlsplit(canonical).path.strip("/").split("/")[-1] or "Saved link"]
        )[0]
        title = data.title.strip() or (old.payload.get("title") if old else "") or f"{provider} · {resource}"
    return store(
        request,
        identity,
        "link",
        {
            "url": data.url.strip(),
            "canonicalUrl": canonical,
            "provider": provider,
            "title": title,
            "lastPlayed": datetime.now(UTC).isoformat(),
        },
    )


@router.post("/library/{identity}/metadata")
def metadata(identity: str, data: MetadataInput, request: Request):
    if data.artwork and not re.match(r"^data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$", data.artwork):
        raise HTTPException(422, "Artwork must be a PNG, JPEG, or WebP data URL.")
    with request.app.state.sessions() as session:
        row = session.get(LibraryEntryRow, identity)
        if not row or row.kind not in ("link", "file"):
            raise HTTPException(404, "Saved music not found.")
        kind = row.kind
        changes = data.model_dump(exclude_unset=True)
        changes.pop("auto", None)
        if data.auto and row.payload.get("customTitle"):
            changes.pop("title", None)
        elif not data.auto:
            changes["customTitle"] = True
    return store(request, identity, kind, changes)


@router.post("/library/{identity}/remove")
def remove(identity: str, request: Request):
    with request.app.state.sessions() as session:
        row = session.get(LibraryEntryRow, identity)
        if not row or row.kind not in ("file", "link", "preset"):
            raise HTTPException(404, "Saved item not found.")
        # Only the private imported copy can be removed; the user's original file is never addressed.
        if row.kind == "file" and re.fullmatch(r"file_[a-f0-9]{64}", identity):
            suffix = row.payload.get("extension")
            if suffix in AUDIO_TYPES:
                root = Path(os.getenv("ASSET_ROOT", ".data/assets")).resolve() / "music"
                (root / (identity + suffix)).unlink(missing_ok=True)
        session.delete(row)
        session.commit()
    return {"removed": True}


@router.post("/library/files")
async def import_file(request: Request, name: str = Query(max_length=255)):
    suffix = Path(name).suffix.lower()
    if suffix not in AUDIO_TYPES:
        raise HTTPException(422, "Choose MP3, WAV, OGG, M4A, AAC, FLAC, or Opus audio.")
    root = Path(os.getenv("ASSET_ROOT", ".data/assets")).resolve() / "music"
    root.mkdir(parents=True, exist_ok=True)
    temporary = root / (uuid.uuid4().hex + ".part")
    digest = hashlib.sha256()
    size = 0
    try:
        with temporary.open("wb") as output:
            async for chunk in request.stream():
                size += len(chunk)
                if size > 250 * 1024 * 1024:
                    raise HTTPException(413, "Files must be 250 MB or smaller.")
                digest.update(chunk)
                await asyncio.to_thread(output.write, chunk)
        if not size:
            raise HTTPException(422, "The audio file is empty.")
        identity = "file_" + digest.hexdigest()
        with request.app.state.sessions() as session:
            existing = session.get(LibraryEntryRow, identity)
            if existing:
                return {"id": identity, "kind": "file", **existing.payload}
        target = root / (identity + suffix)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return store(
        request,
        identity,
        "file",
        {
            "url": f"/api/library/files/{identity}/audio",
            "provider": "Local music",
            "title": Path(name).stem[:200],
            "filename": Path(name).name,
            "extension": suffix,
            "size": size,
        },
    )


@router.get("/library/files/{identity}/audio")
def stream_file(identity: str, request: Request):
    if not re.fullmatch(r"file_[a-f0-9]{64}", identity):
        raise HTTPException(404, "Audio file not found.")
    with request.app.state.sessions() as session:
        row = session.get(LibraryEntryRow, identity)
        if not row or row.kind != "file":
            raise HTTPException(404, "Audio file not found.")
        suffix = row.payload.get("extension")
    if suffix not in AUDIO_TYPES:
        raise HTTPException(404, "Audio file not found.")
    path = Path(os.getenv("ASSET_ROOT", ".data/assets")).resolve() / "music" / (identity + suffix)
    if not path.is_file():
        raise HTTPException(404, "Imported audio is missing.")
    return FileResponse(path, media_type=AUDIO_TYPES[suffix])


@router.get("/settings/player")
def preferences(request: Request):
    with request.app.state.sessions() as session:
        row = session.get(LibraryEntryRow, "player_preferences")
        return PlayerPreferences.model_validate(
            {key: value for key, value in row.payload.items() if key in PlayerPreferences.model_fields}
            if row
            else {}
        ).model_dump()


@router.post("/settings/player")
def save_preferences(data: PlayerPreferences, request: Request):
    store(request, "player_preferences", "settings", data.model_dump())
    return data.model_dump()


@router.get("/settings/presets")
def presets(request: Request):
    with request.app.state.sessions() as session:
        rows = session.scalars(
            select(LibraryEntryRow)
            .where(LibraryEntryRow.kind == "preset")
            .order_by(LibraryEntryRow.updated_at.desc())
        ).all()
        return [{"id": row.id, **row.payload} for row in rows]


@router.post("/settings/presets")
def save_preset(data: PresetInput, request: Request):
    name = data.name.strip()
    if not name:
        raise HTTPException(422, "Give the scene a name.")
    identity = "preset_" + hashlib.sha256(name.casefold().encode()).hexdigest()[:32]
    return store(request, identity, "preset", {"name": name, "preferences": data.preferences.model_dump()})
