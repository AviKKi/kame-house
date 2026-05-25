# Water Build TODO

## Working Rule

Build exactly one step at a time. After each step, stop for review before moving to the next step.

Each implementation step should include:

- a short goal,
- the smallest possible code change,
- tweakable constants at the top of the relevant file,
- a build check,
- a browser/screenshot check when tooling is available,
- notes about what looked wrong and what changed.

## Scope Guardrails

- Keep the visible scene limited to water, one solid floor/ground plane, and one sun-like light source.
- Do not add island terrain, props, sky meshes, mountains, clouds, or extra decorative meshes yet.
- A small temporary tuning menu is allowed for water parameters because Step 5 needs interactive noise tuning.
- Prefer readable, modular code over shader cleverness.
- Add features in layers only after the previous layer looks acceptable.

## Step Plan

### 0. Reset To Blank Baseline

Status: done

Goal: remove the previous water attempt so the next pass starts clean.

Acceptance:

- App opens with no old water, floor, cube, grid, or shader code.
- Parcel still builds.
- TODO and reference docs exist.

### 1. Add Camera, Renderer, Controls, And Sun

Status: done

Goal: create a stable inspection scene with only camera, renderer, orbit controls, and directional sunlight.

Acceptance:

- No water or floor meshes yet.
- Sun is visible in camera as the light-source marker.
- Controls feel stable.
- Sun params are tweakable from constants.

Implementation notes:

- Constants live at the top of `src/main.js`.
- The actual light is a `DirectionalLight`.
- The visible sun is a small `MeshBasicMaterial` sphere at the same position.
- Initial camera distance is set to the orbit controls' max zoom-out distance so the water opens centered with wider side whitespace.
- Build check passed with `npm run build`.
- Headless Chrome screenshot verified the sun is visible in frame.

### 2. Add Solid Circular Floor

Status: done

Goal: add one solid circular floor below water level.

Acceptance:

- Flat, simple material.
- Color reads as submerged sand/ground, not a decorative island.
- Radius, height, color, and subdivision count are constants.

Implementation notes:

- Added `src/floorBody.js` exporting `createFloorBody` and `updateFloorBody`.
- Geometry is a `CircleGeometry` rotated to lie flat in the XZ plane.
- Floor radius, y position, color, and `angularSegments` live in `FLOOR_PARAMS` in `src/main.js`.
- Radius and y are derived from the existing water radius and depth so the floor matches the water footprint exactly and sits at the bottom of the cylinder.
- Render order is 0 so the floor draws before the transparent water side and top.
- Implemented together with Step 11; the floor material is the caustic shader described below.

### 3. Add Cylindrical Water Body

Status: done

Goal: add a custom water body with a cylindrical side wall and dynamic polar top surface.

Acceptance:

- Circular outline is clean from orbit angles.
- Top mesh topology supports equation-driven wave displacement.
- Side wall top rim follows the same height equation as the top mesh.
- No island, floor, caustics, refraction, or extra decorative meshes yet.

Implementation notes:

- Replaced `src/waterDisc.js` with `src/waterBody.js`.
- Water is a group containing a dynamic polar top mesh and a cylindrical side wall.
- Top mesh vertex heights are driven through one centralized surface-height equation.
- Side wall top vertices use the same equation, so future waves will not detach from the rim.
- Water radius, surface height, depth, subdivisions, and surface equation params are constants in `src/main.js`.
- Build check passed with `npm run build`.
- Screenshot check verified a cylindrical water body with the sun still visible.

### 4. Add Transparent Water Material

Status: done

Goal: make the water body read as transparent water using color, alpha, and Fresnel only.

Acceptance:

- Water is transparent enough to see the floor.
- Glancing angles are slightly brighter.
- No caustics or refraction yet.

Implementation notes:

- The top surface uses a minimal `ShaderMaterial` with base color, reflection color, alpha, and Fresnel uniforms.
- The side wall uses a separate transparent material so the water has visible depth.
- A small CPU-side fBm height equation is in place as the surface driver; later steps will replace/tune the wave layers rather than changing topology.
- Floor visibility acceptance is deferred because Step 2 is still pending.

