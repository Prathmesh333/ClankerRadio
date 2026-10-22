# Visual System and 50 Animation Presets

## 1. The visual engine

The visual engine renders original 3D artwork from a preset library. A preset is a deterministic scene module, not a prerecorded video clip. Each scene reads a time, feature timeline, seed, palette, camera path, quality tier, and bounded parameter set. The operator can save a visually coherent scene sequence per track.

### Required scene contract

```ts
type MusicFeatures = { rms: number; low: number; mid: number; high: number; onset: number; beatPhase: number; melodyRegister: number; sectionId: string };
type SceneInput = { timeSeconds: number; seed: number; features: MusicFeatures; params: SceneParams };
interface VisualPreset {
  id: string; name: string; tags: string[]; tier: 'low' | 'medium' | 'high';
  create(ctx: RenderContext): SceneResources;
  evaluate(resources: SceneResources, input: SceneInput): void;
  dispose(resources: SceneResources): void;
}
```

The renderer must create expensive meshes once, use instancing for repeated objects, compute animation from the absolute timeline, and release resources after a segment. Fix random noise seed at the start of the scene. Record renderer version and GPU backend. Reuse this contract in preview and export.

## 2. Art direction rules

- Favor slow movement, texture, believable light, depth, carefully limited bloom, filmic color, fog, and parallax.
- Prefer organic-looking motion from curves and smooth noise over repeated sine oscillation in every object.
- Match palette to the track mood. Keep saturation controlled. Avoid excessive neon or full-screen particle storms.
- Map audio to motion with smoothing. Limit onset response to local glints or small particles, never a full-screen flash.
- Limit cuts to meaningful section boundaries. Use visual phrases that match musical phrases.
- Add a reduced-motion preview mode. Record safety limits and brightness change checks.
- Performance tiers refer to expected relative cost, not measured FPS. Benchmark every preset on reference hardware.

## 3. Preset parameters

Shared: `seed`, `paletteId`, `opacity`, `speed`, `motionIntensity`, `cameraPath`, `cameraDepth`, `fogDensity`, `glowStrength`, `reactivity`, `beatLock`, `detailLevel`, `particleCount`, `qualityTier`, `startTimeS`, `durationS`. Every parameter must declare range, default, type, and permitted audio mapping.

Visual selection must use a constraint solver rather than uniform randomness. Candidate scenes require mood compatibility, a GPU tier fit, visual-family separation, and camera-path continuity. Draw from weighted candidates with a reproducible seed. Reject conflicting adjacent family/palette combinations unless a transition plan handles them.

## 4. Scene catalog

The following 50 entries are **implementation briefs**. Each one needs procedural geometry, shader/materials, camera, lighting, preview thumbnail, manifest, parameter tests, and a rendered golden fixture before it is called complete.

### V01 — Celestial Threads

**Family:** threads · **Mood tags:** night focus · **GPU tier:** low  
**Build:** Thin glowing spline bundles with slow curl noise.  
**Audio behavior:** mid energy rotates threads; onset adds low-amplitude shimmer.  
**Camera / transition:** sideways dolly; fog fade.

### V02 — Amber Hourglass

**Family:** sculpture · **Mood tags:** dawn calm · **GPU tier:** medium  
**Build:** Procedural sand inside translucent hourglass shell.  
**Audio behavior:** low energy moves sand density.  
**Camera / transition:** fixed slow orbit; warm dissolve.

### V03 — Breathing Monolith

**Family:** sculpture · **Mood tags:** deep focus · **GPU tier:** low  
**Build:** Rounded stone monolith with layered normals.  
**Audio behavior:** rms drives 2% breathing and edge light.  
**Camera / transition:** vertical tilt; dark fade.

### V04 — Floating Lotus Forms

**Family:** organic · **Mood tags:** dawn forest · **GPU tier:** medium  
**Build:** Layered abstract petal meshes above reflective pool.  
**Audio behavior:** melody register opens petals.  
**Camera / transition:** slow orbit; petal morph.

### V05 — Moonlit Dunes

**Family:** landscape · **Mood tags:** night calm · **GPU tier:** medium  
**Build:** Instanced low-poly dunes and blue dust.  
**Audio behavior:** low energy displaces dune crests.  
**Camera / transition:** ground-level drift; horizon dissolve.

### V06 — Glass Rain

**Family:** weather · **Mood tags:** rain night · **GPU tier:** medium  
**Build:** Sparse refractive raindrops on glass-plane layers.  
**Audio behavior:** onsets animate selected drops.  
**Camera / transition:** macro dolly; lens crossfade.

