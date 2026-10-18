import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DayCycle } from './DayCycle.js';
import { Stars }    from './Stars.js';
import * as UI      from './UI.js';
import { ICONS }    from './icons.js';



// ── CONSTANTS ─────────────────────────────────────────────────
const SCALE         = 3.5;
const LOCO_LEN      = 2.6 * SCALE;
const COACH_LEN     = 2.6 * SCALE;
const COACH_GAP     = 0.5;
const COACH_SPACING = COACH_LEN + COACH_GAP;
const TRACK_W       = 1.0 * SCALE;
const POOL_TILES    = 280; // 280 tiles = 980 world units of continuous track
const SPEED         = 6;
const MAX_ZOOM      = 1.5;
const MIN_ZOOM      = 0.5;

export const COACH_SECTIONS = ['loco', 'about', 'skills', 'projects', 'interests', 'contact'];

// ── RENDERER ─────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace    = THREE.SRGBColorSpace;

// ── SCENE ────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ab3d9);
// Linear atmospheric fog: clear up to 55u, smoothly reaches 100% opaque sky color by 340u
// This beautifully reveals distant mountain peaks while completely hiding track ends (595u ahead, 385u behind)
scene.fog = new THREE.Fog(0x8ec8e8, 55, 340);

// ── CAMERA ───────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);

// ── LIGHTS ───────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambient);

// Sunlight shines from in front and above the train
const sun = new THREE.DirectionalLight(0xfff5d8, 2.4);
sun.position.set(-60, 140, -220);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.near = -300;
sun.shadow.camera.far  = 600;
sun.shadow.camera.left = sun.shadow.camera.bottom = -180;
sun.shadow.camera.right = sun.shadow.camera.top   =  180;
scene.add(sun);
scene.add(sun.target);

const fillLight = new THREE.DirectionalLight(0xaad5ff, 0.65);
fillLight.position.set(-60, 45, 10);
scene.add(fillLight);

const moon = new THREE.DirectionalLight(0x223366, 0);
moon.position.set(-40, 60, -20);
scene.add(moon);

// ── CELESTIAL SUN (Visible Sun Orb with Radiant Corona in the Sky Ahead) ──
const sunGroup = new THREE.Group();
scene.add(sunGroup);

const sunCoreGeo = new THREE.SphereGeometry(14, 24, 16);
const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff6cf, fog: false });
const sunCore    = new THREE.Mesh(sunCoreGeo, sunCoreMat);
sunGroup.add(sunCore);

const sunHaloGeo = new THREE.SphereGeometry(25, 20, 12);
const sunHaloMat = new THREE.MeshBasicMaterial({
  color: 0xffdf70,
  transparent: true,
  opacity: 0.38,
  fog: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const sunHalo    = new THREE.Mesh(sunHaloGeo, sunHaloMat);
sunGroup.add(sunHalo);

const sunFlareGeo = new THREE.SphereGeometry(42, 16, 10);
const sunFlareMat = new THREE.MeshBasicMaterial({
  color: 0xffb84d,
  transparent: true,
  opacity: 0.16,
  fog: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const sunFlare    = new THREE.Mesh(sunFlareGeo, sunFlareMat);
sunGroup.add(sunFlare);

// Celestial direction in front of the train in the sky
const SUN_CELESTIAL_OFFSET = new THREE.Vector3(-45, 125, -340);

// ── SKY ──────────────────────────────────────────────────────
const skyMat  = new THREE.MeshBasicMaterial({ color: 0x7ab3d9, side: THREE.BackSide, fog: false });
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 24, 12), skyMat);
scene.add(skyMesh);

// ── GROUND ───────────────────────────────────────────────────
const groundMat  = new THREE.MeshLambertMaterial({ color: 0x448a30 });
const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.06;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// ── PROCEDURAL BIOMES (Open Prairie, Alpine Pass, Frozen Tundra, Autumn Highlands) ──
export const BIOMES = [
  {
    id: 'prairie',
    name: 'Open Prairie',
    iconKey: 'prairie',
    mountainFactor: 0.0,
    groundColor: new THREE.Color(0x448a30),      // Vibrant meadow green
    mtnColor: new THREE.Color(0x4a5845),         // Distant rolling green hills
    snowCapColor: new THREE.Color(0xe0e7ec),
    leafLight: new THREE.Color(0x3ca329),        // Vibrant prairie foliage
    leafMid: new THREE.Color(0x287b1c),          // Fresh green pine
    leafDark: new THREE.Color(0x195113),         // Deep shade green
    fogColor: new THREE.Color(0x8ec8e8),         // Clear sky blue fog
    skyColor: new THREE.Color(0x7ab3d9),
    snowIntensity: 0.0,
  },
  {
    id: 'alpine',
    name: 'Alpine Pass',
    iconKey: 'mountain',
    mountainFactor: 1.0,
    groundColor: new THREE.Color(0x324d2a),      // Rocky alpine valley green
    mtnColor: new THREE.Color(0x384541),         // Dark slate granite peaks
    snowCapColor: new THREE.Color(0xf2f7fa),     // Crisp snowcaps
    leafLight: new THREE.Color(0x2a7722),        // Alpine pine
    leafMid: new THREE.Color(0x1b5815),
    leafDark: new THREE.Color(0x10360e),         // Deep mountain pine
    fogColor: new THREE.Color(0x84b7d6),         // Crisp mountain valley haze
    skyColor: new THREE.Color(0x6fa1c5),
    snowIntensity: 0.05,                         // Occasional faint flake
  },
  {
    id: 'tundra',
    name: 'Frozen Tundra',
    iconKey: 'snow',
    mountainFactor: 0.92,
    groundColor: new THREE.Color(0xdcecf5),      // Pure pristine snow mantle!
    mtnColor: new THREE.Color(0x7a9caf),         // Glacial ice & slate peaks
    snowCapColor: new THREE.Color(0xffffff),     // Blinding white ice cap
    leafLight: new THREE.Color(0xf0f7fc),        // Snow-frosted tree branches
    leafMid: new THREE.Color(0xb2d6e8),          // Frosty ice needles
    leafDark: new THREE.Color(0x739eb5),         // Sub-zero winter spruce
    fogColor: new THREE.Color(0xd0e3f0),         // Frosty winter fog
    skyColor: new THREE.Color(0xb2d1e4),         // Pale icy sky
    snowIntensity: 1.0,                          // Active falling snowflakes!
  },
  {
    id: 'autumn',
    name: 'Autumn Highlands',
    iconKey: 'autumn',
    mountainFactor: 0.65,
    groundColor: new THREE.Color(0x6e532b),      // Golden highland steppe
    mtnColor: new THREE.Color(0x694230),         // Warm terracotta sandstone bluffs
    snowCapColor: new THREE.Color(0xd6bca0),     // Warm sunlit canyon rims
    leafLight: new THREE.Color(0xd99f24),        // Golden birch / aspen
    leafMid: new THREE.Color(0xc45e1a),          // Burnt amber orange
    leafDark: new THREE.Color(0x8a2911),         // Rich crimson maple
    fogColor: new THREE.Color(0xe8caa2),         // Warm golden afternoon haze
    skyColor: new THREE.Color(0xd7b080),         // Amber sky
    snowIntensity: 0.0,
  },
];

const BIOME_CYCLE_LENGTH = 1600; // 4 biomes × 400 units each (~4.4 mins full cycle)
const BIOME_COUNT = BIOMES.length;
const BIOME_SPAN = BIOME_CYCLE_LENGTH / BIOME_COUNT;

export function getBiomeInterpolation(z) {
  const progress = ((-z % BIOME_CYCLE_LENGTH) + BIOME_CYCLE_LENGTH) % BIOME_CYCLE_LENGTH;
  const floatIdx = progress / BIOME_SPAN;
  const curIdx = Math.floor(floatIdx) % BIOME_COUNT;
  const nextIdx = (curIdx + 1) % BIOME_COUNT;
  const frac = floatIdx - Math.floor(floatIdx);

  // Smooth transition during the last 30% of each biome
  const transStart = 0.70;
  let t = 0;
  if (frac > transStart) {
    const raw = (frac - transStart) / (1 - transStart);
    t = raw * raw * (3 - 2 * raw); // Hermite smoothstep
  }

  return {
    curBiome: BIOMES[curIdx],
    nextBiome: BIOMES[nextIdx],
    t,
    dominantBiome: t > 0.5 ? BIOMES[nextIdx] : BIOMES[curIdx],
  };
}

export function getBiomeMountainFactor(z) {
  const { curBiome, nextBiome, t } = getBiomeInterpolation(z);
  return THREE.MathUtils.lerp(curBiome.mountainFactor, nextBiome.mountainFactor, t);
}

const _blendedBiome = {
  groundColor: new THREE.Color(),
  mtnColor: new THREE.Color(),
  snowCapColor: new THREE.Color(),
  leafLight: new THREE.Color(),
  leafMid: new THREE.Color(),
  leafDark: new THREE.Color(),
  fogColor: new THREE.Color(),
  skyColor: new THREE.Color(),
  snowIntensity: 0,
};

export function sampleBlendedBiome(z) {
  const { curBiome, nextBiome, t } = getBiomeInterpolation(z);
  _blendedBiome.groundColor.copy(curBiome.groundColor).lerp(nextBiome.groundColor, t);
  _blendedBiome.mtnColor.copy(curBiome.mtnColor).lerp(nextBiome.mtnColor, t);
  _blendedBiome.snowCapColor.copy(curBiome.snowCapColor).lerp(nextBiome.snowCapColor, t);
  _blendedBiome.leafLight.copy(curBiome.leafLight).lerp(nextBiome.leafLight, t);
  _blendedBiome.leafMid.copy(curBiome.leafMid).lerp(nextBiome.leafMid, t);
  _blendedBiome.leafDark.copy(curBiome.leafDark).lerp(nextBiome.leafDark, t);
  _blendedBiome.fogColor.copy(curBiome.fogColor).lerp(nextBiome.fogColor, t);
  _blendedBiome.skyColor.copy(curBiome.skyColor).lerp(nextBiome.skyColor, t);
  _blendedBiome.snowIntensity = THREE.MathUtils.lerp(curBiome.snowIntensity, nextBiome.snowIntensity, t);
  return _blendedBiome;
}
let lastBiomeId = '';

// ── STATIONARY MOUNTAINS (Front & Back Alpine Valley Corridor) ─
const mtnGroup = new THREE.Group();
scene.add(mtnGroup);

const matMtn  = new THREE.MeshLambertMaterial({ color: 0x42524e, flatShading: true });
const matSnow = new THREE.MeshLambertMaterial({ color: 0xf2f7fa, flatShading: true });

function createMountainInstance(baseW, baseH, sides) {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(baseW, baseH, sides);
  geo.scale(1, 1, 0.72);
  const body = new THREE.Mesh(geo, matMtn);
  body.position.y = baseH * 0.48;
  body.receiveShadow = true;
  g.add(body);

  if (baseH > 65) {
    const sGeo = new THREE.ConeGeometry(baseW * 0.34, baseH * 0.30, sides);
    sGeo.scale(1, 1, 0.72);
    const cap = new THREE.Mesh(sGeo, matSnow);
    cap.position.y = baseH * 0.48 + baseH * 0.37;
    cap.receiveShadow = true;
    g.add(cap);
  }
  g.baseW = baseW;
  g.baseH = baseH;
  return g;
}

// Minimum 45 units clearance: mountain base can NEVER come near or touch the tracks!
const MIN_TRACK_CLEARANCE = 45;

function positionMountain(m, z, isLeft, isFar) {
  const factor = getBiomeMountainFactor(z);

  // In the open plains, mountains recede completely from the corridor
  if (factor < 0.05) {
    m.visible = false;
    m.scale.setScalar(0.001);
    m.position.set(isLeft ? -400 : 400, 0, z);
    return;
  }

  m.visible = true;
  // Dynamic scale: gently rises from foothills at plains edge into towering peaks in mountain pass
  const sc = THREE.MathUtils.lerp(0.35, 1.0, factor);
  m.scale.set(sc, sc, sc);

  // MATHEMATICAL GUARANTEE: distance from mountain base to track centerline is always >= MIN_TRACK_CLEARANCE
  const actualRadius = m.baseW * sc;
  const xDist = actualRadius + MIN_TRACK_CLEARANCE + Math.random() * (isFar ? 75 : 45);
  const x = isLeft ? -xDist : xDist;

  m.position.set(x, 0, z);
  m.rotation.y = Math.random() * Math.PI * 2;
}

const MTN_POOL_SIZE = 96;
const mountainPool = [];

// Initialize stationary mountains spanning front (Z = -450) to back (Z = +450)
for (let i = 0; i < MTN_POOL_SIZE; i++) {
  const isLeft = (i % 2 === 0);
  const isFar  = (i % 4 < 2);
  const baseW = isFar ? (42 + Math.random() * 45) : (20 + Math.random() * 26);
  const baseH = isFar ? (90 + Math.random() * 110) : (35 + Math.random() * 55);
  const m = createMountainInstance(baseW, baseH, isFar ? 8 : 7);

  const initZ = -450 + (i / MTN_POOL_SIZE) * 900 + (Math.random() - 0.5) * 20;
  positionMountain(m, initZ, isLeft, isFar);
  mtnGroup.add(m);
  mountainPool.push({ mesh: m, isLeft, isFar });
}

// Procedural recycling: mountains remain 100% stationary in world space.
// Only when a mountain falls 460 units behind the moving train is it recycled ahead in the deep fog
const MTN_BEHIND_LIMIT = 460;
function updateMountains(trainZ) {
  for (const item of mountainPool) {
    if (item.mesh.position.z - trainZ > MTN_BEHIND_LIMIT) {
      const spawnZ = trainZ - 430 - Math.random() * 70;
      positionMountain(item.mesh, spawnZ, item.isLeft, item.isFar);
    }
  }
}

// ── PROCEDURAL RELATIVE VEGETATION (Moves relative to train, spawns ahead, deletes behind) ──
const vegGroup = new THREE.Group();
scene.add(vegGroup);

const matTrunk     = new THREE.MeshLambertMaterial({ color: 0x54391e });
const matLeafLight = new THREE.MeshLambertMaterial({ color: 0x368524 }); // foreground fresh green / prairie meadow
const matLeafMid   = new THREE.MeshLambertMaterial({ color: 0x25671c }); // midground forest green
const matLeafDark  = new THREE.MeshLambertMaterial({ color: 0x184414 }); // deep alpine pine green

function createTreeInstance() {
  const g = new THREE.Group();
  const th = 2.0;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, th, 6), matTrunk);
  trunk.position.y = th / 2;
  trunk.castShadow = true;
  g.add(trunk);

  const foliageCones = [];
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const r = 1.35 - i * 0.28;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.85, 7), matLeafMid);
    cone.position.y = th + i * 0.65;
    cone.castShadow = true;
    g.add(cone);
    foliageCones.push(cone);
  }
  g.foliageCones = foliageCones;
  return g;
}

