import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import ProcessesView from '../views/ProcessesView.vue'
import TasksView from '../views/TasksView.vue'
import EmployeesView from '../views/EmployeesView.vue'
import LogsView from '../views/LogsView.vue'
// import SystemView from '../views/SystemView.vue'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/processes',
      name: 'processes',
      component: ProcessesView
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksView
    },
    {
      path: '/employees',
      name: 'employees',
      component: EmployeesView
    },
    {
      path: '/logs',
      name: 'logs',
      component: LogsView
    }
    // {
    //   path: '/system',
    //   name: 'system',
    //   component: SystemView
    // }
  ]
})

export default router