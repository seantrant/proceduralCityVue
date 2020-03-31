import Vue from 'vue';
import Router from 'vue-router';
import Scene from './views/Scene.vue';
// import Start from './views/Start.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'scene',
      component: Scene,
    },
    // {
    //   path: '/start',
    //   name: 'start',
    //   // route level code-splitting
    //   // this generates a separate chunk (about.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import(/* webpackChunkName: "start" */ './views/Start.vue'),
    // },
  ],
});
