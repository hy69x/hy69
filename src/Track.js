// ─────────────────────────────────────────────────────────────
//  Track — infinite repeating 1-unit Kenney track tiles
//  track-detailed.glb is 1×1 unit (X/Z: -0.5 to 0.5)
//  We scale it up to match the 1.5× scaled train
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TRACK_SCALE = 1.5;      // match train scale
const SEG_LEN     = 1 * TRACK_SCALE;  // 1.5 world units per tile
const POOL_SIZE   = 60;       // enough to fill the view ahead

export class Track {
  constructor(scene) {
    this.scene     = scene;
    this.segments  = [];
    this.loader    = new GLTFLoader();
    this._loaded   = false;
    this._template = null;
  }

  load(onProgress) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        'assets/models/track-detailed.glb',
        (gltf) => {
          this._template = gltf.scene;
          this._template.traverse(c => {
            if (c.isMesh) {
              c.receiveShadow = true;
              c.castShadow    = false;
            }
          });
          this._buildPool();
          this._loaded = true;
          resolve();
        },
        (xhr) => { if (xhr.total > 0) onProgress?.(xhr.loaded / xhr.total); },
        reject
      );
    });
  }

  _buildPool() {
    for (let i = 0; i < POOL_SIZE; i++) {
      const seg = this._template.clone();
      seg.scale.setScalar(TRACK_SCALE);
      // Tile faces +Z by default in Kenney's kit — keep as-is
      seg.position.set(0, 0, i * SEG_LEN);
      this.scene.add(seg);
      this.segments.push(seg);
    }
  }

  update(trainZ) {
    if (!this._loaded) return;
    const total = POOL_SIZE * SEG_LEN;
    for (const seg of this.segments) {
      // Recycle segments that are too far behind the train
      while (seg.position.z - trainZ > SEG_LEN * 2) {
        seg.position.z -= total;
      }
    }
  }
}
