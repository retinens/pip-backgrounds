import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

// Metaballs: soft blobs that merge, each carrying its palette color.
export class Lava extends ShaderScene {
  static id = 'lava';
  static label = 'Lampe à lave';
  static params = {
    count: { label: 'Blobs', value: 7, min: 2, max: 10, step: 1 },
    size: { label: 'Taille', value: 1, min: 0.3, max: 2.5, step: 0.01 },
    smoothness: { label: 'Douceur des bords', value: 0.35, min: 0.02, max: 0.9, step: 0.01 },
    glow: { label: 'Halo', value: 0.6, min: 0, max: 1.5, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uCount;
    uniform float uSize;
    uniform float uSmoothness;
    uniform float uGlow;
    varying vec2 vUv;
  `) + /* glsl */ `
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
      float t = uTime * 0.18;

      float field = 0.0;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 10; i++) {
        float fi = float(i);
        if (fi >= uCount) break;
        vec2 c = vec2(
          sin(t * (0.5 + 0.13 * fi) + fi * 2.1) * aspect * 0.4,
          sin(t * (0.37 + 0.11 * fi) + fi * 1.3 + 1.0) * 0.38
        ) + 0.08 * vec2(snoise(vec2(t, fi)), snoise(vec2(fi, t)));
        float r = uSize * uScale * (0.6 + 0.4 * fract(fi * 0.618)) * 0.3;
        // softened falloff: no hard color point at the blob center
        float w = r * r / (dot(p - c, p - c) + r * r * 0.15);
        field += w;
        acc += paletteColor(i) * w;
      }
      vec3 blob = acc / max(field, 1e-4);
      float inside = smoothstep(1.0 - uSmoothness, 1.0 + uSmoothness, field);
      vec3 col = mix(uBg, blob, inside * uIntensity);
      col = mix(col, blob, uGlow * 0.4 * smoothstep(0.0, 1.0, field) * (1.0 - inside) * uIntensity);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
