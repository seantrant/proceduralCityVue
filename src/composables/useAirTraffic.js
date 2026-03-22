import * as Three from 'three';
import { ensureNamedGroup } from '@/composables/useSceneGroups';

/* ------------------------------------------------------------------ */
/*  Texture helpers                                                    */
/* ------------------------------------------------------------------ */

function createGlowTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const half = size / 2;
  const grd = ctx.createRadialGradient(half, half, 1, half, half, half);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new Three.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createSpotTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const half = size / 2;
  const grd = ctx.createRadialGradient(half, half, 0, half, half, half);
  grd.addColorStop(0, 'rgba(255,255,230,0.45)');
  grd.addColorStop(0.4, 'rgba(255,255,200,0.15)');
  grd.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new Three.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Edge spawn helpers                                                 */
/* ------------------------------------------------------------------ */

const EDGES = ['north', 'south', 'east', 'west'];

function oppositeEdge(edge) {
  switch (edge) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east':  return 'west';
    case 'west':  return 'east';
    default:      return 'south';
  }
}

function pointOnEdge(edge, halfExtent, altitude, margin) {
  const m = margin || 2;
  const randAlong = () => (Math.random() * 2 - 1) * (halfExtent - m);
  switch (edge) {
    case 'north': return new Three.Vector3(randAlong(), altitude, -(halfExtent + m));
    case 'south': return new Three.Vector3(randAlong(), altitude, (halfExtent + m));
    case 'east':  return new Three.Vector3((halfExtent + m), altitude, randAlong());
    case 'west':  return new Three.Vector3(-(halfExtent + m), altitude, randAlong());
    default:      return new Three.Vector3(0, altitude, 0);
  }
}

