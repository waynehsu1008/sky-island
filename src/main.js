import * as THREE from 'three';
import { createIsland } from './world.js';
import { Player, advancePlayer } from './physics.js';
import { createTerrain } from './terrain.js';
import { Mining, pickBlock } from './mining.js';
import { createCracks } from './cracks.js';
import { Drops } from './drops.js';
import { createDropView } from './drop-view.js';
import { Inventory, BLOCK_ORDER, collectDrops, placeBlock } from './inventory.js';
import { createHotbar } from './hotbar.js';
import { DayCycle } from './day-cycle.js';
import { createHandView } from './hand-view.js';
import { Animals } from './animals.js';
import { createAnimalView } from './animal-view.js';
import { createSkyView } from './sky-view.js';
import './style.css';

const canvas = document.querySelector('#world');
const welcome = document.querySelector('#welcome');
const start = document.querySelector('#start');
const title = document.querySelector('#welcome-title');
const note = document.querySelector('#start-note');
const notice = document.querySelector('#notice');
const fpsOutput = document.querySelector('#fps');
const fullButton = document.querySelector('#fullscreen');
const game = document.querySelector('#game');
const keys = new Set();
let renderer, scene, camera, player, world, terrain, cracks, dropView, hemisphere, sunlight, hand, animals, animalView;
const mining = new Mining();
const drops = new Drops();
const inventory = new Inventory();
const hotbar = createHotbar(inventory);
const dayCycle = new DayCycle();
const timeOutput = document.querySelector('#time-of-day');
const dayOutput = document.querySelector('#play-day');
const playTimeOutput = document.querySelector('#play-time');
let placedBlocks = 0;
const lookDirection = new THREE.Vector3();
let leftHeld = false, aimTarget = null, brokenBlocks = 0, protectionNotified = false;
let active = false, started = false, lastTime = 0, fpsStart = 0, fpsFrames = 0, noticeUntil = 0;
let jumpQueued = false;

function pause() {
  active = false;
  keys.clear();
  jumpQueued = false;
  cancelMining();
  if (player) player.jumpHeld = false;
  welcome.hidden = false;
  if (started) { title.textContent = '休息一下'; start.textContent = '繼續探索'; }
}
function cancelMining() {
  leftHeld = false;
  mining.reset();
  cracks?.show(null, -1);
  protectionNotified = false;
}
function onBlockBroken(block) {
  terrain.rebuildAt(block.x, block.z);
  drops.spawn(block);
  brokenBlocks++;
}
function showNotice(text, seconds = 3) {
  notice.textContent = text;
  notice.hidden = false;
  noticeUntil = performance.now() + seconds * 1000;
}

