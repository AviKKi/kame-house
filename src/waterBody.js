import * as THREE from 'three';

const LEVEL_2_SWELL_COMPONENTS = [
  {
    amplitude: 1,
    wavelength: 1,
    speed: 1,
    directionOffset: 0,
    phase: 0.2,
    steepness: 1,
    crest: 0.52,
    warpScale: 0.72,
    warpSpeed: 0.28,
    warpStrength: 1,
    seed: [3.1, -8.4],
  },
  {
    amplitude: 0.58,
    wavelength: 0.74,
    speed: 1.08,
    directionOffset: 18,
    phase: 2.35,
    steepness: 0.82,
    crest: 0.42,
    warpScale: 0.92,
    warpSpeed: 0.34,
    warpStrength: 0.82,
    seed: [-11.7, 5.9],
  },
  {
    amplitude: 0.38,
    wavelength: 0.52,
    speed: 1.24,
    directionOffset: -23,
    phase: 4.1,
    steepness: 0.64,
    crest: 0.35,
    warpScale: 1.18,
    warpSpeed: 0.42,
    warpStrength: 0.72,
    seed: [19.3, 14.2],
  },
  {
    amplitude: 0.24,
    wavelength: 0.36,
    speed: 1.42,
    directionOffset: 36,
    phase: 1.42,
    steepness: 0.48,
    crest: 0.28,
    warpScale: 1.46,
    warpSpeed: 0.48,
    warpStrength: 0.58,
    seed: [-4.6, 23.8],
  },
  {
    amplitude: 0.16,
    wavelength: 1.34,
    speed: 0.78,
    directionOffset: -41,
    phase: 5.25,
    steepness: 0.34,
    crest: 0.18,
    warpScale: 0.5,
    warpSpeed: 0.22,
    warpStrength: 0.44,
    seed: [27.8, -17.5],
  },
];

const LEVEL_2_PHASE_WARP_OCTAVES = 3;

const WATER_SURFACE_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const WATER_SIDE_VERTEX_SHADER = `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const WATER_SIDE_FRAGMENT_SHADER = `
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform float uDepthAttenuation;
  uniform float uSurfaceY;
  uniform float uAlpha;

  varying vec3 vWorldPosition;

  void main() {
    float depth = max(0.0, uSurfaceY - vWorldPosition.y);
    float transmission = exp(-uDepthAttenuation * depth);
    vec3 color = mix(uDeepColor, uShallowColor, transmission);
    gl_FragColor = vec4(color, uAlpha);
  }
