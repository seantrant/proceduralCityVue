<template>
  <div
    class="mini-map"
    :style="containerStyle"
  >
    <canvas
      ref="canvas"
      :width="size"
      :height="size"
      @click="onClick"
    />
  </div>
</template>

<script>
import {
  MINI_MAP_BUILDING_FILL,
  MINI_MAP_BUILDING_STROKE,
  MINI_MAP_ROAD_FILL,
  MINI_MAP_JUNCTION_FILL,
} from '@/composables/useSceneGroups';

export default {
  name: 'MiniMap',
  props: {
    gridArray: { type: Array, default: () => [] },
    size: { type: Number, default: 200 },
    drawOnScene: { type: Object, default: () => ({ gridLayout: true, buildings: true }) },
  },
  data() {
    return {
      camPos: { x: 0, z: 0 },
      camDir: { x: 0, z: -1 },
      padding: 6,
    };
  },
  computed: {
    containerStyle() {
      return {
        width: `${this.size}px`,
        height: `${this.size}px`,
      };
    },
  },
  watch: {
    gridArray() { this.draw(); },
  },
  mounted() {
    this.setupCanvas();
    window.addEventListener('resize', this.setupCanvas);
    this.draw();
  },
  beforeUnmount() {
    try { window.removeEventListener('resize', this.setupCanvas); } catch (e) { void e; }
  },
  methods: {
    setupCanvas() {
      const { canvas } = this.$refs;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      // set logical size (CSS pixels) and backing store size (device pixels)
      canvas.style.width = `${this.size}px`;
      canvas.style.height = `${this.size}px`;
      canvas.width = Math.round(this.size * dpr);
      canvas.height = Math.round(this.size * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx = ctx;
    },
    updateCamera(pos, dir) {
      if (pos) { this.camPos.x = pos.x; this.camPos.z = pos.z; }
      if (dir) { this.camDir.x = dir.x; this.camDir.z = dir.z; }
      this.draw();
    },
    draw() {
      const { ctx } = this;
      if (!ctx) return;
      const w = this.size;
      const h = this.size;
      ctx.clearRect(0, 0, w, h);

      const arr = this.gridArray || [];
      if (arr.length === 0) return;

      // compute bounds
      let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let
        maxY = -Infinity;
      arr.forEach((g) => {
        const { x } = g.coords;
        const { y } = g.coords;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      const spanX = Math.max(1, maxX - minX + 1);
      const spanY = Math.max(1, maxY - minY + 1);

      const pad = this.padding;
      const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);

      // draw tiles
      arr.forEach((g) => {
        const gx = Math.round((g.coords.x - minX) * scale) + pad;
        const gy = Math.round((g.coords.y - minY) * scale) + pad;
        // invert y so +z (three) goes up the canvas
        const cy = h - gy;
        if (g.contents === 'building') {
          if (this.drawOnScene && this.drawOnScene.buildings) {
            ctx.fillStyle = MINI_MAP_BUILDING_FILL;
            const sz = Math.ceil(scale);
            ctx.fillRect(gx, cy, sz, sz);
            ctx.strokeStyle = MINI_MAP_BUILDING_STROKE;
            ctx.lineWidth = 1;
            ctx.strokeRect(gx + 0.5, cy + 0.5, sz - 1, sz - 1);
          }
        } else if (g.contents === 'road') {
          if (this.drawOnScene && this.drawOnScene.gridLayout) {
            ctx.fillStyle = MINI_MAP_ROAD_FILL;
            ctx.fillRect(gx, cy, Math.ceil(scale), Math.ceil(scale));
          }
        } else if (g.contents === 'junction') {
          if (this.drawOnScene && this.drawOnScene.gridLayout) {
            ctx.fillStyle = MINI_MAP_JUNCTION_FILL;
            ctx.fillRect(gx, cy, Math.ceil(scale), Math.ceil(scale));
          }
        }
      });

      // draw camera indicator (improved: shadow + circle + heading)
      const camX = (this.camPos.x - minX) * scale + pad;
      const camY = (this.camPos.z - minY) * scale + pad;
      const cC = { x: camX, y: h - camY };
      const dir = this.camDir || { x: 0, z: -1 };
      const len = Math.max(6, Math.min(16, scale * 1.5));
      const angle = Math.atan2(-dir.z, dir.x); // convert to canvas angle
      // shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.arc(cC.x + 1.5, cC.y + 1.5, Math.max(3, len * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // main circle
      ctx.fillStyle = 'rgba(255,80,80,0.95)';
      ctx.beginPath();
      ctx.arc(cC.x, cC.y, Math.max(3, len * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // heading line
      ctx.beginPath();
      ctx.moveTo(cC.x, cC.y);
      ctx.lineTo(cC.x + Math.cos(angle) * (len * 1.4), cC.y + Math.sin(angle) * (len * 1.4));
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // border
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    },
    onClick(e) {
      const { canvas } = this.$refs;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const w = this.size;
      const h = this.size;

      const arr = this.gridArray || [];
      if (arr.length === 0) return;

      // recompute bounds
      let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let
        maxY = -Infinity;
      arr.forEach((g) => {
        const { x } = g.coords;
        const { y } = g.coords;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      const spanX = Math.max(1, maxX - minX + 1);
      const spanY = Math.max(1, maxY - minY + 1);
      const pad = this.padding;
      const scale = Math.max(1, Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY));

      // canvas to world
      const worldX = (cx - pad) / scale + minX;
      const worldZ = ((h - cy) - pad) / scale + minY;
      this.$emit('minimap-click', { x: worldX, z: worldZ });
    },
  },
};
</script>

<style scoped>
.mini-map{
  position: fixed;
  left: 12px;
  top: 60px;
  background: rgba(0,0,0,0.8);
  border: 1px solid white;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  z-index: 2000;
  pointer-events: auto;
  overflow: hidden;
}
.mini-map canvas{
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  cursor: pointer;
  border-radius: inherit;
}
</style>
