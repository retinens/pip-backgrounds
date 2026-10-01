import * as THREE from 'three';
import { BaseScene } from '../engine/Scene.js';

const GEOMETRIES = [
  () => new THREE.IcosahedronGeometry(1, 0),
  () => new THREE.OctahedronGeometry(1, 0),
  () => new THREE.TetrahedronGeometry(1.1, 0),
  () => new THREE.DodecahedronGeometry(1, 0),
  () => new THREE.TorusGeometry(0.8, 0.28, 8, 24),
  () => new THREE.BoxGeometry(1.2, 1.2, 1.2),
];

export class Geometric extends BaseScene {
  static id = 'geometric';
  static label = 'Formes géométriques';
  static params = {
    count: { label: 'Nombre', value: 18, min: 3, max: 60, step: 1, rebuild: true },
    style: { label: 'Style', value: 'solid', options: { Plein: 'solid', Filaire: 'wire', Verre: 'glass' } },
    size: { label: 'Taille', value: 1, min: 0.3, max: 2.5, step: 0.01 },
    rotation: { label: 'Rotation', value: 1, min: 0, max: 4, step: 0.01 },
    metalness: { label: 'Métal', value: 0.3, min: 0, max: 1, step: 0.01 },
    roughness: { label: 'Rugosité', value: 0.45, min: 0, max: 1, step: 0.01 },
  };

  init() {
    this.camera = new THREE.PerspectiveCamera(40, this.aspect, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.scene.fog = new THREE.Fog(this.uniforms.uBg.value, 8, 22);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1.8);
    this.key = new THREE.DirectionalLight(0xffffff, 2.2);
    this.key.position.set(5, 6, 8);
    this.rim = new THREE.PointLight(0xffffff, 60, 30);
    this.rim.position.set(-6, -3, 4);
    this.lights = new THREE.Group();
    this.lights.add(this.hemi, this.key, this.rim);

    this.geometries = GEOMETRIES.map((make) => make());
    this.materials = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ flatShading: true }));
    this.build();
  }

  build() {
    this.group = new THREE.Group();
    this.items = [];
    const n = this.params.count;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geometries[i % this.geometries.length], this.materials[i % 4]);
      const item = {
        mesh,
        home: new THREE.Vector3(
          (Math.random() * 2 - 1) * 9,
          (Math.random() * 2 - 1) * 4.5,
          -12 + Math.random() * 13,
        ),
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6),
        phase: Math.random() * Math.PI * 2,
        scale: 0.35 + Math.random() * 0.65,
      };
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      this.items.push(item);
      this.group.add(mesh);
    }
    this.scene.add(this.group, this.lights);
  }

  rebuild() {
    this.scene.remove(this.group);
    this.build();
  }

  onCommon() {
    const c = this.uniforms.uColors.value;
    this.materials.forEach((m, i) => m.color.copy(c[i]));
    this.hemi.color.copy(c[0]).lerp(new THREE.Color(1, 1, 1), 0.5);
    this.hemi.groundColor.copy(this.uniforms.uBg.value);
    this.rim.color.copy(c[2]);
    this.key.intensity = 2.2 * this.common.intensity;
    this.scene.fog.color.copy(this.uniforms.uBg.value);
  }

  onParams(p) {
    for (const m of this.materials) {
      m.wireframe = p.style === 'wire';
      m.transparent = p.style === 'glass';
      m.opacity = p.style === 'glass' ? 0.35 : 1;
      m.depthWrite = p.style !== 'glass';
      m.metalness = p.metalness;
      m.roughness = p.style === 'glass' ? 0.05 : p.roughness;
      m.needsUpdate = true;
    }
  }

  onResize() {
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  onUpdate(time, dt) {
    const s = this.params.size * this.uniforms.uScale.value;
    const rot = dt * this.params.rotation;
    const xSpread = Math.max(1, this.aspect / (16 / 9));
    for (const it of this.items) {
      const m = it.mesh;
      m.position.set(
        it.home.x * xSpread + Math.sin(time * 0.15 + it.phase) * 0.4,
        it.home.y + Math.sin(time * 0.25 + it.phase * 1.3) * 0.5,
        it.home.z,
      );
      m.rotation.x += it.spin.x * rot;
      m.rotation.y += it.spin.y * rot;
      m.rotation.z += it.spin.z * rot;
      m.scale.setScalar(it.scale * s);
    }
  }

  dispose() {
    this.clear();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
