import * as THREE from 'three';

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

const WATER_SURFACE_FRAGMENT_SHADER = `
  uniform vec3 uBaseColor;
  uniform vec3 uReflectionColor;
  uniform float uAlpha;
  uniform float uFresnelStrength;
  uniform float uFresnelPower;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = max(0.0, dot(normal, viewDirection));
    float fresnel = pow(1.0 - facing, uFresnelPower) * uFresnelStrength;

    vec3 color = mix(uBaseColor, uReflectionColor, fresnel);
    float alpha = clamp(uAlpha + fresnel * 0.24, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createWaterBody(params) {
  const group = new THREE.Group();
  const surfaceGeometry = createWaterSurfaceGeometry(params);
  const sideGeometry = createWaterSideGeometry(params);

  const surface = new THREE.Mesh(
    surfaceGeometry,
    createWaterSurfaceMaterial(params),
  );
  surface.renderOrder = 2;

  const side = new THREE.Mesh(sideGeometry, createWaterSideMaterial(params));
  side.renderOrder = 1;

  group.add(side, surface);
  group.userData.water = {
    params,
    surfaceGeometry,
    sideGeometry,
  };

  updateWaterBody(group, 0);

  return group;
}

export function updateWaterBody(group, time) {
  const { params, surfaceGeometry, sideGeometry } = group.userData.water;
  updateSurfaceGeometry(surfaceGeometry, params, time);
  updateSideGeometry(sideGeometry, params, time);
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
  geometry.computeVertexNormals();

  return geometry;
}

function createWaterSurfaceMaterial({
  baseColor,
  reflectionColor,
  surfaceAlpha,
  fresnelStrength,
  fresnelPower,
}) {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_SURFACE_VERTEX_SHADER,
    fragmentShader: WATER_SURFACE_FRAGMENT_SHADER,
    uniforms: {
      uBaseColor: { value: new THREE.Color(baseColor) },
      uReflectionColor: { value: new THREE.Color(reflectionColor) },
      uAlpha: { value: surfaceAlpha },
      uFresnelStrength: { value: fresnelStrength },
      uFresnelPower: { value: fresnelPower },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createWaterSideMaterial({ sideColor, sideAlpha }) {
  return new THREE.MeshBasicMaterial({
    color: sideColor,
    transparent: true,
    opacity: sideAlpha,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function updateSurfaceGeometry(geometry, params, time) {
  const position = geometry.getAttribute('position');

  for (let index = 0; index < geometry.userData.vertexCount; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    position.setY(index, getSurfaceHeight(x, z, params, time));
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.getAttribute('normal').needsUpdate = true;
}

function updateSideGeometry(geometry, params, time) {
  const position = geometry.getAttribute('position');

  for (let segment = 0; segment < params.angularSegments; segment += 1) {
    const topIndex = segment * 2 + 1;
    const x = position.getX(topIndex);
    const z = position.getZ(topIndex);
    position.setY(topIndex, getSurfaceHeight(x, z, params, time));
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function getSurfaceHeight(x, z, { surfaceY, waves }, time) {
  return surfaceY + getLevel1NoiseHeight(x, z, waves.level1, time);
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
