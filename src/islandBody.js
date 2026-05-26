import * as THREE from 'three';

const CAUSTIC_NOISE_GLSL = `
  vec3 modCust289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec2 modCust289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec3 permute289(vec3 x) {
    return modCust289(((x * 34.0) + 1.0) * x);
  }
  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = modCust289(i);
    vec3 p = permute289(
      permute289(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
    );
    vec3 m = max(
      0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
      0.0
    );
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

const LEVEL_2_SWELL_GLSL = `
  const float WAVE_PI = 3.141592653589793;

  uniform float uWaveLevel2Enabled;
  uniform float uWaveAmplitude;
  uniform float uWaveWavelength;
  uniform float uWaveSpeed;
  uniform float uWaveDirectionDegrees;
  uniform float uWaveSecondaryStrength;
  uniform float uWaveNoiseStrength;
  uniform float uWaveSteepness;

  vec2 waveAngleToVector(float degrees) {
    float radians = degrees * WAVE_PI / 180.0;
    return vec2(cos(radians), sin(radians));
  }

  float waveHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float waveValueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = waveHash(i);
    float b = waveHash(i + vec2(1.0, 0.0));
    float c = waveHash(i + vec2(0.0, 1.0));
    float d = waveHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float waveFbm2(vec2 p) {
    float value = waveValueNoise(p) * 0.5;
    value += waveValueNoise(p * 2.0) * 0.275;
    return value / 0.775;
  }

  float waveFbm3(vec2 p) {
    float value = waveValueNoise(p) * 0.5;
    value += waveValueNoise(p * 2.0) * 0.275;
    value += waveValueNoise(p * 4.0) * 0.15125;
    return value / 0.92625;
  }

  float getWavePhaseWarp(
    vec2 p,
    vec2 baseDirection,
    float baseTravel,
    float componentWarpScale,
    float componentWarpSpeed,
    float componentWarpStrength,
    vec2 componentSeed,
    float phaseWarp,
    float wavelength
  ) {
    if (phaseWarp == 0.0) {
      return 0.0;
    }

    float warpScale = componentWarpScale / wavelength;
    vec2 drift = baseDirection * baseTravel * componentWarpSpeed;
    float broadWarp = waveFbm3(vec2(
      p.x * warpScale - drift.x + componentSeed.x,
      p.y * warpScale - drift.y + componentSeed.y
    )) - 0.5;
    float crossWarp = waveFbm2(vec2(
      p.y * warpScale * 0.74 + drift.y * 0.35 + componentSeed.y,
      p.x * warpScale * 0.74 - drift.x * 0.35 + componentSeed.x
    )) - 0.5;

    return (
      (broadWarp + crossWarp * 0.55) *
      phaseWarp *
      componentWarpStrength *
      WAVE_PI
    );
  }

  void accumulateSwellComponent(
    vec2 p,
    vec2 baseDirection,
    float baseTravel,
    float layerWeight,
    float componentAmplitude,
    float componentWavelength,
    float componentSpeed,
    float componentDirectionOffset,
    float componentPhase,
    float componentCrest,
    float componentWarpScale,
    float componentWarpSpeed,
    float componentWarpStrength,
    vec2 componentSeed,
    inout float height,
    inout float amplitudeSum
  ) {
    if (layerWeight == 0.0) {
      return;
    }

    float layerMix = clamp(uWaveSecondaryStrength, 0.0, 1.0);
    float phaseWarp = clamp(uWaveNoiseStrength, 0.0, 1.0);
    float steepness = clamp(uWaveSteepness, 0.0, 1.0);
    float baseWavelength = max(0.2, uWaveWavelength);
    float wavelength = max(0.2, baseWavelength * componentWavelength);
    float amplitude = uWaveAmplitude * componentAmplitude * layerWeight;
    float waveNumber = (WAVE_PI * 2.0) / wavelength;
    float speed =
      uWaveSpeed *
      componentSpeed *
      sqrt(wavelength / baseWavelength);
    vec2 componentDirection = waveAngleToVector(
      uWaveDirectionDegrees + componentDirectionOffset * layerMix
    );
    float along = dot(p, componentDirection);
    float phase =
      waveNumber * (along - speed * uTime) +
      componentPhase +
      getWavePhaseWarp(
        p,
        baseDirection,
        baseTravel,
        componentWarpScale,
        componentWarpSpeed,
        componentWarpStrength,
        componentSeed,
        phaseWarp,
        wavelength
      );
    float sine = sin(phase);
    float crestAmount = steepness * componentCrest;
    float shapedSine =
      (sine + sin(phase * 2.0 + componentPhase) * crestAmount * 0.34) /
      (1.0 + crestAmount * 0.18);

    height += shapedSine * amplitude;
    amplitudeSum += amplitude;
  }

  float getWaterSurfaceYAt(vec2 p) {
    if (uWaveLevel2Enabled < 0.5 || abs(uWaveAmplitude) < 0.0001) {
      return uWaterSurfaceY;
    }

    float layerMix = clamp(uWaveSecondaryStrength, 0.0, 1.0);
    vec2 baseDirection = waveAngleToVector(uWaveDirectionDegrees);
    float baseTravel = uWaveSpeed * uTime;
    float height = 0.0;
    float amplitudeSum = 0.0;

    accumulateSwellComponent(
      p,
      baseDirection,
      baseTravel,
      1.0,
      1.0,
      1.0,
      1.0,
      0.0,
      0.2,
      0.52,
      0.72,
      0.28,
      1.0,
      vec2(3.1, -8.4),
      height,
      amplitudeSum
    );
    accumulateSwellComponent(
      p,
      baseDirection,
      baseTravel,
      layerMix,
      0.58,
      0.74,
      1.08,
      18.0,
      2.35,
      0.42,
      0.92,
      0.34,
      0.82,
      vec2(-11.7, 5.9),
      height,
      amplitudeSum
    );
    accumulateSwellComponent(
      p,
      baseDirection,
      baseTravel,
      layerMix,
      0.38,
      0.52,
      1.24,
      -23.0,
      4.1,
      0.35,
      1.18,
      0.42,
      0.72,
      vec2(19.3, 14.2),
      height,
      amplitudeSum
    );
    accumulateSwellComponent(
      p,
      baseDirection,
      baseTravel,
      layerMix,
      0.24,
      0.36,
      1.42,
      36.0,
      1.42,
      0.28,
      1.46,
      0.48,
      0.58,
      vec2(-4.6, 23.8),
      height,
      amplitudeSum
    );
    accumulateSwellComponent(
      p,
      baseDirection,
      baseTravel,
      layerMix,
      0.16,
      1.34,
      0.78,
      -41.0,
      5.25,
      0.18,
      0.5,
      0.22,
      0.44,
      vec2(27.8, -17.5),
      height,
      amplitudeSum
    );

    float verticalScale =
      amplitudeSum > 0.0
        ? uWaveAmplitude / max(uWaveAmplitude, amplitudeSum)
        : 1.0;
    return uWaterSurfaceY + height * verticalScale;
  }