`;

const WATER_SURFACE_FRAGMENT_SHADER = `
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform float uDepthAttenuation;
  uniform float uFloorY;
  uniform vec3 uReflectionColor;
  uniform float uAlpha;
  uniform float uFresnelStrength;
  uniform float uFresnelPower;
  uniform vec3 uSunPosition;
  uniform vec3 uSunReflectionColor;
  uniform float uSunReflectionStrength;
  uniform float uSunReflectionShininess;
  uniform float uSunReflectionSpread;
  uniform vec3 uSlopeLightColor;
  uniform vec3 uSlopeShadowColor;
  uniform float uSlopeLightStrength;
  uniform float uSlopeShadowStrength;
  uniform float uSlopeNormalBoost;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

    float depth = max(0.0, vWorldPosition.y - uFloorY);
    float cosView = max(0.05, viewDirection.y);
    float pathLength = depth / cosView;
    float transmission = exp(-uDepthAttenuation * pathLength);
    vec3 baseColor = mix(uDeepColor, uShallowColor, transmission);

    float facing = max(0.0, dot(normal, viewDirection));
    float fresnel = pow(1.0 - facing, uFresnelPower) * uFresnelStrength;

    vec3 color = mix(baseColor, uReflectionColor, fresnel);
    vec3 lightDirection = normalize(uSunPosition - vWorldPosition);
    vec2 lightPlanar = normalize(lightDirection.xz);
    float slope = dot(normal.xz * uSlopeNormalBoost, lightPlanar);
    float litSlope = clamp(max(0.0, slope), 0.0, 1.0);
    float shadowSlope = clamp(max(0.0, -slope), 0.0, 1.0);
    color = mix(color, uSlopeLightColor, litSlope * uSlopeLightStrength);
    color = mix(color, uSlopeShadowColor, shadowSlope * uSlopeShadowStrength);

    vec3 reflectedLight = reflect(-lightDirection, normal);
    float alignment = max(0.0, dot(reflectedLight, viewDirection));
    float tightGlint = pow(alignment, uSunReflectionShininess);
    float broadGlint = pow(
      alignment,
      max(1.0, uSunReflectionShininess * uSunReflectionSpread)
    );
    float sunGlint = (tightGlint + broadGlint * 0.28) * uSunReflectionStrength;
    sunGlint = clamp(sunGlint, 0.0, 0.82);
    color = mix(color, uSunReflectionColor, sunGlint);

    float alpha = clamp(uAlpha + fresnel * 0.24, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createWaterBody(params) {
  const group = new THREE.Group();
  const surfaceGeometry = createWaterSurfaceGeometry(params);
  const sideGeometry = createWaterSideGeometry(params);
  const surfaceMaterial = createWaterSurfaceMaterial(params);
  const sideMaterial = createWaterSideMaterial(params);

  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.renderOrder = 2;
  surface.frustumCulled = false;

  const side = new THREE.Mesh(sideGeometry, sideMaterial);
  side.renderOrder = 1;
  side.frustumCulled = false;

  group.add(side, surface);
  group.userData.water = {
    params,
    surfaceGeometry,
    sideGeometry,
    surfaceMaterial,
    sideMaterial,
  };

  updateWaterBody(group, 0);

  return group;
}

export function updateWaterBody(group, time) {
  const {
    params,
    surfaceGeometry,
    sideGeometry,
    surfaceMaterial,
    sideMaterial,
  } = group.userData.water;
  updateSurfaceGeometry(surfaceGeometry, params, time);
  updateSideGeometry(sideGeometry, params, time);
  updateWaterMaterial(surfaceMaterial, params);
  updateSideMaterial(sideMaterial, params);
}

function createWaterSurfaceGeometry({
  radius,
  radialSegments,
  angularSegments,
}) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const uvs = [0.5, 0.5];
  const indices = [];

  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const ringRadius = (ring / radialSegments) * radius;

    for (let segment = 0; segment < angularSegments; segment += 1) {
      const theta = (segment / angularSegments) * Math.PI * 2;
      const x = Math.cos(theta) * ringRadius;
      const z = Math.sin(theta) * ringRadius;

      positions.push(x, 0, z);
      normals.push(0, 1, 0);
      uvs.push(0.5 + x / (radius * 2), 0.5 + z / (radius * 2));
    }
  }

  for (let segment = 0; segment < angularSegments; segment += 1) {
    const nextSegment = (segment + 1) % angularSegments;
    indices.push(0, 1 + segment, 1 + nextSegment);
  }

  for (let ring = 1; ring < radialSegments; ring += 1) {
    const currentRingStart = 1 + (ring - 1) * angularSegments;
    const nextRingStart = 1 + ring * angularSegments;

    for (let segment = 0; segment < angularSegments; segment += 1) {
      const nextSegment = (segment + 1) % angularSegments;
      const a = currentRingStart + segment;
      const b = nextRingStart + segment;
      const c = currentRingStart + nextSegment;
      const d = nextRingStart + nextSegment;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.userData.vertexCount = positions.length / 3;
  geometry.userData.basePositions = new Float32Array(positions);

  return geometry;
}

function createWaterSideGeometry({ radius, surfaceY, depth, angularSegments }) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let segment = 0; segment < angularSegments; segment += 1) {
    const theta = (segment / angularSegments) * Math.PI * 2;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    positions.push(x, surfaceY - depth, z);
    positions.push(x, surfaceY, z);
    uvs.push(segment / angularSegments, 0);
    uvs.push(segment / angularSegments, 1);
  }

  for (let segment = 0; segment < angularSegments; segment += 1) {
    const nextSegment = (segment + 1) % angularSegments;
    const bottomA = segment * 2;
    const topA = bottomA + 1;
    const bottomB = nextSegment * 2;
    const topB = bottomB + 1;

    indices.push(bottomA, bottomB, topA);
    indices.push(topA, bottomB, topB);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.userData.basePositions = new Float32Array(positions);
  geometry.computeVertexNormals();

  return geometry;
}

