import { createRouter, createWebHistory } from 'vue-router';
import Scene from './views/Scene.vue';

const BuildingGenerator = () => import('./views/BuildingGenerator.vue');

const routes = [
  {
    path: '/',
    name: 'scene',
    component: Scene,
  },
  {
    path: '/building-generator',
    name: 'buildingGenerator',
    component: BuildingGenerator,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
