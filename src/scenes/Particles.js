import * as THREE from 'three';
import { BaseScene } from '../engine/Scene.js';
import { COMMON_UNIFORMS } from '../shaders/common.js';

const MAX_LINKS_PER_POINT = 10;

export class Particles extends BaseScene {
  static id = 'network';
  static label = 'Réseau de particules';
  static params = {
    count: { label: 'Particules', value: 140, min: 20, max: 400, step: 1, rebuild: true },
    linkDistance: { label: 'Distance de liaison', value: 0.32, min: 0, max: 0.6, step: 0.01 },
    pointSize: { label: 'Taille des points', value: 1.6, min: 0.2, max: 4, step: 0.01 },
    lineOpacity: { label: 'Opacité des liens', value: 0.65, min: 0, max: 1, step: 0.01 },
    drift: { label: 'Vitesse de dérive', value: 1, min: 0, max: 4, step: 0.01 },
  };

  init() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.uniforms.uPointSize = { value: this.params.pointSize };
    this.pointMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      vertexShader: COMMON_UNIFORMS + /* glsl */ `
        uniform float uPointSize;
        attribute float aSize;
        attribute float aColor;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = uColors[int(aColor)];
          vAlpha = 0.65 + 0.35 * sin(uTime * 0.8 + aPhase);
          gl_PointSize = aSize * uPointSize * uRes.y / 1080.0 * uScale;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: COMMON_UNIFORMS + /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.35, d) * vAlpha * uIntensity;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });
    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
    });
    this.build();
  }

  build() {
    const n = this.params.count;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 2);
    this.colorIdx = new Float32Array(n);
    const sizes = new Float32Array(n);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.pos[i * 3] = (Math.random() * 2 - 1) * this.aspect;
      this.pos[i * 3 + 1] = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = 0.02 + Math.random() * 0.04;
      this.vel[i * 2] = Math.cos(a) * s;
      this.vel[i * 2 + 1] = Math.sin(a) * s;
      this.colorIdx[i] = i % 4;
      sizes[i] = 4 + Math.random() * 8;
      phases[i] = Math.random() * 10;
    }
    const pg = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    pg.setAttribute('position', this.posAttr);
    pg.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    pg.setAttribute('aColor', new THREE.BufferAttribute(this.colorIdx, 1));
    pg.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.points = new THREE.Points(pg, this.pointMaterial);
    this.points.frustumCulled = false;

    const maxLinks = n * MAX_LINKS_PER_POINT;
    const lg = new THREE.BufferGeometry();
    this.linePos = new Float32Array(maxLinks * 6);
    this.lineCol = new Float32Array(maxLinks * 8);
    lg.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute('color', new THREE.BufferAttribute(this.lineCol, 4).setUsage(THREE.DynamicDrawUsage));
    this.links = new THREE.LineSegments(lg, this.lineMaterial);
    this.links.frustumCulled = false;

    this.scene.add(this.links, this.points);
  }

  rebuild() {
    this.scene.remove(this.points, this.links);
    this.points.geometry.dispose();
    this.links.geometry.dispose();
    this.build();
  }

  onResize() {
    const a = this.aspect;
    Object.assign(this.camera, { left: -a, right: a, top: 1, bottom: -1 });
    this.camera.updateProjectionMatrix();
  }

  onUpdate(time, dt) {
    const n = this.params.count;
    const a = this.aspect;
    const pos = this.pos;
    const step = dt * this.params.drift;
    for (let i = 0; i < n; i++) {
      let x = pos[i * 3] + this.vel[i * 2] * step;
      let y = pos[i * 3 + 1] + this.vel[i * 2 + 1] * step;
      // wrap with a small margin so points never pop in view
      if (x > a + 0.1) x = -a - 0.1;
      else if (x < -a - 0.1) x = a + 0.1;
      if (y > 1.1) y = -1.1;
      else if (y < -1.1) y = 1.1;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
    }
    this.posAttr.needsUpdate = true;

    const maxD = this.params.linkDistance * this.uniforms.uScale.value;
    const maxD2 = maxD * maxD;
    const colors = this.uniforms.uColors.value;
    const opacity = this.params.lineOpacity * this.uniforms.uIntensity.value;
    const maxLinks = n * MAX_LINKS_PER_POINT;
    let k = 0;
    for (let i = 0; i < n && k < maxLinks; i++) {
      const xi = pos[i * 3];
      const yi = pos[i * 3 + 1];
      for (let j = i + 1; j < n && k < maxLinks; j++) {
        const dx = xi - pos[j * 3];
        const dy = yi - pos[j * 3 + 1];
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;
        const alpha = (1 - Math.sqrt(d2) / maxD) * opacity;
        this.linePos.set([xi, yi, 0, pos[j * 3], pos[j * 3 + 1], 0], k * 6);
        const ci = colors[this.colorIdx[i]];
        const cj = colors[this.colorIdx[j]];
        this.lineCol.set([ci.r, ci.g, ci.b, alpha, cj.r, cj.g, cj.b, alpha], k * 8);
        k++;
      }
    }
    const lg = this.links.geometry;
    lg.attributes.position.needsUpdate = true;
    lg.attributes.color.needsUpdate = true;
    lg.setDrawRange(0, k * 2);
  }
}
