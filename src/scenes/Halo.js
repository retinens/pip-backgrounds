import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

// Big soft stage-light glows rising from an edge, keynote style.
export class Halo extends ShaderScene {
  static id = 'halo';
  static label = 'Halo de scène';
  static params = {
    position: { label: 'Origine (bas → haut)', value: 0, min: 0, max: 1, step: 0.01 },
    spread: { label: 'Étendue', value: 0.45, min: 0.15, max: 1.2, step: 0.01 },
    pulse: { label: 'Respiration', value: 0.5, min: 0, max: 1, step: 0.01 },
    sweep: { label: 'Faisceau', value: 0.4, min: 0, max: 1, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uPosition;
    uniform float uSpread;
    uniform float uPulse;
    uniform float uSweep;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y);
      float t = uTime * 0.15;
      float edgeY = mix(-0.05, 1.05, uPosition);

      vec3 col = uBg;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float x = (fi - 1.5) * 0.3 * aspect + 0.22 * aspect * snoise(vec2(t * 0.4, fi * 3.0));
        vec2 d = (p - vec2(x, edgeY)) * vec2(0.8, 1.0) / uScale;
        float r = uSpread * (1.0 + uPulse * 0.25 * sin(t * 3.0 + fi * 1.7));
        float g = exp(-dot(d, d) / (r * r));
        vec3 c = paletteColor(i);
        // painted wash + a brighter core so pools of light stay distinct
        col = mix(col, c, g * 0.9 * uIntensity) + c * g * g * 0.45 * uIntensity;
      }
      // slow diagonal light beam
      float bx = p.x - (p.y - edgeY) * 0.5 - sin(t * 0.7) * aspect * 0.45;
      float beam = exp(-bx * bx * 10.0) * uSweep * 0.25 * (1.0 - abs(p.y - edgeY));
      col = mix(col, uColors[3], clamp(beam, 0.0, 1.0) * uIntensity);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