function spawnPath(halfExtent, altitude) {
  const entryEdge = EDGES[Math.floor(Math.random() * EDGES.length)];
  const exitEdge = oppositeEdge(entryEdge);
  const entry = pointOnEdge(entryEdge, halfExtent, altitude, 2);
  const exit  = pointOnEdge(exitEdge, halfExtent, altitude, 2);
  const direction = new Three.Vector3().subVectors(exit, entry);
  const totalLength = direction.length() || 1;
  direction.normalize();
  return { entry, exit, direction, totalLength };
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export function createAirTraffic({ scene, halfExtent, disposeObject, options = {} }) {
  const group = ensureNamedGroup(scene, 'airTrafficGroup', disposeObject);

  // Dispose previous textures if any
  const ud = group.userData || {};
  if (ud.glowTexture && typeof ud.glowTexture.dispose === 'function') {
    try { ud.glowTexture.dispose(); } catch (e) { void e; }
  }
  if (ud.spotTexture && typeof ud.spotTexture.dispose === 'function') {
    try { ud.spotTexture.dispose(); } catch (e) { void e; }
  }

  const planeCount     = Math.max(0, Number(options.planeCount) || 2);
  const helicopterCount = Math.max(0, Number(options.helicopterCount) || 1);
  const planeMinSpeed  = Number(options.planeMinSpeed) || 8;
  const planeMaxSpeed  = Number(options.planeMaxSpeed) || 14;
  const heliMinSpeed   = Number(options.heliMinSpeed) || 2;
  const heliMaxSpeed   = Number(options.heliMaxSpeed) || 4;
  const planeAltitude  = Number(options.planeAltitude) || 15;
  const heliAltitude   = Number(options.heliAltitude) || 8;
  const respawnDelayMin = Number(options.respawnDelayMin) || 2;
  const respawnDelayMax = Number(options.respawnDelayMax) || 8;

  const glowTexture = createGlowTexture(64);
  const spotTexture = createSpotTexture(64);

  const aircraftSprites = [];
  const aircraftMeta = [];
  const searchlightGroups = [];

  /* ---- planes ---- */
  for (let i = 0; i < planeCount; i++) {
    const path = spawnPath(halfExtent, planeAltitude + Math.random() * 4);
    const speed = planeMinSpeed + Math.random() * (planeMaxSpeed - planeMinSpeed);
    const mat = new Three.SpriteMaterial({
      map: glowTexture,
      color: 0xffeedd,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
      blending: Three.AdditiveBlending,
    });
    const sprite = new Three.Sprite(mat);
    sprite.position.copy(path.entry);
    sprite.scale.set(0.4, 0.4, 1);
    sprite.renderOrder = 1000;
    group.add(sprite);

    aircraftSprites.push(sprite);
    searchlightGroups.push(null);
    aircraftMeta.push({
      type: 'plane',
      entry: path.entry,
      exit: path.exit,
      direction: path.direction,
      totalLength: path.totalLength,
      t: 0,
      speed,
      alive: true,
      respawnTimer: 0,
      halfExtent,
      planeAltitude,
      heliAltitude,
      planeMinSpeed,
      planeMaxSpeed,
      heliMinSpeed,
      heliMaxSpeed,
      respawnDelayMin,
      respawnDelayMax,
      blinkPhase: Math.random() * Math.PI * 2,
    });
  }

  /* ---- helicopters ---- */
  for (let i = 0; i < helicopterCount; i++) {
    const path = spawnPath(halfExtent, heliAltitude + Math.random() * 2);
    const speed = heliMinSpeed + Math.random() * (heliMaxSpeed - heliMinSpeed);

    // body light
    const mat = new Three.SpriteMaterial({
      map: glowTexture,
      color: 0xccddff,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
      blending: Three.AdditiveBlending,
    });
    const sprite = new Three.Sprite(mat);
    sprite.position.copy(path.entry);
    sprite.scale.set(0.3, 0.3, 1);
    sprite.renderOrder = 1000;
    group.add(sprite);

    // searchlight group (cone + ground spot)
    const slGroup = new Three.Group();
    slGroup.renderOrder = 999;

    // cone beam
    const coneHeight = path.entry.y - 0.1;
    const coneRadius = coneHeight * 0.12;
    const coneGeo = new Three.ConeGeometry(coneRadius, coneHeight, 8, 1, true);
    coneGeo.translate(0, -coneHeight / 2, 0);
    const coneMat = new Three.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.045,
      blending: Three.AdditiveBlending,
      side: Three.DoubleSide,
      depthWrite: false,
    });
    const coneMesh = new Three.Mesh(coneGeo, coneMat);
    slGroup.add(coneMesh);

    // ground spot sprite
    const spotMat = new Three.SpriteMaterial({
      map: spotTexture,
      color: 0xffffdd,
      transparent: true,
      depthWrite: false,
      opacity: 0.35,
      blending: Three.AdditiveBlending,
    });
    const spotSprite = new Three.Sprite(spotMat);
    spotSprite.scale.set(2.0, 2.0, 1);
    spotSprite.position.set(0, -coneHeight + 0.05, 0);
    spotSprite.renderOrder = 998;
    slGroup.add(spotSprite);

    slGroup.position.copy(path.entry);
    group.add(slGroup);

    aircraftSprites.push(sprite);
    searchlightGroups.push(slGroup);
    aircraftMeta.push({
      type: 'helicopter',
      entry: path.entry,
      exit: path.exit,
      direction: path.direction,
      totalLength: path.totalLength,
      t: 0,
      speed,
      alive: true,
      respawnTimer: 0,
      halfExtent,
      planeAltitude,
      heliAltitude,
      planeMinSpeed,
      planeMaxSpeed,
      heliMinSpeed,
      heliMaxSpeed,
      respawnDelayMin,
      respawnDelayMax,
      blinkPhase: Math.random() * Math.PI * 2,
      sweepPhase: Math.random() * Math.PI * 2,
      coneHeight,
    });
  }

  group.userData = {
    aircraftSprites,
    aircraftMeta,
    searchlightGroups,
    glowTexture,
    spotTexture,
    __lastTimestamp: 0,
    __scratch: {
      pos: new Three.Vector3(),
    },
  };

  return group;
}

/* ------------------------------------------------------------------ */
/*  Per-frame step                                                     */
/* ------------------------------------------------------------------ */