`;

function createIslandGeometry(params) {
  const angularSegments = params.angularSegments;
  const profiles = createIslandProfiles(params);
  const positions = [];
  const colors = [];
  const indices = [];

  profiles.forEach((profile) => {
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const theta = (segment / angularSegments) * Math.PI * 2;
      const edgeScale = getIslandEdgeScale(theta, params);
      const radius = params.radius * profile.radiusScale * edgeScale;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const y = profile.y + getIslandTopOffset(x, z, profile, params);
      const color = getIslandVertexColor(profile, params);

      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  });

  for (let ring = 0; ring < profiles.length - 1; ring += 1) {
    const currentRingStart = ring * angularSegments;
    const nextRingStart = (ring + 1) * angularSegments;

    for (let segment = 0; segment < angularSegments; segment += 1) {
      const nextSegment = (segment + 1) % angularSegments;
      const a = currentRingStart + segment;
      const b = nextRingStart + segment;
      const c = currentRingStart + nextSegment;
      const d = nextRingStart + nextSegment;

      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createIslandProfiles({
  baseY,
  baseRadiusScale,
  filletSegments,
  plateauRadiusScale,
  shoreY,
  topY,
}) {
  const profiles = [
    createIslandProfile(0, topY, 0, 1),
    createIslandProfile(plateauRadiusScale * 0.32, topY, 0, 1),
    createIslandProfile(plateauRadiusScale * 0.68, topY, 0, 1),
    createIslandProfile(plateauRadiusScale, topY, 0.08, 0.85),
  ];

  for (let index = 1; index <= filletSegments; index += 1) {
    const t = index / filletSegments;
    const quarter = t * Math.PI * 0.5;
    const radiusScale =
      plateauRadiusScale + (1 - plateauRadiusScale) * Math.sin(quarter);
    const y = topY + (shoreY - topY) * (1 - Math.cos(quarter));
    const shoreMix = smoothstep(0.12, 1, t);
    const topOffsetStrength = (1 - t) * 0.35;

    profiles.push(
      createIslandProfile(radiusScale, y, shoreMix, topOffsetStrength),
    );
  }

  profiles.push(createIslandProfile(1, shoreY, 1, 0));
  profiles.push(
    createIslandProfile(
      1,
      THREE.MathUtils.lerp(shoreY, baseY, 0.46),
      1,
      0,
      0.42,
    ),
  );
  profiles.push(createIslandProfile(baseRadiusScale, baseY, 1, 0, 1));
  profiles.push(createIslandProfile(0, baseY, 1, 0, 1));

  return profiles;
}

function createIslandProfile(
  radiusScale,
  y,
  shoreMix,
  topOffsetStrength,
  underwaterMix = 0,
) {
  return {
    radiusScale,
    y,
    shoreMix,
    topOffsetStrength,
    underwaterMix,
  };
}

function getIslandEdgeScale(theta, { edgeIrregularity }) {
  const contour =
    Math.sin(theta * 2 + 0.35) * 0.24 +
    Math.sin(theta * 3 - 1.15) * 0.36 +
    Math.sin(theta * 5 + 2.1) * 0.25 +
    Math.sin(theta * 9 - 0.7) * 0.15;

  return 1 + contour * edgeIrregularity;
}

function getIslandTopOffset(x, z, profile, params) {
  const {
    crownHeight,
    plateauRadiusScale,
    topNoise,
    topNoiseFrequency,
  } = params;

  if (profile.topOffsetStrength === 0) {
    return 0;
  }

  const topFade = 1 - smoothstep(
    plateauRadiusScale * 0.72,
    1,
    profile.radiusScale,
  );
  const crown = crownHeight * (
    1 - smoothstep(0.1, plateauRadiusScale, profile.radiusScale)
  );
  const rough =
    (
      Math.sin(x * topNoiseFrequency + z * topNoiseFrequency * 0.55 + 0.4) *
        0.58 +
      Math.sin(x * topNoiseFrequency * -0.74 + z * topNoiseFrequency * 1.28 - 1.1) *
        0.42
    ) *
    topNoise;

  return (crown + rough) * topFade * profile.topOffsetStrength;
}

function getIslandVertexColor(profile, params) {
  const topColor = new THREE.Color(params.topColor);
  const shoreColor = new THREE.Color(params.shoreColor);
  const underwaterColor = new THREE.Color(params.underwaterColor);

  return topColor
    .lerp(shoreColor, profile.shoreMix)
    .lerp(underwaterColor, profile.underwaterMix);
}

function smoothstep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function createIslandBody(params) {
  const geometry = createIslandGeometry(params);

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: params.roughness,
    metalness: 0,
    vertexColors: true,
  });

  const uniforms = {
    uTime: { value: 0 },
    uCausticColor: { value: new THREE.Color(params.caustics.color) },
    uCausticScale: { value: params.caustics.scale },
    uCausticFlow: { value: new THREE.Vector2() },
    uCausticThreshold: { value: params.caustics.threshold },
    uCausticWidth: { value: params.caustics.width },
    uCausticStrength: { value: params.caustics.strength },
    uCausticNormalFade: { value: params.caustics.normalFade },
    uCausticDepthFalloff: { value: params.caustics.depthFalloff },
    uCausticSurfaceFade: { value: params.caustics.surfaceFade },
    uWaterSurfaceY: { value: params.waterSurfaceY },
    uWaveLevel2Enabled: { value: 1 },
    uWaveAmplitude: { value: 0 },
    uWaveWavelength: { value: 1 },
    uWaveSpeed: { value: 0 },
    uWaveDirectionDegrees: { value: 0 },
    uWaveSecondaryStrength: { value: 0 },
    uWaveNoiseStrength: { value: 0 },
    uWaveSteepness: { value: 0 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vIslandWorldPos;
        varying vec3 vIslandWorldNormal;`,
      )
      .replace(
        '#include <project_vertex>',
        `vIslandWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vIslandWorldNormal = normalize(mat3(modelMatrix) * normal);
         #include <project_vertex>`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform vec3 uCausticColor;
        uniform float uCausticScale;
        uniform vec2 uCausticFlow;
        uniform float uCausticThreshold;
        uniform float uCausticWidth;
        uniform float uCausticStrength;
        uniform float uCausticNormalFade;
        uniform float uCausticDepthFalloff;
        uniform float uCausticSurfaceFade;
        uniform float uWaterSurfaceY;
        varying vec3 vIslandWorldPos;
        varying vec3 vIslandWorldNormal;
        ${CAUSTIC_NOISE_GLSL}
        ${LEVEL_2_SWELL_GLSL}`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         float movingWaterY = getWaterSurfaceYAt(vIslandWorldPos.xz);
         float depthBelow = movingWaterY - vIslandWorldPos.y;
         if (depthBelow > 0.0) {
           vec2 uv = vIslandWorldPos.xz * uCausticScale;
           vec2 flow = uCausticFlow * uTime;
           float n1 = 1.0 - abs(snoise(uv - flow));
           float n2 = 1.0 - abs(
             snoise(vec2(uv.y, uv.x) - vec2(flow.y, flow.x) * 0.8)
           );
           float causticRaw = smoothstep(
             uCausticThreshold,
             uCausticThreshold + uCausticWidth,
             n1 + n2
           );
           float surfaceMask = smoothstep(
             0.0,
             max(0.0001, uCausticSurfaceFade),
             depthBelow
           );
           float depthFade = exp(-depthBelow * uCausticDepthFalloff);
           float orient = clamp(vIslandWorldNormal.y, 0.0, 1.0);
           float orientFade = mix(uCausticNormalFade, 1.0, orient);
           float amount =
             causticRaw *
             uCausticStrength *
             depthFade *
             orientFade *
             surfaceMask;
           gl_FragColor.rgb = mix(
             gl_FragColor.rgb,
             uCausticColor,
             clamp(amount, 0.0, 1.0)
           );
         }`,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.island = { uniforms, params };
  return mesh;
}