function positionProceduralTree(tree, z) {
  const mtnFactor = getBiomeMountainFactor(z);
  const r = Math.random();
  const side = Math.random() < 0.5 ? -1 : 1;
  let x, sc, mat;

  if (mtnFactor > 0.4) {
    // Mountain Biome: dense evergreen pine trees climbing foothills
    if (r < 0.50) {
      x   = side * (32 + Math.random() * 85);
      sc  = 1.1 + Math.random() * 1.3;
      mat = Math.random() > 0.4 ? matLeafDark : matLeafMid;
    } else if (r < 0.85) {
      x   = side * (12 + Math.random() * 20);
      sc  = 0.9 + Math.random() * 0.6;
      mat = matLeafMid;
    } else {
      x   = side * (7.5 + Math.random() * 6.0);
      sc  = 0.75 + Math.random() * 0.4;
      mat = matLeafLight;
    }
  } else {
    // Plains Biome: open prairie with scattered meadow trees and lone scenic pines
    if (r < 0.35) {
      x   = side * (40 + Math.random() * 90);
      sc  = 0.9 + Math.random() * 0.8;
      mat = matLeafLight;
    } else if (r < 0.70) {
      x   = side * (16 + Math.random() * 24);
      sc  = 0.85 + Math.random() * 0.6;
      mat = Math.random() > 0.5 ? matLeafLight : matLeafMid;
    } else {
      x   = side * (8.5 + Math.random() * 9.0);
      sc  = 0.7 + Math.random() * 0.45;
      mat = matLeafLight;
    }
  }

  tree.position.set(x, 0, z);
  tree.rotation.y = Math.random() * Math.PI * 2;
  tree.scale.setScalar(sc);

  for (const cone of tree.foliageCones) {
    cone.material = mat;
  }
}

const TREE_POOL_SIZE = 650;
const treePool = [];

// Initialize tree pool spread in world coordinates from -340 to +340 (covering full view depth)
for (let i = 0; i < TREE_POOL_SIZE; i++) {
  const tree = createTreeInstance();
  const initZ = -340 + (i / TREE_POOL_SIZE) * 680;
  positionProceduralTree(tree, initZ);
  vegGroup.add(tree);
  treePool.push(tree);
}

// Procedural stream: recycle trees passing behind the train and respawn them ahead
function updateVegetation(trainZ) {
  // Generous limit (340 units) ensures trees never disappear while anywhere near the camera frustum, even on ultrawide monitors
  const BEHIND_LIMIT = 340;

  for (const tree of treePool) {
    if (tree.position.z - trainZ > BEHIND_LIMIT) {
      // Regenerate procedurally in the distant fog ahead of the train
      const spawnZ = trainZ - 300 - Math.random() * 60;
      positionProceduralTree(tree, spawnZ);
    }
  }
}

// ── TRACK BALLAST & TRACK POOL ────────────────────────────────
const gltfLoader = new GLTFLoader();
const trackTiles = [];