### V07 — Silk Ribbon Orbit

**Family:** ribbons · **Mood tags:** forest focus · **GPU tier:** medium  
**Build:** Two long silk surfaces follow controlled curves.  
**Audio behavior:** mid energy changes curvature.  
**Camera / transition:** gentle orbit; ribbon morph.

### V08 — Harmonic Rings

**Family:** geometry · **Mood tags:** focus calm · **GPU tier:** low  
**Build:** Nested matte rings in three dimensions.  
**Audio behavior:** beat phase adjusts ring phase slowly.  
**Camera / transition:** axial dolly; iris fade.

### V09 — Deep Blue Kelp

**Family:** nature · **Mood tags:** night forest · **GPU tier:** medium  
**Build:** Instanced soft kelp strands in underwater haze.  
**Audio behavior:** rms increases sway by small bound.  
**Camera / transition:** slow swim camera; particle dissolve.

### V10 — Paper Lantern Drift

**Family:** objects · **Mood tags:** dawn calm · **GPU tier:** medium  
**Build:** Lanterns float at staggered depths in volumetric haze.  
**Audio behavior:** high energy adjusts halo width.  
**Camera / transition:** upward tracking; haze fade.

### V11 — Nebula Petals

**Family:** particles · **Mood tags:** night calm · **GPU tier:** medium  
**Build:** Petal-shaped instanced particles in nebula band.  
**Audio behavior:** onset triggers sparse new petals.  
**Camera / transition:** spiral wide orbit; fog dissolve.

### V12 — Quiet Mountain Fog

**Family:** landscape · **Mood tags:** forest calm · **GPU tier:** low  
**Build:** Layered mountain silhouettes with procedural fog.  
**Audio behavior:** low energy modulates mist spread.  
**Camera / transition:** parallax pan; mist wipe.

### V13 — Liquid Pearl Surface

**Family:** fluids · **Mood tags:** focus rain · **GPU tier:** medium  
**Build:** Pearlescent displacement surface on plane.  
**Audio behavior:** rms drives slow traveling ripples.  
**Camera / transition:** overhead glide; gradient dissolve.

### V14 — Candlelight Chamber

**Family:** interior · **Mood tags:** night calm · **GPU tier:** medium  
**Build:** Minimal stone room with one warm area-light source.  
**Audio behavior:** mid energy controls shadow drift.  
**Camera / transition:** slow push; shadow fade.

### V15 — Origami Valley

**Family:** geometry · **Mood tags:** forest dawn · **GPU tier:** low  
**Build:** Paper-folded terrain and folded arches.  
**Audio behavior:** beat phase alters microfold shape.  
**Camera / transition:** oblique rail; fold morph.

### V16 — Golden Dust Columns

**Family:** particles · **Mood tags:** dawn focus · **GPU tier:** low  
**Build:** Sparse dust rising between transparent columns.  
**Audio behavior:** high energy lifts small subset.  
**Camera / transition:** vertical dolly; fade.

### V17 — Aurora Veil

**Family:** shaders · **Mood tags:** night forest · **GPU tier:** medium  
**Build:** Layered shader curtains with pastel emission.  
**Audio behavior:** low-mid energy expands ribbon width.  
**Camera / transition:** slow horizon pan; color dissolve.

### V18 — Mirror Pond

**Family:** water · **Mood tags:** rain calm · **GPU tier:** medium  
**Build:** Still water plane reflecting distant abstract trees.  
**Audio behavior:** onsets generate gentle bounded ripples.  
**Camera / transition:** low skimming dolly; reflection fade.

### V19 — Frosted Geometry

**Family:** geometry · **Mood tags:** night focus · **GPU tier:** medium  
**Build:** Translucent frosted prisms with diffuse highlights.  
**Audio behavior:** melody register shifts prism elevation.  
**Camera / transition:** soft orbit; frost dissolve.

### V20 — Cloud Corridor

**Family:** volume · **Mood tags:** calm focus · **GPU tier:** medium  
**Build:** Low-cost layered alpha clouds forming long corridor.  
**Audio behavior:** rms changes layer spacing slowly.  
**Camera / transition:** forward dolly; fog fade.

### V21 — Satin Waves

**Family:** ribbons · **Mood tags:** rain calm · **GPU tier:** low  
**Build:** Satin strips arranged as quiet ocean swells.  
**Audio behavior:** low energy controls 3% crest change.  
**Camera / transition:** side parallax; silk crossfade.

### V22 — Crystal Orchard

