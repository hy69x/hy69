// ─────────────────────────────────────────────────────────────
//  Stars — visible at night
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

export class Stars {
  constructor(scene) {
    const count = 2500;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 280 + Math.random() * 60;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi));  // upper hemisphere only
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.55, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false,
    });
    this.points  = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this._mat    = mat;
    this._night  = false;
    scene.add(this.points);
  }

  setNight(night) {
    this._night = night;
  }

  update(dt, cameraPos) {
    if (cameraPos) this.points.position.copy(cameraPos);
    const target = this._night ? 0.85 : 0;
    this._mat.opacity += (target - this._mat.opacity) * dt * 1.5;
  }
}
