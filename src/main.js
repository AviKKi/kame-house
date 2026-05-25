import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createWaterBody, updateWaterBody } from './waterBody.js';
import './styles.css';

const SCENE_PARAMS = {
  backgroundColor: 0xd7edf0,
};

const CAMERA_PARAMS = {
  fov: 45,
  near: 0.1,
  far: 80,
  position: [4.2, 2.8, 6.2],
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

const WATER_PARAMS = {
  radius: 3.8,
  surfaceY: 0,
  depth: 0.46,
  radialSegments: 64,
  angularSegments: 192,
  baseColor: 0x50d4df,
  reflectionColor: 0xe1fbff,
  sideColor: 0x36b8c7,
  surfaceAlpha: 0.5,
  sideAlpha: 0.44,
  fresnelStrength: 0.82,
  fresnelPower: 4.8,
  surface: {
    enabled: true,
    amplitude: 0.08,
    frequency: 0.9,
    speed: 0.22,
    drift: [0.8, -0.45],
    octaves: 3,
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

const water = createWaterBody(WATER_PARAMS);
scene.add(water);

const clock = new THREE.Clock();

function resizeRenderer() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  updateWaterBody(water, clock.getElapsedTime());
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeRenderer);
animate();
