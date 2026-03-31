import * as Three from 'three';

// Lightweight InputManager providing WASD + arrow support and pointer-lock mouse-look
// Usage: const input = new InputManager({ camera }); input.connect(domElement);
// In render loop call: input.update(deltaSeconds)
export default class InputManager {
  constructor({ camera, settings = {} } = {}) {
    this.camera = camera;
    this.domElement = null;

    // config
    this.moveSpeed = settings.moveSpeed || 5.0; // units per second
    this.sprintMultiplier = settings.sprintMultiplier || 1.8;
    this.acceleration = settings.acceleration || 30.0;
    this.friction = settings.friction || 10.0;
    this.mouseSensitivity = settings.mouseSensitivity || 0.0025;
    this.maxPitch = settings.maxPitch || (Math.PI / 2 - 0.1);

    // state
    this.keys = {};
    this.pointerLocked = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.velocity = new Three.Vector3(0, 0, 0);
    this.targetVelocity = new Three.Vector3(0, 0, 0);

    // rotation state (yaw, pitch)
    const e = new Three.Euler().copy(this.camera.rotation);
    this.pitch = e.x;
    this.yaw = e.y;

    // bound handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  connect(domElement) {
    if (!domElement) return;
    this.domElement = domElement;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    // request pointer lock on click
    domElement.addEventListener('click', this._onClick);
  }

  disconnect() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    if (this.domElement) {
      this.domElement.removeEventListener('click', this._onClick);
      this.domElement = null;
    }
    this._removeMouseMoveListener();
  }

  _onClick() {
    if (!this.domElement) return;
    try {
      if (document.pointerLockElement === this.domElement) {
        document.exitPointerLock();
      } else {
        this.domElement.requestPointerLock();
      }
    } catch (e) { /* ignore */ }
  }

  _onPointerLockChange() {
    const locked = document.pointerLockElement === this.domElement;
    this.pointerLocked = locked;
    if (locked) {
      document.addEventListener('mousemove', this._onMouseMove);
    } else {
      this._removeMouseMoveListener();
    }
  }

  _removeMouseMoveListener() {
    document.removeEventListener('mousemove', this._onMouseMove);
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  _onMouseMove(e) {
    this.mouseDeltaX += e.movementX || 0;
    this.mouseDeltaY += e.movementY || 0;
  }

  _onKeyDown(e) {
    const k = e.key.toLowerCase();
    this.keys[k] = true;
  }

  _onKeyUp(e) {
    const k = e.key.toLowerCase();
    this.keys[k] = false;
  }

  update(delta) {
    if (!this.camera) return;

    // handle mouse -> rotation
    if (this.pointerLocked) {
      const dx = this.mouseDeltaX;
      const dy = this.mouseDeltaY;
      this.yaw -= dx * this.mouseSensitivity;
      this.pitch -= dy * this.mouseSensitivity;
      // clamp pitch
      if (this.pitch > this.maxPitch) this.pitch = this.maxPitch;
      if (this.pitch < -this.maxPitch) this.pitch = -this.maxPitch;
      // apply rotation
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      // reset deltas
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
    }

    // compute input direction in XZ plane
    const forward = (this.keys.w || this.keys.arrowup) ? 1 : 0;
    const back = (this.keys.s || this.keys.arrowdown) ? 1 : 0;
    const left = (this.keys.a || this.keys.arrowleft) ? 1 : 0;
    const right = (this.keys.d || this.keys.arrowright) ? 1 : 0;
    const sprint = this.keys.shift ? this.sprintMultiplier : 1.0;

    const moveX = (right - left);
    const moveZ = (forward - back);

    // derive world-space movement vectors relative to camera yaw
    if (!this._scratchDir) {
      this._scratchDir = new Three.Vector3();
      this._scratchRight = new Three.Vector3();
      this._scratchUp = new Three.Vector3(0, 1, 0);
      this._scratchToTarget = new Three.Vector3();
      this._scratchMove = new Three.Vector3();
    }
    const dir = this._scratchDir;
    this.camera.getWorldDirection(dir); // points -Z forward
    dir.y = 0;
    dir.normalize();
    const rightVec = this._scratchRight.crossVectors(dir, this._scratchUp.set(0, 1, 0)).normalize();

    // target velocity
    const speed = this.moveSpeed * sprint;
    this.targetVelocity.set(0, 0, 0);
    if (moveZ !== 0) {
      this.targetVelocity.addScaledVector(dir, moveZ * speed);
    }
    if (moveX !== 0) {
      this.targetVelocity.addScaledVector(rightVec, moveX * speed);
    }

    // smooth velocity: approach target using acceleration
    const toTarget = this._scratchToTarget.subVectors(this.targetVelocity, this.velocity);
    const maxStep = this.acceleration * delta;
    if (toTarget.length() > 0) {
      const step = Math.min(maxStep, toTarget.length());
      toTarget.setLength(step);
      this.velocity.add(toTarget);
    }

    // apply friction when no input
    if (moveX === 0 && moveZ === 0) {
      const decel = Math.min(this.friction * delta, this.velocity.length());
      if (decel > 0) {
        this._scratchMove.copy(this.velocity).normalize().multiplyScalar(-decel);
        this.velocity.add(this._scratchMove);
      }
    }

    // update position
    const move = this._scratchMove.copy(this.velocity).multiplyScalar(delta);
    this.camera.position.add(move);
  }
}
