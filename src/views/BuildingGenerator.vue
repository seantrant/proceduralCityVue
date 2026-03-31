<template>
  <div id="container">
    <div class="builder-ui">
      <h2>Building Generator</h2>
      <p class="subtitle">
        Procedural building randomiser — preview one building at a time
      </p>
      <div class="controls">
        <button
          class="generate-btn"
          @click="generateBuilding"
        >
          Generate
        </button>
      </div>
      <div
        v-if="currentShapeType"
        class="shape-label"
      >
        {{ currentShapeType }}
        <span class="height-label">h {{ currentHeight }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import * as Three from 'three';
import { markRaw } from 'vue';
import { generateRandomBuilding, disposeBuildingGroup } from '@/utils/buildingShapes';
import { SKIP_DISPOSE_FLAG } from '@/utils/buildingDecorations';

export default {
  name: 'BuildingGenerator',
  data() {
    return {
      camera: null,
      renderer: null,
      scene: markRaw(new Three.Scene()),
      animationFrameId: null,
      orbitAngle: 0,
      orbitSpeed: 0.3,
      orbitRadius: 4,
      orbitAltitude: 3,
      currentBuilding: null,
      currentShapeType: '',
      currentHeight: 0,
    };
  },
  mounted() {
    // Defer scene init to next tick so any previous WebGL context
    // (e.g. from the city scene) has time to be fully released.
    this.$nextTick(() => {
      this.initScene();
      this.generateBuilding();
      this.animate();
    });
    window.addEventListener('resize', this.onResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.removeCurrentBuilding();
    this.disposeScene();
  },
  methods: {
    initScene() {
      const container = document.getElementById('container');
      if (!container) return;

      // HMR guard: if a canvas already exists from a previous hot-reload,
      // remove it and force-release the old context first.
      const existingCanvas = container.querySelector('canvas');
      if (existingCanvas) {
        const gl = existingCanvas.getContext('webgl2') || existingCanvas.getContext('webgl');
        if (gl && gl.getExtension) {
          const ext = gl.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
        }
        existingCanvas.remove();
      }

      // Renderer
      try {
        this.renderer = markRaw(new Three.WebGLRenderer({ antialias: true, alpha: true }));
      } catch (e) {
        console.warn('BuildingGenerator: WebGL context creation failed, retrying…', e);
        // Last-resort: wait a frame for the browser to reclaim a context slot
        requestAnimationFrame(() => { this.initScene(); });
        return;
      }
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setClearColor(0x000000, 0);
      container.appendChild(this.renderer.domElement);

      // Camera
      const aspect = container.clientWidth / container.clientHeight;
      this.camera = markRaw(new Three.PerspectiveCamera(60, aspect, 0.1, 1000));
      this.camera.position.set(this.orbitRadius, this.orbitAltitude, 0);
      this.camera.lookAt(new Three.Vector3(0, 1.5, 0));

      // Minimal ambient light so MeshBasicMaterial stays pure black
      const ambient = new Three.AmbientLight(0xffffff, 0.15);
      this.scene.add(ambient);

      // Dark ground plane
      const groundGeo = new Three.PlaneGeometry(10, 10);
      const groundMat = new Three.MeshBasicMaterial({ color: 0x0a0a12 });
      const ground = new Three.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      this.scene.add(ground);

      // Subtle background grid
      const grid = new Three.GridHelper(10, 10, 0x222244, 0x181830);
      grid.position.y = 0.005;
      this.scene.add(grid);

      // Cell boundary guide — 1×1 square showing allowed footprint
      const cellGuide = new Three.GridHelper(1, 1, 0x4466ff, 0x4466ff);
      cellGuide.position.y = 0.01;
      this.scene.add(cellGuide);
    },

    generateBuilding() {
      this.removeCurrentBuilding();

      const { group, shapeType, height } = generateRandomBuilding(1);
      this.currentBuilding = markRaw(group);
      this.currentShapeType = shapeType;
      this.currentHeight = height;
      this.scene.add(this.currentBuilding);

      // Adjust camera altitude to frame the building
      this.orbitAltitude = Math.max(2, height * 0.6);
      this.orbitRadius = Math.max(3, height * 0.7 + 1);
    },

    removeCurrentBuilding() {
      if (this.currentBuilding) {
        this.scene.remove(this.currentBuilding);
        disposeBuildingGroup(this.currentBuilding);
        this.currentBuilding = null;
      }
    },

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate);
      if (!this.renderer || !this.camera) return;

      this.orbitAngle += this.orbitSpeed * 0.01;
      this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
      this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
      this.camera.position.y = this.orbitAltitude;

      const lookY = this.currentHeight ? this.currentHeight * 0.4 : 1.5;
      this.camera.lookAt(new Three.Vector3(0, lookY, 0));

      this.renderer.render(this.scene, this.camera);
    },

    onResize() {
      const container = document.getElementById('container');
      if (!container || !this.renderer || !this.camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },

    disposeScene() {
      if (this.renderer) {
        try {
          // forceContextLoss first to free the WebGL context immediately
          if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
          this.renderer.dispose();
        } catch (e) {
          void e;
        }
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer = null;
      }
      if (this.scene) {
        const canDispose = resource => !!(
          resource
          && typeof resource.dispose === 'function'
          && !(resource.userData && resource.userData[SKIP_DISPOSE_FLAG])
        );
        this.scene.traverse((obj) => {
          if (canDispose(obj.geometry)) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                if (canDispose(m)) m.dispose();
              });
            } else {
              if (canDispose(obj.material)) obj.material.dispose();
            }
          }
        });
      }
    },
  },
};
</script>

<style scoped lang="scss">
#container {
  position: relative;
  width: 100%;
  height: calc(100vh - 61px);
  overflow: hidden;

  canvas {
    display: block;
  }
}

.builder-ui {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  color: white;

  h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 300;
    letter-spacing: 0.05em;
    pointer-events: none;
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 0.85rem;
    opacity: 0.6;
    pointer-events: none;
  }

  .controls {
    margin-top: 14px;
  }

  .generate-btn {
    padding: 8px 22px;
    font-size: 0.9rem;
    font-weight: 400;
    letter-spacing: 0.06em;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.5);
      box-shadow: 0 0 8px rgba(100, 140, 255, 0.25);
    }

    &:active {
      background: rgba(255, 255, 255, 0.18);
    }
  }

  .shape-label {
    margin-top: 10px;
    font-size: 0.8rem;
    font-family: monospace;
    opacity: 0.7;
    letter-spacing: 0.04em;
    pointer-events: none;

    .height-label {
      margin-left: 8px;
      opacity: 0.5;
    }
  }
}
</style>
