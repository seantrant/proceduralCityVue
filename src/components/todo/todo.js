export default {
  name: 'Todo',
  data() {
    return {
      // addToListInput: this.$store.getters.navState[0].open,
      addToListInput: '',
      toDoList: [],
      openDiv: true,
    }
  },
  computed: {
    openWindow () {
      return this.$store.getters.navState[0].open
    }
  },
  watch: {
    openWindow () {
      // watcher intentionally left empty to avoid logging in production
    }
  },
  mounted(){
    if(this.retrieveTodoListFromStorage()){
      this.toDoList = this.retrieveTodoListFromStorage()
    }
  },
  methods:{
    retrieveTodoListFromStorage(){
      return JSON.parse(localStorage.getItem('todoItems'))
    },

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
      let indexToRemve = this.toDoList.findIndex(listEntry => listEntry.item === item)
      this.toDoList.splice(indexToRemve, 1);
      this.updateStorage();
    },
    updateStorage(){
      localStorage.setItem('todoItems', JSON.stringify(this.toDoList));
    }
  }
};
