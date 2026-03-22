<template>
  <transition name="panel">
    <aside
      v-if="openWindow"
      class="option-panel"
      :style="panelStyle"
    >
      <p>Traffic</p>
      <ul class="noselect">
        <li class="panel-row">
          <span class="panel-key">Density</span>
          <input
            v-model.number="traffic.density"
            step="0.1"
            min="0.1"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Min speed</span>
          <input
            v-model.number="traffic.minSpeed"
            step="0.1"
            min="0"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Max speed</span>
          <input
            v-model.number="traffic.maxSpeed"
            step="0.1"
            min="0"
          >
        </li>
        <li class="panel-row panel-row-action">
          <span class="panel-key">Settings</span>
          <button
            class="generateButton"
            @click="applyTrafficSettings()"
          >
            Apply
          </button>
        </li>
        <hr>
        <li class="panel-row">
          <span class="panel-key">Show traffic paths</span>
          <input
            v-model="showTrafficPaths"
            type="checkbox"
          >
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script src='./traffic.js'></script>

<style scoped lang="scss" src="./traffic.scss"></style>
