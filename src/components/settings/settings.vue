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
            v-model="grid.gridSize"
            placeholder="8"
          >
        </li>

        <hr>
        <li class="panel-section">
          Show on Scene
        </li>
        <li class="panel-row">
          <span class="panel-key">Floor</span>
          <input
            v-model="drawOnScene.floor"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Grid Layout</span>
          <input
            v-model="drawOnScene.gridLayout"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Buildings</span>
          <input
            v-model="drawOnScene.buildings"
            type="checkbox"
          >
        </li>


        <li class="panel-row panel-row-action">
          <span class="panel-key">Scene</span>
          <button
            class="generateButton"
            @click="reGenerate()"
          >
            Generate
          </button>
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
        <hr>
        <li class="panel-section">
          Simulation
        </li>
        <li class="panel-row">
          <span class="panel-key">Running</span>
          <input
            v-model="simulationRunning"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Speed</span>
          <input
            v-model.number="simulationSpeed"
            step="0.25"
            min="0.25"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Tick</span>
          <strong class="sim-value">{{ simulationTick }}</strong>
        </li>
        <li class="panel-row panel-row-action">
          <span class="panel-key">Simulation</span>
          <button
            class="generateButton"
            @click="resetSimulation()"
          >
            Reset
          </button>
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script src='./settings.js'></script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss" src="./settings.scss"></style>
