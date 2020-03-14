<template>
  <transition name="fade">
    <aside v-if="openWindow">
      <p>Settings</p>
      <ul class="noselect">
        <li>
          Buildings<input
            v-model="noOfBuildings"
            placeholder="Buildings"
            @keyup.enter="reGenerate()"
          >
        </li>

        <li>
          Rows<input
            v-model="noOfRows"
            placeholder="Rows"
            @keyup.enter="reGenerate()"
          >
        </li>

        <!-- <li>
          Wire Frame
          <input
            v-model="wireFrame"
            type="checkbox"
            @change="reGenerate()">
        </li> -->

        <button
          class="generateButton"
          @click="reGenerate()"
        >
          Generate
        </button>
      </ul>
    </aside>
  </transition>
</template>

<script src='./settings.js'></script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss" src="./settings.scss"></style>
