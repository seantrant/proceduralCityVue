<template>
  <transition name="fade">
    <aside v-if="openWindow">
      <p>Settings</p>
      <ul class="noselect">
        <li>
          Grid Size<input
            v-model="grid.gridSize"
            placeholder="8"
          >
        </li>

        <hr>
        Show on Scene
        <br>
        <li>
          Floor
          <input
            v-model="drawOnScene.floor"
            type="checkbox"
            >
        </li>
        <li>
          Grid Layout
          <input
            v-model="drawOnScene.gridLayout"
            type="checkbox"
            >
        </li>
        <li>
          Buildings
          <input
            v-model="drawOnScene.buildings"
            type="checkbox"
            >
        </li>


        <button
          class="generateButton"
          @click="reGenerate()"
        >
          Generate
        </button>
        <hr>
        <p>FPS Controls</p>
        <li>
          Mouse sensitivity
          <input v-model.number="fps.mouseSensitivity" step="0.001" min="0.0001">
        </li>
        <li>
          Move speed
          <input v-model.number="fps.moveSpeed" step="0.1" min="0.1">
        </li>
        <li>
          Acceleration
          <input v-model.number="fps.acceleration" step="1" min="0">
        </li>
        <li>
          Friction
          <input v-model.number="fps.friction" step="1" min="0">
        </li>
        <button class="generateButton" @click="applyFpsSettings()">Apply FPS Settings</button>
      </ul>
    </aside>
  </transition>
</template>

<script src='./settings.js'></script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss" src="./settings.scss"></style>
