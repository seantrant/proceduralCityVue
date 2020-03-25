<template>
  <transition name="fade">
    <aside v-if="openWindow">
      <p>Todo</p>
      <ul class="noselect">
        <li
          v-for="list in toDoList"
          :key="list.item"
          :class="{checked: list.checked }"
        >
          <span @click="listItemClicked(list)">{{ list.item }}</span>
          <span
            class="remove-button"
            @click="removeItem(list.item)"
          > &nbsp; x</span>
        </li>
      </ul>

      <div class="addButton">
        <input
          v-model="addToListInput"
          placeholder="Add item"
          @keyup.enter="addItem()"
        >
        <button @click="addItem()">
          Add
        </button>
      </div>
    </aside>
  </transition>
</template>

<script src="./todo.js"> </script>
<style scoped lang="scss" src="./todo.scss"></style>
