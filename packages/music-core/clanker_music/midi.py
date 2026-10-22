import io

import mido

from clanker_music.models import MusicalBlueprint, Score


def export_midi(score: Score, blueprint: MusicalBlueprint) -> bytes:
    midi = mido.MidiFile(ticks_per_beat=480)
    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(blueprint.tempoBpm)))
    meta.append(mido.MetaMessage("time_signature", numerator=4, denominator=4))
    midi.tracks.append(meta)
    for channel, (instrument, program) in enumerate(
        [("prototype_flute", 73), ("prototype_keys", 0), ("prototype_drone", 89)]
    ):
        track = mido.MidiTrack()
        midi.tracks.append(track)
        track.append(mido.MetaMessage("track_name", name=instrument))
        track.append(mido.Message("program_change", channel=channel, program=program))
        messages = []
        for event in score.events:
            if event.instrumentId != instrument:
                continue
            start = round(event.startBeat * 480)
            stop = round((event.startBeat + event.durationBeats) * 480)
            messages.extend(
                [
                    (
                        start,
                        1,
                        mido.Message("note_on", channel=channel, note=event.pitch, velocity=event.velocity),
                    ),
                    (stop, 0, mido.Message("note_off", channel=channel, note=event.pitch, velocity=0)),
                ]
            )
        previous = 0
        for tick, _, message in sorted(messages, key=lambda entry: (entry[0], entry[1])):
            track.append(message.copy(time=tick - previous))
            previous = tick
        track.append(
            mido.MetaMessage("end_of_track", time=max(0, round(score.durationBeats * 480) - previous))
        )
    stream = io.BytesIO()
    midi.save(file=stream)
    return stream.getvalue()
