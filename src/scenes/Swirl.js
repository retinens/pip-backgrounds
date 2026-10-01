import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

// Slowly rotating conic gradient, twisted and softened with noise.
export class Swirl extends ShaderScene {
  static id = 'swirl';
  static label = 'Tourbillon';
  static params = {
    twist: { label: 'Torsion', value: 0.8, min: 0, max: 4, step: 0.01 },
    arms: { label: 'Branches', value: 1, min: 1, max: 4, step: 1 },
    blur: { label: 'Flou', value: 0.6, min: 0, max: 1, step: 0.01 },
    falloff: { label: 'Fondu vers le fond', value: 0.4, min: 0, max: 1, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uTwist;
    uniform float uArms;
    uniform float uBlur;
    uniform float uFalloff;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) / uScale;
      float t = uTime * 0.1;
      vec2 q = p - 0.18 * vec2(sin(t * 1.3) * aspect, cos(t));
      float r = length(q);
      float a = atan(q.y, q.x) / 6.28318;
      float n = snoise(vec3(q * 1.4, t * 2.0)) * 0.12 * (0.3 + uBlur);
      float v = a * uArms + uTwist * r + t * 1.5 + n;

      // blur: average a few neighbouring palette positions
      vec3 col = vec3(0.0);
      for (int k = -2; k <= 2; k++) {
        col += paletteLoop(v + float(k) * 0.04 * uBlur);
      }
      col /= 5.0;
      // hide the conic singularity at the center
      vec3 avg = (uColors[0] + uColors[1] + uColors[2] + uColors[3]) * 0.25;
      col = mix(avg, col, smoothstep(0.0, 0.3, r));
      col = mix(col, uBg, uFalloff * smoothstep(0.1, 1.1, r));
      gl_FragColor = vec4(mix(uBg, col, uIntensity), 1.0);
    }
  `;
}
