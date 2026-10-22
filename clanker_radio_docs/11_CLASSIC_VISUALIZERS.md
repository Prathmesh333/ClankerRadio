# Classic visualizer implementation references

- Butterchurn: https://github.com/jberg/butterchurn (MIT). Browser MilkDrop engine, WebGL2, audio node input, preset equations, feedback textures and blended transitions.
- Presets: https://github.com/jberg/butterchurn-presets (MIT package; author names retained in presets).
- Webamp: https://github.com/captbaritone/webamp ; https://docs.webamp.org/docs/features/mikdrop/ . Uses Butterchurn for MilkDrop.
- Original authoring guide: https://www.geisswerks.com/milkdrop/milkdrop_preset_authoring.html
- Native alternative: https://github.com/projectM-visualizer/projectm

Our Random evolving mode now uses the installed Butterchurn engine and preset package, fed from the existing synthesizer analyzer. A shuffled preset changes after 18–40 seconds, with a 3.5 second blend, scaled by intensity. It avoids consecutive repeats. Four original shaders remain selectable and provide a fallback before audio initialization or without WebGL2. Reduced motion bypasses MilkDrop. This is randomized preset selection, not arbitrary AI-generated shader code.

Audio -> FFT/envelopes -> preset equations -> warp previous frame -> waves/shapes -> color/decay -> next frame. Feedback is what creates the flowing trails missing from a stateless shader.
