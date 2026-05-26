import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createWaterBody, updateWaterBody } from './waterBody.js';
import { createFloorBody, updateFloorBody } from './floorBody.js';
import { createIslandBody, updateIslandBody } from './islandBody.js';
import { createWaterTuningMenu } from './waterTuningMenu.js';
import './styles.css';

const SCENE_PARAMS = {
  backgroundColor: 0xd7edf0,
};

const CAMERA_PARAMS = {
  fov: 45,
  near: 0.1,
  far: 80,
  position: [6.3, 4.2, 9.3],
  target: [0, 0, 0],
};

const CONTROLS_PARAMS = {
  enableDamping: true,
  dampingFactor: 0.06,
  minDistance: 3,
  maxDistance: 12,
  maxPolarAngle: Math.PI * 0.49,
};

const SUN_PARAMS = {
  color: 0xfff0bf,
  intensity: 3.2,
  distance: 7.5,
  height: 3.4,
  initialAngleDegrees: 180,
  position: new THREE.Vector3(),
  glow: {
    size: 2.6,
    coreColor: 0xfff8d6,
  },
};

const sunAngleRad = (SUN_PARAMS.initialAngleDegrees * Math.PI) / 180;
SUN_PARAMS.position.set(
  Math.sin(sunAngleRad) * SUN_PARAMS.distance,
  SUN_PARAMS.height,
  Math.cos(sunAngleRad) * SUN_PARAMS.distance,
);

const AUTO_ROTATE_PARAMS = {
  enabledByDefault: true,
  speed: 0.6,
};

const LEVEL_1_NOISE_PRESETS = {
  calm: {
    label: 'Calm',
    values: {
      amplitude: 0.018,
      frequency: 5.2,
      speed: 1.2,
      octaves: 2,
      morphRadius: 0.45,
    },
  },
  ripple: {
    label: 'Ripple',
    values: {
      amplitude: 0.036,
      frequency: 8.4,
      speed: 2.2,
      octaves: 3,
      morphRadius: 0.85,
    },
  },
  active: {
    label: 'Active',
    values: {
      amplitude: 0.056,
      frequency: 11.2,
      speed: 3.3,
      octaves: 4,
      morphRadius: 1.15,
    },
  },
};

const WATER_PARAMS = {
  radius: 3.8,
  surfaceY: 0,
  depth: 0.46,
  radialSegments: 64,
  angularSegments: 192,
  baseColor: 0x50d4df,
  reflectionColor: 0xe1fbff,
  surfaceAlpha: 0.5,
  sideAlpha: 0.44,
  fresnelStrength: 0.82,
  fresnelPower: 4.8,
  sunReflection: {
    position: SUN_PARAMS.position,
    color: 0xfff4c8,
    strength: 0.72,
    shininess: 96,
    spread: 0.28,
  },
  slopeShading: {
    lightColor: 0xcafcff,
    shadowColor: 0x2297a8,
    lightStrength: 0.42,
    shadowStrength: 0.46,
    normalBoost: 9.5,
  },
  normalBlending: {
    level1Strength: 0.74,
    sampleStep: 0.055,
    maxSlope: 1.15,
  },
  depthTint: {
    deepColor: 0x1a6577,
    attenuation: 1.4,
  },
  refraction: {
    strength: 0.04,
    mix: 0.55,
    dispersion: 0,
    texture: null,
    viewportSize: new THREE.Vector2(),
  },
  waves: {
    level1: {
      enabled: true,
      ...LEVEL_1_NOISE_PRESETS.ripple.values,
    },
    level2: {
      enabled: true,
      amplitude: 0.18,
      wavelength: 3.8,
      speed: 0.58,
      directionDegrees: -28,
      secondaryStrength: 0.68,
      noiseStrength: 0.3,
      steepness: 0.38,
    },
  },
};

const FLOOR_PARAMS = {
  radius: WATER_PARAMS.radius,
  y: WATER_PARAMS.surfaceY - WATER_PARAMS.depth,
  angularSegments: 192,
  color: 0x9ea995,
  maskRadius: WATER_PARAMS.radius,
  maskEdgeFade: 0.55,
  caustics: {
    color: 0xf3ffff,
    scale: 0.7,
    flowScale: 0.7,
    threshold: 1.22,
    width: 0.8,
    strength: 1.05,
  },
};

