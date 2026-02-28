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
export default {
  name: 'MiniMap',
  props: {
    gridArray: { type: Array, default: () => [] },
    size: { type: Number, default: 200 },
    drawOnScene: { type: Object, default: () => ({ gridLayout: true, buildings: true }) }
  },
  data() {
    return {
      camPos: { x: 0, z: 0 },
      camDir: { x: 0, z: -1 },
      padding: 6
    }
  },
  computed: {
    containerStyle() {
      return {
        width: this.size + 'px',
        height: this.size + 'px'
      }
    }
  },
  watch: {
    gridArray(){ this.draw() }
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d')
    this.draw()
  },
  methods: {
    updateCamera(pos, dir){
      if(pos){ this.camPos.x = pos.x; this.camPos.z = pos.z }
      if(dir){ this.camDir.x = dir.x; this.camDir.z = dir.z }
      this.draw()
    },
    draw(){
      const ctx = this.ctx
      if(!ctx) return
      const w = this.size
      const h = this.size
      ctx.clearRect(0,0,w,h)
      ctx.fillStyle = 'rgba(250,250,250,0.95)'
      ctx.fillRect(0,0,w,h)

      const arr = this.gridArray || []
      if(arr.length === 0) return

      // compute bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      arr.forEach(g => {
        const x = g.coords.x, y = g.coords.y
        if(x < minX) minX = x
        if(x > maxX) maxX = x
        if(y < minY) minY = y
        if(y > maxY) maxY = y
      })
      const spanX = Math.max(1, maxX - minX + 1)
      const spanY = Math.max(1, maxY - minY + 1)

      const pad = this.padding
      const scale = Math.min((w - pad*2) / spanX, (h - pad*2) / spanY)

      // draw tiles
      arr.forEach(g => {
        const gx = Math.round((g.coords.x - minX) * scale) + pad
        const gy = Math.round((g.coords.y - minY) * scale) + pad
        // invert y so +z (three) goes up the canvas
        const cy = h - gy
        if(g.contents === 'building'){
          if(this.drawOnScene && this.drawOnScene.buildings){
            ctx.fillStyle = '#222222'
            ctx.fillRect(gx, cy, Math.ceil(scale), Math.ceil(scale))
          }
        } else if(g.contents === 'road'){
          if(this.drawOnScene && this.drawOnScene.gridLayout){
            ctx.fillStyle = '#BFBFBF'
            ctx.fillRect(gx, cy, Math.ceil(scale), Math.ceil(scale))
          }
        } else if(g.contents === 'junction'){
          if(this.drawOnScene && this.drawOnScene.gridLayout){
            ctx.fillStyle = '#8B0000'
            ctx.fillRect(gx, cy, Math.ceil(scale), Math.ceil(scale))
          }
        }
      })

      // draw camera indicator
      const camX = (this.camPos.x - minX) * scale + pad
      const camY = (this.camPos.z - minY) * scale + pad
      const cC = { x: camX, y: h - camY }
      // triangle pointing in camDir
      const dir = this.camDir
      const len = Math.max(6, Math.min(16, scale * 1.5))
      const angle = Math.atan2(-dir.z, dir.x) // convert to canvas angle
      ctx.fillStyle = 'rgba(255,0,0,0.9)'
      ctx.beginPath()
      ctx.moveTo(cC.x + Math.cos(angle) * len, cC.y + Math.sin(angle) * len)
      ctx.lineTo(cC.x + Math.cos(angle + 2.3) * (len*0.7), cC.y + Math.sin(angle + 2.3) * (len*0.7))
      ctx.lineTo(cC.x + Math.cos(angle - 2.3) * (len*0.7), cC.y + Math.sin(angle - 2.3) * (len*0.7))
      ctx.closePath()
      ctx.fill()

      // border
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      ctx.strokeRect(0.5,0.5,w-1,h-1)
    },
    onClick(e){
      const canvas = this.$refs.canvas
      if(!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const w = this.size
      const h = this.size

      const arr = this.gridArray || []
      if(arr.length === 0) return

      // recompute bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      arr.forEach(g => {
        const x = g.coords.x, y = g.coords.y
        if(x < minX) minX = x
        if(x > maxX) maxX = x
        if(y < minY) minY = y
        if(y > maxY) maxY = y
      })
      const spanX = Math.max(1, maxX - minX + 1)
      const spanY = Math.max(1, maxY - minY + 1)
      const pad = this.padding
      const scale = Math.max(1, Math.min((w - pad*2) / spanX, (h - pad*2) / spanY))

      // canvas to world
      const worldX = (cx - pad) / scale + minX
      const worldZ = ((h - cy) - pad) / scale + minY
      this.$emit('minimap-click', { x: worldX, z: worldZ })
    }
  }
}
</script>

<style scoped>
.mini-map{
  position: fixed;
  left: 12px;
  top: 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  z-index: 2000;
  pointer-events: auto;
  overflow: hidden;
}
.mini-map canvas{ display:block; pointer-events: auto; cursor: pointer }
</style>