// Beveled trapezoidal crushed-stone ballast bed prism
function createBallastMesh() {
  const geo = new THREE.BufferGeometry();
  // Ballast prism dimensions (in local track units):
  // Sleeper ends extend to X ≈ ±0.50. Ballast top extends beyond sleepers to ±0.70.
  // The beveled slope extends out to base width ±1.15.
  // Top surface rests at Y = 0.04 (under rails and sleeper ties).
  // Bottom penetrates down to Y = -0.10 (well below ground at -0.017).
  const topW = 0.70, botW = 1.15;
  const topY = 0.04, botY = -0.10;
  const lenZ = 0.505; // seamless overlap with adjacent tiles

  const positions = new Float32Array([
    // Top face (+Y normal)
    -topW, topY, -lenZ,   topW, topY,  lenZ,   topW, topY, -lenZ,
    -topW, topY, -lenZ,  -topW, topY,  lenZ,   topW, topY,  lenZ,

    // Right slope (+X side, facing camera at +X: normal points +X, +Y)
     topW, topY, -lenZ,   botW, botY,  lenZ,   botW, botY, -lenZ,
     topW, topY, -lenZ,   topW, topY,  lenZ,   botW, botY,  lenZ,

    // Left slope (-X side: normal points -X, +Y)
    -topW, topY, -lenZ,  -botW, botY, -lenZ,  -botW, botY,  lenZ,
    -topW, topY, -lenZ,  -botW, botY,  lenZ,  -topW, topY,  lenZ,
  ]);

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    color: 0x5a554e, // authentic crushed granite stone grey
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function applyTrackColors(trackScene) {
  const colSleeper = new THREE.Color(0x4e341f); // wooden railway tie
  const colRail    = new THREE.Color(0x848892); // steel rail silver/grey

  trackScene.traverse(c => {
    if (!c.isMesh) return;
    const geo = c.geometry;
    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = uvs ? uvs.getX(i) : 0;
      const isRail = Math.abs(u - 0.96875) < 0.05 || pos.getY(i) > 0.045;
      const col = isRail ? colRail : colSleeper;
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    c.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    c.receiveShadow = true;
  });
}

function spawnTrackPool(templateScene) {
  applyTrackColors(templateScene);

  // Add the ballast bed underneath the track template
  const ballastMesh = createBallastMesh();
  templateScene.add(ballastMesh);

  for (let i = 0; i < POOL_TILES; i++) {
    const t = templateScene.clone(true);
    t.scale.setScalar(SCALE);
    t.position.set(0, 0, (i - 170) * TRACK_W);
    t.visible = true;
    scene.add(t);
    trackTiles.push(t);
  }
}

function recycleTracks(trainZ) {
  const total = POOL_TILES * TRACK_W;
  const TILES_AHEAD  = 170; // 595 units ahead (fog is 100% opaque at 250, hiding all ends)
  const TILES_BEHIND = 110; // 385 units behind (safe for rear observation track camera)

  for (const t of trackTiles) {
    while (t.position.z - trainZ > TILES_BEHIND * TRACK_W) {
      t.position.z -= total;
    }
    while (trainZ - t.position.z > TILES_AHEAD * TRACK_W) {
      t.position.z += total;
    }
  }
}

// ── COLORING: LOCOMOTIVE ───────────────────────────────────────
function applyLocoVertexColors(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  // Find window glass vertices (U ~ 0.09375)
  const winIndices = [];
  const winPositions = [];
  for (let i = 0; i < count; i++) {
    const u = uvs ? uvs.getX(i) : 0;
    if (Math.abs(u - 0.09375) < 0.015) {
      winIndices.push(i);
      winPositions.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
  }

  const colBlueBody   = new THREE.Color(0x1a52aa); // royal engine blue
  const colDarkRoof   = new THREE.Color(0x1c2432); // dark navy/graphite cab roof
  const colSmokestack = new THREE.Color(0x18181a); // dark iron chimney
  const colBrassDome  = new THREE.Color(0xd4af37); // brass boiler dome
  const colHeadlamp   = new THREE.Color(0xf5d061); // warm light lamp
  const colBlackShaft = new THREE.Color(0x111111); // total black shaft & crank
  const colBlackWin   = new THREE.Color(0x060606); // black window glass
  const colBrownFrame = new THREE.Color(0x6b3a1f); // brown window border

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const p = new THREE.Vector3(x, y, z);

    let chosenColor = colBlueBody;

    // 1. Shaft and wheel crank/hub on both sides (total black)
    if (Math.abs(x) >= 0.47 && y <= 0.56 && z >= -0.88 && z <= 0.6) {
      chosenColor = colBlackShaft;
    }
    // 2. Window glass (black)
    else if (winIndices.includes(i)) {
      chosenColor = colBlackWin;
    }
    // 3. Window border/frame (brown)
    else if (winPositions.some(wp => wp.distanceTo(p) <= 0.09)) {
      chosenColor = colBrownFrame;
    }
    // 4. Cab roof
    else if (y >= 1.35 && z <= 0.25) {
      chosenColor = colDarkRoof;
    }
    // 5. Smokestack / chimney
    else if (y >= 1.35 && z > 0.6) {
      chosenColor = colSmokestack;
    }
    // 6. Brass dome
    else if (y >= 1.15 && Math.abs(z - 0.1) <= 0.2 && Math.abs(x) <= 0.25) {
      chosenColor = colBrassDome;
    }
    // 7. Headlamp on front
    else if (z >= 1.15 && y >= 0.4 && y <= 0.8) {
      chosenColor = colHeadlamp;
    }

    colors[i * 3]     = chosenColor.r;
    colors[i * 3 + 1] = chosenColor.g;
    colors[i * 3 + 2] = chosenColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshLambertMaterial({ vertexColors: true });
}

// ── COLORING: COACHES ──────────────────────────────────────────
function applyCoachVertexColors(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const winPositions = [];
  const isWin = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const u = uvs ? uvs.getX(i) : 0;
    if (Math.abs(u - 0.09375) < 0.015) {
      isWin[i] = 1;
      winPositions.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
  }

  const colWoodBody   = new THREE.Color(0x8e5828); // warm wood brown carriage
  const colWoodRoof   = new THREE.Color(0x3a2416); // dark wood roof
  const colWoodTrim   = new THREE.Color(0x5a3518); // lower chassis wood trim
  const colBlackWin   = new THREE.Color(0x060606); // black window glass
  const colBrownFrame = new THREE.Color(0x6b3a1f); // brown window border

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const p = new THREE.Vector3(x, y, z);

    let chosenColor = colWoodBody;

    if (isWin[i] === 1) {
      chosenColor = colBlackWin;
    } else if (winPositions.some(wp => wp.distanceTo(p) <= 0.09)) {
      chosenColor = colBrownFrame;
    } else if (y >= 1.45) {
      chosenColor = colWoodRoof;
    } else if (y <= 0.35) {
      chosenColor = colWoodTrim;
    }

    colors[i * 3]     = chosenColor.r;
    colors[i * 3 + 1] = chosenColor.g;
    colors[i * 3 + 2] = chosenColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshLambertMaterial({ vertexColors: true });
}

// ── AUTHENTIC TRAIN BOGIE WITH CLEAN CIRCULAR WHEELS ───────────
function createBogieTruck() {
  const bogieGroup = new THREE.Group();
  const matBlack = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // 1. Static bogie truck frame (does not rotate)
  const frameGroup = new THREE.Group();

  const beamGeo = new THREE.BoxGeometry(0.06, 0.08, 0.76);
  const leftBeam = new THREE.Mesh(beamGeo, matBlack);
  leftBeam.position.set(-0.44, 0, 0);
  leftBeam.castShadow = true;

  const rightBeam = new THREE.Mesh(beamGeo, matBlack);
  rightBeam.position.set(0.44, 0, 0);
  rightBeam.castShadow = true;

  const crossGeo = new THREE.BoxGeometry(0.88, 0.06, 0.16);
  const crossBeam = new THREE.Mesh(crossGeo, matBlack);
  crossBeam.position.set(0, 0.04, 0);
  crossBeam.castShadow = true;

  // Bearing caps over axle pins
  const capGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12);
  capGeo.rotateZ(Math.PI / 2);
  for (const sx of [-0.47, 0.47]) {
    for (const sz of [-0.225, 0.225]) {
      const cap = new THREE.Mesh(capGeo, matBlack);
      cap.position.set(sx, 0, sz);
      cap.castShadow = true;
      frameGroup.add(cap);
    }
  }

  frameGroup.add(leftBeam, rightBeam, crossBeam);
  bogieGroup.add(frameGroup);

  // 2. Rotating Wheelsets (smooth 24-sided circles with flanges)
  function makeWheelset() {
    const wsGroup = new THREE.Group();

    // Steel axle rod connecting left and right
    const axleGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.82, 16);
    axleGeo.rotateZ(Math.PI / 2);
    const axle = new THREE.Mesh(axleGeo, matBlack);
    axle.castShadow = true;
    wsGroup.add(axle);

    // Two circular wheels positioned exactly on the rails at X = ±0.392
    const treadGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 24);
    treadGeo.rotateZ(Math.PI / 2);

    const flangeGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.025, 24);
    flangeGeo.rotateZ(Math.PI / 2);

    for (const sign of [-1, 1]) {
      const tread = new THREE.Mesh(treadGeo, matBlack);
      tread.position.set(sign * 0.392, 0, 0);
      tread.castShadow = true;

      const flange = new THREE.Mesh(flangeGeo, matBlack);
      flange.position.set(sign * (0.392 - sign * 0.035), 0, 0);
      flange.castShadow = true;

      wsGroup.add(tread, flange);
    }

    return wsGroup;
  }

  const frontWs = makeWheelset();
  frontWs.position.set(0, 0, 0.225);

  const backWs = makeWheelset();
  backWs.position.set(0, 0, -0.225);

  bogieGroup.add(frontWs, backWs);

  return { bogieGroup, wheelsets: [frontWs, backWs] };
}

// ── TRAIN GROUP ──────────────────────────────────────────────
const trainGroup  = new THREE.Group();
trainGroup.position.y = 0.15 * SCALE; // Elevates wheels flush on rail tops (0.525 world Y)
scene.add(trainGroup);

