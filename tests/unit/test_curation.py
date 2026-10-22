from copy import deepcopy

from clanker_api.curation import curate, music_fingerprint
from clanker_music.performance import PerformanceRequest, build_performance


def fixture():
    return build_performance(PerformanceRequest())


def winner(score, points=80):
    copy = deepcopy(score)
    copy["id"] = "winner_" + str(points)
    copy["provenance"].update(
        source="codex_tournament", judge={"winner": "A", "approved": True, "scoreA": points, "scoreB": 60}
    )
    return copy


def test_seed_title_tonic_and_microtiming_do_not_disguise_duplicate_music():
    a = fixture()
    b = deepcopy(a)
    b["seed"] = 123
    b["title"] = "Another title"
    b["plan"]["tonic"] = 55
    b["events"][0]["startBeat"] += 0.001
    assert music_fingerprint(a) == music_fingerprint(b)


def test_kept_list_excludes_unreviewed_fillers_and_selects_better_winner():
    score = fixture()
    a = winner(score, 76)
    b = winner(score, 88)
    assert curate([score], {}) == []
    assert curate([a, b, score], {}) == [b]
    assert curate([a, b, score], {score["id"]: {"favorite": True}}) == [score]


def test_hidden_music_cannot_return_as_a_different_seed_duplicate():
    a = winner(fixture(), 80)
    b = winner(fixture(), 85)
    assert curate([a, b], {a["id"]: {"hidden": True}}) == []
    assert curate([a, b], {a["id"]: {"hidden": False}}) == [b]
