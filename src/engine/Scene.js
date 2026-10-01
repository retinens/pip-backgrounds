import * as THREE from 'three';
import { FULLSCREEN_VERT } from '../shaders/common.js';

/**
 * Base class for every background.
 *
 * Subclasses declare:
 *   static id      unique key (used in URLs / presets)
 *   static label   name shown in the panel
 *   static params  { key: { label, value, min, max, step } | { label, value, options } | { label, value: bool } }
 *                  add `rebuild: true` when changing the param needs geometry to be rebuilt.
 *
 * A param `foo` is automatically pushed to the uniform `uFoo` when that uniform exists.
 */
export class BaseScene {
  static id = '';
  static label = '';
  static params = {};

  constructor(ctx) {
    this.ctx = ctx;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.width = 1;
    this.height = 1;
    this.uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uColors: { value: [0, 1, 2, 3].map(() => new THREE.Color()) },
      uBg: { value: new THREE.Color() },
      uIntensity: { value: 1 },
      uScale: { value: 1 },
    };
    this.scene.background = this.uniforms.uBg.value;
    this.params = Object.fromEntries(
      Object.entries(this.constructor.params).map(([k, def]) => [k, def.value]),
    );
  }

  get aspect() {
    return this.width / this.height;
  }

  /** Build the scene. Called once, after the first resize/setCommon/setParams. */
  init() {}

  /** Called by the engine: build, then sync materials with the current settings. */
  start() {
    this.init();
    this.ready = true;
    this.onResize(this.width, this.height);
    this.onCommon(this.common);
    this.onParams(this.params);
  }

  /** Tear down and rebuild objects (for `rebuild: true` params). */
  rebuild() {}

  onCommon() {}
  onParams() {}
  onResize() {}
  onUpdate() {}

  setCommon(common) {
    common.colors.forEach((hex, i) => this.uniforms.uColors.value[i].set(hex));
    this.uniforms.uBg.value.set(common.bg);
    this.uniforms.uIntensity.value = common.intensity;
    this.uniforms.uScale.value = common.scale;
    this.common = common;
    if (this.ready) this.onCommon(common);
  }

  setParams(values) {
    const defs = this.constructor.params;
    let needsRebuild = false;
    for (const [key, value] of Object.entries(values)) {
      if (!(key in defs)) continue;
      if (defs[key].rebuild && this.params[key] !== value) needsRebuild = true;
      this.params[key] = value;
      const uniform = this.uniforms['u' + key[0].toUpperCase() + key.slice(1)];
      if (uniform && typeof value !== 'string') uniform.value = Number(value);
    }
    if (!this.ready) return;
    if (needsRebuild) this.rebuild();
    this.onParams(this.params);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.uniforms.uRes.value.set(width, height);
    if (this.ready) this.onResize(width, height);
  }

  update(time, dt) {
    this.uniforms.uTime.value = time;
    this.onUpdate(time, dt);
  }

  render(renderer, target) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  /** Remove and free every object of the scene. */
  clear() {
    for (const child of [...this.scene.children]) {
      child.traverse((obj) => {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose());
      });
      this.scene.remove(child);
    }
  }

  dispose() {
    this.clear();
  }
}

/** Fullscreen fragment-shader background. Subclasses only provide `static fragment`. */
export class ShaderScene extends BaseScene {
  static fragment = '';

  /** Extra uniforms derived from numeric params (uFoo for param foo). */
  paramUniforms() {
    const out = {};
    for (const [key, value] of Object.entries(this.params)) {
      if (typeof value === 'string') continue;
      out['u' + key[0].toUpperCase() + key.slice(1)] = { value: Number(value) };
    }
    return out;
  }

  init() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    Object.assign(this.uniforms, this.paramUniforms());
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: this.constructor.fragment,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }
}