const coaches     = [];   // { root, section }
const driveWheels = [];   // individual wheels rotating on their axles
let chimneyAnchor = null; // smoke emission anchor on locomotive stack
const _chimneyWP  = new THREE.Vector3();

// ── 3D VOLUMETRIC CONTINUOUS SMOKE SYSTEM ────────────────────
class SmokeSystem {
  constructor(scene, count = 280) {
    this.count = count;
    // Low-poly faceted dodecahedron gives soft, organic billowing steam cloud puffs
    this.geo = new THREE.DodecahedronGeometry(0.55, 1);
    this.mat = new THREE.MeshLambertMaterial({
      color: 0xedf0f4,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      flatShading: true,
    });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // NEVER cull smoke as train travels along negative Z!
    scene.add(this.mesh);

    this.dummy = new THREE.Object3D();
    this.puffs = [];
    this.head = 0;
    this.emitAccumulator = 0;
    this.emitInterval = 1 / 35; // 35 puffs per second for dense, unbroken continuous steam
    this.maxAge = count * this.emitInterval; // 8.0 seconds lifetime (~48 units long plume)

    for (let i = 0; i < count; i++) {
      this.puffs.push({
        x: 0, y: -500, z: 0,
        vx: 0, vy: 0, vz: 0,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        rotSpeedX: (Math.random() - 0.5) * 1.5,
        rotSpeedY: (Math.random() - 0.5) * 1.5,
        rotSpeedZ: (Math.random() - 0.5) * 1.5,
        age: 999, // start inactive until spawned or seeded
        maxAge: this.maxAge,
        scaleMax: 2.6 + Math.random() * 0.9,
      });
    }

    this.lastChimneyPos = null;
  }

  // Pre-seed an unbroken, flowing plume behind the train on startup
  seedPlume(chimneyPos) {
    this.lastChimneyPos = chimneyPos.clone();
    for (let i = 0; i < this.count; i++) {
      const p = this.puffs[i];
      const progress = i / this.count;
      p.age = progress * p.maxAge;
      p.x = chimneyPos.x + Math.sin(progress * 8) * 0.4 * progress;
      p.y = chimneyPos.y + progress * 4.2;
      p.z = chimneyPos.z + (progress * p.maxAge * SPEED) + (Math.random() - 0.5) * 0.2;
      p.vx = (Math.random() - 0.5) * 0.35;
      p.vy = 1.2 + Math.random() * 0.6;
      p.vz = 0.5 + Math.random() * 0.4;
      p.scaleMax = 2.6 + Math.random() * 0.9;
    }
    this.head = 0;
    this.updateMatrix();
  }

