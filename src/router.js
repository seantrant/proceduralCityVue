import { createRouter, createWebHistory } from 'vue-router';
import Scene from './views/Scene.vue';

const routes = [
  {
    path: '/',
    name: 'scene',
    component: Scene,
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
