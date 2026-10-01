import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

export class Aurora extends ShaderScene {
  static id = 'aurora';
  static label = 'Aurore';
  static params = {
    layers: { label: 'Rubans', value: 4, min: 1, max: 6, step: 1 },
    height: { label: 'Hauteur', value: 1, min: 0.3, max: 3, step: 0.01 },
    shimmer: { label: 'Scintillement', value: 0.6, min: 0, max: 1, step: 0.01 },
    position: { label: 'Position', value: 0.3, min: 0, max: 0.8, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uLayers;
    uniform float uHeight;
    uniform float uShimmer;
    uniform float uPosition;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      float x = (vUv.x - 0.5) * aspect / uScale;
      float t = uTime * 0.2;
      vec3 col = uBg * (1.0 - 0.35 * vUv.y);

      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        if (fi >= uLayers) break;
        float base = uPosition + fi * 0.08;
        float curve = base
          + 0.12 * snoise(vec2(x * 0.7 + fi * 3.1, t * 0.6 + fi * 1.3))
          + 0.04 * snoise(vec2(x * 2.2 - fi, t * 1.1));
        float d = vUv.y - curve;
        float glow = d > 0.0 ? exp(-d * 6.0 / uHeight) : exp(d * 18.0);
        float streak = 0.55 + 0.45 * snoise(vec2(x * 14.0 + fi * 10.0, t * 0.8));
        glow *= mix(1.0, streak, uShimmer);
        col += uColors[i - (i / 4) * 4] * glow * 0.5 * uIntensity;
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
