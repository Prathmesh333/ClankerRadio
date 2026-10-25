"""Windows media session selection without depending on real browser state."""

import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from clanker_api.loopback import session_now_playing


def session(title="Test song", app="Chrome", artist="Orbit", duration=200, position=10, playing=True):
    class Session:
        source_app_user_model_id = app

        async def try_get_media_properties_async(self):
            return SimpleNamespace(title=title, artist=artist)

        def get_timeline_properties(self):
            return SimpleNamespace(
                start_time=timedelta(),
                end_time=timedelta(seconds=duration),
                position=timedelta(seconds=position),
                last_updated_time=datetime.now(UTC),
            )

        def get_playback_info(self):
            return SimpleNamespace(playback_status=4 if playing else 5)

    return Session()


def read(sessions, player="browser", title=""):
    manager = SimpleNamespace(get_current_session=lambda: sessions[0], get_sessions=lambda: sessions)
    return asyncio.run(session_now_playing(manager, title, player))


def test_browser_finds_song_behind_current_dashboard_and_ignores_own_player():
    result = read(
        [
            session("Stream - Kick Dashboard", duration=0),
            session("Clanker song", app="Clanker Radio"),
            session("Shape of You"),
        ]
    )
    assert result["title"] == "Shape of You" and result["sourceApp"] == "Chrome"
    assert 10 <= result["position"] < 11


def test_browser_does_not_use_live_preview_or_a_different_application():
    result = read([session("Dashboard", duration=-0.000001), session(app="Spotify")])
    assert result["status"] == "waiting" and "dashboard" in result["message"]


def test_browser_pause_and_seek_positions_do_not_advance():
    result = read([session(position=75, playing=False)])
    assert result["playing"] is False and result["position"] == 75


def test_playing_browser_song_wins_over_paused_session():
    assert read([session("Paused", playing=False), session("Playing")])["title"] == "Playing"


def test_closed_session_does_not_hide_music_and_title_filter_is_retained():
    class Closed:
        source_app_user_model_id = "Chrome"

        async def try_get_media_properties_async(self):
            raise RuntimeError("Tab closed")

    assert read([Closed(), session("Wanted"), session("Other")], title="Wanted")["title"] == "Wanted"
