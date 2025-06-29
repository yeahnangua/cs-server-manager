import { createRouter, createWebHashHistory } from 'vue-router'
import ServerManagement from '../views/ServerManagement.vue'
import Settings from '../views/Settings.vue'
import Statistics from '../views/Statistics.vue'
import CreateServer from '../views/CreateServer.vue'
import Console from '../views/Console.vue'
import SettingsView from '../views/Settings.vue'
const routes = [
  {
    path: '/',
    redirect: '/server'
  },
  {
    path: '/server',
    name: 'ServerManagement',
    component: ServerManagement
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/server/:serverName/settings',
    name: 'ServerSettings',
    component: Settings
  },
  {
    path: '/stats',
    name: 'Statistics',
    component: Statistics
  },
  {
    path: '/server/create',
    name: 'CreateServer',
    component: CreateServer
  },
  {
    path: '/console',
    name: 'Console',
    component: Console
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router