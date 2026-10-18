// ─────────────────────────────────────────────────────────────
//  Train — KennyNL GLB models (each ~2.6 units long)
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Kenney loco model is ~2.6 units long → spacing between coaches
const COACH_SPACING = 3.0;
const SPEED         = 5;   // units/sec
const SMOKE_COUNT   = 60;

export const COACH_SECTIONS = ['loco', 'about', 'skills', 'projects', 'interests', 'contact'];

export class Train {
  constructor(scene) {
    this.scene    = scene;
    this.loader   = new GLTFLoader();
    this.group    = new THREE.Group();
    this.coaches  = [];
    this.wheels   = [];
    this._loaded  = false;
    this.speed    = SPEED;

    scene.add(this.group);
    this._buildSmoke();
  }

  get loaded() { return this._loaded; }

  async load(onProgress) {
    // Report progress: loco=40%, coachA=30%, coachB=30%
    const locoGltf   = await this._loadGLTF('assets/models/locomotive.glb',
      p => onProgress?.(p * 0.40, p < 1 ? 'loco' : 'loco_done'));

    const coachAGltf = await this._loadGLTF('assets/models/coach-a.glb',
      p => onProgress?.(0.40 + p * 0.30, p < 1 ? 'coachA' : 'coachA_done'));

    const coachBGltf = await this._loadGLTF('assets/models/coach-b.glb',
      p => onProgress?.(0.70 + p * 0.30, p < 1 ? 'coachB' : 'coachB_done'));

    this._assemble(locoGltf, coachAGltf, coachBGltf);
  }

  _loadGLTF(url, onProgress) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve,
        xhr => { if (xhr.total > 0) onProgress?.(xhr.loaded / xhr.total); },
        err => { console.error('GLB load failed:', url, err); reject(err); }
      );
    });
  }

  _assemble(locoGltf, coachAGltf, coachBGltf) {
    // ── Scale up: Kenney models are ~2.6 units, scale to ~4 units ──
    const SCALE = 1.5;

    // ── Locomotive ────────────────────────────────────────────
    const loco = locoGltf.scene;
    loco.scale.setScalar(SCALE);
    loco.rotation.y = Math.PI; // face forward (negative Z)
    loco.position.set(0, 0, 0);
    loco.traverse(c => {
      if (c.isMesh) {
        c.castShadow = c.receiveShadow = true;
        if (/wheel/i.test(c.name)) this.wheels.push(c);
      }
    });
    this.group.add(loco);
    this.coaches.push({ root: loco, section: 'loco' });

    // ── 5 Coaches behind loco ─────────────────────────────────
    const templates = [coachAGltf, coachBGltf, coachAGltf, coachBGltf, coachAGltf];
    const sections  = ['about', 'skills', 'projects', 'interests', 'contact'];

    for (let i = 0; i < 5; i++) {
      const coach = templates[i].scene.clone(true);
      coach.scale.setScalar(SCALE);
      coach.rotation.y = Math.PI;
      // Place each coach behind the loco (positive Z = behind in our setup)
      coach.position.set(0, 0, (i + 1) * COACH_SPACING * SCALE);
      coach.traverse(c => {
        if (c.isMesh) c.castShadow = c.receiveShadow = true;
      });

      // Floating label above coach
      const label = this._makeLabel(sections[i]);
      label.position.set(0, 2.2, 0);
      coach.add(label);

      this.group.add(coach);
      this.coaches.push({ root: coach, section: sections[i], label });
    }

    // Smoke at chimney top
    this.smoke.position.set(0, 2.5 * SCALE, -1.5 * SCALE);
    this.group.add(this.smoke);

    this._loaded = true;
    console.log('Train assembled. Group position:', this.group.position);
    console.log('Loco world pos:', loco.position);
  }

  _makeLabel(section) {
    const INFO = {
      about:     { icon: '👤', text: 'ABOUT' },
      skills:    { icon: '💻', text: 'SKILLS' },
      projects:  { icon: '🚀', text: 'PROJECTS' },
      interests: { icon: '🎯', text: 'INTERESTS' },
      contact:   { icon: '📬', text: 'CONTACT' },
    };
    const { icon, text } = INFO[section] || { icon: '?', text: section.toUpperCase() };

    const c   = document.createElement('canvas');
    c.width   = 256; c.height = 80;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(8,8,20,0.9)';
    ctx.beginPath(); ctx.roundRect(4, 8, 248, 64, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(232,184,109,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(4, 8, 248, 64, 12); ctx.stroke();
    ctx.font = '26px serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.fillText(icon, 40, 50);
    ctx.font = 'bold 20px "Segoe UI",sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(text, 66, 50);

    const tex  = new THREE.CanvasTexture(c);
    const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.78), mat);
    mesh.name  = `label-${section}`;
    return mesh;
  }

  _buildSmoke() {
    const pos = new Float32Array(SMOKE_COUNT * 3);
    for (let i = 0; i < SMOKE_COUNT; i++) {
      pos[i * 3] = 0; pos[i * 3 + 1] = i * 0.08; pos[i * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.smoke = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xcccccc, size: 0.28, transparent: true, opacity: 0.5,
      sizeAttenuation: true, depthWrite: false,
    }));
    this._smokeLife = Array.from({ length: SMOKE_COUNT }, (_, i) => i / SMOKE_COUNT);
  }

  update(dt) {
    if (!this._loaded) return;

    // Move train (negative Z = forward)
    this.group.position.z -= this.speed * dt;

    // Spin wheels
    for (const w of this.wheels) w.rotation.x -= this.speed * dt * 1.6;

    // Animate smoke
    const attr = this.smoke.geometry.attributes.position;
    for (let i = 0; i < SMOKE_COUNT; i++) {
      this._smokeLife[i] += dt * 0.5;
      if (this._smokeLife[i] > 1) this._smokeLife[i] = 0;
      const t = this._smokeLife[i];
      attr.setXYZ(i,
        Math.sin(t * 9 + i) * 0.3 * t,
        t * 5,
        Math.cos(t * 6 + i) * 0.2 * t
      );
    }
    attr.needsUpdate = true;

    // Labels face side camera (rotate around Y to face +X direction)
    for (const c of this.coaches) {
      if (c.label) c.label.rotation.y = -Math.PI / 2;
    }
  }

  get worldZ() { return this.group.position.z; }

  coachWorldPos(index) {
    const p = new THREE.Vector3();
    this.coaches[index]?.root.getWorldPosition(p);
    return p;
  }

  highlightCoach(index) {
    this.coaches.forEach(c => c.root.traverse(m => {
      if (m.isMesh && m.material?.emissive) {
        m.material.emissive.set(0x000000);
        m.material.emissiveIntensity = 0;
      }
    }));
    if (index >= 0) {
      this.coaches[index]?.root.traverse(m => {
        if (m.isMesh && m.material?.emissive) {
          m.material.emissive.set(0xe8b86d);
          m.material.emissiveIntensity = 0.25;
        }
      });
    }
  }
}
