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

<script>
export default {
  name: 'Todo',
  data() {
    return {
      addToListInput: this.$store.getters.navState[0].open,
      toDoList: [],
      openDiv: true,
    }
  },
  computed: {
    openWindow () {
      console.log( this.$store.getters.navState[0].open)
      return this.$store.getters.navState[0].open
    }
  },
  watch: {
    openWindow (newCount, oldCount) {
  // // Our fancy notification (2).
      console.log(`new be ${newCount} old be ${oldCount}`)
    }
  },
  mounted(){
    this.toDoList = JSON.parse(localStorage.getItem('todoItems'))
    // setInterval(() => {
    //   console.log('ran')
    //   this.openDiv = !this.openDiv
    // }, 2000)
  },
  methods:{
    listItemClicked(item){
      item.checked = !item.checked
      this.updateStorage();
    },

    addItem(){
      if(!this.addToListInput){
        return
      }
      this.toDoList.push({item: this.addToListInput, checked: false});
      this.addToListInput = null;
      this.updateStorage();
    },

    removeItem(item){
      console.log('item clicked: ', item)
      console.log(this.toDoList.findIndex(listEntry => listEntry.item === item))
      let indexToRemve = this.toDoList.findIndex(listEntry => listEntry.item === item)
      this.toDoList.splice(indexToRemve, 1);
      this.updateStorage();
    },
    updateStorage(){
      localStorage.setItem('todoItems', JSON.stringify(this.toDoList));
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

aside{
  height:auto;
  width:200px;
  position:absolute;
  top:60px;
  right:0;
  padding:0 1rem;
  border-bottom: 1px solid white;
  border-left: 1px solid white;
  border-top: 1px solid white;
  text-align: left;
  color:white;
  background: black;
  opacity: 0.8;

  p{
    margin-bottom:0px;
  }

  ul{
    padding-left:0;
    margin:0;
    color:white;
    list-style:none;
    padding-top:1rem;

    li{
      // color:red;
    }

    li.checked{
      text-decoration: line-through;
    }

  }

  .remove-button{
    float:right;
  }

  .addButton{
    margin:10px 0 16px 0;

    input{
      width:70%;
    }
  }
}


.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}

.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
