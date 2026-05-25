import * as THREE from 'three';

const FLOOR_VERTEX_SHADER = `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FLOOR_FRAGMENT_SHADER = `
  uniform vec3 uFloorColor;
  uniform vec3 uCausticColor;
  uniform float uTime;
  uniform float uCausticScale;
  uniform vec2 uCausticFlow;
  uniform float uCausticThreshold;
  uniform float uCausticWidth;
  uniform float uCausticStrength;
  uniform float uMaskRadius;
  uniform float uMaskEdgeFade;

  varying vec3 vWorldPosition;

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

  void main() {
    vec2 p = vWorldPosition.xz;
    float radial = length(p);
    float footprintMask = 1.0 - smoothstep(
      uMaskRadius - uMaskEdgeFade,
      uMaskRadius,
      radial
    );

    vec2 uv = p * uCausticScale;
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
    float causticAmount = causticRaw * uCausticStrength * footprintMask;

    vec3 color = mix(uFloorColor, uCausticColor, causticAmount);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createFloorBody(params) {
  const geometry = createFloorGeometry(params);
  const material = createFloorMaterial(params);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.y = params.y;
  mesh.renderOrder = 0;
  mesh.userData.floor = { params, material };

  return mesh;
}

export function updateFloorBody(mesh, time, waveParams) {
  const { material, params } = mesh.userData.floor;
  const { caustics } = params;
  const level2 = waveParams.level2;
  const radians = (level2.directionDegrees * Math.PI) / 180;
  const flowSpeed = level2.speed * caustics.flowScale;

  material.uniforms.uTime.value = time;
  material.uniforms.uCausticScale.value = caustics.scale;
  material.uniforms.uCausticFlow.value.set(
    Math.cos(radians) * flowSpeed,
    Math.sin(radians) * flowSpeed,
  );
  material.uniforms.uCausticThreshold.value = caustics.threshold;
  material.uniforms.uCausticWidth.value = caustics.width;
  material.uniforms.uCausticStrength.value = caustics.strength;
}

function createFloorGeometry({ radius, angularSegments }) {
  const geometry = new THREE.CircleGeometry(radius, angularSegments);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createFloorMaterial(params) {
  return new THREE.ShaderMaterial({
    vertexShader: FLOOR_VERTEX_SHADER,
    fragmentShader: FLOOR_FRAGMENT_SHADER,
    uniforms: {
      uFloorColor: { value: new THREE.Color(params.color) },
      uCausticColor: { value: new THREE.Color(params.caustics.color) },
      uTime: { value: 0 },
      uCausticScale: { value: params.caustics.scale },
      uCausticFlow: { value: new THREE.Vector2() },
      uCausticThreshold: { value: params.caustics.threshold },
      uCausticWidth: { value: params.caustics.width },
      uCausticStrength: { value: params.caustics.strength },
      uMaskRadius: { value: params.maskRadius },
      uMaskEdgeFade: { value: params.maskEdgeFade },
    },
  });
}
