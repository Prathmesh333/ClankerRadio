from clanker_api import lyrics


def record(title="Neon Signal", artist="Orbit", synced="[00:00.00]Test line", duration=200):
    return {
        "id": 10,
        "trackName": title,
        "artistName": artist,
        "syncedLyrics": synced,
        "plainLyrics": "Test line",
        "duration": duration,
    }


def test_title_cleaning_and_best_duration_match(monkeypatch):
    lyrics.lookup.cache_clear()
    monkeypatch.setattr(lyrics, "fetch_json", lambda *args: [record(duration=400), record(duration=200)])
    result = lyrics.lookup("", "Orbit - Neon Signal (Official Video)", "", 200, 1)
    assert result["status"] == "synced"
    assert result["artist"] == "Orbit"
    assert result["lyrics"].startswith("[00:")


def test_wrong_title_is_not_substituted(monkeypatch):
    lyrics.lookup.cache_clear()
    monkeypatch.setattr(lyrics, "fetch_json", lambda *args: [record("A Completely Different Song")])
    assert lyrics.lookup("", "Neon Signal", "Orbit", 200, 1)["status"] == "missing"


def test_playlist_waits_for_current_track_and_arbitrary_hosts_are_not_fetched(monkeypatch):
    calls = []
    monkeypatch.setattr(lyrics, "fetch_json", lambda *args: calls.append(args))
    assert lyrics.metadata("https://www.youtube.com/playlist?list=PL1234567890") == ("", "")
    assert lyrics.metadata("https://open.spotify.com/playlist/1234567890123456789012") == ("", "")
    assert lyrics.metadata("http://127.0.0.1/private") == ("", "")
    assert not calls


def test_oembed_and_apple_metadata(monkeypatch):
    def fetch(base, params):
        if "itunes" in base:
            return {"results": [{"trackName": "Neon Signal", "artistName": "Orbit"}]}
        return {"title": "Neon Signal", "author_name": "Orbit - Topic"}

    monkeypatch.setattr(lyrics, "fetch_json", fetch)
    assert lyrics.metadata("https://youtu.be/abcdefghijk") == ("Neon Signal", "Orbit")
    assert lyrics.metadata("https://music.apple.com/us/album/record/1?i=123") == ("Neon Signal", "Orbit")


def test_plain_and_unavailable_results_are_explicit(monkeypatch):
    lyrics.lookup.cache_clear()
    monkeypatch.setattr(lyrics, "fetch_json", lambda *args: [record(synced="")])
    assert lyrics.lookup("", "Neon Signal", "Orbit", 200, 1)["status"] == "plain"
    lyrics.lookup.cache_clear()

    def fail(*args):
        raise TimeoutError()

    monkeypatch.setattr(lyrics, "fetch_json", fail)
    assert lyrics.lookup("", "Neon Signal", "Orbit", 200, 1)["status"] == "unavailable"