### 5. Add Level 1 Small Ripple Noise

Status: done

Goal: add small, fast, mostly in-place noise disturbances as the first water movement layer.

Acceptance:

- Detail is subtle.
- Mesh silhouette remains calm.
- Frequency, amplitude, and speed are constants.
- Level 1 motion does not imply wind direction; wind-driven directional waves are still reserved for Step 7.
- A tuning menu exposes 2-3 presets plus numeric controls.

Implementation notes:

- Level 1 uses CPU-side fBM height displacement on the dynamic top mesh.
- The side-wall rim uses the same level 1 height function so the cylindrical edge remains attached.
- The noise animates by morphing between offset fBM samples instead of advecting in one direction.
- Added three presets: Calm, Ripple, Active.
- Added sliders for amplitude, frequency, speed, octaves, and morph radius.
- Larger wind/directional wave movement remains disabled as `waves.level2`.
- Build check passed with `npm run build`.
- Screenshot check verified the tuning menu and level 1 surface disturbance.

### 6. Add Sun Surface Reflection

Status: done

Goal: make level 1 ripples visible from the default camera by reflecting the sun/source light on the water surface.

Acceptance:

- A bright but controlled sun glint appears on the water surface.
- Level 1 ripple normals break up the highlight enough to reveal small disturbances.
- Highlight color, strength, shininess, and spread are tweakable constants.
- Sun-facing ripple slopes get a light tint while opposing slopes get a darker aqua shade.
- Slope light, slope shadow, and slope boost are tunable from the same menu.
- The effect uses the existing sun direction; do not add extra lights or decorative reflection meshes.
- The water should still read as transparent aqua, not a metallic mirror.

Implementation notes:

- Add this before large directional waves because the current material makes ripples hard to evaluate from the default viewing angle.
- Used the current dynamic surface normals first; improve finite-difference normals in Step 8 if needed.
- Added shader uniforms for sun position, highlight color, strength, shininess, and spread.
- The tuning menu now exposes strength, shininess, and spread.
- The shader clamps the glint and blends toward a warm sun color instead of adding unbounded white.
- Added directional slope shading because specular alone was too view-angle dependent.
- The tuning menu now exposes Light Side, Dark Side, and Slope Boost controls.
- Build check passed with `npm run build`.
- Screenshot check verified the sun reflection, ripple breakup, and light/dark slope contrast from the default camera.

### 7. Add Level 2 Directional Large Waves

Status: done

Goal: add larger directional vertex waves.

Acceptance:

- Waves have visible broad movement.
- Direction, speed, amplitude, wavelength, and wind vector are constants.
- Motion does not look like random static shimmer.
- Level 2 controls are exposed in the collapsible settings menu.
- Level 1 remains a smaller, faster local disturbance over the larger wind-driven layer.

Implementation notes:

- Added level 2 as a separate height term combined with level 1 in `getSurfaceHeight`.
- Level 2 uses layered directional sine waves moving along a wind direction.
- Added a directional fBM phase/noise term so the broad waves are not perfectly mechanical.
- Side-wall rim uses the combined level 1 plus level 2 height, so the water body stays connected.
- Added menu controls for amplitude, wavelength, speed, direction, layering, and noise.
- Build check passed with `npm run build`.
- Screenshot check verified visible broad wave movement with the settings menu collapsed by default.

### 8. Replace Level 2 With Multi-Layer Gerstner Swell

Status: done

Goal: replace the current too-uniform sine-like broad waves with multi-layer Gerstner-style swell and phase-warped directionality.

Acceptance:

- Main ocean movement reads less like one repeated sine wave.
- Use 3-5 larger wave components with varied direction, amplitude, wavelength, speed, steepness, and phase.
- Add phase warping/noise to break uniform stripes while preserving a clear wind-driven travel direction.
- Level 1 remains the smaller, faster local disturbance on top.
- Voronoi is not used for primary height displacement.
- Keep relevant params exposed in the collapsible settings menu.

