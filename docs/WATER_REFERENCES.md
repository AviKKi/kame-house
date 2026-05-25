# Water References

This file captures the formulas, links, and architecture notes for the procedural water build.

## External Links

- Three.js Water docs: https://threejs.org/docs/pages/Water.html
- Blender displacement docs: https://docs.blender.org/manual/en/latest/render/shader_nodes/vector/displacement.html
- Red Blob terrain noise: https://www.redblobgames.com/maps/terrain-from-noise/
- Three.js water shader notes: https://deepwiki.com/dgreenheck/threejs-water-shader/4.1-water-shaders
- WebGL Water reference: https://www.enchase.space/
- Caustics shader notes: https://deepwiki.com/dgreenheck/threejs-water-shader/4.2-caustics-shaders

## Geometry Model

Use concentric procedural meshes instead of rectangular planes with circular masks.

Polar position:

```text
p(rho, theta) = [rho cos(theta), rho sin(theta)]
```

For this water-only phase:

- Water: shallow cylindrical volume with a dynamic polar top mesh and matching side wall.
- Underwater floor: full circular floor below water.
- Island terrain: deferred until the water stack works.

Water top surface:

```text
P_top(rho, theta, t) =
  [
    rho cos(theta),
    h_water(rho cos(theta), rho sin(theta), t),
    rho sin(theta)
  ]
```

Water side wall:

```text
P_side(theta, s, t) =
  [
    R cos(theta),
    mix(y_bottom, h_water(R cos(theta), R sin(theta), t), s),
    R sin(theta)
  ]
```

The top mesh and side-wall rim must use the same `h_water` function. Otherwise large waves later will visually detach from the cylindrical water edge.

## Annular Water Mask

```text
M_water(r) =
  smoothstep(R_inner, R_inner + delta, r)
  * (1 - smoothstep(R_outer - delta, R_outer, r))
```

Use for:

- water alpha fade,
- caustic visibility,
- foam near shoreline later,
- depth/color transitions.

For a full disc, `R_inner = 0`.

## Level 1 Small Ripple Layer

This is the first movement layer: small, fast disturbances that mostly stay in place. It should not read as wind-driven swell.

```text
eta_small(p) = A_s * fbm(p * f_s + o_s)
```

Starter values:

```text
A_s = 0.015
f_s = 12 to 30
```

Use mostly for normal perturbation, not major vertex displacement.

Current build variant:

```text
eta_1(p, t) =
  A_1 * (
    mix(
      fbm(p * f_1 + q_a(t)),
      fbm(p * f_1 + q_b(t) + seed),
      0.5 + 0.5 sin(k t)
    )
    - 0.5
  )
```

where:

```text
q_a(t) = morphRadius * [cos(speed * t), sin(0.83 * speed * t)]
q_b(t) = morphRadius * [cos(0.61 * speed * t + phaseA), sin(0.71 * speed * t + phaseB)]
```

This gives local surface agitation without a single directional drift. Keep this layer small and fast.

Current tuning presets:

```text
Calm:   A_1 = 0.018, f_1 = 5.2,  speed = 1.2, octaves = 2
Ripple: A_1 = 0.036, f_1 = 8.4,  speed = 2.2, octaves = 3
Active: A_1 = 0.056, f_1 = 11.2, speed = 3.3, octaves = 4
```

## Level 2 Large Directional Waves

Single directional sine wave:

```text
eta_dir(p, t) = A_L * sin(k * dot(d, p) - omega * t + phi)
```

Layered version:

```text
eta_dir(p, t) =
  sum_j A_j * sin(k_j * dot(d_j, p) - omega_j * t + phi_j)
```

Suggested progression:

```text
A_(j+1) = 0.5 * A_j
k_(j+1) = 1.7 * k_j
```

Noise-style directional flow:

```text
eta_flow(p, t) = A_L * fbm(p * f_L - v * t)
v = c * d
```

## Final Water Height

```text
h_water(p, t) = h_0 + eta_1(p, t) + eta_2(p, t)
```

Practical split:

- Level 1 small waves: small amplitude, high frequency, fast local disturbance.
- Level 2 large waves: larger amplitude, lower frequency, wind-directional movement.
- Foam/shore ripples: separate later mask.

## Water Normals

```text
N_w(p, t) = normalize([
  -partial h_water / partial x,
   1,
  -partial h_water / partial z
])
```

Finite difference:

```text
partial h / partial x ~= (h(x + epsilon, z) - h(x - epsilon, z)) / (2 * epsilon)
partial h / partial z ~= (h(x, z + epsilon) - h(x, z - epsilon)) / (2 * epsilon)
```

## Fresnel

```text
F = F_0 + (1 - F_0) * (1 - max(0, dot(N, V)))^5
```

