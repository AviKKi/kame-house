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
- Do not add island terrain, props, sky meshes, mountains, clouds, extra decorative meshes, or UI panels yet.
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

### 5. Add Level 1 Small Ripple Normal Noise

Status: pending

Goal: add small granular surface detail mostly through normals/color response.

Acceptance:

- Detail is subtle.
- Mesh silhouette remains calm.
- Frequency, amplitude, and speed are constants.

### 6. Add Level 2 Directional Large Waves

Status: pending

Goal: add larger directional vertex waves.

Acceptance:

- Waves have visible broad movement.
- Direction, speed, amplitude, and wavelength are constants.
- Motion does not look like random static shimmer.

### 7. Blend Small And Large Wave Normals

Status: pending

Goal: make lighting respond to both ripple layers without making the geometry noisy.

Acceptance:

- Large waves shape the surface.
- Small waves affect highlights.
- Normals do not create broken/dark artifacts.

### 8. Add Edge Fade And Disc Mask

Status: pending

Goal: keep the circular water boundary soft and controlled.

Acceptance:

- Edge fade is subtle.
- No harsh square/canvas artifacts.
- Inner/outer mask formulas are centralized.

### 9. Add Caustics To Floor Below Water

Status: pending

Goal: add a floor shader caustic effect, not a separate decorative mesh.

Acceptance:

- Caustics appear only under the water disc.
- Pattern is pale cyan-white, not pure white cracks.
- Scale, speed, threshold, and strength are constants.

### 10. Add Depth-Based Water Color

Status: pending

Goal: tint water from shallow aqua to deeper aqua using floor depth.

Acceptance:

- Floor remains visible.
- Depth tint does not make the whole disc opaque.
- Attenuation strength is tweakable.

### 11. Add Screen-Space Refraction

Status: pending

Goal: use a scene color render target and water normal offset to distort the floor through the water.

Acceptance:

- Distortion follows wave normals.
- Refraction amount is subtle.
- Render order is explicit and documented.

### 12. Final Water Pass

Status: pending

Goal: tune the complete water stack after all individual layers work.

Acceptance:

- Water reads well from the default camera angle.
- Parameters are organized.
- No unrelated meshes were added.
