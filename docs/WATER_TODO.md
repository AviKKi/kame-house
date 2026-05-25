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
- Build check passed with `npm run build`.
- Headless Chrome screenshot verified the sun is visible in frame.

### 2. Add Solid Circular Floor

Status: pending; intentionally skipped for now by request

Goal: add one solid circular floor below water level.

Acceptance:

- Flat, simple material.
- Color reads as submerged sand/ground, not a decorative island.
- Radius, height, color, and subdivision count are constants.

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

Status: pending

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
- Prefer Gerstner-style horizontal/vertical displacement or a close heightfield approximation if we want to preserve the current cylinder topology.
- Use noise as phase/domain warp, not as the only movement model.
- Defer Voronoi to future caustic/foam breakup if needed; do not use it for the middle-ocean heightfield now.

### 9. Blend Small And Large Wave Normals

Status: pending

Goal: make lighting respond to both ripple layers without making the geometry noisy.

Acceptance:

- Large waves shape the surface.
- Small waves affect highlights.
- Normals do not create broken/dark artifacts.

### 10. Add Edge Fade And Disc Mask

Status: pending

Goal: keep the circular water boundary soft and controlled.

Acceptance:

- Edge fade is subtle.
- No harsh square/canvas artifacts.
- Inner/outer mask formulas are centralized.

### 11. Add Caustics To Floor Below Water

Status: pending

Goal: add a floor shader caustic effect, not a separate decorative mesh.

Acceptance:

- Caustics appear only under the water body footprint.
- Pattern is pale cyan-white, not pure white cracks.
- Scale, speed, threshold, and strength are constants.

### 12. Add Depth-Based Water Color

Status: pending

Goal: tint water from shallow aqua to deeper aqua using floor depth.

Acceptance:

- Floor remains visible.
- Depth tint does not make the whole disc opaque.
- Attenuation strength is tweakable.

### 13. Add Screen-Space Refraction

Status: pending

Goal: use a scene color render target and water normal offset to distort the floor through the water.

Acceptance:

- Distortion follows wave normals.
- Refraction amount is subtle.
- Render order is explicit and documented.

### 14. Final Water Pass

Status: pending

Goal: tune the complete water stack after all individual layers work.

Acceptance:

- Water reads well from the default camera angle.
- Parameters are organized.
- No unrelated meshes were added.