export function updateIslandBody(mesh, time, waveParams) {
  const { uniforms, params } = mesh.userData.island;
  const { caustics } = params;
  const level2 = waveParams.level2;
  const radians = (level2.directionDegrees * Math.PI) / 180;
  const flowSpeed = level2.speed * caustics.flowScale;

  uniforms.uTime.value = time;
  uniforms.uCausticScale.value = caustics.scale;
  uniforms.uCausticFlow.value.set(
    Math.cos(radians) * flowSpeed,
    Math.sin(radians) * flowSpeed,
  );
  uniforms.uCausticThreshold.value = caustics.threshold;
  uniforms.uCausticWidth.value = caustics.width;
  uniforms.uCausticStrength.value = caustics.strength;
  uniforms.uCausticNormalFade.value = caustics.normalFade;
  uniforms.uCausticDepthFalloff.value = caustics.depthFalloff;
  uniforms.uCausticSurfaceFade.value = caustics.surfaceFade;
  uniforms.uWaterSurfaceY.value = params.waterSurfaceY;
  uniforms.uWaveLevel2Enabled.value = level2.enabled ? 1 : 0;
  uniforms.uWaveAmplitude.value = level2.amplitude;
  uniforms.uWaveWavelength.value = level2.wavelength;
  uniforms.uWaveSpeed.value = level2.speed;
  uniforms.uWaveDirectionDegrees.value = level2.directionDegrees;
  uniforms.uWaveSecondaryStrength.value = level2.secondaryStrength;
  uniforms.uWaveNoiseStrength.value = level2.noiseStrength;
  uniforms.uWaveSteepness.value = level2.steepness;
}
