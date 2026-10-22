"""Curate by musical content. Preserve original scores and provenance for recovery."""

import hashlib
import json


def music_fingerprint(performance):
    plan = performance["plan"]
    material = {key: plan[key] for key in ["mode", "motifs", "progression"]}
    return hashlib.sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()


def quality_rank(performance, preference=None):
    preference = preference or {}
    judge = performance["provenance"].get("judge") or {}
    judge_score = judge.get(f"score{judge.get('winner', '')}", 0)
    return (preference.get("favorite", False), judge_score, performance.get("composerVersion", ""))


def curate(performances, preferences):
    kept = {}
    hidden = {
        music_fingerprint(item) for item in performances if preferences.get(item["id"], {}).get("hidden")
    }
    for performance in performances:
        preference = preferences.get(performance["id"], {})
        fingerprint = music_fingerprint(performance)
        judge = performance["provenance"].get("judge") or {}
        approved = judge.get("approved", False) and judge.get(f"score{judge.get('winner', '')}", 0) >= 75
        if fingerprint in hidden or not (approved or preference.get("favorite")):
            continue
        previous = kept.get(fingerprint)
        if previous is None or quality_rank(performance, preference) > quality_rank(
            previous, preferences.get(previous["id"])
        ):
            kept[fingerprint] = performance
    return sorted(
        kept.values(), key=lambda item: quality_rank(item, preferences.get(item["id"])), reverse=True
    )