  update(dt, chimneyPos) {
    if (!this.lastChimneyPos) this.lastChimneyPos = chimneyPos.clone();

    // Prevent accumulator explosion from frame skips or tab switches
    this.emitAccumulator = Math.min(this.emitAccumulator + dt, 0.08);

    // Continuous steady emission: emit puffs at strict cadence with sub-frame interpolation
    while (this.emitAccumulator >= this.emitInterval) {
      this.emitAccumulator -= this.emitInterval;

      const alpha = THREE.MathUtils.clamp(1.0 - (this.emitAccumulator / Math.max(dt, 0.001)), 0, 1);
      const spawnX = THREE.MathUtils.lerp(this.lastChimneyPos.x, chimneyPos.x, alpha) + (Math.random() - 0.5) * 0.12;
      const spawnY = THREE.MathUtils.lerp(this.lastChimneyPos.y, chimneyPos.y, alpha) + 0.15;
      const spawnZ = THREE.MathUtils.lerp(this.lastChimneyPos.z, chimneyPos.z, alpha) + (Math.random() - 0.5) * 0.12;

      const p = this.puffs[this.head];
      this.head = (this.head + 1) % this.count;

      p.age = 0;
      p.x = spawnX;
      p.y = spawnY;
      p.z = spawnZ;
      p.vx = (Math.random() - 0.5) * 0.35;
      p.vy = 2.0 + Math.random() * 1.0; // initial vertical steam ejection
      p.vz = 0.5 + Math.random() * 0.4; // aerodynamic drift trailing behind
      p.scaleMax = 2.6 + Math.random() * 0.9;
    }

    this.lastChimneyPos.copy(chimneyPos);

    // Update all puffs along the billowing plume
    for (let i = 0; i < this.count; i++) {
      const p = this.puffs[i];
      if (p.age >= p.maxAge) {
        // Place expired puff off-screen with tiny scale so it never pops
        this.dummy.position.set(0, -500, 0);
        this.dummy.scale.setScalar(0.0001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      p.age += dt;
      const progress = Math.min(1, p.age / p.maxAge);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy = Math.max(0.3, p.vy - 0.6 * dt);

      p.rotX += p.rotSpeedX * dt;
      p.rotY += p.rotSpeedY * dt;
      p.rotZ += p.rotSpeedZ * dt;

      // Dense unbroken billowing scale curve: compact birth -> rapid expansion -> stays large -> smooth vanish
      let s;
      if (progress < 0.12) {
        s = THREE.MathUtils.lerp(0.45, 1.6, progress / 0.12);
      } else if (progress < 0.70) {
        s = THREE.MathUtils.lerp(1.6, p.scaleMax, (progress - 0.12) / 0.58);
      } else {
        s = THREE.MathUtils.lerp(p.scaleMax, 0.05, (progress - 0.70) / 0.30);
      }

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      this.dummy.scale.setScalar(Math.max(0.001, s));
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // Dramatic burst of high-velocity steam when locomotive horn/whistle is pulled
  burstWhistle(pos) {
    if (!pos) return;
    for (let k = 0; k < 12; k++) {
      const p = this.puffs[this.head];
      this.head = (this.head + 1) % this.count;
      p.age = 0;
      p.x = pos.x + (Math.random() - 0.5) * 0.25;
      p.y = pos.y + 0.2 + k * 0.12;
      p.z = pos.z + (Math.random() - 0.5) * 0.25;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = 4.8 + Math.random() * 2.5; // energetic vertical steam burst
      p.vz = 0.8 + Math.random() * 0.6;
      p.scaleMax = 3.2 + Math.random() * 0.8;
    }
    this.updateMatrix();
  }

  updateMatrix() {
    for (let i = 0; i < this.count; i++) {
      const p = this.puffs[i];
      if (p.age >= p.maxAge) continue;
      const progress = Math.min(1, p.age / p.maxAge);
      let s;
      if (progress < 0.12) s = THREE.MathUtils.lerp(0.45, 1.6, progress / 0.12);
      else if (progress < 0.70) s = THREE.MathUtils.lerp(1.6, p.scaleMax, (progress - 0.12) / 0.58);
      else s = THREE.MathUtils.lerp(p.scaleMax, 0.05, (progress - 0.70) / 0.30);

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      this.dummy.scale.setScalar(Math.max(0.001, s));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const smokeSystem = new SmokeSystem(scene, 280);

// ── 3D FALLING SNOW PARTICLES (Active during Frozen Tundra Biome) ──
class SnowSystem {
  constructor(scene, count = 1200) {
    this.count = count;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.velocities = [];
    this.seeds = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 45;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;

      this.velocities.push({
        fall: 3.5 + Math.random() * 3.0,
        driftX: (Math.random() - 0.5) * 1.6,
        driftZ: (Math.random() - 0.5) * 1.6,
      });
      this.seeds.push(Math.random() * 100);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Procedural soft circle snowflake canvas texture
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 32;
    const ctx = cvs.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.35, 'rgba(242,248,255,0.85)');
    grad.addColorStop(1, 'rgba(242,248,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(cvs);

    this.mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.points.visible = false;
  }

  update(dt, camPos, intensity) {
    if (intensity <= 0.005) {
      this.points.visible = false;
      return;
    }

    this.points.visible = true;
    this.mat.opacity = THREE.MathUtils.clamp(intensity * 0.88, 0, 0.88);

    const pos = this.points.geometry.attributes.position.array;
    const time = clock.getElapsedTime();

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const v = this.velocities[i];
      const s = this.seeds[i];

      pos[idx + 1] -= v.fall * dt;
      pos[idx + 0] += Math.sin(time * 1.8 + s) * 0.8 * dt + v.driftX * dt;
      pos[idx + 2] += Math.cos(time * 1.4 + s) * 0.8 * dt + v.driftZ * dt;

      const relX = pos[idx + 0] - camPos.x;
      const relY = pos[idx + 1] - camPos.y;
      const relZ = pos[idx + 2] - camPos.z;

      if (pos[idx + 1] < 0 || Math.abs(relX) > 65 || Math.abs(relZ) > 65 || relY > 38) {
        pos[idx + 0] = camPos.x + (Math.random() - 0.5) * 110;
        pos[idx + 1] = Math.max(camPos.y + 12 + Math.random() * 20, 22 + Math.random() * 16);
        pos[idx + 2] = camPos.z + (Math.random() - 0.5) * 110;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

const snowSystem = new SnowSystem(scene, 1200);

// ── LOCOMOTIVE HEADLIGHT & LEFT/RIGHT ENGINE LIGHTING SYSTEM ──
let headlightGroup     = null;
let headSpot           = null;
let frontFillLight     = null;
let beamCone           = null;
let glowSprite         = null;
let lensMat            = null;
let headlightIntensity = 0.0;

let leftMarker         = null;
let rightMarker        = null;
let leftFlank          = null;
let rightFlank         = null;
let sharedGlowTex      = null;

function getSharedGlowTexture() {
  if (sharedGlowTex) return sharedGlowTex;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 128;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 230, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 235, 160, 0.7)');
  grad.addColorStop(0.6, 'rgba(255, 195, 80, 0.2)');
  grad.addColorStop(1, 'rgba(255, 195, 80, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sharedGlowTex = new THREE.CanvasTexture(cvs);
  return sharedGlowTex;
}

function createLocomotiveHeadlight() {
  const group = new THREE.Group();

  // 1. Vintage Cast Iron / Dark Metallic Lantern Casing
  const casingGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.22, 16);
  casingGeo.rotateX(Math.PI / 2); // Cylinder axis points along +Z
  const casingMat = new THREE.MeshStandardMaterial({
    color: 0x181818,
    metalness: 0.85,
    roughness: 0.35,
  });
  const casing = new THREE.Mesh(casingGeo, casingMat);
  group.add(casing);

  // 2. Polished Vintage Brass Trim Bezel
  const rimGeo = new THREE.TorusGeometry(0.14, 0.02, 8, 24);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xdfb438,
    metalness: 0.9,
    roughness: 0.2,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.set(0, 0, 0.11);
  group.add(rim);

  // 3. Glowing Lamp Lens Disk
  const lensGeo = new THREE.CircleGeometry(0.13, 24);
  lensMat = new THREE.MeshBasicMaterial({
    color: 0xfffae0,
    toneMapped: false,
  });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 0, 0.115);
  group.add(lens);

  // 4. Soft Lens Glow Flare Sprite
  const glowMat = new THREE.SpriteMaterial({
    map: getSharedGlowTexture(),
    color: 0xfff0c0,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  glowSprite = new THREE.Sprite(glowMat);
  glowSprite.scale.set(1.5, 1.5, 1.5);
  glowSprite.position.set(0, 0, 0.16);
  group.add(glowSprite);

  // 5. Cinematic Volumetric Light Cone
  const coneGeo = new THREE.ConeGeometry(2.2, 16.0, 24, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, 8.0); // Stretches forward along +Z from lamp face
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2d4,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  beamCone = new THREE.Mesh(coneGeo, coneMat);
  beamCone.frustumCulled = false;
  group.add(beamCone);

  // 6. Dynamic 3D SpotLight pointing along rails ahead
  headSpot = new THREE.SpotLight(0xfffae6, 0, 75, Math.PI / 5.2, 0.45, 1.0);
  headSpot.position.set(0, 0, 0.15);
  headSpot.castShadow = true;
  headSpot.shadow.mapSize.width = 1024;
  headSpot.shadow.mapSize.height = 1024;
  headSpot.shadow.camera.near = 1;
  headSpot.shadow.camera.far = 75;
  headSpot.shadow.bias = -0.0005;

  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -0.25, 20.0);
  group.add(spotTarget);
  headSpot.target = spotTarget;
  group.add(headSpot);

  // 7. Front Fill PointLight for cowcatcher & front track ties
  frontFillLight = new THREE.PointLight(0xffe6ad, 0, 12, 1.4);
  frontFillLight.position.set(0, 0, 0.4);
  group.add(frontFillLight);

  return group;
}

// ── LEFT & RIGHT FRONT MARKER LANTERNS (Ditch / Pilot Lamps) ──
function createMarkerLantern(isLeft) {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.4 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xdfb438, metalness: 0.9, roughness: 0.2 });

  // 1. Vertical mount stem attached to buffer beam
  const stemGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.08, 8);
  const stem = new THREE.Mesh(stemGeo, ironMat);
  stem.position.set(0, -0.04, 0);
  group.add(stem);

  // 2. Compact lantern casing
  const bodyGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.12, 14);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, ironMat);
  group.add(body);

  // 3. Polished brass bezel
  const rimGeo = new THREE.TorusGeometry(0.065, 0.012, 8, 20);
  const rim = new THREE.Mesh(rimGeo, brassMat);
  rim.position.set(0, 0, 0.06);
  group.add(rim);

  // 4. Glowing glass lens
  const lensGeo = new THREE.CircleGeometry(0.06, 20);
  const lMat = new THREE.MeshBasicMaterial({ color: 0xfffae0, toneMapped: false });
  const lens = new THREE.Mesh(lensGeo, lMat);
  lens.position.set(0, 0, 0.063);
  group.add(lens);

  // 5. Soft lens glow flare sprite
  const glowMat = new THREE.SpriteMaterial({
    map: getSharedGlowTexture(),
    color: 0xfff2cc,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(0.9, 0.9, 0.9);
  glow.position.set(0, 0, 0.09);
  group.add(glow);

  // 6. Volumetric beam cone angled slightly outward along the tracks
  const coneGeo = new THREE.ConeGeometry(1.1, 12.0, 16, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, 6.0);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.frustumCulled = false;
  cone.rotation.y = isLeft ? -0.18 : 0.18; // spread outward
  cone.rotation.x = 0.04;                  // slight downward pitch
  group.add(cone);

  // 7. Dynamic SpotLight angled along rails and embankment
  const spot = new THREE.SpotLight(0xfffae0, 0, 50, Math.PI / 5.2, 0.5, 1.2);
  spot.position.set(0, 0, 0.08);
  spot.castShadow = false;

  const target = new THREE.Object3D();
  target.position.set(isLeft ? -3.0 : 3.0, -0.4, 18.0);
  group.add(target);
  spot.target = target;
  group.add(spot);

  return { group, spot, cone, glow, lensMat: lMat };
}

// ── LEFT & RIGHT FLANK INSPECTION LANTERNS (Ground / Running Gear) ──
function createSideFlankLantern(isLeft) {
  const group = new THREE.Group();
  const sign = isLeft ? -1 : 1;
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.4 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xdfb438, metalness: 0.9, roughness: 0.2 });

  // 1. Horizontal mounting bracket extending from running board
  const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8);
  armGeo.rotateZ(Math.PI / 2);
  const arm = new THREE.Mesh(armGeo, ironMat);
  arm.position.set(sign * 0.045, 0, 0);
  group.add(arm);

  // 2. Vintage hooded lantern housing
  const lampGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.10, 12);
  const lamp = new THREE.Mesh(lampGeo, ironMat);
  lamp.position.set(sign * 0.09, 0, 0);
  group.add(lamp);

  // 3. Brass conical cap
  const capGeo = new THREE.ConeGeometry(0.062, 0.04, 12);
  const cap = new THREE.Mesh(capGeo, brassMat);
  cap.position.set(sign * 0.09, 0.06, 0);
  group.add(cap);

  // 4. Outer glass lens facing outward (to the side)
  const lensGeo = new THREE.CircleGeometry(0.048, 16);
  if (isLeft) lensGeo.rotateY(-Math.PI / 2);
  else lensGeo.rotateY(Math.PI / 2);
  const lMat = new THREE.MeshBasicMaterial({ color: 0xffe6ad, toneMapped: false });
  const lens = new THREE.Mesh(lensGeo, lMat);
  lens.position.set(sign * 0.145, 0, 0);
  group.add(lens);

  // 5. Soft outward glow flare
  const glowMat = new THREE.SpriteMaterial({
    map: getSharedGlowTexture(),
    color: 0xffdf99,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(0.85, 0.85, 0.85);
  glow.position.set(sign * 0.165, 0, 0);
  group.add(glow);

  // 6. Warm ground PointLight illuminating driving wheels & trackside ground
  const light = new THREE.PointLight(0xffdf99, 0, 14, 1.5);
  light.position.set(sign * 0.20, -0.10, 0);
  group.add(light);

  return { group, light, glow, lensMat: lMat };
}

function updateHeadlights(dt) {
  if (!headlightGroup || !headSpot) return;
  const isNight = dayCycle.isNight();
  const h = dayCycle._hour;

  let targetLevel = 0.0;
  if (isNight) {
    targetLevel = 1.0;
  } else if (h >= 19.5 || h < 6.5) {
    targetLevel = 0.75; // dusk / dawn twilight
  } else if (h >= 17.5 || h < 8.0) {
    targetLevel = 0.35; // golden hour / morning
  } else {
    targetLevel = 0.02; // daytime running lamp
  }

  headlightIntensity = THREE.MathUtils.lerp(headlightIntensity, targetLevel, Math.min(1, dt * 3.5));

  // Center Headlight
  headSpot.intensity = headlightIntensity * 4.8;
  frontFillLight.intensity = headlightIntensity * 1.6;
  beamCone.material.opacity = headlightIntensity * 0.22;
  beamCone.visible = headlightIntensity > 0.01;
  glowSprite.material.opacity = headlightIntensity * 0.95;
  glowSprite.visible = headlightIntensity > 0.01;
  if (lensMat) {
    lensMat.color.setRGB(
      0.25 + headlightIntensity * 0.75,
      0.25 + headlightIntensity * 0.73,
      0.22 + headlightIntensity * 0.65
    );
  }

  // Left & Right Front Marker Lamps
  if (leftMarker) {
    leftMarker.spot.intensity = headlightIntensity * 2.4;
    leftMarker.cone.material.opacity = headlightIntensity * 0.16;
    leftMarker.cone.visible = headlightIntensity > 0.01;
    leftMarker.glow.material.opacity = headlightIntensity * 0.85;
    leftMarker.glow.visible = headlightIntensity > 0.01;
    leftMarker.lensMat.color.setRGB(
      0.25 + headlightIntensity * 0.75,
      0.25 + headlightIntensity * 0.73,
      0.22 + headlightIntensity * 0.65
    );
  }
  if (rightMarker) {
    rightMarker.spot.intensity = headlightIntensity * 2.4;
    rightMarker.cone.material.opacity = headlightIntensity * 0.16;
    rightMarker.cone.visible = headlightIntensity > 0.01;
    rightMarker.glow.material.opacity = headlightIntensity * 0.85;
    rightMarker.glow.visible = headlightIntensity > 0.01;
    rightMarker.lensMat.color.setRGB(
      0.25 + headlightIntensity * 0.75,
      0.25 + headlightIntensity * 0.73,
      0.22 + headlightIntensity * 0.65
    );
  }

  // Left & Right Side Flank Inspection Lamps
  if (leftFlank) {
    leftFlank.light.intensity = headlightIntensity * 1.8;
    leftFlank.glow.material.opacity = headlightIntensity * 0.80;
    leftFlank.glow.visible = headlightIntensity > 0.01;
    leftFlank.lensMat.color.setRGB(
      0.25 + headlightIntensity * 0.75,
      0.23 + headlightIntensity * 0.65,
      0.18 + headlightIntensity * 0.50
    );
  }
  if (rightFlank) {
    rightFlank.light.intensity = headlightIntensity * 1.8;
    rightFlank.glow.material.opacity = headlightIntensity * 0.80;
    rightFlank.glow.visible = headlightIntensity > 0.01;
    rightFlank.lensMat.color.setRGB(
      0.25 + headlightIntensity * 0.75,
      0.23 + headlightIntensity * 0.65,
      0.18 + headlightIntensity * 0.50
    );
  }
}

// ── TRAIN ASSEMBLY ────────────────────────────────────────────
function assembleTrain(locoGltf, coachAGltf, coachBGltf) {
  const matWheel = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // ── 1. Locomotive ──
  const loco = locoGltf.scene;
  loco.scale.setScalar(SCALE);
  loco.rotation.y = Math.PI;

  // Replace front bogie with our clean round-wheel bogie
  loco.traverse(c => {
    if (c.isMesh && c.name === 'wheels-front') {
      const parent = c.parent;
      const { bogieGroup, wheelsets } = createBogieTruck();
      bogieGroup.position.set(0, 0.18, 0.6);
      parent.remove(c);
      parent.add(bogieGroup);
      driveWheels.push(...wheelsets);
    }
  });

  // Driving wheels & body
  loco.traverse(c => {
    if (!c.isMesh) return;
    c.castShadow = true;
    c.receiveShadow = true;

    if (/^wheel(_\d+)?$/i.test(c.name)) {
      c.material = matWheel;
      driveWheels.push(c);
    } else if (c.name.includes('locomotive')) {
      // Body mesh (train-locomotive-a, train-locomotive-a_1)
      applyLocoVertexColors(c);
    }
  });

  trainGroup.add(loco);
  coaches.push({ root: loco, section: 'loco' });

  // Smoke emitter anchor placed right at smokestack mouth
  chimneyAnchor = new THREE.Object3D();
  chimneyAnchor.position.set(0, 1.522, 0.85); // local locomotive coordinates
  loco.add(chimneyAnchor);
  trainGroup.updateMatrixWorld(true);
  chimneyAnchor.getWorldPosition(_chimneyWP);
  smokeSystem.seedPlume(_chimneyWP);

  // ── Locomotive Headlight & Left/Right Engine Lights ──
  headlightGroup = createLocomotiveHeadlight();
  headlightGroup.position.set(0, 0.96, 1.31);
  loco.add(headlightGroup);

  // Left & Right Front Marker Lamps (pilot / ditch lights)
  leftMarker = createMarkerLantern(true);
  leftMarker.group.position.set(-0.42, 0.54, 1.22);
  loco.add(leftMarker.group);

  rightMarker = createMarkerLantern(false);
  rightMarker.group.position.set(0.42, 0.54, 1.22);
  loco.add(rightMarker.group);

  // Left & Right Side Flank Inspection Lamps (running board / ground lights)
  leftFlank = createSideFlankLantern(true);
  leftFlank.group.position.set(-0.66, 0.72, 0.05);
  loco.add(leftFlank.group);

  rightFlank = createSideFlankLantern(false);
  rightFlank.group.position.set(0.66, 0.72, 0.05);
  loco.add(rightFlank.group);

  // ── 2. Five Coaches ──
  const tpls  = [coachAGltf, coachBGltf, coachAGltf, coachBGltf, coachAGltf];
  const sects = ['about', 'skills', 'projects', 'interests', 'contact'];

  for (let i = 0; i < 5; i++) {
    const coach = tpls[i].scene.clone(true);
    coach.scale.setScalar(SCALE);
    coach.rotation.y = Math.PI;
    coach.position.z = LOCO_LEN * 0.5 + COACH_GAP + COACH_LEN * 0.5 + i * COACH_SPACING;

    // Replace old coach bogies with clean round-wheel bogies
    const oldBogies = [];
    coach.traverse(c => {
      if (c.isMesh && /wheels-(front|back)/i.test(c.name)) {
        oldBogies.push(c);
      }
    });

    for (const oldBogie of oldBogies) {
      const parent = oldBogie.parent;
      const isFront = oldBogie.name.includes('front');
      const zPos = isFront ? 0.7 : -0.4;
      const { bogieGroup, wheelsets } = createBogieTruck();
      bogieGroup.position.set(0, 0.18, zPos);
      parent.remove(oldBogie);
      parent.add(bogieGroup);
      driveWheels.push(...wheelsets);
    }

    // Color coach body (wood with black windows & brown frame)
    coach.traverse(c => {
      if (!c.isMesh) return;
      c.castShadow = true;
      c.receiveShadow = true;
      if (/passenger/i.test(c.name)) {
        applyCoachVertexColors(c);
      }
    });

    trainGroup.add(coach);
    coaches.push({ root: coach, section: sects[i] });
  }

  console.log(`Train assembled! Total independently rotating axles: ${driveWheels.length}`);
}

// ── DAY CYCLE ────────────────────────────────────────────────
const dayCycle = new DayCycle();
const stars    = new Stars(scene);
const _sc = new THREE.Color(), _fc = new THREE.Color(), _tempColor = new THREE.Color();

function applyDayCycle() {
  dayCycle.update();
  const top  = dayCycle.getSkyTop(),  bot = dayCycle.getSkyBottom();
  const sunC = dayCycle.getSunColor(), night = dayCycle.isNight();
  _sc.setRGB(top.r, top.g, top.b); skyMat.color.copy(_sc); scene.background = _sc.clone();
  _fc.setRGB(bot.r, bot.g, bot.b); scene.fog.color.copy(_fc);
  sun.color.setRGB(sunC.r, sunC.g, sunC.b);
  sun.intensity     = dayCycle.getSunIntensity();
  ambient.intensity = dayCycle.getAmbientIntensity();
  moon.intensity    = night ? 0.6 : 0;
  stars.setNight(night);

  // Celestial Sun appearance: radiant warm orb during daytime, hidden at night
  sunGroup.visible = !night;
  if (!night) {
    sunCoreMat.color.setRGB(sunC.r, sunC.g, sunC.b);
    sunHaloMat.color.setRGB(sunC.r, sunC.g * 0.9, sunC.b * 0.55);
    sunFlareMat.color.setRGB(sunC.r, sunC.g * 0.7, sunC.b * 0.25);
  }

  const lbl = dayCycle.getLabel();
  const timeIconEl = document.getElementById('time-icon');
  if (timeIconEl) {
    timeIconEl.innerHTML = ICONS[lbl.iconKey] ? ICONS[lbl.iconKey](15) : ICONS.sun(15);
  }
  const timeLabelEl = document.getElementById('time-label');
  if (timeLabelEl) {
    timeLabelEl.textContent = lbl.label;
  }
  updateHeadlights(1.0);
}
setInterval(applyDayCycle, 60_000);

export function toggleTime() {
  dayCycle.cycleTime();
  applyDayCycle();
}

// ── CAMERA MODES & TRACKING ──────────────────────────────────
export const CAMERA_MODES = [
  { id: 'side',        label: 'Side View',   hint: 'Cinematic tracking camera' },
  { id: 'cabin',       label: 'Cab View',    hint: 'Driver cabin looking forward over boiler' },
  { id: 'coach_ahead', label: 'Coach Flank', hint: 'Side of coach looking forward' },
  { id: 'rear_track',  label: 'Rear Tracks', hint: 'Back of train looking down tracks' },
  { id: 'top',         label: 'Top Down',    hint: 'Overhead bird\'s-eye view' },
];

let trainReady = false;
let camModeIdx = 0;
let camMode = CAMERA_MODES[0].id;
let camZoom = 1.0;

// ── RESPONSIVE MOBILE ZOOM FACTOR ────────────────────────────
export function getMobileZoomFactor() {
  const aspect = window.innerWidth / window.innerHeight;
  // If in portrait mode or narrow mobile screen, zoom out proportionally
  if (aspect < 0.65) {
    return 1.48; // tall mobile phone portrait (e.g. iPhone, modern Android)
  } else if (aspect < 0.9) {
    return 1.36; // standard mobile portrait
  } else if (aspect < 1.15 || window.innerWidth < 768) {
    return 1.22; // tablet / narrow landscape
  }
  return 1.0;    // widescreen desktop
}

const _wantPos  = new THREE.Vector3();
const _wantLook = new THREE.Vector3();
const _locoWP   = new THREE.Vector3();

function getCameraConfig(mode, zoom) {
  switch (mode) {
    case 'cabin':
      // Inside locomotive cab looking forward over boiler, dome, stack, and front cowcatcher
      return {
        pos: new THREE.Vector3(0.65 * zoom, 4.35, 0.1 + 0.3 * zoom),
        look: new THREE.Vector3(0.12, 1.8, -80),
        fov: 56,
      };
    case 'coach_ahead':
      // Side of passenger coach looking ahead along the flank toward locomotive and tracks
      return {
        pos: new THREE.Vector3(3.2 * zoom, 2.8, 18.2),
        look: new THREE.Vector3(0.0, 1.8, -35),
        fov: 54,
      };
    case 'rear_track':
      // Rear observation view looking back along the twin steel rails and ballast bed receding
      return {
        pos: new THREE.Vector3(0.0, 2.5 * zoom, 54.8 + 1.2 * zoom),
        look: new THREE.Vector3(0.0, 0.4, 130),
        fov: 52,
      };
    case 'top':
      return {
        pos: new THREE.Vector3(0, 34 * zoom, 10 * zoom),
        look: new THREE.Vector3(0, 1.4, 10),
        fov: 52,
      };
    case 'side':
    default:
      return {
        pos: new THREE.Vector3(26 * zoom, 9 * zoom, -4 * zoom),
        look: new THREE.Vector3(0, SCALE * 0.4, 0),
        fov: 52,
      };
  }
}

window.addEventListener('wheel', e => {
  camZoom = THREE.MathUtils.clamp(camZoom + e.deltaY * 0.0006, MIN_ZOOM, MAX_ZOOM);
}, { passive: true });

// Mobile touch pinch-to-zoom
let touchStartDist = 0;
let initialCamZoom = 1.0;

window.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchStartDist = Math.hypot(dx, dy);
    initialCamZoom = camZoom;
  }
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && touchStartDist > 0) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const currentDist = Math.hypot(dx, dy);
    const factor = touchStartDist / currentDist;
    camZoom = THREE.MathUtils.clamp(initialCamZoom * factor, MIN_ZOOM, MAX_ZOOM);
  }
}, { passive: true });

