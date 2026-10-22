# Automation, Radio Scheduling, YouTube, and Rights

## 1. Daily pipeline

1. Read the operator's target duration, mood program, instrument limits, and publication window.
2. Read the published catalog and mark prohibited repeats.
3. Calculate how many new approved minutes are available.
4. Produce new compositions to fill the shortfall. Plan more candidates than required because quality checks will reject some.
5. Render MIDI, stems, audio, and audio-reactive feature timelines.
6. Run musical, technical, similarity, and rights checks.
7. Create the program from approved compositions only.
8. Plan scene choreography from mood, section map, audio analysis, diversity rules, and GPU budget.
9. Render restartable video segments and assemble the program.
10. Check the final program with automated QA and a human reviewer.
11. Generate the thumbnail, track list, chapters, descriptions, asset credits, and AI-use disclosure.
12. Stage a private/unlisted upload and verify the result. Publish only when the release gate approves it.
13. Archive all source manifests, stems, audio, visuals, and decisions.

Use the target duration as an upper operating goal, not a command to publish filler. If 240 minutes do not pass, publish a shorter approved program or defer publication. This is a product policy.

## 2. Program construction

Start with 3–9-minute tracks. A 4.5-hour program may contain approximately 40–65 tracks depending on length and transitions. Track and program targets must remain configurable. Limit adjacent tracks with nearly identical motifs, instruments, tonal centers, dynamic arcs, or scene families. Sequence by mood adjacency and key/tonal relationships. Confirm musical transition points by score cadence and low-energy audio regions.

A program has a **visual chapter identity**. Each track gets 2–5 related preset instances, with parameter variations and gentle transitions. The same 50 presets can form many unique compositions, but variation alone does not make otherwise duplicate music original.

## 3. Audio continuity

Normalize tracks consistently without flattening dynamic arcs. Check transitions at the actual export level. Use crossfades only when the harmonic and acoustic tails permit them. Avoid abrupt cuts between incompatible drones or keys. Insert a short quiet bridge or resolve the first piece when required.

## 4. YouTube integration

Use OAuth authorization for the channel. Keep secrets in a server-side credential store. Use the YouTube Data API resumable upload workflow for large files. Set title, description, chapter timestamps, language, schedule or privacy, thumbnail, and relevant AI-use fields through supported platform mechanisms. Current API documentation includes `status.containsSyntheticMedia`; verify its current behavior before implementation. YouTube Studio also provides an AI-use declaration.

Implement an idempotent upload operation keyed by program revision and platform channel. If a network timeout occurs, query the prior upload status before creating another video. Save the remote video ID and upload session. A completed upload is not proof of successful publication.

## 5. AI disclosure and monetization

YouTube's documentation requires disclosure for AI-generated music that is the main focus of a video. The uploader must set the applicable AI-use declaration and keep a production record. YouTube's channel monetization policy excludes mass-produced, repetitive, or interchangeable content. Generative visuals plus a random seed do not satisfy originality on their own. The editorial process must demonstrate distinct compositions and a coherent creative identity.

YouTube rules change. Review the official policy links before turning on public auto-publishing. A channel's monetization eligibility also depends on other platform requirements. Never present generated tracks as human performances if they are not.

## 6. Copyright and provenance

Record for every musical element: creator, source, license, acquisition date, usage terms, reference URL, proof file, permitted platforms, commercial use, modifications, and attribution conditions. Record model name/version and whether the output was generated from licensed samples, source recordings, MIDI, text prompts, or other inputs.

Do not copy copyrighted melodies, use unauthorized source songs for cover/repaint, scrape music samples, or imply ownership of a third-party performance. Respond promptly to claims and preserve affected assets for review.

## 7. Thumbnail and packaging policy

Generate a thumbnail from an actual scene instance or a separately licensed original visual. Use a restrained channel brand, program name, and mood label. Avoid clickbait or misleading artist credits. Keep track chapters precise. Use consistent description structure:

```
Title: Quiet Forest | Original Bansuri & Harmonium Ambient Journey | Clanker Radio
Description: Original instrument-led ambient program with procedural visuals.
                 Includes a chapter list and clear AI-use disclosure.
Chapters: 00:00 Track A ...
Credits: Composition system / instrument libraries / visual tooling / licenses.
```

Do not claim every track is fully human-composed if models substantially generated it. The example is a template, not a ready-to-publish disclosure.

## 8. Reliability and monitoring

Measure: approved minutes per day, candidate rejection rate, human rating, duplicate warnings, audio failures, render frames/second, average render time by preset, scene failure rate, storage use, total GPU-hours, upload success, claim incidence, and listener retention. Track errors by correlation ID.

Alert for: missing daily assets, high rejection rate, repeated tracks, clip detection, render worker crash, low disk space, rights-expired sample library, failed OAuth authorization, incomplete upload, and missing review.

## 9. Cost and capacity model

For each candidate, log generator time, sampler time, GPU model time, video render time, encoder time, storage bytes, network bytes, and retries. Forecast daily resource needs from measured benchmark data. Do not assume model generation speed equals 5 hours of production-ready music. Render and review can dominate costs.

At 6 Mbps, 4 hours of video is approximately 10.8 GB before container overhead; 5 hours is approximately 13.5 GB. At 10 Mbps, the same durations are approximately 18 GB and 22.5 GB. These are simple bitrate estimates, not encoded-size guarantees. Retain source assets separately.

## 10. Launch sequence

Week 1 onward: upload manual-approved pilots. Then add auto-staging with human review. Finally, consider auto-publication only after an extended clean run and an explicit operator toggle. Keep an emergency pause button that stops pending publication without deleting completed creative work.
