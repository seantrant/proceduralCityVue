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
      const item = (this.$store.state.nav.items || []).find(n => n.name === 'todo')
      return !!(item && item.open)
    },
    panelIndex () {
      const openPanels = (this.$store.state.nav.items || []).filter(n => n.open)
      return openPanels.findIndex(n => n.name === 'todo')
    },
    panelStyle () {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex
      }
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
      this.copyToClipboard(item.item)
      item.checked = !item.checked
      this.updateStorage();
    },

    copyToClipboard(text){
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
        return
      }
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'absolute'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
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
