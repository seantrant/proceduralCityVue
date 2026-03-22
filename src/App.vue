<template>
  <div id="app">
    <app-nav />
    <router-view />
  </div>
</template>

<script>
import appNav from '@/components/nav';

export default {
  name: 'App',
  components: {
    appNav,
  },
};
</script>

<style lang="scss">
body{
  margin:0px;
  padding:0px;
  min-height: 100vh;
  background: linear-gradient(180deg, #001f3f 0%, #000015 100%);
}
#app {
  margin:0px;
  padding:0px;
  height:100vh;
  width:100%;
  overflow:hidden;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
#nav {
  padding: 30px;
  height:70px;
  a {
    font-weight: bold;
    color: #2c3e50;
    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

.noselect {
  -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
     -khtml-user-select: none; /* Konqueror HTML */
       -moz-user-select: none; /* Old versions of Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
            user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Opera and Firefox */
}
</style>