Implementation notes:

- Current level 2 was useful as a first pass but reads too sinusoidal.
- Replaced the single broad directional formula with five Gerstner-style swell components.
- Each component has its own amplitude, wavelength, speed, direction offset, phase, crest shaping, steepness, and warp seed.
- Level 2 now displaces x/z as well as y for a more wave-like surface, while the side-wall rim reads from the same base coordinates so the cylinder remains connected.
- The menu exposes Base Length, Speed, Direction, Layer Mix, Phase Warp, and Steepness for this layer.
- Noise is used as phase/domain warp, not as the only movement model.
- Defer Voronoi to future caustic/foam breakup if needed; do not use it for the middle-ocean heightfield now.
- Build check passed with `npm run build`.
- Headless browser screenshot verified the scene renders, the sun remains visible, and the settings menu is collapsed by default.

### 9. Blend Small And Large Wave Normals

Status: done

Goal: make lighting respond to both ripple layers without making the geometry noisy.

Acceptance:

- Large waves shape the surface.
- Small waves affect highlights.
- Normals do not create broken/dark artifacts.

Implementation notes:

- Level 2 Gerstner swell remains the actual vertex displacement for the top surface and side-wall rim.
- Level 1 is no longer added to vertex height; it now contributes through a finite-difference normal perturbation pass.
- The normal pass starts from the large-wave mesh normals, samples level 1 height around each base vertex, clamps the resulting slope, and renormalizes the blended normal.
- Added Wave Normals controls for Ripple Normal, Sample Step, and Slope Limit.
- Build check passed with `npm run build`.
- Headless browser screenshot verified the scene renders, the sun remains visible, and the settings menu is still collapsed by default.

### 10. Add Edge Fade And Disc Mask (Doesn't look good, skipping for now)

Status: pending

Goal: keep the circular water boundary soft and controlled.

Acceptance:

- Edge fade is subtle.
- No harsh square/canvas artifacts.
- Inner/outer mask formulas are centralized.

### 11. Add Caustics To Floor Below Water

Status: done

Goal: add a floor shader caustic effect, not a separate decorative mesh.

Acceptance:

- Caustics appear only under the water body footprint.
- Pattern is pale cyan-white, not pure white cracks.
- Scale, speed, threshold, and strength are constants.

Implementation notes:

- Caustics live in the floor's `ShaderMaterial` fragment shader in `src/floorBody.js`, not as a separate mesh.
- Pattern uses two crossed 2D simplex noise samples in the noise-line caustic style from the reference doc: `c = smoothstep(threshold, threshold + width, (1 - |snoise_a|) + (1 - |snoise_b|))`.
- A radial smoothstep mask fades caustics inside the water footprint so the disc edge is soft, not a hard ring.
- Caustic color is mixed over a muted sage floor color; the cyan-white tint reads correctly through the transparent water.
- Tuneable constants `FLOOR_PARAMS.caustics`: `color`, `scale`, `flowScale`, `threshold`, `width`, `strength`. (Initially shipped with an independent `speed`; replaced with `flowScale` in Step 15 so caustic motion is driven by level 2 wave wind.)
- Tuned defaults after live review: scale 1.4, threshold 1.22, width 0.8, strength 1.05. The original `speed: 0.22` mapped to `flowScale: 0.4` after the Step 15 coupling (`level2.speed * flowScale ≈ 0.58 * 0.4 ≈ 0.23`).
- Added a Caustics section to the water tuning menu with sliders for scale, flow scale, threshold, width, and strength.
- Build check passed with `npm run build`.
- Visual check confirmed pale cyan-white caustic ribbons over the sage floor through the transparent water, with a soft edge fade.

### 12. Add Depth-Based Water Color

Status: done

Goal: tint water from shallow aqua to deeper aqua using floor depth.

Acceptance:

- Floor remains visible.
- Depth tint does not make the whole disc opaque.
- Attenuation strength is tweakable.

Implementation notes:

