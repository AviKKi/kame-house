import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createWaterBody, updateWaterBody } from './waterBody.js';
import { createFloorBody, updateFloorBody } from './floorBody.js';
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
  position: [0.0, 2.0, -4.0],
  markerRadius: 0.35,
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
    scale: 1.4,
    speed: 0.22,
    threshold: 1.22,
    width: 0.8,
    strength: 1.05,
  },
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

const sun = new THREE.DirectionalLight(SUN_PARAMS.color, SUN_PARAMS.intensity);
sun.position.set(...SUN_PARAMS.position);
scene.add(sun);
scene.add(sun.target);

const sunMarker = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_PARAMS.markerRadius, 32, 16),
  new THREE.MeshBasicMaterial({
    color: SUN_PARAMS.color,
  }),
);
sunMarker.position.copy(sun.position);
scene.add(sunMarker);

const floor = createFloorBody(FLOOR_PARAMS);
scene.add(floor);

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
}

function animate() {
  const elapsed = clock.getElapsedTime();
  updateFloorBody(floor, elapsed);
  updateWaterBody(water, elapsed);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeRenderer);
animate();
