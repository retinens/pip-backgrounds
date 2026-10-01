import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

export class MeshGradient extends ShaderScene {
  static id = 'mesh';
  static label = 'Mesh gradient';
  static params = {
    warp: { label: 'Distorsion', value: 0.6, min: 0, max: 2, step: 0.01 },
    sharpness: { label: 'Netteté', value: 2.4, min: 1, max: 5, step: 0.01 },
    spread: { label: 'Étendue', value: 0.45, min: 0.1, max: 0.8, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uWarp;
    uniform float uSharpness;
    uniform float uSpread;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) / uScale;
      float t = uTime * 0.15;
      p += uWarp * 0.3 * vec2(snoise(vec3(p * 1.2, t)), snoise(vec3(p * 1.2 + 7.3, t)));

      vec3 col = vec3(0.0);
      float wsum = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 c = vec2(
          sin(t * (0.9 + fi * 0.23) + fi * 1.7) * aspect,
          cos(t * (0.7 + fi * 0.31) + fi * 2.9)
        ) * uSpread / uScale;
        float w = 1.0 / pow(length(p - c) + 0.05, uSharpness);
        col += uColors[i] * w;
        wsum += w;
      }
      col /= wsum;
      gl_FragColor = vec4(mix(uBg, col, uIntensity), 1.0);
    }
  `;
}
