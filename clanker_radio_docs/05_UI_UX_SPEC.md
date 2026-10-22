# Studio Interface, Interaction, and Motion Design

## 1. Visual identity

Build a premium generative-art workstation. Use a charcoal or nearly-black background, restrained glass-like panels, generous spacing, subtle lines, monochrome data, and one accent color per music mood. The 3D canvas is the visual focus. The interface is calm and functional. Avoid a dense DJ dashboard or flashy neon everywhere.

Typography: modern grotesk UI font for controls; optional restrained serif for program names. Use a reliable open-source font license. Base text must remain readable. Motion in the editor must not distract from listening.

## 2. Primary navigation

```
┌ CLANKER RADIO ─────────────────────────────────────── User ▾ ┐
│ Studio  Library  Scenes  Radio Queue  Publish  Analytics     │
├─────────────────────────────────────────────────────────────┤
│ LEFT: MUSICAL BRIEF        │ CENTER: LIVE CANVAS │ RIGHT: MIX │
│ mood, grammar, key, tempo  │ full 3D preview      │ stems      │
│ instruments, form         │ scene camera         │ effects    │
│ [Generate Blueprint]      │ quality selector     │ levels     │
│ [Compose] [Regenerate]    │                     │ analyzer   │
├─────────────────────────────────────────────────────────────┤
│ TRANSPORT / TIMELINE: waveform, note phrases, section markers│
│ scene blocks, transitions, beat map, scrub, solo, mute       │
└─────────────────────────────────────────────────────────────┘
```

## 3. Screens

### Dashboard

Show today's queued minutes, approved minutes, production health, pending reviews, GPU/render capacity, last upload result, catalog diversity, and blocker count. Use status text as well as color.

### Studio

Left composer inspector: mood, music grammar, tempo range, instrument roles, density, form, seed, and advanced constraints. Center 3D preview: play/pause, camera, resolution, graphics quality, before/after comparison. Right inspector: stem levels, sound selection, reverb, delay, space, current scene controls. Bottom: multitrack score and synchronized visual timeline.

### Score View

Display piano roll or simple notation, phrase markers, harmony/raga guardrails, instrument ranges, motif labels, and validation issues. Support `Regenerate phrase`, `Keep phrase`, `Simplify`, `Add rest`, `Move motif`, and `Undo`.

### Scene Library

Grid of 50 scene previews. Each card shows scene name, visual family, mood tags, performance tier, parameters, and sample playback. Filters select GPU cost, motion intensity, palette, atmosphere, and camera behavior.

### Visual Editor

Split 3D preview and control panel. Expose geometry count, color palette, lighting, noise seed, particle density, bloom, fog, motion speed, camera path, feature mappings, duration, and transition. Show timeline curves for major parameters. Implement reset, duplicate, save preset, and A/B compare.

### Radio Queue

Show program target length, selected track sequence, total duration, key/mood flow, segment plan, transitions, predicted render cost, pending approvals, and warnings. Drag tracks to reorder. The operator can pin a track or exclude one from the program.

### Publish

Show final render checklist, title, description, track chapters, thumbnail preview, copyright and asset manifest, AI disclosure fields, video privacy, scheduled release time, upload progress, and retry controls.

### Catalog & Analytics

Provide search by motif, mood, date, soundset, model version, track embedding, visual preset, license status, and published video. Show uniqueness warnings. Track qualitative listener feedback, not only view counts.

## 4. Interactions

- A Generate action creates a blueprint and reports validation results. It must not publish anything.
- A Compose action produces MIDI and stem candidates. It must keep prior approved revisions.
- A Regenerate Phrase action changes only the targeted phrase and the downstream affected transitions.
- A visual randomize action samples only from constraints that fit the mood, tempo, and motion limit.
- A Save Scene action captures all parameters and the seed. No hidden implicit defaults.
- An Export action creates an immutable rendering task with revision IDs.
- A Publish action is disabled while any blocking check is open.

## 5. 3D camera and transitions

Use world-space camera paths with bounded velocity and acceleration. Prefer slow dolly, orbital drift, shallow depth changes, and parallax. Avoid constant aggressive zooming. Map section boundaries to controlled shifts in framing. Do not allow free random camera jumps.

Transition types: chromatic dissolve, fog fade, shared-shape morph, particle drift, luminance blend, and texture crossfade. Respect musical cadence timing. Transition duration is a named parameter, with example defaults 2–8 seconds. Do not apply all transitions randomly.

## 6. Motion design and accessibility

Use physical-feeling easings. Animate state changes over 160–360 ms when appropriate. Disable nonessential motion under `prefers-reduced-motion`. All playback actions need keyboard equivalents. The visual presets must not include full-screen strobe effects. Measure luminance deltas in QA. Keep the UI usable when GPU preview is disabled.

## 7. Recommended web implementation

Frontend: Next.js + TypeScript + React, Tailwind or CSS variables, React Three Fiber / Drei for the preview, Zustand for editor state, TanStack Query for jobs and library data, and a waveform/timeline component. Keep the renderer module independently usable by the offline render worker. Do not let browser UI timing control export frames.
