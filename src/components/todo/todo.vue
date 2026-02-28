<template>
  <transition name="panel">
    <aside
      v-if="openWindow"
      class="option-panel"
      :style="panelStyle"
    >
      <p>Todo</p>
      <ul class="noselect">
        <li
          v-for="list in toDoList"
          :key="list.item"
          :class="{checked: list.checked }"
          class="panel-row todo-row"
        >
          <span
            class="todo-item"
            @click="listItemClicked(list)"
          >{{ list.item }}</span>
          <button
            class="remove-button"
            @click="removeItem(list.item)"
          >
            x
          </button>
        </li>
      </ul>

      <div class="addButton panel-row">
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
