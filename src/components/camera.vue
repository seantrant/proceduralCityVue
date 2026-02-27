<template>
  <transition name="fade">
    <aside v-if="openWindow">
      <p>Camera</p>
      <ul class="noselect">
        <li>
          <button @click="requestPointerLock">Enable FPS Controls (click scene)</button>
        </li>
        <li>
          <small>Pointer lock: <strong>{{ pointerLocked ? 'Locked' : 'Unlocked' }}</strong></small>
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script>
export default {
  name: 'Camera',
  data() {
    return {
    }
  },
  computed: {
    openWindow () {
      return this.$store.getters.navState[1].open
    }
  },
  watch: {
    openWindow (newCount, oldCount) {
      console.log(`new be ${newCount} old be ${oldCount}`)
    }
  },
  mounted(){
    this.pointerLocked = document.pointerLockElement !== null
    document.addEventListener('pointerlockchange', this._onPointerLockChange)
  },
  methods:{
    requestPointerLock(){
      // ask the scene to request pointer lock on the canvas
      document.dispatchEvent(new CustomEvent('request-pointer-lock'))
    },
    _onPointerLockChange(){
      this.pointerLocked = document.pointerLockElement !== null
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