Water starter value:

```text
F_0 ~= 0.02
```

## Sun Surface Reflection

Use this before adding level 2 waves so level 1 ripples are visually readable from the default camera angle.

Inputs:

```text
N = water surface normal
V = view direction from water point to camera
L = direction from water point to sun/source light
```

Reflection-vector specular:

```text
R = reflect(-L, N)
S_sun = max(0, dot(R, V))^shininess
```

Blinn half-vector alternative:

```text
H = normalize(L + V)
S_sun = max(0, dot(N, H))^shininess
```

Final highlight:

```text
C_specular = C_sun * S_sun * specularStrength
```

Current implementation uses a capped blend to avoid a pure white patch:

```text
S = clamp(S_sun * specularStrength, 0, S_max)
C = mix(C_water, C_sun, S)
```

Use a controlled highlight:

```text
shininess = 80 to 220
specularStrength = 0.25 to 1.2
C_sun = pale warm white, not pure white
```

The important requirement is that level 1 normals break up the reflected highlight. If the highlight remains smooth, improve normal calculation before moving to level 2 waves.

Directional slope shading is a stylized readability layer. It makes ripple normals visible even when the specular glint is not at the perfect camera angle.

```text
D = normalize(L.xz)
slope = dot(N.xz * normalBoost, D)
lightSide = max(0, slope)
darkSide = max(0, -slope)
```

Then:

```text
C = mix(C, C_lightSide, lightSide * lightStrength)
C = mix(C, C_darkSide, darkSide * shadowStrength)
```

This is not physically pure diffuse water shading; it is a practical visual aid for reading small displacement before the full reflection/refraction stack exists.

## Depth-Based Transparency And Color

Depth:

```text
d = y_water - y_floor
```

Transmission:

```text
T(d) = exp(-sigma * d)
```

Water material blend:

```text
C =
  F * C_reflection
  + (1 - F) * (
      T(d) * C_refractedScene
      + (1 - T(d)) * C_deepAqua
    )
```

Starter colors:

```text
C_water = [0.0, 0.75, 0.9]
C_deepAqua = [0.0, 0.35, 0.45]
```

## Refraction Offset

```text
uv_refract = uv_screen + N_w.xy * s_distort * d
```

Starter distortion:

```text
s_distort = 0.01 to 0.05
```

Three.js constructs:

- `WebGLRenderTarget`
- `DepthTexture`
- `ShaderMaterial`
- `transparent: true`
- `depthWrite: false`

## Shore Foam Mask

Deferred until shoreline/island work.

```text
M_foam = 1 - smoothstep(0, w_foam, abs(r - R_inner))
```

Animated foam:

```text
F_foam =
  M_foam
  * smoothstep(tau_1, tau_2, fbm(p * f_foam - v_foam * t))
```

## Cheap Voronoi Caustics

Nearest and second-nearest cell distances:

```text
F_1(p) = distance to nearest cell point
F_2(p) = distance to second-nearest cell point
```

Voronoi edge intensity:

```text
C_voro(p) =
  1 - smoothstep(w, w + s, F_2(p) - F_1(p))
```

Animated domain:

```text
p' = p * f_c + v_c * t
```

Final caustic:

```text
C_caustic =
  M_water(r)
  * C_voro(p')
  * I_light
  * A_caustic
```

Starter values:

```text
f_c = 8 to 20
w = 0.03
s = 0.08
A_caustic = 0.2 to 0.8
```

## Noise-Line Caustics

```text
c1 = a * (o - abs(snoise([uv_x * S, uv_y * S, t * v])))
c2 = a * (o - abs(snoise([uv_y * S, uv_x * S, -t * v])))
```

```text
C_caustic = smoothstep(tau, tau + w, c1 + c2)
```

This usually reads more watery and less cellular than Voronoi.

## More Physical Caustics Direction

Incoming light direction:

```text
L
```

Refracted ray:

```text
R = refract(-L, N_w, eta)
eta = n_air / n_water ~= 1.0 / 1.333
```

Water point:

```text
P_w = [x, h_water(p, t), z]
```

Floor intersection:

```text
lambda = (y_f - P_w.y) / R.y
P_f = P_w + lambda * R
```

Approximate caustic intensity:

```text
I_caustic ~= 1 / (abs(det(partial P_f.xz / partial p)) + epsilon)
```

This is deferred because it likely needs a render-to-texture splat/pass.

## Render Order

Target order:

1. Solid floor.
2. Caustics as part of floor shader.
3. Water body top and side wall.

Water settings:

```text
depthWrite = false
depthTest = true
transparent = true
```

Use additive/screen-style blending only for caustics if caustics become a separate pass. Prefer floor-shader caustics first to avoid sorting issues.
