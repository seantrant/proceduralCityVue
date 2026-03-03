import * as Three from 'three';

export function createCameraAnimation(camera, target = { x: 0, y: 4.5, z: 0 }, opts = {}) {
  if (!camera) return null;
  const duration = typeof opts.duration === 'number' ? opts.duration : 600;
  const startPos = camera.position.clone();
  const targetPos = new Three.Vector3(
    target.x,
    typeof target.y === 'number' ? target.y : camera.position.y,
    target.z,
  );

  const dir = camera.getWorldDirection(new Three.Vector3());
  const startLook = startPos.clone().add(dir);
  const lookAtTarget = targetPos.clone().add(dir);

  return {
    startPos,
    targetPos,
    startLook,
    lookAtTarget,
    startTime: performance.now(),
    duration,
  };
}

export function stepCameraAnimation(camera, animation, now, tempLookVector) {
  if (!camera || !animation) return { done: true };

  const elapsed = Math.max(0, now - (animation.startTime || now));
  const traw = Math.min(1, elapsed / (animation.duration || 600));
  const t = traw < 0.5 ? (2 * traw * traw) : (-1 + (4 - 2 * traw) * traw);

  camera.position.lerpVectors(animation.startPos, animation.targetPos, t);

  if (animation.startLook && animation.lookAtTarget) {
    const look = tempLookVector || new Three.Vector3();
    look.lerpVectors(animation.startLook, animation.lookAtTarget, t);
    camera.lookAt(look);
  }

  return { done: traw >= 1 };
}