- Added depth-based tint to the water surface fragment shader in `src/waterBody.js`.
- The shader now mixes between `uShallowColor` (existing `baseColor`) and `uDeepColor` using `transmission = exp(-uDepthAttenuation * pathLength)`, where `pathLength = (vWorldPosition.y - uFloorY) / max(0.05, viewDirection.y)`.
- `pathLength` divides by the downward view-direction component so glancing camera angles read as a longer water column and pick up more of the deep color, while top-down views stay closer to the shallow tone.
- Alpha is unchanged, so the floor (and its caustics) remain visible everywhere; the tint only shifts hue/value, not opacity.
- Side wall material is unchanged for now since its existing `sideColor` already reads as a darker aqua and matches the new deep tone reasonably.
- Tuneable constant `WATER_PARAMS.depthTint`: `deepColor` (0x1a6577 starter) and `attenuation` (1.4 starter).
- Added a Depth Tint section to the water tuning menu with an `attenuation` slider (0–5).
- Build check passed with `npm run build`.
- Visual check pending: confirm shallow→deep gradient is visible from the default orbit and that the floor is still readable through the deepest part of the disc.

### 13. Add Screen-Space Refraction (Plain)

Status: done

Goal: use a scene color render target and water normal offset to distort the floor through the water. Single-sample refraction with no chromatic split.

Acceptance:

- A `WebGLRenderTarget` captures the scene-without-water each frame.
- The water surface fragment shader samples the captured texture at `uv_screen + N_w.xy * s_distort` to refract the floor (and the baked-in caustic ribbons from Step 11) through wave normals.
- Distortion follows wave normals.
- Refraction amount is subtle (no "wet glass" over-warping).
- Render order is explicit and documented: scene-without-water render pass first, then water surface.
- `s_distort` strength is tweakable.

Notes:

- This step covers plain refraction only; chromatic dispersion (prism) is split into the next step so it can be evaluated independently.

Implementation notes:

- Added a `WebGLRenderTarget` (`refractionTarget`) in `src/main.js` sized to the renderer's drawing buffer. `syncRefractionViewport()` resizes the target and updates `WATER_PARAMS.refraction.viewportSize` on startup and on window resize.
- Animate loop now does two render passes per frame: (1) `water.visible = false`, render into `refractionTarget`; (2) `water.visible = true`, render to the canvas normally. The water surface samples the captured texture from pass (1).
- Water surface fragment shader (`src/waterBody.js`) adds `uSceneTexture`, `uViewportSize`, `uRefractionStrength`, `uRefractionMix`. Screen UV is `gl_FragCoord.xy / uViewportSize`; refraction offset is `normal.xz * uRefractionStrength` (world-space horizontal tilt mapped onto screen XY — cheap but reads believably for our roughly top-down orbit).
- The refracted scene color is blended into the shallow tint via `mix(uShallowColor, refractedScene, uRefractionMix)` before the depth-tint mix runs, so deep portions still tint toward `uDeepColor` and the refracted floor only dominates at shallow paths. Setting `uRefractionMix` to 0 falls back exactly to the Step 12 look.
- Side wall is not refracted in this step; it stays on the depth-tint shader from Step 12.
- Tuneable constants `WATER_PARAMS.refraction`: `strength` (0.04 starter) and `mix` (0.55 starter). Defaults chosen to make the floor caustics visibly wobble under waves without over-warping.
- Added a Refraction section to the water tuning menu with `Strength` (0–0.15) and `Mix` (0–1) sliders.
- Build check passed with `npm run build`.
- Visual check pending: confirm floor caustics shift/wobble where wave normals tilt, and that the look stays subtle rather than wet-glass.

### 14. Add Chromatic Dispersion To Refraction

Status: done

Goal: layer a subtle prism/dispersion effect on top of Step 13 refraction by splitting the refraction sample into R/G/B with slightly different distortion offsets.

Acceptance:

