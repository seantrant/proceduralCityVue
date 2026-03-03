<template>
  <transition name="panel">
    <aside
      v-if="openWindow"
      class="option-panel"
      :style="panelStyle"
    >
      <p>Settings</p>
      <ul class="noselect">
        <li class="panel-row">
          <span class="panel-key">Grid Size</span>
          <input
            v-model.number="grid.gridSize"
            placeholder="8"
          >
        </li>

        
        <li class="panel-row panel-section">
          Traffic Settings
        </li>
        <li class="panel-row">
          <span class="panel-key">Density</span>
          <input v-model.number="traffic.density" step="0.1" min="0.1">
        </li>
        <li class="panel-row">
          <span class="panel-key">Min speed</span>
          <input v-model.number="traffic.minSpeed" step="0.1" min="0">
        </li>
        <li class="panel-row">
          <span class="panel-key">Max speed</span>
          <input v-model.number="traffic.maxSpeed" step="0.1" min="0">
        </li>
        <li class="panel-row panel-row-action">
          <span class="panel-key">Traffic</span>
          <button class="generateButton" @click="applyTrafficSettings()">Apply</button>
        </li>
        <hr>
        <li class="panel-section">
          FPS Controls
        </li>
        <li class="panel-row">
          <span class="panel-key">Mouse sensitivity</span>
          <input
            v-model.number="fps.mouseSensitivity"
            step="0.001"
            min="0.0001"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Move speed</span>
          <input
            v-model.number="fps.moveSpeed"
            step="0.1"
            min="0.1"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Acceleration</span>
          <input
            v-model.number="fps.acceleration"
            step="1"
            min="0"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Friction</span>
          <input
            v-model.number="fps.friction"
            step="1"
            min="0"
          >
        </li>
        <li class="panel-row panel-row-action">
          <span class="panel-key">FPS</span>
          <button
            class="generateButton"
            @click="applyFpsSettings()"
          >
            Apply
          </button>
        </li>
        
      </ul>
    </aside>
  </transition>
</template>

<script src='./settings.js'></script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss" src="./settings.scss"></style>