export function stepAirTrafficFrame(vm, now, cachedGroup) {
  if (!vm || !vm.scene) return;
  const group = cachedGroup || (vm.scene.getObjectByName && vm.scene.getObjectByName('airTrafficGroup'));
  if (!group || !group.visible || !group.userData) return;

  const { aircraftSprites = [], aircraftMeta = [], searchlightGroups = [] } = group.userData;
  if (!aircraftMeta.length) return;

  const last = group.userData.__lastTimestamp || now;
  const deltaMs = now - last;
  const delta = Math.min(0.1, Math.max(0, deltaMs / 1000));
  group.userData.__lastTimestamp = now;
  if (delta <= 0) return;

  const scratch = group.userData.__scratch;
  const nowSec = now / 1000;

  for (let i = 0; i < aircraftMeta.length; i++) {
    const meta = aircraftMeta[i];
    const sprite = aircraftSprites[i];
    const slGroup = searchlightGroups[i];
    if (!sprite) continue;

    /* ---------- respawn countdown ---------- */
    if (!meta.alive) {
      meta.respawnTimer -= delta;
      if (meta.respawnTimer <= 0) {
        // respawn from a new random edge
        const alt = meta.type === 'plane'
          ? meta.planeAltitude + Math.random() * 4
          : meta.heliAltitude + Math.random() * 2;
        const path = spawnPath(meta.halfExtent, alt);
        const minSpd = meta.type === 'plane' ? meta.planeMinSpeed : meta.heliMinSpeed;
        const maxSpd = meta.type === 'plane' ? meta.planeMaxSpeed : meta.heliMaxSpeed;
        meta.entry = path.entry;
        meta.exit = path.exit;
        meta.direction = path.direction;
        meta.totalLength = path.totalLength;
        meta.speed = minSpd + Math.random() * (maxSpd - minSpd);
        meta.t = 0;
        meta.alive = true;
        meta.blinkPhase = Math.random() * Math.PI * 2;

        sprite.visible = true;
        sprite.position.copy(path.entry);
        if (slGroup) {
          slGroup.visible = true;
          slGroup.position.copy(path.entry);
          if (meta.type === 'helicopter') {
            meta.coneHeight = alt - 0.1;
          }
        }
      }
      continue;
    }

    /* ---------- advance along path ---------- */
    meta.t += (meta.speed * delta) / meta.totalLength;

    if (meta.t >= 1) {
      // arrived at exit — despawn
      meta.alive = false;
      meta.respawnTimer = meta.respawnDelayMin
        + Math.random() * (meta.respawnDelayMax - meta.respawnDelayMin);
      sprite.visible = false;
      if (slGroup) slGroup.visible = false;
      continue;
    }

    // lerp position
    scratch.pos.lerpVectors(meta.entry, meta.exit, meta.t);
    sprite.position.copy(scratch.pos);

    /* ---------- blinking ---------- */
    if (meta.type === 'plane') {
      // slow blink: brief dip every ~2.5s
      const phase = (nowSec + meta.blinkPhase) % 2.5;
      const blinkOn = phase < 0.15;
      sprite.material.opacity = blinkOn ? 0.3 : 0.95;
    } else {
      // helicopter: faster red/white alternating flash every ~0.8s
      const phase = (nowSec + meta.blinkPhase) % 0.8;
      if (phase < 0.15) {
        sprite.material.color.setHex(0xff3333);
        sprite.material.opacity = 1.0;
      } else if (phase > 0.35 && phase < 0.4) {
        sprite.material.color.setHex(0xffffff);
        sprite.material.opacity = 1.0;
      } else {
        sprite.material.color.setHex(0xccddff);
        sprite.material.opacity = 0.7;
      }
    }

    /* ---------- searchlight (helicopters only) ---------- */
    if (slGroup && meta.type === 'helicopter') {
      slGroup.position.copy(scratch.pos);

      // subtle sweep oscillation on the cone
      const sweepAngle = Math.sin(nowSec * 0.7 + (meta.sweepPhase || 0)) * 0.12;
      const sweepAngleZ = Math.cos(nowSec * 0.5 + (meta.sweepPhase || 0) + 1.3) * 0.08;
      slGroup.rotation.set(sweepAngleZ, 0, sweepAngle);
    }
  }
}
