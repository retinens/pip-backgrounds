import * as THREE from 'three';
import { BaseScene } from '../engine/Scene.js';
import { COMMON_UNIFORMS, NOISE, PALETTE } from '../shaders/common.js';

const WIDTH = 16;
const NEAR_Z = 4;
const FAR_Z = -20;
const SEGMENTS = 220;

export class WaveLines extends BaseScene {
  static id = 'waves';
  static label = 'Lignes ondulantes';
  static params = {
    rows: { label: 'Lignes', value: 60, min: 10, max: 160, step: 1, rebuild: true },
    grid: { label: 'Grille', value: false, rebuild: true },
    amp: { label: 'Amplitude', value: 0.9, min: 0, max: 3, step: 0.01 },
    freq: { label: 'Fréquence', value: 1, min: 0.2, max: 3, step: 0.01 },
    tilt: { label: 'Inclinaison caméra', value: 0.35, min: 0, max: 1, step: 0.01 },
  };

  init() {
    this.camera = new THREE.PerspectiveCamera(45, this.aspect, 0.1, 100);
    Object.assign(this.uniforms, {
      uAmp: { value: this.params.amp },
      uFreq: { value: this.params.freq },
    });
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: COMMON_UNIFORMS + /* glsl */ `
        uniform float uAmp;
        uniform float uFreq;
        attribute float aRow;
        varying float vRow;
        varying float vDepth;
        varying float vH;
      ` + NOISE + /* glsl */ `
        void main() {
          vec3 pos = position;
          float t = uTime * 0.25;
          vec2 q = pos.xz * uFreq / uScale;
          float h = snoise(vec3(q * 0.15, t)) + 0.4 * snoise(vec3(q * 0.4, t * 1.3));
          pos.y += h * uAmp;
          vH = h;
          vRow = aRow;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: COMMON_UNIFORMS + /* glsl */ `
        varying float vRow;
        varying float vDepth;
        varying float vH;
      ` + PALETTE + /* glsl */ `
        void main() {
          vec3 col = palette(vRow + 0.12 * vH);
          float fog = smoothstep(26.0, 3.0, vDepth);
          gl_FragColor = vec4(mix(uBg, col, fog * uIntensity), 1.0);
        }
      `,
    });
    this.build();
  }

  build() {
    const rows = this.params.rows;
    const positions = [];
    const rowAttr = [];
    const line = (ax, az, bx, bz, row) => {
      positions.push(ax, 0, az, bx, 0, bz);
      rowAttr.push(row, row);
    };
    for (let r = 0; r < rows; r++) {
      const f = r / (rows - 1);
      const z = FAR_Z + f * (NEAR_Z - FAR_Z);
      for (let i = 0; i < SEGMENTS; i++) {
        const x0 = -WIDTH + (2 * WIDTH * i) / SEGMENTS;
        const x1 = -WIDTH + (2 * WIDTH * (i + 1)) / SEGMENTS;
        line(x0, z, x1, z, f);
      }
    }
    if (this.params.grid) {
      const cols = Math.round(rows * 1.4);
      const zSegs = Math.round(SEGMENTS / 2);
      for (let c = 0; c <= cols; c++) {
        const x = -WIDTH + (2 * WIDTH * c) / cols;
        for (let i = 0; i < zSegs; i++) {
          const z0 = FAR_Z + ((NEAR_Z - FAR_Z) * i) / zSegs;
          const z1 = FAR_Z + ((NEAR_Z - FAR_Z) * (i + 1)) / zSegs;
          line(x, z0, x, z1, (i + 0.5) / zSegs);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aRow', new THREE.Float32BufferAttribute(rowAttr, 1));
    this.lines = new THREE.LineSegments(geometry, this.material);
    this.lines.frustumCulled = false;
    this.scene.add(this.lines);
  }

  rebuild() {
    this.scene.remove(this.lines);
    this.lines.geometry.dispose();
    this.build();
  }

  onParams(p) {
    const tilt = p.tilt;
    this.camera.position.set(0, 0.6 + tilt * 5, 6);
    this.camera.lookAt(0, -tilt * 1.5, -6);
  }

  onResize() {
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }
}
