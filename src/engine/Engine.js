import * as THREE from 'three';
import { FULLSCREEN_VERT } from '../shaders/common.js';

// Colors are authored and blended as plain sRGB values: what you pick is what you get.
THREE.ColorManagement.enabled = false;

export const RESOLUTIONS = {
  'Auto (écran HiDPI)': 'auto',
  'Auto (1x)': 'auto1x',
  '1280×720': '720p',
  '1920×1080': '1080p',
  '2560×1440': '1440p',
  '3840×2160 (4K)': '4k',
};

const FIXED = {
  '720p': [1280, 720],
  '1080p': [1920, 1080],
  '1440p': [2560, 1440],
  '4k': [3840, 2160],
};

const POST_FRAG = /* glsl */ `
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform float uMix;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uNoiseSeed;
  uniform vec2 uRes;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec3 col = texture2D(tA, vUv).rgb;
    if (uMix < 1.0) {
      col = mix(texture2D(tB, vUv).rgb, col, smoothstep(0.0, 1.0, uMix));
    }
    col *= uBrightness;
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, uSaturation);

    // 0 at the center, 1 in the corners — follows the frame shape
    float r = length(vUv - 0.5) * 1.4142;
    col *= 1.0 - uVignette * smoothstep(0.3, 1.0, r);

    col += (hash(gl_FragCoord.xy + uNoiseSeed) - 0.5) * uGrain * 0.18;
    // dither to kill gradient banding
    col += (hash(gl_FragCoord.xy * 1.37 + 11.0) - 0.5) / 255.0;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(1);

    const rtOptions = { type: THREE.HalfFloatType, samples: 4, depthBuffer: true };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, rtOptions);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, rtOptions);

    this.post = {
      uniforms: {
        tA: { value: this.rtA.texture },
        tB: { value: this.rtB.texture },
        uMix: { value: 1 },
        uGrain: { value: 0 },
        uVignette: { value: 0 },
        uBrightness: { value: 1 },
        uSaturation: { value: 1 },
        uNoiseSeed: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
    };
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: this.post.uniforms,
          vertexShader: FULLSCREEN_VERT,
          fragmentShader: POST_FRAG,
          depthTest: false,
        }),
      ),
    );

    this.current = null;
    this.previous = null;
    this.fade = 1;
    this.fadeDuration = 1;
    this.resolution = 'auto';
    this.width = 1;
    this.height = 1;
  }

  setResolution(mode) {
    this.resolution = mode;
    this.resize();
  }

  resize() {
    let [w, h] = FIXED[this.resolution] || [];
    if (!w) {
      const dpr = this.resolution === 'auto' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      w = Math.round(window.innerWidth * dpr);
      h = Math.round(window.innerHeight * dpr);
    }
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.rtA.setSize(w, h);
    this.rtB.setSize(w, h);
    this.post.uniforms.uRes.value.set(w, h);
    this.current?.resize(w, h);
    this.previous?.resize(w, h);
  }

  /** Switch background, cross-fading from the current one over `duration` seconds. */
  setScene(SceneClass, { params, common, duration = 0 }) {
    const next = new SceneClass({ renderer: this.renderer });
    next.resize(this.width, this.height);
    next.setCommon(common);
    next.setParams(params || {});
    next.start();

    this.previous?.dispose();
    this.previous = null;
    if (this.current && duration > 0) {
      this.previous = this.current;
      this.fade = 0;
      this.fadeDuration = duration;
    } else {
      this.current?.dispose();
      this.fade = 1;
    }
    this.current = next;
    return next;
  }

  setCommon(common) {
    this.current?.setCommon(common);
    this.previous?.setCommon(common);
  }

  setPost({ grain, vignette, brightness, saturation }) {
    const u = this.post.uniforms;
    u.uGrain.value = grain;
    u.uVignette.value = vignette;
    u.uBrightness.value = brightness;
    u.uSaturation.value = saturation;
  }

  /**
   * @param time   animation time (already scaled by speed, frozen when paused)
   * @param dt     animation delta (same scaling)
   * @param realDt wall-clock delta, drives cross-fades and grain
   */
  render(time, dt, realDt) {
    const r = this.renderer;
    if (this.previous) {
      this.fade = Math.min(1, this.fade + realDt / this.fadeDuration);
      this.previous.update(time, dt);
      this.previous.render(r, this.rtB);
    }
    this.current.update(time, dt);
    this.current.render(r, this.rtA);

    const u = this.post.uniforms;
    u.uMix.value = this.previous ? this.fade : 1;
    u.uNoiseSeed.value = (u.uNoiseSeed.value + 17.13) % 1000;
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCamera);

    if (this.previous && this.fade >= 1) {
      this.previous.dispose();
      this.previous = null;
    }
  }
}