function createWaterSurfaceMaterial({
  baseColor,
  reflectionColor,
  surfaceAlpha,
  fresnelStrength,
  fresnelPower,
  sunReflection,
  slopeShading,
  depthTint,
  surfaceY,
  depth,
}) {
  const floorY = surfaceY - depth;
  return new THREE.ShaderMaterial({
    vertexShader: WATER_SURFACE_VERTEX_SHADER,
    fragmentShader: WATER_SURFACE_FRAGMENT_SHADER,
    uniforms: {
      uShallowColor: { value: new THREE.Color(baseColor) },
      uDeepColor: { value: new THREE.Color(depthTint.deepColor) },
      uDepthAttenuation: { value: depthTint.attenuation },
      uFloorY: { value: floorY },
      uReflectionColor: { value: new THREE.Color(reflectionColor) },
      uAlpha: { value: surfaceAlpha },
      uFresnelStrength: { value: fresnelStrength },
      uFresnelPower: { value: fresnelPower },
      uSunPosition: { value: new THREE.Vector3(...sunReflection.position) },
      uSunReflectionColor: {
        value: new THREE.Color(sunReflection.color),
      },
      uSunReflectionStrength: { value: sunReflection.strength },
      uSunReflectionShininess: { value: sunReflection.shininess },
      uSunReflectionSpread: { value: sunReflection.spread },
      uSlopeLightColor: { value: new THREE.Color(slopeShading.lightColor) },
      uSlopeShadowColor: { value: new THREE.Color(slopeShading.shadowColor) },
      uSlopeLightStrength: { value: slopeShading.lightStrength },
      uSlopeShadowStrength: { value: slopeShading.shadowStrength },
      uSlopeNormalBoost: { value: slopeShading.normalBoost },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createWaterSideMaterial({
  baseColor,
  sideAlpha,
  surfaceY,
  depthTint,
}) {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_SIDE_VERTEX_SHADER,
    fragmentShader: WATER_SIDE_FRAGMENT_SHADER,
    uniforms: {
      uShallowColor: { value: new THREE.Color(baseColor) },
      uDeepColor: { value: new THREE.Color(depthTint.deepColor) },
      uDepthAttenuation: { value: depthTint.attenuation },
      uSurfaceY: { value: surfaceY },
      uAlpha: { value: sideAlpha },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function updateSideMaterial(material, { depthTint }) {
  material.uniforms.uDepthAttenuation.value = depthTint.attenuation;
}

function updateWaterMaterial(
  material,
  { sunReflection, slopeShading, depthTint },
) {
  material.uniforms.uSunReflectionStrength.value = sunReflection.strength;
  material.uniforms.uSunReflectionShininess.value = sunReflection.shininess;
  material.uniforms.uSunReflectionSpread.value = sunReflection.spread;
  material.uniforms.uSlopeLightStrength.value = slopeShading.lightStrength;
  material.uniforms.uSlopeShadowStrength.value = slopeShading.shadowStrength;
  material.uniforms.uSlopeNormalBoost.value = slopeShading.normalBoost;
  material.uniforms.uDepthAttenuation.value = depthTint.attenuation;
}

function updateSurfaceGeometry(geometry, params, time) {
  const position = geometry.getAttribute('position');
  const basePositions = geometry.userData.basePositions;

  for (let index = 0; index < geometry.userData.vertexCount; index += 1) {
    const baseIndex = index * 3;
    const surfacePoint = getSurfacePoint(
      basePositions[baseIndex],
      basePositions[baseIndex + 2],
      params,
      time,
    );

    position.setXYZ(index, surfacePoint.x, surfacePoint.y, surfacePoint.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  blendLevel1SurfaceNormals(geometry, params, time);
}

function updateSideGeometry(geometry, params, time) {
  const position = geometry.getAttribute('position');
  const basePositions = geometry.userData.basePositions;

  for (let segment = 0; segment < params.angularSegments; segment += 1) {
    const topIndex = segment * 2 + 1;
    const baseIndex = topIndex * 3;
    const surfacePoint = getSurfacePoint(
      basePositions[baseIndex],
      basePositions[baseIndex + 2],
      params,
      time,
    );

    position.setXYZ(topIndex, surfacePoint.x, surfacePoint.y, surfacePoint.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function getSurfacePoint(x, z, params, time) {
  const level2Displacement = getLevel2SwellDisplacement(
    x,
    z,
    params.waves.level2,
    time,
  );

  return {
    x: x + level2Displacement.x,
    y: params.surfaceY + level2Displacement.y,
    z: z + level2Displacement.z,
  };
}

function blendLevel1SurfaceNormals(geometry, params, time) {
  const { normalBlending, waves } = params;

  if (
    !normalBlending ||
    !waves.level1.enabled ||
    waves.level1.amplitude === 0 ||
    normalBlending.level1Strength === 0
  ) {
    geometry.getAttribute('normal').needsUpdate = true;
    return;
  }

  const basePositions = geometry.userData.basePositions;
  const normal = geometry.getAttribute('normal');
  const sampleStep = Math.max(0.005, normalBlending.sampleStep ?? 0.055);
  const strength = normalBlending.level1Strength ?? 0.74;
  const maxSlope = normalBlending.maxSlope ?? 1.15;

  for (let index = 0; index < geometry.userData.vertexCount; index += 1) {
    const baseIndex = index * 3;
    const x = basePositions[baseIndex];
    const z = basePositions[baseIndex + 2];
    const gradient = getLevel1Gradient(x, z, waves.level1, time, sampleStep);
    const slopeX = THREE.MathUtils.clamp(
      gradient.x,
      -maxSlope,
      maxSlope,
    );
    const slopeZ = THREE.MathUtils.clamp(
      gradient.z,
      -maxSlope,
      maxSlope,
    );
    const nextX = normal.getX(index) - slopeX * strength;
    const nextY = normal.getY(index);
    const nextZ = normal.getZ(index) - slopeZ * strength;
    const normalLength = Math.hypot(nextX, nextY, nextZ) || 1;

    normal.setXYZ(
      index,
      nextX / normalLength,
      nextY / normalLength,
      nextZ / normalLength,
    );
  }

  normal.needsUpdate = true;
}

function getLevel1Gradient(x, z, level1, time, sampleStep) {
  const halfSpan = sampleStep * 2;
  const heightX =
    getLevel1NoiseHeight(x + sampleStep, z, level1, time) -
    getLevel1NoiseHeight(x - sampleStep, z, level1, time);
  const heightZ =
    getLevel1NoiseHeight(x, z + sampleStep, level1, time) -
    getLevel1NoiseHeight(x, z - sampleStep, level1, time);

  return {
    x: heightX / halfSpan,
    z: heightZ / halfSpan,
  };
}

function getLevel1NoiseHeight(x, z, level1, time) {
  if (!level1.enabled || level1.amplitude === 0) {
    return 0;
  }

  const phase = time * level1.speed;
  const morphRadius = level1.morphRadius;
  const offsetA = {
    x: Math.cos(phase) * morphRadius,
    z: Math.sin(phase * 0.83) * morphRadius,
  };
  const offsetB = {
    x: Math.cos(phase * 0.61 + 2.4) * morphRadius,
    z: Math.sin(phase * 0.71 + 1.7) * morphRadius,
  };

  const domainX = x * level1.frequency;
  const domainZ = z * level1.frequency;
  const sampleA = fbm(
    domainX + offsetA.x,
    domainZ + offsetA.z,
    level1.octaves,
  );
  const sampleB = fbm(
    domainX + offsetB.x + 17.31,
    domainZ + offsetB.z - 9.47,
    level1.octaves,
  );
  const blend = Math.sin(phase * 0.47) * 0.5 + 0.5;
  const value = THREE.MathUtils.lerp(sampleA, sampleB, blend);

  return (value - 0.5) * level1.amplitude;
}

function getLevel2SwellDisplacement(x, z, level2, time) {
  if (!level2.enabled || level2.amplitude === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const baseDirection = angleToVector(level2.directionDegrees);
  const layerMix = THREE.MathUtils.clamp(level2.secondaryStrength, 0, 1);
  const phaseWarp = THREE.MathUtils.clamp(level2.noiseStrength, 0, 1);
  const steepness = THREE.MathUtils.clamp(level2.steepness ?? 0.34, 0, 1);
  const baseWavelength = Math.max(0.2, level2.wavelength);
  const baseTravel = level2.speed * time;
  let horizontalX = 0;
  let horizontalZ = 0;
  let height = 0;
  let amplitudeSum = 0;

  LEVEL_2_SWELL_COMPONENTS.forEach((component, index) => {
    const layerWeight = index === 0 ? 1 : layerMix;

    if (layerWeight === 0) {
      return;
    }

    const componentDirection = angleToVector(
      level2.directionDegrees + component.directionOffset * layerMix,
    );
    const wavelength = Math.max(
      0.2,
      baseWavelength * component.wavelength,
    );
    const amplitude = level2.amplitude * component.amplitude * layerWeight;
    const waveNumber = (Math.PI * 2) / wavelength;
    const speed =
      level2.speed *
      component.speed *
      Math.sqrt(wavelength / baseWavelength);
    const along = x * componentDirection.x + z * componentDirection.z;
    const phase =
      waveNumber * (along - speed * time) + component.phase + getPhaseWarp({
        x,
        z,
        baseDirection,
        baseTravel,
        component,
        phaseWarp,
        wavelength,
      });
    const sine = Math.sin(phase);
    const cosine = Math.cos(phase);
    const crestAmount = steepness * component.crest;
    const shapedSine =
      (sine + Math.sin(phase * 2 + component.phase) * crestAmount * 0.34) /
      (1 + crestAmount * 0.18);
    const horizontalOffset =
      cosine * amplitude * steepness * component.steepness;

    height += shapedSine * amplitude;
    horizontalX += componentDirection.x * horizontalOffset;
    horizontalZ += componentDirection.z * horizontalOffset;
    amplitudeSum += amplitude;
  });

  const verticalScale =
    amplitudeSum > 0
      ? level2.amplitude / Math.max(level2.amplitude, amplitudeSum)
      : 1;

  return {
    x: horizontalX,
    y: height * verticalScale,
    z: horizontalZ,
  };
}

function getPhaseWarp({
  x,
  z,
  baseDirection,
  baseTravel,
  component,
  phaseWarp,
  wavelength,
}) {
  if (phaseWarp === 0) {
    return 0;
  }

  const warpScale = component.warpScale / wavelength;
  const driftX = baseDirection.x * baseTravel * component.warpSpeed;
  const driftZ = baseDirection.z * baseTravel * component.warpSpeed;
  const broadWarp =
    fbm(
      x * warpScale - driftX + component.seed[0],
      z * warpScale - driftZ + component.seed[1],
      LEVEL_2_PHASE_WARP_OCTAVES,
    ) - 0.5;
  const crossWarp =
    fbm(
      z * warpScale * 0.74 + driftZ * 0.35 + component.seed[1],
      x * warpScale * 0.74 - driftX * 0.35 + component.seed[0],
      2,
    ) - 0.5;

  return (
    (broadWarp + crossWarp * 0.55) *
    phaseWarp *
    component.warpStrength *
    Math.PI
  );
}

function angleToVector(degrees) {
  const radians = THREE.MathUtils.degToRad(degrees);
  return {
    x: Math.cos(radians),
    z: Math.sin(radians),
  };
}

function fbm(x, z, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let amplitudeSum = 0;
  let frequency = 1;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(x * frequency, z * frequency) * amplitude;
    amplitudeSum += amplitude;
    amplitude *= 0.55;
    frequency *= 2;
  }

  return value / amplitudeSum;
}

function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = smooth(fx);
  const uz = smooth(fz);

  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uz,
  );
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function hash(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