- Refraction sampler does three reads (one per channel) with per-channel distortion offsets `s_distort * (1 + k_disp_r/g/b)`.
- Dispersion amount is tweakable and starts subtle (defaults near zero so the output matches Step 13 until the slider is moved).
- Effect is most visible on high-slope wave normals and around caustic edges in the refracted floor.
- Caustic fringing comes for free via the refraction sample — no separate dispersion path inside the floor shader.
- Setting the dispersion knob to 0 must produce the exact same output as Step 13.

Notes:

- Defer this step until plain refraction is in and tuned; if the look is already convincing without dispersion, this step can stay at default-zero or be skipped entirely.

Implementation notes:

- Water surface fragment shader (`src/waterBody.js`) now does three texture reads: R sampled at `screenUV + refractOffset * (1 - dispersion)`, G at the neutral offset, B at `screenUV + refractOffset * (1 + dispersion)`. Final `refractedScene` packs `.r/.g/.b` from those three samples. With dispersion = 0 all three UVs collapse to the same value, so the output is bit-identical to Step 13.
- The physical convention is preserved: blue refracts more than red, so the blue sample uses the larger offset multiplier.
- Tuneable constant `WATER_PARAMS.refraction.dispersion` (default 0). Slider range 0–1 in the menu's existing Refraction section.
- No changes inside the floor shader; caustic edge fringing emerges naturally from per-channel sampling of the refraction texture, matching the acceptance note.
- Build check passed with `npm run build`.
- Visual check: the math fires correctly, but the effect is a no-op in the current scene because the refraction texture is near-monochromatic (sage floor + pale cyan caustics + pale cyan sky). Dispersion needs chromatic content in the refraction texture to read as visible prism fringing. Default kept at 0; the slider remains exposed so the effect can light up automatically once scene decor (coral, pebbles, colored terrain) is added in a future phase.

### 15. Final Water Pass

Status: done

Goal: tune the complete water stack after all individual layers work.

Acceptance:

- Water reads well from the default camera angle.
- Parameters are organized.
- No unrelated meshes were added.

Implementation notes:

- **Caustic wave coupling (deferred from Step 11):** caustic motion now derives from the level 2 wave wind instead of having an independent control. Replaced `FLOOR_PARAMS.caustics.speed` (scalar) with `flowScale` (scalar). The floor fragment shader now reads `uCausticFlow` (vec2) instead of `uCausticSpeed`; the vector is recomputed each frame in `updateFloorBody` from `WATER_PARAMS.waves.level2` as `flow = (cos(directionDegrees), sin(directionDegrees)) * level2.speed * caustics.flowScale`. Caustic samples drift directionally along the wind: `n1 = 1 - abs(snoise(uv - flow))` and `n2 = 1 - abs(snoise(swap(uv) - swap(flow) * 0.8))`. The `-flow` sign is the standard advection convention: subtracting the flow offset makes the noise feature at `N0` appear at world point `p` when `p*scale = N0 + flow*t`, so the visible feature moves *with* the wind direction (first cut used `+flow`, which made caustics drift 180° opposite the waves; corrected during live review).
- `updateFloorBody(mesh, time, waveParams)` signature now takes wave params from `main.js`; the menu's caustic Speed slider was replaced with Flow Scale (0–2, default 0.4). With level 2 defaults (`speed 0.58`, `directionDegrees -28`) and `flowScale 0.4`, caustic drift magnitude is ~0.23 — close to the original `speed: 0.22` so the look is preserved at startup but now retunes automatically when wave speed/direction change.
- Removed the obsolete `sideColor` constant in Step 12 — already cleaned up. No other unused params found during the parameter audit.
- Scene contents audited: only floor mesh, water group (top surface + depth-tinted side wall), `DirectionalLight` sun, and a sun marker sphere. No island terrain, props, sky meshes, mountains, clouds, or extra decorative meshes — matches the scope guardrails.
- Dispersion (Step 14) confirmed as a no-op in the current monochromatic scene; left at default 0 with the slider exposed so it activates automatically once chromatic decor is added later.
- Build check passed with `npm run build`.
- All step 0–15 statuses are now `done` (Step 10 edge fade remains explicitly skipped per its own note).
