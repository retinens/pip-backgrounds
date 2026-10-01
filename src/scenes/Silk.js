import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

// Domain-warped fbm (after Inigo Quilez) mapped onto the palette.
export class Silk extends ShaderScene {
  static id = 'silk';
  static label = 'Soie / fumée';
  static params = {
    warp: { label: 'Distorsion', value: 0.55, min: 0, max: 2, step: 0.01 },
    contrast: { label: 'Contraste', value: 1, min: 0.3, max: 2.5, step: 0.01 },
    sheen: { label: 'Reflets', value: 0.4, min: 0, max: 1, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uWarp;
    uniform float uContrast;
    uniform float uSheen;
    varying vec2 vUv;
  `) + /* glsl */ `
    // 3 octaves only: smoother, calmer folds than the shared 5-octave fbm
    float fbmSoft(vec3 p) {
      return 0.5 * snoise(p) + 0.25 * snoise(p * 2.02) + 0.125 * snoise(p * 4.04);
    }
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 0.75 / uScale;
      float t = uTime * 0.05;

      vec2 q = vec2(fbmSoft(vec3(p, t)), fbmSoft(vec3(p + vec2(5.2, 1.3), t)));
      vec2 r = vec2(
        fbmSoft(vec3(p + 4.0 * uWarp * q + vec2(1.7, 9.2), t * 1.3)),
        fbmSoft(vec3(p + 4.0 * uWarp * q + vec2(8.3, 2.8), t * 1.3))
      );
      float f = fbmSoft(vec3(p + 4.0 * uWarp * r, t * 1.6)) * 0.5 + 0.5;

      vec3 col = palette(clamp(length(q) * 1.1 + 0.15 * f, 0.0, 1.0));
      col = mix(col, uColors[3], clamp(length(r), 0.0, 1.0) * 0.4);
      float shade = clamp(pow(f, uContrast) * 1.4, 0.0, 1.0);
      col = mix(uBg, col, shade * uIntensity);
      col += uSheen * pow(f, 5.0) * uColors[2];
      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
