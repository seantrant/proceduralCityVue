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
          Air Traffic
        </li>
        <li class="panel-row">
          <span class="panel-key">Planes</span>
          <input
            v-model.number="airTraffic.planeCount"
            type="number"
            step="1"
            min="0"
            max="10"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Helicopters</span>
          <input
            v-model.number="airTraffic.helicopterCount"
            type="number"
            step="1"
            min="0"
            max="5"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Plane min speed</span>
          <input
            v-model.number="airTraffic.planeMinSpeed"
            type="number"
            step="1"
            min="1"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Plane max speed</span>
          <input
            v-model.number="airTraffic.planeMaxSpeed"
            type="number"
            step="1"
            min="1"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Heli min speed</span>
          <input
            v-model.number="airTraffic.heliMinSpeed"
            type="number"
            step="0.5"
            min="0.5"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Heli max speed</span>
          <input
            v-model.number="airTraffic.heliMaxSpeed"
            type="number"
            step="0.5"
            min="0.5"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Plane altitude</span>
          <input
            v-model.number="airTraffic.planeAltitude"
            type="number"
            step="1"
            min="5"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Heli altitude</span>
          <input
            v-model.number="airTraffic.heliAltitude"
            type="number"
            step="1"
            min="3"
          >
        </li>
        <li class="panel-row panel-row-action">
          <span class="panel-key">Air Traffic</span>
          <button
            class="generateButton"
            @click="applyAirTrafficSettings()"
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
