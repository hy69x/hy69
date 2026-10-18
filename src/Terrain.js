// ─────────────────────────────────────────────────────────────
//  Terrain — infinite repeating ground + mountains
//  Scaled for Kenney models (~4 units tall after 1.5× scale)
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const CHUNK_SIZE = 40;    // world units per chunk
const NUM_CHUNKS = 8;     // pool size
const SEGS       = 28;    // mesh subdivisions
const MOUNTAIN_Z = 80;    // distance to mountains

export class Terrain {
  constructor(scene) {
    this.scene  = scene;
    this.noise  = createNoise2D();
    this.chunks = [];

    // Materials
    this.groundMat   = new THREE.MeshLambertMaterial({ color: 0x4a7c34 });
    this.mountainMat = new THREE.MeshLambertMaterial({ color: 0x6b7a6e, flatShading: true });
    this.snowMat     = new THREE.MeshLambertMaterial({ color: 0xeef5f8 });
    this.treeMat     = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
    this.trunkMat    = new THREE.MeshLambertMaterial({ color: 0x5c3d1e });
    this.rockMat     = new THREE.MeshLambertMaterial({ color: 0x8a8070 });

    this._buildMountains();
    this._initChunks();
  }

  // ── Mountains ──────────────────────────────────────────────
  _buildMountains() {
    const group = new THREE.Group();
    const count = 22;

    for (let i = 0; i < count; i++) {
      // Back range (far)
      const h = 14 + Math.random() * 30;
      const w = 8  + Math.random() * 16;
      const x = (i - count / 2) * 14 + (Math.random() - 0.5) * 7;

      const geo  = new THREE.ConeGeometry(w, h, 7, 1);
      geo.scale(1, 1, 0.6);
      const mesh = new THREE.Mesh(geo, this.mountainMat);
      mesh.position.set(x, h * 0.45, -MOUNTAIN_Z);
      mesh.castShadow = true;
      group.add(mesh);

      // Snow cap on tall peaks
      if (h > 30) {
        const capGeo = new THREE.ConeGeometry(w * 0.28, h * 0.22, 7, 1);
        capGeo.scale(1, 1, 0.6);
        const cap = new THREE.Mesh(capGeo, this.snowMat);
        cap.position.set(x, h * 0.45 + h * 0.37, -MOUNTAIN_Z);
        group.add(cap);
      }

      // Foothills (closer, smaller)
      const h2 = 5 + Math.random() * 12;
      const w2 = 4 + Math.random() * 9;
      const geo2 = new THREE.ConeGeometry(w2, h2, 6, 1);
      geo2.scale(1, 1, 0.6);
      const m2 = new THREE.Mesh(geo2, this.mountainMat);
      m2.position.set(
        x + (Math.random() - 0.5) * 10,
        h2 * 0.45,
        -MOUNTAIN_Z + 28
      );
      group.add(m2);
    }

    this.scene.add(group);
    this.mountainGroup = group;
  }

  // ── Ground chunk ───────────────────────────────────────────
  _makeChunk(offsetZ) {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE * 2.2, CHUNK_SIZE, SEGS, SEGS);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + offsetZ;
      // Flat track corridor: 5 units either side of centre
      const distFromCentre = Math.abs(x);
      const flatness = distFromCentre < 5 ? 0 : Math.min(1, (distFromCentre - 5) / 8);
      // Low-amplitude noise so hills are gentle relative to model size
      const n = this.noise(x * 0.06, z * 0.06) * 1.8
              + this.noise(x * 0.02, z * 0.02) * 3.5;
      pos.setY(i, n * flatness);
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.groundMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -0.05, offsetZ);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const decos = this._addDecorations(offsetZ);
    return { mesh, decos, offsetZ };
  }

  _addDecorations(offsetZ) {
    const group = new THREE.Group();

    // Trees: 7–30 units either side of track
    for (let i = 0; i < 14; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x    = side * (7 + Math.random() * 22);
      const z    = (Math.random() - 0.5) * CHUNK_SIZE;
      group.add(this._makeTree(x, z));
    }

    // Rocks: 6–20 units out
    for (let i = 0; i < 5; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x    = side * (6 + Math.random() * 16);
      const z    = (Math.random() - 0.5) * CHUNK_SIZE;
      group.add(this._makeRock(x, z));
    }

    group.position.z = offsetZ;
    this.scene.add(group);
    return group;
  }

  _makeTree(x, z) {
    const g      = new THREE.Group();
    const trunkH = 1.0 + Math.random() * 1.0;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, trunkH, 5),
      this.trunkMat
    );
    trunk.position.y = trunkH / 2;
    g.add(trunk);

    const layers = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < layers; i++) {
      const r    = (1.0 - i * 0.22) * (0.7 + Math.random() * 0.4);
      const h    = r * 1.7;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 7),
        this.treeMat
      );
      cone.position.y = trunkH + i * h * 0.38;
      g.add(cone);
    }

    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.7 + Math.random() * 0.5;
    g.scale.set(s, s, s);
    return g;
  }

  _makeRock(x, z) {
    const r   = 0.3 + Math.random() * 0.6;
    const geo = new THREE.DodecahedronGeometry(r, 0);
    const m   = new THREE.Mesh(geo, this.rockMat);
    m.position.set(x, r * 0.35, z);
    m.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    m.scale.set(1, 0.55 + Math.random() * 0.4, 1.1 + Math.random() * 0.4);
    return m;
  }

  _initChunks() {
    for (let i = 0; i < NUM_CHUNKS; i++) {
      this.chunks.push(this._makeChunk((i - 1) * CHUNK_SIZE));
    }
  }

  // ── Night mode ─────────────────────────────────────────────
  setNight(night) {
    this.groundMat.color.set(night ? 0x192b10 : 0x4a7c34);
    this.mountainMat.color.set(night ? 0x252e2c : 0x6b7a6e);
    this.treeMat.color.set(night ? 0x142210 : 0x2d5a27);
  }

  // ── Update (recycle chunks) ────────────────────────────────
  update(trainZ) {
    for (const chunk of this.chunks) {
      if (chunk.mesh.position.z - trainZ > CHUNK_SIZE * 1.5) {
        const newZ = chunk.mesh.position.z - NUM_CHUNKS * CHUNK_SIZE;
        chunk.mesh.position.z  = newZ;
        chunk.decos.position.z = newZ;
        chunk.offsetZ          = newZ;
      }
    }
    // Mountains parallax scroll
    this.mountainGroup.position.z = trainZ * 0.06;
  }
}
