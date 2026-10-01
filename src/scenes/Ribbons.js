import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

// Layered diagonal color bands with flowing edges (Stripe-like).
export class Ribbons extends ShaderScene {
  static id = 'ribbons';
  static label = 'Vagues de couleur';
  static params = {
    angle: { label: 'Angle (°)', value: -20, min: -90, max: 90, step: 1 },
    wave: { label: 'Ondulation', value: 1, min: 0, max: 2.5, step: 0.01 },
    softness: { label: 'Douceur des bords', value: 0.12, min: 0.005, max: 0.5, step: 0.005 },
    spread: { label: 'Écart des bandes', value: 1, min: 0.3, max: 2, step: 0.01 },
    depth: { label: 'Ombres', value: 0.5, min: 0, max: 1, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uAngle;
    uniform float uWave;
    uniform float uSoftness;
    uniform float uSpread;
    uniform float uDepth;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) / uScale;
      float t = uTime * 0.15;
      float a = radians(uAngle);
      vec2 dir = vec2(-sin(a), cos(a));
      float s = dot(p, dir);
      float x = dot(p, vec2(dir.y, -dir.x));

      vec3 col = uBg;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float edge = mix(-0.55, 0.45, (fi + 0.5) / 4.0) * uSpread;
        float w = uWave * (
          0.14 * sin(x * 1.8 + t * (1.0 + fi * 0.3) + fi * 1.7)
          + 0.10 * snoise(vec2(x * 0.7 + fi * 5.0, t * 0.6))
        );
        float d = s + w - edge;
        // band i covers everything past its edge; later bands stack on top
        float m = smoothstep(-uSoftness, uSoftness, d);
        // soft shadow cast on the band underneath, just before the edge
        col *= 1.0 - uDepth * 0.35 * (1.0 - m) * exp(min(d, 0.0) * 9.0);
        col = mix(col, paletteColor(i), m * uIntensity);
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