window.addEventListener('touchend', e => {
  if (e.touches.length < 2) touchStartDist = 0;
}, { passive: true });

function snapCamera() {
  if (!coaches.length) return;
  coaches[0].root.getWorldPosition(_locoWP);
  const effectiveZoom = camZoom * getMobileZoomFactor();
  const cfg = getCameraConfig(camMode, effectiveZoom);
  camera.position.copy(_locoWP).add(cfg.pos);
  _wantLook.copy(_locoWP).add(cfg.look);
  camera.lookAt(_wantLook);
  camera.fov = cfg.fov;
  camera.updateProjectionMatrix();
}

function updateCamera(dt) {
  if (!trainReady) return;
  coaches[0].root.getWorldPosition(_locoWP);
  const effectiveZoom = camZoom * getMobileZoomFactor();
  const cfg = getCameraConfig(camMode, effectiveZoom);
  _wantPos.copy(_locoWP).add(cfg.pos);
  _wantLook.copy(_locoWP).add(cfg.look);

  // Train-mounted cameras (cabin, coach_ahead, rear_track) stay rigidly locked to train frame to avoid jitter:
  const isRigid = camMode === 'cabin' || camMode === 'coach_ahead' || camMode === 'rear_track';
  if (isRigid) {
    camera.position.copy(_wantPos);
    camera.lookAt(_wantLook);
  } else {
    camera.position.lerp(_wantPos, Math.min(1, 8 * dt));
    camera.lookAt(_wantLook);
  }
}

