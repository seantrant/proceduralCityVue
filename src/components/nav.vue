<template>
  <nav>
    <ul>
      <li @click="openNav('todo')">
        <i class="fa fa-check" />
      </li>
      <!-- <li><i class="fa fa-check" /></li> -->
      <li @click="openNav('camera')">
        <i class="fa fa-arrows-alt" />
      </li>
      <li @click="openNav('settings')">
        <i class="fa fa-cogs" />
      </li>
    </ul>
  </nav>
</template>

<script>
export default {
  name: 'Nav',
  props: {
    // msg: String,
  },
  methods:{
    openNav(option){
      this.$store.commit("changeNav", option);
      console.log('nav ', this.$store.getters.navState)
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
nav{
  position: relative;
  top: -16px;
  margin-top:0;
  height:60px;
  width:100%;
  border-bottom: 1px solid white;

  ul{
    color:white;
    list-style:none;
    text-align: right;

    li{
      display: inline-block;
      font-size: 2rem;
      padding: 12px;
      border-left: 1px solid white;

      &:hover{
        opacity:0.7;
        cursor:pointer;
      }
    }
  }
}
</style>
