// ─────────────────────────────────────────────────────────────
//  Camera — two modes: side-top and top-down, smooth lerp
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

const LERP_SPEED = 5;

// Offsets are RELATIVE to train position
// Kenney loco is ~2.6 units long, coaches ~2.6 units each
// Full train ≈ 6 coaches × 3.5 spacing = ~21 units long
const MODES = {
  side: {
    // Side-right view, slightly elevated — clearly shows loco + coaches
    offset: new THREE.Vector3(12, 6, 6),
    fov: 60,
  },
  top: {
    // Top-down, tilted forward to see all coaches in a line
    offset: new THREE.Vector3(0, 20, 10),
    fov: 55,
  },
};

export class CameraController {
  constructor(camera, train) {
    this.camera      = camera;
    this.train       = train;
    this.mode        = 'side';
    this._zoom       = 1;
    this._ready      = false;
    this._targetPos  = new THREE.Vector3();
    this._targetLook = new THREE.Vector3();

    window.addEventListener('wheel', (e) => {
      this._zoom = THREE.MathUtils.clamp(
        this._zoom + e.deltaY * 0.0006,
        0.4, 3.0
      );
    }, { passive: true });
  }

  /** Snap immediately — no lerp. Call after models load. */
  snapToTrain() {
    const cfg = MODES[this.mode];
    const pos = this.train.group.position;

    // Camera sits at train pos + offset
    const camPos = pos.clone().add(cfg.offset.clone().multiplyScalar(this._zoom));
    // Look at the middle of the train (between loco and last coach)
    const lookAt = pos.clone();
    lookAt.z += 5; // centre of train consist

    this.camera.position.copy(camPos);
    this.camera.fov = cfg.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(lookAt);
    this._targetPos.copy(camPos);
    this._targetLook.copy(lookAt);
    this._ready = true;
  }

  toggle() {
    this.mode = this.mode === 'side' ? 'top' : 'side';
    return this.mode;
  }

  update(dt) {
    if (!this._ready) return;

    const cfg = MODES[this.mode];
    const pos = this.train.group.position;

    // Target = train position + mode offset * zoom
    const offset = cfg.offset.clone().multiplyScalar(this._zoom);
    this._targetPos.copy(pos).add(offset);

    // Look at centre of train (z+5 = between loco and 2nd coach)
    this._targetLook.copy(pos);
    this._targetLook.z += 5;

    const alpha = Math.min(1, LERP_SPEED * dt);
    this.camera.position.lerp(this._targetPos, alpha);

    // Smooth look-at
    const dummy = new THREE.Object3D();
    dummy.position.copy(this.camera.position);
    dummy.lookAt(this._targetLook);
    this.camera.quaternion.slerp(dummy.quaternion, alpha);

    // Smooth FOV
    this.camera.fov += (cfg.fov - this.camera.fov) * alpha;
    this.camera.updateProjectionMatrix();
  }

  focusCoach(index) {
    const pos = this.train.coachWorldPos(index);
    this._targetLook.copy(pos);
  }
}
