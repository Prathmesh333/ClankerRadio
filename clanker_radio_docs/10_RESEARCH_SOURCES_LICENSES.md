# Research References and Licensing Register

**Research review date:** 21 October 2026. These pages support technology selection. Check current licenses, provider terms and platform policies again before deployment.

## Authoring skill

- User-owned skill: https://github.com/Prathmesh333/controlled-technical-english-writing-skill/blob/main/SKILL.md — 77 house rules; controlled technical English, consistent terminology, direct commands, and technical-equivalence checks. The repo states this is not certified ASD-STE100 compliance.

## Music theory and symbolic tools

- Open Music Theory — melodic keyboard-style voice leading: https://openmusictheory.github.io/melodicKeyboardStyle.html
- Open Music Theory — harmonic functions: https://openmusictheory.github.io/harmonicFunctions.html
- Open Music Theory — cadence types: https://openmusictheory.github.io/cadenceTypes
- `music21` harmony reference: https://music21.org/music21docs/moduleReference/moduleHarmony.html
- `music21` voice-leading reference: https://music21.org/music21docs/moduleReference/moduleVoiceLeading.html
- `pretty_midi` project and examples: https://github.com/craffel/pretty-midi
- FluidSynth starter guide: https://www.fluidsynth.org/wiki/GettingStarted/
- FluidSynth sound generation and licensing FAQ: https://github.com/FluidSynth/fluidsynth/blob/master/doc/wiki/LicensingFAQ.md

**Application:** These sources justify explicit phrases, harmonic roles, cadence plans, symbolic MIDI, and a sampler-based prototype. They do not grant rights to arbitrary third-party music recordings, SoundFonts or samples.

## Music model candidates

- ACE-Step 1.5 official project: https://github.com/ace-step/ACE-Step-1.5
- ACE-Step 1.5 official model card: https://huggingface.co/ACE-Step/Ace-Step1.5
- ACE-Step official API guide: https://ace-step.github.io/ACE-Step-1.5/en/API
- Meta AudioCraft/MusicGen: https://github.com/facebookresearch/audiocraft
- Meta MusicGen model card: https://github.com/facebookresearch/audiocraft/blob/main/model_cards/MUSICGEN_MODEL_CARD.md
- Stable Audio Open 1.0 model card: https://huggingface.co/stabilityai/stable-audio-open-1.0

**Rights summary:** ACE-Step lists MIT and states commercial use of its generated audio is permitted, but you must verify the exact checkpoint, attached licenses, assets, and your rights review. Meta AudioCraft code uses MIT but model weights use CC-BY-NC 4.0. Stable Audio Open uses the Stability AI Community License and points commercial users to its license terms. Keep a signed internal rights register. Generated output can still cause a similarity or rights dispute.

## Three.js, visual rendering, and audio/video postproduction

- Three.js WebGPURenderer: https://threejs.org/manual/pages/webgpurenderer
- Three.js WebGPU post-processing: https://threejs.org/manual/pages/webgpu-postprocessing.html
- Remotion ThreeCanvas: https://www.remotion.dev/docs/three-canvas
- Remotion browser-side rendering: https://www.remotion.dev/docs/client-side-rendering
- Remotion OpenGL renderer options: https://www.remotion.dev/docs/options/gl
- FFmpeg audio loudnorm and filters: https://www.ffmpeg.org/ffmpeg-filters.html
- Tone.js transport: https://github.com/Tonejs/Tone.js/wiki/Transport

**Application:** Three.js WebGL remains the stable first backend. Its WebGPU path uses different materials and effects and is still documented as experimental. Remotion's frame-stepped ThreeCanvas may support deterministic video export; benchmark it before selecting the final renderer. FFmpeg offers media assembly and loudness tools.

## YouTube and publication

- YouTube channel monetization policies: https://support.google.com/youtube/answer/1311392
- Disclosing use of GenAI content: https://support.google.com/youtube/answer/14328491
- Understanding AI disclosures: https://support.google.com/youtube/answer/15447836
- YouTube videos.insert: https://developers.google.com/youtube/data/reference/rest/v3/videos/insert
- YouTube resumable uploads: https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol

**Application:** YouTube has a policy against inauthentic, mass-produced or repetitive channels. AI-generated music that is the focus of the upload falls within its disclosure guidance. Use current YouTube Studio and API instructions. Verify quotas, authorization and publishing restrictions in the target account rather than assuming they apply to all projects.

## Asset license ledger template

| Field | Required evidence |
|---|---|
| `asset_id` | Immutable local asset identifier |
| `asset_type` | soundfont, sample, recorded stem, MIDI, model, texture, font |
| `source_url` | Supplier / original reference |
| `license_name` | Exact declared license; record custom contract if relevant |
| `license_version_or_date` | Date reviewed |
| `proof_uri` | Copy or screenshot of license text/receipt |
| `commercial_use` | permitted / prohibited / needs_review |
| `redistribution` | permitted / prohibited / conditional |
| `attribution` | exact conditions |
| `platform_scope` | YouTube and other permitted destinations |
| `reviewer` | Internal reviewer and review time |
| `expiry` | Renewal date or none |

**Important:** A catalog page saying "free" does not establish all usage rights. Do not rely on model marketing claims alone.