**Family:** nature · **Mood tags:** dawn forest · **GPU tier:** medium  
**Build:** Tree-like branching crystals with soft reflections.  
**Audio behavior:** high energy glints selected tips.  
**Camera / transition:** curved dolly; reflection morph.

### V23 — Orbital Seeds

**Family:** particles · **Mood tags:** focus night · **GPU tier:** low  
**Build:** Matte spheres in gentle orbital system.  
**Audio behavior:** beat phase rotates orbit in sync.  
**Camera / transition:** static framing; seed dissolve.

### V24 — Terra Breaths

**Family:** landscape · **Mood tags:** forest dawn · **GPU tier:** medium  
**Build:** Smooth geological layers with ambient dust.  
**Audio behavior:** rms displaces strata minimally.  
**Camera / transition:** slow crane; contour transition.

### V25 — Ink in Water

**Family:** fluids · **Mood tags:** rain night · **GPU tier:** high  
**Build:** Volumetric-looking ink fields with shader advection.  
**Audio behavior:** mid energy subtly changes density.  
**Camera / transition:** lateral push; fluid dissolve.

### V26 — Midnight Observatory

**Family:** architecture · **Mood tags:** night focus · **GPU tier:** medium  
**Build:** Abstract dome and slow starfield.  
**Audio behavior:** section change rotates sky palette.  
**Camera / transition:** wide orbit; night fade.

### V27 — Woven Light

**Family:** threads · **Mood tags:** focus calm · **GPU tier:** low  
**Build:** Light threads cross like a loosely woven fabric.  
**Audio behavior:** onset brightens few junctions.  
**Camera / transition:** shallow lateral pan; thread morph.

### V28 — Bamboo Shadows

**Family:** nature · **Mood tags:** forest dawn · **GPU tier:** low  
**Build:** Stylized bamboo shafts and layered moving shadows.  
**Audio behavior:** high energy changes leaf highlights.  
**Camera / transition:** slow tracking; shadow dissolve.

### V29 — Soft Prism Sea

**Family:** geometry · **Mood tags:** calm rain · **GPU tier:** medium  
**Build:** Sparse prisms beneath milky waves.  
**Audio behavior:** low energy changes water opacity.  
**Camera / transition:** slow waterline camera; fog transition.

### V30 — Tidal Mandala

**Family:** geometry · **Mood tags:** calm focus · **GPU tier:** medium  
**Build:** Abstract non-symbolic concentric organic lobes.  
**Audio behavior:** beat phase rotates lobes at low speed.  
**Camera / transition:** top-down drift; bloom fade.

### V31 — Snowfall Silence

**Family:** weather · **Mood tags:** night calm · **GPU tier:** low  
**Build:** Small snow flakes over deep blue hills.  
**Audio behavior:** rms changes snowfall rate slightly.  
**Camera / transition:** static-to-slow pan; snow dissolve.

### V32 — Hollow Bloom

**Family:** organic · **Mood tags:** dawn forest · **GPU tier:** medium  
**Build:** Hollow translucent flowers made with parametric tubes.  
**Audio behavior:** mid energy extends petals.  
**Camera / transition:** gentle macro orbit; bloom morph.

### V33 — Infinite Library

**Family:** architecture · **Mood tags:** focus night · **GPU tier:** medium  
**Build:** Repeated arches and shelves in fog, no readable books.  
**Audio behavior:** section progression changes corridor length.  
**Camera / transition:** slow dolly; dark passage.

### V34 — Chime Constellation

**Family:** particles · **Mood tags:** night focus · **GPU tier:** low  
**Build:** Floating wireframe stars connected by faint lines.  
**Audio behavior:** onsets brighten sparse connections.  
**Camera / transition:** slow orbit; star fade.

### V35 — Watercolor Hills

**Family:** landscape · **Mood tags:** dawn rain · **GPU tier:** low  
**Build:** Layered softly shaded hills with noisy edges.  
**Audio behavior:** low energy shifts horizon tint.  
**Camera / transition:** parallax track; paint dissolve.

### V36 — Solar Mist

**Family:** shaders · **Mood tags:** dawn calm · **GPU tier:** low  
**Build:** Warm diffused circular mist layers around soft core.  
**Audio behavior:** rms adjusts core glow under safe limit.  
**Camera / transition:** slow approach; light fade.

### V37 — Ethereal Bridge

**Family:** architecture · **Mood tags:** focus calm · **GPU tier:** medium  
**Build:** One slender bridge through cloudy abyss.  
**Audio behavior:** melody register raises distant glow.  
**Camera / transition:** subtle dolly; fog transition.

### V38 — Submerged Glass Garden

