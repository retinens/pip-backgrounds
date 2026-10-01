import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

export class Orbs extends ShaderScene {
  static id = 'orbs';
  static label = 'Orbes minimalistes';
  static params = {
    count: { label: 'Nombre', value: 4, min: 1, max: 8, step: 1 },
    size: { label: 'Taille', value: 0.45, min: 0.1, max: 1, step: 0.01 },
    blur: { label: 'Flou', value: 0.85, min: 0.05, max: 1, step: 0.01 },
    drift: { label: 'Amplitude', value: 0.35, min: 0, max: 1, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uCount;
    uniform float uSize;
    uniform float uBlur;
    uniform float uDrift;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
      float t = uTime * 0.12;
      vec3 col = uBg;

      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        if (fi >= uCount) break;
        // spread seeds over the frame, then drift with noise
        vec2 home = vec2(fract(fi * 0.618 + 0.2) - 0.5, fract(fi * 0.382 + 0.35) - 0.5) * vec2(aspect, 1.0) * 1.1;
        vec2 c = home + uDrift * 0.5 * vec2(snoise(vec2(t, fi * 4.1)), snoise(vec2(t + 9.0, fi * 2.7))) * vec2(aspect, 1.0);
        float r = uSize * uScale * (0.7 + 0.3 * sin(fi * 3.7)) * (1.0 + 0.08 * sin(t * 2.0 + fi));
        float a = 1.0 - smoothstep(r * (1.0 - uBlur), r, length(p - c));
        col = mix(col, uColors[i - (i / 4) * 4], a * 0.85 * uIntensity);
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