// ── AUDIO SYSTEM (Pixabay Railway Train Ambient Loop & Horn) ────
let soundMuted = false;

const bgAudio   = document.getElementById('bg-audio')   || new Audio('assets/sounds/train-ambient.mp3');
const hornAudio = document.getElementById('horn-audio') || new Audio('assets/sounds/horn.mp3');

bgAudio.loop   = true;
bgAudio.volume = 0.75;
hornAudio.volume = 1.0;

export function startBackgroundMusic() {
  if (soundMuted) return;
  if (bgAudio.paused) {
    bgAudio.play().catch(() => {
      // Browser autoplay policy requires user gesture
    });
  }
}

export function playHorn() {
  // 1. Visual steam burst from locomotive smokestack
  if (chimneyAnchor && smokeSystem) {
    chimneyAnchor.getWorldPosition(_chimneyWP);
    smokeSystem.burstWhistle(_chimneyWP);
  }

  // 2. Visual button push feedback in HUD
  const btn = document.getElementById('horn-btn');
  if (btn) {
    btn.classList.add('pulling');
    setTimeout(() => btn.classList.remove('pulling'), 600);
  }

  // Ensure background loop is running as well
  startBackgroundMusic();

  if (soundMuted) return;

  // 3. Play the authentic 7-second train horn
  try {
    hornAudio.currentTime = 0;
    hornAudio.play().catch(e => console.warn('Horn play error:', e));
  } catch (e) {
    console.warn('Horn play error:', e);
  }
}

export function toggleSound() {
  soundMuted = !soundMuted;
  bgAudio.muted   = soundMuted;
  hornAudio.muted = soundMuted;

  if (!soundMuted) {
    startBackgroundMusic();
  }

  const iconEl = document.getElementById('sound-icon');
  if (iconEl) {
    iconEl.innerHTML = soundMuted ? ICONS.soundOff(15) : ICONS.soundOn(15);
  }
  const labelEl = document.getElementById('sound-label');
  if (labelEl) {
    labelEl.textContent = soundMuted ? 'Sound: OFF' : 'Sound: ON';
  }
  const btn = document.getElementById('sound-btn');
  if (btn) {
    btn.classList.toggle('muted', soundMuted);
  }
}

// ── LOADING ───────────────────────────────────────────────────
const loadingEl = document.getElementById('loading');
const barEl     = document.getElementById('loadingBar');
const pctEl     = document.getElementById('loadingPct');
const stepEl    = document.getElementById('loadingStep');

function setProgress(frac, msg) {
  const p = Math.round(Math.min(frac, 1) * 100);
  barEl.style.width = p + '%'; pctEl.textContent = p + '%';
  if (msg) stepEl.textContent = msg;
}

function loadGLTF(url, onProg) {
  return new Promise((res, rej) => gltfLoader.load(
    url, res,
    xhr => { if (xhr.total > 0) onProg?.(xhr.loaded / xhr.total); },
    err => { console.error('GLB fail:', url, err); rej(err); }
  ));
}

