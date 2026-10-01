import { ShaderScene } from '../engine/Scene.js';
import { fragHeader } from '../shaders/common.js';

// 3×3 grid of color nodes (like a Figma / Illustrator mesh), interpolated and warped.
export class MeshGrid extends ShaderScene {
  static id = 'meshgrid';
  static label = 'Mesh 3×3';
  static params = {
    warp: { label: 'Distorsion', value: 0.8, min: 0, max: 2, step: 0.01 },
    cycle: { label: 'Rotation des couleurs', value: 0.25, min: 0, max: 2, step: 0.01 },
    smoothness: { label: 'Douceur', value: 1, min: 0, max: 1, step: 0.01 },
  };

  static fragment = fragHeader(/* glsl */ `
    uniform float uWarp;
    uniform float uCycle;
    uniform float uSmoothness;
    varying vec2 vUv;
  `) + /* glsl */ `
    float gShift;

    // node (ix, iy) of the grid; colors slide to the next palette entry over time
    vec3 node(vec2 ij) {
      int idx = int(ij.x) + int(ij.y) * 3 + int(floor(gShift));
      return mix(paletteColor(idx), paletteColor(idx + 1), smoothstep(0.0, 1.0, fract(gShift)));
    }

    void main() {
      float aspect = uRes.x / uRes.y;
      float t = uTime * 0.12;
      gShift = t * uCycle;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) / uScale;
      vec2 uv = (vUv - 0.5) / uScale + 0.5;
      uv += uWarp * 0.18 * vec2(snoise(vec3(p * 0.9, t)), snoise(vec3(p * 0.9 + 4.7, t)));

      vec2 g = clamp(uv, 0.0, 1.0) * 2.0;
      vec2 cell = min(floor(g), vec2(1.0));
      vec2 f = g - cell;
      f = mix(f, f * f * (3.0 - 2.0 * f), uSmoothness);

      vec3 col = mix(
        mix(node(cell), node(cell + vec2(1.0, 0.0)), f.x),
        mix(node(cell + vec2(0.0, 1.0)), node(cell + vec2(1.0, 1.0)), f.x),
        f.y
      );
      gl_FragColor = vec4(mix(uBg, col, uIntensity), 1.0);
    }
  `;
}
