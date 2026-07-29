import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { coreelementRouteGuard } from './coreelementGuard'
import { runAuthGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { requiresGuest: true },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
          meta: { requiresGuest: true },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/views/auth/ForgotPasswordView.vue'),
          meta: { requiresGuest: true },
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('@/views/auth/ResetPasswordView.vue'),
          meta: { requiresGuest: true },
        },
        {
          // No requiresAuth/requiresGuest -- self-contained via the token
          // in the URL, works whether or not the visitor already has an
          // active session (see VerifyEmailView.vue).
          path: 'verify-email',
          name: 'verify-email',
          component: () => import('@/views/auth/VerifyEmailView.vue'),
        },
        {
          // One dynamic route for all six Coreelement types (see
          // constants/coreelementTypes.ts) instead of six near-identical
          // route entries -- mirrors the backend's single generic
          // /coreelements/{element_type} router. The required permission
          // depends on `type` (only known at navigation time), so it's
          // checked in `beforeEnter` rather than via a static `meta`
          // value (1:1 the backend's `ensure_permission` reasoning).
          path: 'administrator/:type(instrument|voice|choirjob|location|role|propriumelement)',
          name: 'administrator-coreelement',
          component: () => import('@/views/administrator/CoreelementView.vue'),
          props: true,
          meta: { requiresAuth: true },
          beforeEnter: coreelementRouteGuard,
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(runAuthGuards)

export default router