const ISLAND_PARAMS = {
  topColor: 0x86d642,
  shoreColor: 0xeacd91,
  underwaterColor: 0xa9825b,
  radius: 2.45,
  angularSegments: 128,
  plateauRadiusScale: 0.56,
  baseRadiusScale: 0.94,
  filletSegments: 7,
  baseY: WATER_PARAMS.surfaceY - WATER_PARAMS.depth,
  shoreY: WATER_PARAMS.surfaceY - 0.015,
  topY: WATER_PARAMS.surfaceY + 0.22,
  waterSurfaceY: WATER_PARAMS.surfaceY,
  edgeIrregularity: 0.1,
  crownHeight: 0.016,
  topNoise: 0.014,
  topNoiseFrequency: 2.2,
  roughness: 0.95,
  caustics: {
    color: FLOOR_PARAMS.caustics.color,
    scale: FLOOR_PARAMS.caustics.scale,
    flowScale: FLOOR_PARAMS.caustics.flowScale,
    threshold: FLOOR_PARAMS.caustics.threshold,
    width: FLOOR_PARAMS.caustics.width,
    strength: 1.1,
    normalFade: 0.35,
    depthFalloff: 4.5,
    // @todo: Tighten the island caustic mask if wave-edge overshoot becomes visible at stronger swell settings.
    surfaceFade: 0.035,
  },
};

const AMBIENT_LIGHT_PARAMS = {
  skyColor: 0xe8f6f7,
  groundColor: 0x8a7044,
  intensity: 0.55,
};

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_PARAMS.backgroundColor);

const camera = new THREE.PerspectiveCamera(
  CAMERA_PARAMS.fov,
  window.innerWidth / window.innerHeight,
  CAMERA_PARAMS.near,
  CAMERA_PARAMS.far,
);
camera.position.set(...CAMERA_PARAMS.position);
camera.lookAt(...CAMERA_PARAMS.target);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = CONTROLS_PARAMS.enableDamping;
controls.dampingFactor = CONTROLS_PARAMS.dampingFactor;
controls.minDistance = CONTROLS_PARAMS.minDistance;
controls.maxDistance = CONTROLS_PARAMS.maxDistance;
controls.maxPolarAngle = CONTROLS_PARAMS.maxPolarAngle;
controls.target.set(...CAMERA_PARAMS.target);
controls.autoRotate = AUTO_ROTATE_PARAMS.enabledByDefault;
controls.autoRotateSpeed = AUTO_ROTATE_PARAMS.speed;

const sun = new THREE.DirectionalLight(SUN_PARAMS.color, SUN_PARAMS.intensity);
sun.position.copy(SUN_PARAMS.position);
scene.add(sun);
scene.add(sun.target);

const ambientLight = new THREE.HemisphereLight(
  AMBIENT_LIGHT_PARAMS.skyColor,
  AMBIENT_LIGHT_PARAMS.groundColor,
  AMBIENT_LIGHT_PARAMS.intensity,
);
scene.add(ambientLight);

const sunGlow = createSunGlow(SUN_PARAMS);
sunGlow.position.copy(sun.position);
scene.add(sunGlow);

const refractionTarget = new THREE.WebGLRenderTarget(1, 1, {
  depthBuffer: true,
});
WATER_PARAMS.refraction.texture = refractionTarget.texture;

function syncRefractionViewport() {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  refractionTarget.setSize(size.x, size.y);
  WATER_PARAMS.refraction.viewportSize.copy(size);
}

syncRefractionViewport();

const floor = createFloorBody(FLOOR_PARAMS);
scene.add(floor);

const island = createIslandBody(ISLAND_PARAMS);
scene.add(island);

const water = createWaterBody(WATER_PARAMS);
scene.add(water);
createWaterTuningMenu({
  params: WATER_PARAMS,
  floorParams: FLOOR_PARAMS,
  presets: LEVEL_1_NOISE_PRESETS,
  initialPreset: 'ripple',
});

const clock = new THREE.Clock();

function resizeRenderer() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  syncRefractionViewport();
}

function createSunGlow({ color, glow }) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uCoreColor: { value: new THREE.Color(glow.coreColor) },
      uSize: { value: glow.size },
    },
    vertexShader: `
      uniform float uSize;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mvCenter.xy += position.xy * uSize;
        gl_Position = projectionMatrix * mvCenter;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      void main() {
        vec2 d = vUv - 0.5;
        float r = length(d) * 2.0;
        if (r > 1.0) discard;
        float core = 1.0 - smoothstep(0.0, 0.14, r);
        float disc = 1.0 - smoothstep(0.14, 0.24, r);
        float halo = exp(-r * r * 5.5);
        vec3 color = mix(uColor, uCoreColor, core);
        float alpha = clamp(disc + halo * 0.55, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 0;
  return mesh;
}

function setupRotationFab() {
  const button = document.querySelector('#rotation-fab');
  if (!button) return;
  const apply = (enabled) => {
    controls.autoRotate = enabled;
    button.setAttribute('aria-pressed', String(enabled));
  };
  apply(AUTO_ROTATE_PARAMS.enabledByDefault);
  button.addEventListener('click', () => {
    apply(!controls.autoRotate);
  });
}

setupRotationFab();

function animate() {
  const elapsed = clock.getElapsedTime();
  controls.update();
  updateFloorBody(floor, elapsed, WATER_PARAMS.waves);
  updateIslandBody(island, elapsed, WATER_PARAMS.waves);
  updateWaterBody(water, elapsed);

  water.visible = false;
  renderer.setRenderTarget(refractionTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  water.visible = true;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeRenderer);
animate();
