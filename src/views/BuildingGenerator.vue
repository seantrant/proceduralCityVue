<template>
  <div id="container">
    <div class="builder-ui">
      <h2>Building Generator</h2>
      <p class="subtitle">
        Test and preview individual building types
      </p>
    </div>
  </div>
</template>

<script>
import * as Three from 'three';
import { markRaw } from 'vue';

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
      orbitRadius: 12,
      orbitAltitude: 6,
    };
  },
  mounted() {
    this.initScene();
    this.animate();
    window.addEventListener('resize', this.onResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.disposeScene();
  },
  methods: {
    initScene() {
      const container = document.getElementById('container');

      // Renderer
      this.renderer = markRaw(new Three.WebGLRenderer({ antialias: true, alpha: true }));
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.shadowMap.enabled = true;
      container.appendChild(this.renderer.domElement);

      // Camera
      const aspect = container.clientWidth / container.clientHeight;
      this.camera = markRaw(new Three.PerspectiveCamera(60, aspect, 0.1, 1000));
      this.camera.position.set(this.orbitRadius, this.orbitAltitude, 0);
      this.camera.lookAt(new Three.Vector3(0, 2, 0));

      // Lighting
      const ambient = new Three.AmbientLight(0x334466, 0.6);
      this.scene.add(ambient);

      const directional = new Three.DirectionalLight(0xffeedd, 0.8);
      directional.position.set(10, 20, 10);
      directional.castShadow = true;
      this.scene.add(directional);

      const pointLight = new Three.PointLight(0x4488ff, 0.4, 50);
      pointLight.position.set(-5, 8, -5);
      this.scene.add(pointLight);

      // Ground plane
      const groundGeo = new Three.PlaneGeometry(40, 40);
      const groundMat = new Three.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.9,
        metalness: 0.1,
      });
      const ground = new Three.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);

      // Grid helper
      const grid = new Three.GridHelper(40, 40, 0x333355, 0x222244);
      grid.position.y = 0.01;
      this.scene.add(grid);

      // Placeholder building — a simple procedural tower
      this.createPlaceholderBuilding();
    },

    createPlaceholderBuilding() {
      const buildingGroup = new Three.Group();

      // Main body
      const bodyGeo = new Three.BoxGeometry(2, 6, 2);
      const bodyMat = new Three.MeshStandardMaterial({
        color: 0x445566,
        roughness: 0.7,
        metalness: 0.3,
      });
      const body = new Three.Mesh(bodyGeo, bodyMat);
      body.position.y = 3;
      body.castShadow = true;
      buildingGroup.add(body);

      // Windows (emissive panels on two faces)
      const windowGeo = new Three.PlaneGeometry(0.3, 0.4);
      const windowMatLit = new Three.MeshStandardMaterial({
        color: 0xffcc66,
        emissive: 0xffcc66,
        emissiveIntensity: 0.5,
      });
      const windowMatDark = new Three.MeshStandardMaterial({
        color: 0x222233,
        emissive: 0x222233,
        emissiveIntensity: 0.1,
      });

      for (let floor = 0; floor < 5; floor++) {
        for (let col = 0; col < 3; col++) {
          const lit = Math.random() > 0.3;
          const mat = lit ? windowMatLit : windowMatDark;

          // Front face
          const winFront = new Three.Mesh(windowGeo, mat);
          winFront.position.set(-0.5 + col * 0.5, 0.8 + floor * 1.1, 1.01);
          buildingGroup.add(winFront);

          // Right face
          const winRight = new Three.Mesh(windowGeo, mat);
          winRight.position.set(1.01, 0.8 + floor * 1.1, -0.5 + col * 0.5);
          winRight.rotation.y = Math.PI / 2;
          buildingGroup.add(winRight);
        }
      }

      // Roof
      const roofGeo = new Three.BoxGeometry(2.2, 0.2, 2.2);
      const roofMat = new Three.MeshStandardMaterial({
        color: 0x334455,
        roughness: 0.5,
        metalness: 0.5,
      });
      const roof = new Three.Mesh(roofGeo, roofMat);
      roof.position.y = 6.1;
      buildingGroup.add(roof);

      // Roof beacon
      const beaconGeo = new Three.SphereGeometry(0.15, 8, 8);
      const beaconMat = new Three.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff3333,
        emissiveIntensity: 1.0,
      });
      const beacon = new Three.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 6.5;
      buildingGroup.add(beacon);

      this.scene.add(buildingGroup);
    },

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate);

      // Orbit the camera around the building
      this.orbitAngle += this.orbitSpeed * 0.01;
      this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
      this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
      this.camera.position.y = this.orbitAltitude;
      this.camera.lookAt(new Three.Vector3(0, 2, 0));

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
          this.renderer.dispose();
          if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
        } catch (e) {
          void e;
        }
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }
      if (this.scene) {
        this.scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
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
  pointer-events: none;

  h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 300;
    letter-spacing: 0.05em;
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 0.85rem;
    opacity: 0.6;
  }
}
</style>