start.addEventListener('click', async () => {
  if (start.disabled) return;
  try {
    if (!canvas.requestPointerLock) throw new Error('Pointer lock unavailable');
    await canvas.requestPointerLock();
  } catch {
    note.textContent = '瀏覽器未允許滑鼠操作，請再按一次，或用桌面瀏覽器開啟。';
  }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    active = started = true;
    welcome.hidden = true;
    note.textContent = '點擊後以滑鼠看四周。';
    lastTime = performance.now();
  } else pause();
});
document.addEventListener('pointerlockerror', () => {
  note.textContent = '滑鼠操作未啟用，請再按一次「開始探索」。';
});
document.addEventListener('mousemove', (event) => {
  if (!active) return;
  player.yaw -= event.movementX * 0.002;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * 0.002, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
});
document.addEventListener('keydown', (event) => {
  if (!active) return;
  if (event.code === 'Escape') {
    event.preventDefault();
    pause();
    if (document.pointerLockElement) document.exitPointerLock();
    return;
  }
  if (/^Digit[1-8]$/.test(event.code)) {
    event.preventDefault();
    inventory.select(BLOCK_ORDER[Number(event.code.slice(-1)) - 1]);
    hotbar.update();
    return;
  }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
    if (event.code === 'Space' && !event.repeat) jumpQueued = true;
  }
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('mousedown', (event) => {
  if (active && event.button === 0) { event.preventDefault(); leftHeld = true; }
  if (active && event.button === 2) {
    event.preventDefault();
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    const hit = pickBlock(world, camera.position, camera.getWorldDirection(lookDirection));
    const placed = placeBlock(world, player, inventory, hit);
    if (placed) { terrain.rebuildAt(placed.x, placed.z); placedBlocks++; cancelMining(); hotbar.update(); hand.place(); }
    else showNotice(inventory.count(inventory.selected) === 0 ? '這種方塊已用完，先挖掘並撿取' : '這裡不能放置，請對準空的相鄰格');
  }
});
document.addEventListener('mouseup', (event) => {
  if (event.button === 0) cancelMining();
});
window.addEventListener('blur', () => {
  pause();
  if (document.pointerLockElement) document.exitPointerLock();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    if (document.pointerLockElement) document.exitPointerLock();
  }
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
fullButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await game.requestFullscreen();
  } catch { showNotice('無法切換全螢幕，可改用瀏覽器的 F11。'); }
});
document.addEventListener('fullscreenchange', () => {
  fullButton.textContent = document.fullscreenElement ? '離開全螢幕' : '全螢幕';
  resize();
});
function resize() {
  if (!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  hand?.resize(camera.aspect);
}
window.addEventListener('resize', resize);

function animate(now) {
  const dt = lastTime ? (now - lastTime) / 1000 : 0;
  lastTime = now;
  const previousRespawns = player.respawnCount;
  if (active) advancePlayer(player, world, {
    forward: Number(keys.has('KeyW')) - Number(keys.has('KeyS')),
    right: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
    jump: keys.has('Space') || jumpQueued,
  }, dt);
  jumpQueued = false;
  if (player.respawnCount !== previousRespawns) {
    keys.clear();
    cancelMining();
    showNotice('已回到出生點');
  }
  camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  aimTarget = active ? pickBlock(world, camera.position, camera.getWorldDirection(lookDirection)) : null;
  const broken = mining.update(world, aimTarget, active && leftHeld, dt);
  if (broken) onBlockBroken(broken);
  if (active) {
    drops.update(world, dt);
    collectDrops(drops, player, inventory, dt);
    dropView.sync(drops.items);
    hotbar.update();
  }
  animals.update(world, dt, active, player.position);
  animalView.sync();
  dayCycle.update(dt, active);
  const light = dayCycle.sample();
  const clock = dayCycle.clock();
  const dayLabel = `第 ${clock.day} 天`;
  if (dayOutput.value !== dayLabel) dayOutput.value = dayLabel;
  if (playTimeOutput.value !== clock.text) playTimeOutput.value = clock.text;
  scene.background.setRGB(...light.sky, THREE.SRGBColorSpace);
  scene.fog.color.copy(scene.background);
  hemisphere.intensity = light.ambient;
  sunlight.intensity = light.sun;
  if (timeOutput.value !== light.label) timeOutput.value = light.label;
  cracks.show(mining.target, mining.stage);
  if (leftHeld && aimTarget && world.isProtected(aimTarget.x, aimTarget.y, aimTarget.z)) {
    if (!protectionNotified) showNotice('出生點腳下的方塊受到保護');
    protectionNotified = true;
  } else protectionNotified = false;
  hand.update(dt, { active, mining: active && leftHeld && mining.target !== null,
    heldType: inventory.count(inventory.selected) > 0 ? inventory.selected : null,
    walking: active && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(key => keys.has(key)) });
  renderer.info.reset();
  renderer.render(scene, camera);
  hand.render(renderer, light);
  fpsFrames++;
  if (now - fpsStart >= 1000) {
    fpsOutput.value = `FPS ${Math.round(fpsFrames * 1000 / (now - fpsStart))}`;
    fpsStart = now;
    fpsFrames = 0;
  }
  if (noticeUntil && now > noticeUntil) { notice.hidden = true; noticeUntil = 0; }
}

async function boot() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.info.autoReset = false;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#bfe0f4');
    scene.fog = new THREE.Fog('#bfe0f4', 38, 75);
    camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90);
    hemisphere = new THREE.HemisphereLight(0xe3f2ff, 0x80705a, 2.2);
    scene.add(hemisphere);
    sunlight = new THREE.DirectionalLight(0xfff5df, 1.6);
    sunlight.position.set(12, 25, 8);
    scene.add(sunlight);
    const island = createIsland();
    world = island.world;
    player = new Player(island.spawn);
    [terrain, cracks] = await Promise.all([createTerrain(world), createCracks()]);
    hand = await createHandView(terrain.blockMaterial);
    dropView = createDropView(terrain.blockMaterial);
    animals = new Animals(world);
    animalView = createAnimalView(animals);
    scene.add(terrain, cracks, dropView, animalView, createSkyView());
    resize();
    fpsStart = performance.now();
    renderer.setAnimationLoop(animate);
    start.disabled = false;
    start.textContent = '開始探索';
    // 本機開發時供瀏覽器驗收讀取狀態，正式建置不暴露此介面。
    if (import.meta.env.DEV) window.__skyIsland = {
      snapshot: () => ({ position: { ...player.position }, yaw: player.yaw, pitch: player.pitch,
        grounded: player.grounded, active, respawns: player.respawnCount,
        worldSize: world.size, blockCount: world.blocks.filter(Boolean).length,
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        target: aimTarget ? { ...aimTarget, protected: world.isProtected(aimTarget.x, aimTarget.y, aimTarget.z) } : null,
        mining: { target: mining.target ? { ...mining.target } : null, progress: mining.progress,
          stage: mining.stage, visible: cracks.visible, held: leftHeld }, brokenBlocks,
        drops: drops.items.map(item => ({ id: item.id, type: item.type, position: { ...item.position },
          grounded: item.grounded, rotation: item.rotation, collecting: Boolean(item.collecting) })), dropBatches: dropView.stats(),
        inventory: [...inventory.counts], selected: inventory.selected, placedBlocks,
        day: { ...dayCycle.sample(), elapsed: dayCycle.elapsed, ...dayCycle.clock() },
        hand: hand.snapshot(),
        animals: animals.snapshot(),
        chunks: terrain.children.map(mesh => ({ name: mesh.name, triangles: mesh.geometry.index.count / 3 })) }),
      blockAt: (x, y, z) => world.get(x, y, z),
    };
  } catch (error) {
    console.error('小島載入失敗', error);
    start.textContent = '無法開始';
    note.textContent = '小島載入失敗，請確認瀏覽器支援 WebGL 2，並重新整理。';
  }
}
boot();
