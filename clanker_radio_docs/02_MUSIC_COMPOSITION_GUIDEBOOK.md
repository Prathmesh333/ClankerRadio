# Music Composition Guidebook

> The guidebook specifies controlled rules for generating pleasing instrumental music. It does not claim to replace a musician. A qualified listener must evaluate the actual sound.

## 1. Build music from structure, not random notes

Every composition must have a **Musical Blueprint**. The blueprint records `grammar`, `tonal_center`, `scale_or_raga`, `tempo_map`, `meter`, `form`, `motifs`, `harmonic_plan` (if applicable), `instrument_roles`, `dynamic_arc`, and `phrase_cadences`. The system then writes note-level events. A sampler renders the note events to audio stems. A listener or validated quality gate accepts the result.

### Composition process

1. Choose a mood and musical grammar. Record the mood's tempo, register, texture, and dynamic limits.
2. Choose a tonal center and allowed pitch collection. Keep Western harmony and raga grammar separate.
3. Plan a macro form. The sections must have musical functions rather than arbitrary equal lengths.
4. Create a seed motif of 3–8 notes. Define a recognizable rhythmic figure and contour.
5. Develop the motif with repetition, sequence, inversion where stylistically suitable, augmentation, rhythmic displacement, call-and-response, and register changes.
6. Write phrase endpoints. Control tension and rest. The melody must breathe.
7. Place bass and accompaniment only after the melody and section plan make sense.
8. Arrange the instruments with frequency space, natural technique, and deliberate entrances.
9. Generate a performance layer. Apply bounded timing, velocity, articulation, dynamics, and breath variation at the phrase level.
10. Render and evaluate. Change the score if the music does not sound intentional.

## 2. Musical principles

**Motif:** A short musical identity. Use a motif across the piece, but transform it at meaningful moments.

**Phrase:** A unit with a beginning, continuation, and arrival. A phrase often spans 4 or 8 bars in common tonal music, but this is a style guideline, not a universal rule.

**Contour:** A melody needs direction. Prefer coherent rises, falls, and arcs over uniform random pitch walks.

**Tension and release:** Build through register, note density, harmony, dissonance, dynamics, or timbre. Resolve by returning to a stable note, lighter texture, or planned cadence.

**Voice leading:** Move accompaniment voices by small intervals when suitable. Retain shared tones. Prevent awkward voice crossing and wide jumps in a sustained inner voice.

**Silence:** Include rests, breath gaps, sparse sections, and pauses before important returns. Do not fill all available time with notes.

**Density:** Keep one dominant melodic voice. If a second melodic instrument enters, assign call-and-response or a planned counterline.

## 3. Western tonal composition profile

Start with a small, safe collection: C major, G major, D major, A minor, D minor, and modal variations. Extend the vocabulary after listening tests.

Recommended harmony by mood:

| Mood | Example progression | Character | Notes |
|---|---|---|---|
| Dawn | I–vi–IV–I | Warm and grounded | Slow harmonic rhythm |
| Deep focus | I–iii–vi–IV | Floating | Use shared tones and inversions |
| Rain | i–VI–III–VII | Gentle melancholy | Avoid dramatic low-end pulses |
| Forest | I–IV–ii–V–I | Organic movement | Resolve phrases without forced climaxes |
| Night | i–iv–VI–V or modal pedal | Spacious | Prefer soft voicings |
| Quiet study | I–V/vi–vi–IV | Subtle forward motion | Use sparingly; avoid pop-song repetition |

Use these as examples, not obligatory templates. A four-chord loop repeated without melodic development fails the arrangement review. Chord voicings should remain within the intended instrument's effective range. Use open fifths, add2, add9, sus2, and maj7 colors selectively; avoid thick dense harmonium clusters.

### Phrase rules

- Start the first phrase on a stable pitch when appropriate to the chosen grammar.
- Limit large jumps for a soft lead melody. If a large jump occurs, consider contrary stepwise recovery.
- Put at least one audible rest or breath point in each standard phrase unless the instrument's technique justifies continuous tone.
- Change a motif before the listener becomes fatigued: dynamics, rhythm, register, answer phrase, accompaniment, or timbre.
- Mark harmonic arrivals in the score. Do not choose chords after rendering the melody without checking for clashes.
- Use a stable end note or cadence at major section endings. Avoid a sudden arbitrary stop.

## 4. Hindustani-inspired and raga-aware profile

A raga is not merely a scale. A credible raga-oriented composition uses permitted ascending and descending movements, characteristic phrases, tonal center, emphasized notes, ornaments, phrase endings, and a stylistic sense of development. The system must store raga-specific rules before it claims a track follows that raga.

Begin with an explicitly labeled **raga-inspired** ambient profile unless a musician verifies the generated phrases. Store these fields: `sa_reference_hz`, `aroha`, `avaroha`, `vadi`, `samvadi`, `pakad`, `forbidden_movements`, `ornaments`, `nyas`, `time_of_day_optional`, and `authorized_reference_notes`. Do not invent these values from a generic scale list.

For authentic raga-aware generation, commission or license expert-authored phrase grammars and reference performances. Do not create fake "traditional raga" labels. Keep a drone and melodic phrasing central. Add functional Western chord progressions only in a declared fusion mode, and review their pitch compatibility.

### Practice-safe entry profile

Use `indian_ambient_fusion_v0` as a non-traditional starter profile: tonic drone, soft flute melody, harmonium response, very light percussion, slow phrase endings, and no raga-specific label. This supports musical experiments without making an authenticity claim.

