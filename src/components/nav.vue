<template>
  <nav>
    <ul class="nav-pages">
      <li>
        <router-link
          to="/"
          exact
        >
          <i class="fas fa-city" />
          <span>City</span>
        </router-link>
      </li>
      <li>
        <router-link to="/building-generator">
          <i class="fas fa-drafting-compass" />
          <span>Building Generator</span>
        </router-link>
      </li>
    </ul>
    <ul
      v-if="isScenePage"
      class="nav-panels"
    >
      <li @click="openNav('todo')">
        <i class="fa fa-check" />
      </li>
      <li @click="openNav('camera')">
        <i class="fa fa-arrows-alt" />
      </li>
      <li @click="openNav('layers')">
        <i class="fa fa-th-large" />
      </li>
      <li @click="openNav('weather')">
        <i class="fa fa-cloud" />
      </li>
      <li @click="openNav('traffic')">
        <i class="fa fa-car" />
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
  computed: {
    isScenePage() {
      return this.$route.name === 'scene';
    },
  },
  methods: {
    openNav(option) {
      this.$store.commit('nav/changeNav', option);
    },
  },
};
</script>

<style scoped lang="scss">
nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  width: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 5, 15, 0.6);

  ul {
    color: white;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .nav-pages {
    li {
      display: inline-block;

      a {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px 16px;
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        border-right: 1px solid rgba(255, 255, 255, 0.15);
        transition: color 0.2s, background 0.2s;

        i {
          font-size: 1.2rem;
        }

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        &.router-link-exact-active {
          color: white;
          background: rgba(255, 255, 255, 0.08);
          border-bottom: 2px solid #42b983;
        }
      }
    }
  }

  .nav-panels {
    li {
      display: inline-block;
      font-size: 2rem;
      padding: 12px;
      border-left: 1px solid rgba(255, 255, 255, 0.15);

      &:hover {
        opacity: 0.7;
        cursor: pointer;
      }
    }
  }
}
</style>
