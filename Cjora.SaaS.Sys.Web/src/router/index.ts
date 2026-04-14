import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/users' },
    { path: '/tenants', component: () => import('@/views/TenantsView.vue') },
    { path: '/users', component: () => import('@/views/UsersView.vue') },
    { path: '/roles', component: () => import('@/views/RolesView.vue') },
    { path: '/departments', component: () => import('@/views/DepartmentsView.vue') },
    { path: '/user-roles', component: () => import('@/views/UserRolesView.vue') }
  ]
});