**Family:** organic · **Mood tags:** rain forest · **GPU tier:** medium  
**Build:** Glass stems and bubble streams in blue green.  
**Audio behavior:** high energy maps to bubbles.  
**Camera / transition:** slow upward drift; refraction blend.

### V39 — Starfall Horizon

**Family:** particles · **Mood tags:** night calm · **GPU tier:** low  
**Build:** Few comet-like filaments over plain dark horizon.  
**Audio behavior:** onsets trigger one soft tail max.  
**Camera / transition:** wide slow pan; horizon dissolve.

### V40 — Velvet Labyrinth

**Family:** architecture · **Mood tags:** night focus · **GPU tier:** medium  
**Build:** Curved maze walls of matte velvet material.  
**Audio behavior:** section changes alter path lighting.  
**Camera / transition:** continuous slow dolly; turn fade.

### V41 — Warm Stone Ripples

**Family:** sculpture · **Mood tags:** dawn calm · **GPU tier:** low  
**Build:** Circular stone relief with shallow concentric waves.  
**Audio behavior:** low energy drives relief depth.  
**Camera / transition:** overhead crane; stone morph.

### V42 — Echoing Arches

**Family:** architecture · **Mood tags:** focus forest · **GPU tier:** medium  
**Build:** Repeating arches with shifting warm light shafts.  
**Audio behavior:** rms modulates shaft opacity.  
**Camera / transition:** long forward dolly; fog gate.

### V43 — Floating Calligraphy

**Family:** ribbons · **Mood tags:** calm night · **GPU tier:** medium  
**Build:** Abstract brushstroke strips without script.  
**Audio behavior:** mid energy shifts stroke curvature.  
**Camera / transition:** macro orbit; brush dissolve.

### V44 — Rainforest Canopy

**Family:** nature · **Mood tags:** forest rain · **GPU tier:** medium  
**Build:** Soft foliage silhouette canopy and haze.  
**Audio behavior:** high energy adds subtle leaf highlights.  
**Camera / transition:** upward camera drift; canopy wipe.

### V45 — Opal Cavern

**Family:** sculpture · **Mood tags:** night calm · **GPU tier:** high  
**Build:** Cavern shell with opal-like iridescent mineral bands.  
**Audio behavior:** low energy shifts band amplitude.  
**Camera / transition:** slow cave glide; shadow fade.

### V46 — Phase Garden

**Family:** geometry · **Mood tags:** focus forest · **GPU tier:** low  
**Build:** Instanced rounded tiles and kinetic stems.  
**Audio behavior:** beat phase synchronizes low-amplitude tilt.  
**Camera / transition:** side dolly; tile morph.

### V47 — Moonbeam Stair

**Family:** architecture · **Mood tags:** night dawn · **GPU tier:** medium  
**Build:** Floating stairs catching volumetric moonbeam.  
**Audio behavior:** melody register changes step illumination.  
**Camera / transition:** slow ascend; beam fade.

### V48 — Deep Space Silk

**Family:** shaders · **Mood tags:** night calm · **GPU tier:** medium  
**Build:** Broad soft volumetric silk band in dark space.  
**Audio behavior:** rms changes band width slowly.  
**Camera / transition:** wide orbit; silk fold.

### V49 — Zen Pebble Field

**Family:** objects · **Mood tags:** calm forest · **GPU tier:** low  
**Build:** Smooth pebble instances over textured ground.  
**Audio behavior:** onset triggers tiny radial wave.  
**Camera / transition:** ground-level drift; ripple dissolve.

### V50 — Final Light Horizon

**Family:** landscape · **Mood tags:** calm dawn night · **GPU tier:** low  
**Build:** Single luminous horizon with gentle gradient atmosphere.  
**Audio behavior:** section ending dims glow to rest.  
**Camera / transition:** static to slow pullback; long fade.

## 5. Music-to-scene planning example

For a 5-minute `bansuri_dawn` composition, the visual planner may select: `V12 Quiet Mountain Fog` during the intro, `V04 Floating Lotus Forms` for phrase A, `V07 Silk Ribbon Orbit` for development, and `V50 Final Light Horizon` for the coda. Select a single warm/cool palette family and transition at sections. Use motif appearance to trigger a gentle material change; use a cadence to initiate a longer camera pullback.

## 6. Visual quality gates

Each preset must render 30 seconds in preview and export, including silence, an onset peak, and a section change. Check texture loading, numerical stability, overdraw, temporal aliasing, frame drop, pixel contrast, memory cleanup, deterministic timing, and reduced-motion behavior. Store a preview thumbnail, GPU profile, screenshot golden frames, and a 10-second encoded test clip.