// ── RENDER LOOP ───────────────────────────────────────────────
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (trainReady) {
    trainGroup.position.z -= SPEED * dt;

    // Spin every round wheelset smoothly on its axle
    for (const w of driveWheels) {
      w.rotation.x -= SPEED * dt * 1.5;
    }

    // 3D Volumetric smoke billowing from smokestack
    if (chimneyAnchor) {
      chimneyAnchor.getWorldPosition(_chimneyWP);
      smokeSystem.update(dt, _chimneyWP);
    }

    // Dynamic locomotive headlight illumination
    updateHeadlights(dt);

    // Continuous track tiles with ballast bed
    recycleTracks(trainGroup.position.z);

    // Procedural trees moving relative to train (recycle old behind, spawn new ahead)
    updateVegetation(trainGroup.position.z);

    // Stationary mountains flanking front and back of railway
    updateMountains(trainGroup.position.z);
  }

  // Ground plane and sky dome follow train position along Z
  const tz = trainGroup.position.z;
  groundMesh.position.z = tz;
  skyMesh.position.copy(camera.position);

  // Radiant celestial sun stays positioned in the sky ahead
  sunGroup.position.copy(camera.position).add(SUN_CELESTIAL_OFFSET);
  sun.position.set(-60, 140, tz - 220);
  sun.target.position.set(0, 0, tz);
  sun.target.updateMatrixWorld();

  // ── DYNAMIC 4-BIOME ATMOSPHERE & MATERIAL ADAPTATION ─────────
  const targetBiome = sampleBlendedBiome(tz);
  const blendRate = Math.min(1, dt * 2.8);
  const nightFactor = dayCycle.isNight() ? 0.32 : (dayCycle._hour < 6.5 || dayCycle._hour >= 20.0 ? 0.65 : 1.0);

  _tempColor.copy(targetBiome.groundColor).multiplyScalar(nightFactor);
  groundMat.color.lerp(_tempColor, blendRate);

  _tempColor.copy(targetBiome.mtnColor).multiplyScalar(nightFactor);
  matMtn.color.lerp(_tempColor, blendRate);

  _tempColor.copy(targetBiome.snowCapColor).multiplyScalar(nightFactor);
  matSnow.color.lerp(_tempColor, blendRate);

  _tempColor.copy(targetBiome.leafLight).multiplyScalar(nightFactor);
  matLeafLight.color.lerp(_tempColor, blendRate);

  _tempColor.copy(targetBiome.leafMid).multiplyScalar(nightFactor);
  matLeafMid.color.lerp(_tempColor, blendRate);

  _tempColor.copy(targetBiome.leafDark).multiplyScalar(nightFactor);
  matLeafDark.color.lerp(_tempColor, blendRate);

  const top = dayCycle.getSkyTop();
  const bot = dayCycle.getSkyBottom();
  const isDay = dayCycle._hour >= 9 && dayCycle._hour < 17;
  if (dayCycle.isNight()) {
    _fc.setRGB(bot.r, bot.g, bot.b);
    scene.fog.color.lerp(_fc, blendRate);
    _sc.setRGB(top.r, top.g, top.b);
    skyMat.color.lerp(_sc, blendRate);
  } else if (isDay) {
    scene.fog.color.lerp(targetBiome.fogColor, blendRate);
    skyMat.color.lerp(targetBiome.skyColor, blendRate);
  } else {
    // Dawn / Golden hour / Dusk: blend atmospheric twilight with biome sky
    _fc.setRGB(bot.r, bot.g, bot.b).lerp(targetBiome.fogColor, 0.4);
    scene.fog.color.lerp(_fc, blendRate);
    _sc.setRGB(top.r, top.g, top.b).lerp(targetBiome.skyColor, 0.35);
    skyMat.color.lerp(_sc, blendRate);
  }
  scene.background.copy(skyMat.color);

  // Active falling snow particles in frozen tundra / snowy regions
  snowSystem.update(dt, camera.position, targetBiome.snowIntensity);

  // Dynamically update HUD landscape badge (Prairie vs Alpine Pass vs Frozen Tundra vs Autumn Highlands)
  const biomeInterp = getBiomeInterpolation(tz);
  const dominant = biomeInterp.dominantBiome;
  if (dominant.id !== lastBiomeId) {
    lastBiomeId = dominant.id;
    const iconEl = document.getElementById('biome-icon');
    if (iconEl) {
      iconEl.innerHTML = ICONS[dominant.iconKey] ? ICONS[dominant.iconKey](15) : ICONS.mountain(15);
    }
    const labelEl = document.getElementById('biome-label');
    if (labelEl) {
      labelEl.textContent = dominant.name;
    }
  }

  updateCamera(dt);
  stars.update(dt, camera.position);
  renderer.render(scene, camera);
});

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  // Initialize static UI vector icons
  const navIcons = [ICONS.loco(15), ICONS.about(15), ICONS.skills(15), ICONS.projects(15), ICONS.interests(15), ICONS.contact(15)];
  navIcons.forEach((svg, i) => {
    const el = document.getElementById(`nav-icon-${i}`);
    if (el) el.innerHTML = svg;
  });

  const camIconEl = document.getElementById('cam-icon');
  if (camIconEl) camIconEl.innerHTML = ICONS.camera(15);
  const camLabelEl = document.getElementById('cam-label');
  if (camLabelEl) camLabelEl.textContent = CAMERA_MODES[camModeIdx].label;

  const spotifyBtnIcon = document.getElementById('spotify-btn-icon');
  if (spotifyBtnIcon) spotifyBtnIcon.innerHTML = ICONS.spotify(16);

  const hornBtnIcon = document.getElementById('horn-btn-icon');
  if (hornBtnIcon) hornBtnIcon.innerHTML = ICONS.horn(15);

  const soundIcon = document.getElementById('sound-icon');
  if (soundIcon) soundIcon.innerHTML = ICONS.soundOn(15);

  const spotifyDockIcon = document.getElementById('spotify-dock-icon');
  if (spotifyDockIcon) spotifyDockIcon.innerHTML = ICONS.spotify(18);

  applyDayCycle();

  setProgress(0, 'Loading track & ballast…');
  const trackGltf = await loadGLTF('assets/models/track-detailed.glb',
    f => setProgress(f * 0.12, 'Loading track…'));
  spawnTrackPool(trackGltf.scene);
  setProgress(0.12, 'Track & ballast ready');

  const locoGltf = await loadGLTF('assets/models/locomotive.glb',
    f => setProgress(0.12 + f * 0.34, 'Loading locomotive…'));
  setProgress(0.46, 'Locomotive ready');

  const coachAGltf = await loadGLTF('assets/models/coach-a.glb',
    f => setProgress(0.46 + f * 0.27, 'Loading coaches…'));
  setProgress(0.73, 'Coach A ready');

  const coachBGltf = await loadGLTF('assets/models/coach-b.glb',
    f => setProgress(0.73 + f * 0.27, 'Finalising…'));
  setProgress(1, 'All aboard');

  assembleTrain(locoGltf, coachAGltf, coachBGltf);
  trainReady = true;
  snapCamera();

  const onUserInteraction = () => {
    startBackgroundMusic();
  };
  window.addEventListener('pointerdown', onUserInteraction, { passive: true });
  window.addEventListener('keydown', onUserInteraction, { passive: true });
  window.addEventListener('touchstart', onUserInteraction, { passive: true });
  startBackgroundMusic();

  await new Promise(r => setTimeout(r, 700));
  loadingEl.classList.add('fade-out');
  await new Promise(r => setTimeout(r, 950));
  loadingEl.style.display = 'none';
  setTimeout(() => document.getElementById('instructions')?.classList.add('fade'), 7000);
}

init().catch(err => {
  console.error('Initialization error:', err);
  stepEl.textContent = 'Error: ' + (err?.message || String(err));
  stepEl.style.color = '#ff6666';
});

// ── INTERACTIONS ─────────────────────────────────────────────
const coachBtns = document.querySelectorAll('.coach-btn');
coachBtns.forEach(btn => btn.addEventListener('click', () => {
  const i = +btn.dataset.coach;
  coachBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
  highlightCoach(i);
  UI.show(COACH_SECTIONS[i]);
}));

document.getElementById('panel-close').addEventListener('click', () => {
  UI.hide(); highlightCoach(-1); coachBtns.forEach(b => b.classList.remove('active'));
});
document.getElementById('time-badge')?.addEventListener('click', toggleTime);
document.getElementById('cam-badge').addEventListener('click', toggleCam);
document.getElementById('horn-btn')?.addEventListener('click', playHorn);
document.getElementById('sound-btn')?.addEventListener('click', toggleSound);

// ── SPOTIFY DOCK CONTROLLER ─────────────────────────────────
const spotifyBtn       = document.getElementById('spotify-btn');
const spotifyDock      = document.getElementById('spotify-dock');
const spotifyDockClose = document.getElementById('spotify-dock-close');

export function toggleSpotify() {
  if (!spotifyDock) return;
  const isHidden = spotifyDock.classList.contains('hidden');
  if (isHidden) {
    spotifyDock.classList.remove('hidden', 'closing');
    spotifyBtn?.classList.add('active');
  } else {
    closeSpotify();
  }
}

export function closeSpotify() {
  if (!spotifyDock || spotifyDock.classList.contains('hidden')) return;
  spotifyDock.classList.add('closing');
  spotifyBtn?.classList.remove('active');
  setTimeout(() => {
    spotifyDock.classList.add('hidden');
    spotifyDock.classList.remove('closing');
  }, 280);
}

spotifyBtn?.addEventListener('click', toggleSpotify);
spotifyDockClose?.addEventListener('click', closeSpotify);

window.addEventListener('keydown', e => {
  if (e.key === 't' || e.key === 'T') toggleTime();
  if (e.key === 'p' || e.key === 'P') toggleSpotify();
  if (e.key === 'v' || e.key === 'V') toggleCam();
  if (e.key === 'h' || e.key === 'H' || (e.code === 'Space' && !e.repeat && !document.getElementById('panel').classList.contains('visible'))) {
    if (e.code === 'Space') e.preventDefault();
    playHorn();
  }
  if (e.key === 'm' || e.key === 'M') toggleSound();
  if (e.key === 'Escape') {
    UI.hide(); highlightCoach(-1); coachBtns.forEach(b => b.classList.remove('active'));
    closeSpotify();
  }
});

function toggleCam() {
  camModeIdx = (camModeIdx + 1) % CAMERA_MODES.length;
  camMode = CAMERA_MODES[camModeIdx].id;
  const camIconEl = document.getElementById('cam-icon');
  if (camIconEl) camIconEl.innerHTML = ICONS.camera(15);
  const camLabelEl = document.getElementById('cam-label');
  if (camLabelEl) camLabelEl.textContent = CAMERA_MODES[camModeIdx].label;
  if (trainReady) snapCamera();
}

// Keep 3D models free of unnatural emissive glowing halos
function highlightCoach(idx) {
  coaches.forEach(c => c.root.traverse(m => {
    if (m.isMesh && m.material && m.material.emissive) {
      m.material.emissive.set(0x000000);
      m.material.emissiveIntensity = 0;
    }
  }));
}

const raycaster = new THREE.Raycaster(), _mouse = new THREE.Vector2();
canvas.addEventListener('click', e => {
  if (!trainReady || document.getElementById('panel').classList.contains('visible')) return;
  _mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(_mouse, camera);
  const meshes = []; trainGroup.traverse(o => { if (o.isMesh) meshes.push(o); });
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return;
  for (let i = 0; i < coaches.length; i++) {
    let cur = hits[0].object.parent;
    while (cur) {
      if (cur === coaches[i].root) {
        coachBtns.forEach(b => b.classList.remove('active'));
        coachBtns[i]?.classList.add('active');
        highlightCoach(i); UI.show(COACH_SECTIONS[i]); return;
      }
      cur = cur.parent;
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (trainReady) snapCamera();
});
