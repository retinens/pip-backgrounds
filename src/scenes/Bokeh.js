import * as THREE from 'three';
import { BaseScene } from '../engine/Scene.js';
import { COMMON_UNIFORMS } from '../shaders/common.js';

export class Bokeh extends BaseScene {
  static id = 'bokeh';
  static label = 'Bokeh';
  static params = {
    count: { label: 'Nombre', value: 60, min: 5, max: 250, step: 1, rebuild: true },
    size: { label: 'Taille', value: 1, min: 0.2, max: 3, step: 0.01 },
    rise: { label: 'Montée', value: 1, min: -3, max: 3, step: 0.01 },
    softness: { label: 'Douceur', value: 0.5, min: 0.05, max: 1, step: 0.01 },
    glow: { label: 'Mode lumière (additif)', value: true },
  };

  init() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    Object.assign(this.uniforms, {
      uSize: { value: this.params.size },
      uRise: { value: this.params.rise },
      uSoftness: { value: this.params.softness },
      uAspect: { value: this.aspect },
    });
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: COMMON_UNIFORMS + /* glsl */ `
        uniform float uSize;
        uniform float uRise;
        uniform float uAspect;
        attribute vec2 aOffset;
        attribute float aRadius;
        attribute float aColor;
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aDepth;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;
        void main() {
          float t = uTime;
          float y = mod(aOffset.y * 2.8 + t * aSpeed * 0.04 * uRise, 2.8) - 1.4;
          float x = aOffset.x * (uAspect + 0.2) + sin(t * 0.25 * aSpeed + aPhase) * 0.08;
          float r = aRadius * uSize * uScale;
          vec3 pos = vec3(x + position.x * r, y + position.y * r, 0.0);
          vUv = uv;
          vColor = uColors[int(aColor)];
          vAlpha = 0.55 + 0.45 * sin(t * 0.5 + aPhase);
          vDepth = aDepth;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: COMMON_UNIFORMS + /* glsl */ `
        uniform float uSoftness;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float soft = mix(0.04, 0.9, clamp(uSoftness * (0.4 + vDepth), 0.0, 1.0));
          float disc = 1.0 - smoothstep(1.0 - soft, 1.0, d);
          float rim = smoothstep(0.6, 0.95, d) * disc * 0.35 * (1.0 - vDepth);
          float a = (disc * 0.45 + rim) * vAlpha * mix(1.0, 0.45, vDepth) * uIntensity;
          if (a <= 0.001) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });
    this.build();
  }

  build() {
    const n = this.params.count;
    const base = new THREE.PlaneGeometry(2, 2);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute('position', base.attributes.position);
    geometry.setAttribute('uv', base.attributes.uv);
    const attr = (size, fn) => {
      const arr = new Float32Array(n * size);
      for (let i = 0; i < n; i++) {
        const v = fn(i);
        if (size === 1) arr[i] = v;
        else arr.set(v, i * size);
      }
      return new THREE.InstancedBufferAttribute(arr, size);
    };
    const depths = Array.from({ length: n }, () => Math.random());
    geometry.setAttribute('aOffset', attr(2, () => [Math.random() * 2 - 1, Math.random()]));
    geometry.setAttribute('aDepth', attr(1, (i) => depths[i]));
    // far = bigger and blurrier, near = small and crisp
    geometry.setAttribute('aRadius', attr(1, (i) => 0.03 + depths[i] * 0.16 + Math.random() * 0.03));
    geometry.setAttribute('aColor', attr(1, (i) => i % 4));
    geometry.setAttribute('aPhase', attr(1, () => Math.random() * Math.PI * 2));
    geometry.setAttribute('aSpeed', attr(1, (i) => 0.5 + (1 - depths[i]) * 1.2));
    geometry.instanceCount = n;
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  rebuild() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.build();
  }

  onParams(p) {
    this.material.blending = p.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.material.needsUpdate = true;
  }

  onResize() {
    const a = this.aspect;
    Object.assign(this.camera, { left: -a, right: a, top: 1, bottom: -1 });
    this.camera.updateProjectionMatrix();
    this.uniforms.uAspect.value = a;
  }
}