## 5. Instrument technique guide

| Instrument | Role | Generation requirements | Common failures |
|---|---|---|---|
| Bansuri / breathy flute | Lead or response | Monophonic melody, breath gaps, shaped vibrato, slide/grace control, legato by phrase | Endless notes, impossible overlap, uniform vibrato |
| Harmonium | Pedal, sustained chord, response | Controlled chord size, bellows-like dynamic phrase, softer attack, breath between chord changes | Bright organ-like attacks, dense low chords |
| Warm piano | Chordal support, sparse motif | Voicings, sustain pedal decisions, variable velocity, natural release | Machine-perfect attacks, crowded midrange |
| Tanpura / drone | Tonal foundation | Stable tonic/fifth or authorized pitches; subtle timbral motion | Moving bass notes that destabilize tonic |
| Soft strings | Long harmonic layer | Slow bow attack, expression curves, voice-leading | Abrupt sample edges, synthetic string stacks |
| Sarangi-style or cello-style sustained voice | Counterline | Avoid covering flute; use a licensed and culturally appropriate instrument patch | Constant parallel movement |
| Nylon guitar / plucked strings | Texture | Sparse broken-chord patterns; natural note decay | Rigid quantized arpeggios |
| Soft tabla / frame drum | Minimal pulse | Low density, authorized groove, human timing | Drum-loop dominance or unrelated accents |
| Bell / mallet | Transient accents | Rare, harmonic notes, long tails | Sparkling everywhere, distracting highs |
| Air pads / field ambience | Space | Low volume, controlled spectral band, clean license | Flat noisy blanket masking instruments |

Instrument presets must record practical note ranges from the actual sample library. A MIDI patch name does not guarantee acoustic realism. For microtonal bends, use per-note controls or MPE-capable render paths where available. Standard pitch bends affect their MIDI channel.

## 6. Default composition families

| Profile | BPM range (project default) | Meter | Lead | Support | Structure |
|---|---:|---|---|---|---|
| `bansuri_dawn` | 54–72 | 4/4, free phrases | bansuri | drone, harmonium, pads | intro–A–A'–B–A''–outro |
| `harmonium_rain` | 56–76 | 4/4 | harmonium/flute | piano, sparse rain texture | intro–A–bridge–A'–coda |
| `midnight_piano` | 48–70 | 3/4, 4/4 | felt piano | strings, distant pads | intro–A–B–A'–outro |
| `forest_strings` | 60–82 | 6/8 | flute/cello | plucked strings, strings | intro–A–response–B–A' |
| `slow_tanpura` | 40–65 | free / slow cycle | flute | tanpura, restrained harmonium | exposition–development–return |
| `lofi_acoustic_calm` | 62–86 | 4/4 | piano/guitar | texture, brush percussion | intro–A–A'–B–outro |

These tempo ranges and forms are **project defaults**, not published standards or music-theory laws. Measure acceptance by listening tests.

## 7. Human performance modeling

Apply variation to the **phrase**, not by independent random noise on every note. Generate a musical intention curve first. Then map intention to articulation, timing, velocity, and timbre.

Initial experiment bounds: phrase tempo rubato within ±3% when permitted; lead onset deviation typically within ±8–20 ms for soft phrases; MIDI velocity curves within an instrument-calibrated range; breath or release delays matched to phrase endings. These are **starting test values**, not universal targets. Disable microtiming offsets on synchronized accent points or where they create unintended clashes.

Use different performance models per instrument. Flute has breath and slur behavior. Harmonium has sustained pressure-like dynamics. Piano has finger emphasis and decay. Avoid identical MIDI velocity profiles across all instruments.

## 8. Generate an intentional arrangement

### Example 5-minute sketch

- 00:00–00:24 — tanpura tonic and soft environment. State the tonal center.
- 00:24–01:10 — bansuri introduces motif A with a clear breath after each phrase.
- 01:10–01:55 — harmonium supports two chord tones or a restrained drone. Bansuri varies motif A.
- 01:55–02:35 — response phrase B. Slight dynamic lift; optional very soft rhythm.
- 02:35–03:25 — development: higher melodic arc and a short register peak.
- 03:25–04:15 — return to A' with fewer notes, no abrupt loudness increase.
- 04:15–05:00 — dissolve back to tonic. Let instrument tails finish naturally.

Time marks are a single example. Use section boundaries derived from tempo and bar counts in implementation.

## 9. Music validation rules

**Hard checks:** events stay within supported instrument pitch limits; start precedes end; velocities are valid; score duration matches render tolerance; no accidental 0-length notes; sustained voices obey polyphony constraints; no unexpected clipping; no missing audio stem.

**Musical checks:** coherent tonal or raga pitch use; phrase endings sound intentional; melodic contour and density fit mood; harmony does not clash with principal notes; the lead instrument has room to breathe; there is planned repetition and development.

**Similarity checks:** normalized interval n-grams, onset-duration patterns, section forms, chroma sequence distance, audio-fingerprint overlap, embedding nearest neighbors, and human review for uncertain cases. A low spectral match does not prove originality.

## 10. Learning references

Study the *Open Music Theory* chapters on melodic keyboard style, harmonic functions, cadence types, and voice leading. Use `music21` to inspect symbolic harmony and `pretty_midi` to write MIDI. Listen critically to professionally produced flute, harmonium, and acoustic ambient recordings without copying their melodies or recorded samples. Document the actual licenses for every asset.

See `10_RESEARCH_SOURCES_LICENSES.md` for direct links.
