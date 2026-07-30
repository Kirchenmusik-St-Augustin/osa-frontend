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
          // The de-facto app home -- Legacy redirects '/' straight to the
          // performances calendar (routes/web.php), there is no separate
          // "home" concept or nav entry for it.
          path: '',
          name: 'home',
          component: () => import('@/views/performances/PerformanceCalendarView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'performances/create',
          name: 'performances-create',
          component: () => import('@/views/performances/PerformanceFormView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'performanceMaintain' },
        },
        {
          path: 'performances/:id(\\d+)',
          name: 'performances-show',
          component: () => import('@/views/performances/PerformanceShowView.vue'),
          props: true,
          meta: { requiresAuth: true },
        },
        {
          path: 'performances/:id(\\d+)/edit',
          name: 'performances-edit',
          component: () => import('@/views/performances/PerformanceFormView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'performanceMaintain' },
        },
        {
          path: 'performances/:id(\\d+)/cast',
          name: 'performances-cast',
          component: () => import('@/views/performances/CastView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'performanceCast' },
        },
        {
          // No past-lock check client-side (consistent with
          // performances-edit above) -- billing is the one Booking-domain
          // page Legacy's own policy never locks by schedule either, see
          // booking_service.get_billing's docstring.
          path: 'performances/:id(\\d+)/billing',
          name: 'performances-billing',
          component: () => import('@/views/performances/BillingView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'performanceBilling' },
        },
        {
          path: 'performances/:id(\\d+)/requests-and-bookings',
          name: 'performances-requests-and-bookings',
          component: () => import('@/views/performances/RequestsAndBookingsView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'performanceMaintain' },
        },
        {
          path: 'performances/:id(\\d+)/message-to-cast',
          name: 'performances-message-to-cast',
          component: () => import('@/views/performances/MessageToCastView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'performanceMaintain' },
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
          path: 'administrator/fees',
          name: 'administrator-fees',
          component: () => import('@/views/administrator/FeeView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'feeMaintain' },
        },
        {
          path: 'repertoire/artists',
          name: 'repertoire-artists-search',
          component: () => import('@/views/repertoire/ArtistSearchView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'artistMaintain' },
        },
        {
          path: 'repertoire/artists/create',
          name: 'repertoire-artists-create',
          component: () => import('@/views/repertoire/ArtistFormView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'artistMaintain' },
        },
        {
          path: 'repertoire/artists/:id(\\d+)',
          name: 'repertoire-artists-show',
          component: () => import('@/views/repertoire/ArtistShowView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'artistMaintain' },
        },
        {
          path: 'repertoire/artists/:id(\\d+)/edit',
          name: 'repertoire-artists-edit',
          component: () => import('@/views/repertoire/ArtistFormView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'artistMaintain' },
        },
        {
          path: 'repertoire/ordinariumworks',
          name: 'repertoire-ordinariumworks-search',
          component: () => import('@/views/repertoire/OrdinariumworkSearchView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'ordinariumworkMaintain' },
        },
        {
          path: 'repertoire/ordinariumworks/create',
          name: 'repertoire-ordinariumworks-create',
          component: () => import('@/views/repertoire/OrdinariumworkFormView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'ordinariumworkMaintain' },
        },
        {
          path: 'repertoire/ordinariumworks/:id(\\d+)',
          name: 'repertoire-ordinariumworks-show',
          component: () => import('@/views/repertoire/OrdinariumworkShowView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'ordinariumworkMaintain' },
        },
        {
          path: 'repertoire/ordinariumworks/:id(\\d+)/edit',
          name: 'repertoire-ordinariumworks-edit',
          component: () => import('@/views/repertoire/OrdinariumworkFormView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'ordinariumworkMaintain' },
        },
        {
          path: 'repertoire/propriumworks',
          name: 'repertoire-propriumworks-search',
          component: () => import('@/views/repertoire/PropriumworkSearchView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'propriumworkMaintain' },
        },
        {
          path: 'repertoire/propriumworks/create',
          name: 'repertoire-propriumworks-create',
          component: () => import('@/views/repertoire/PropriumworkFormView.vue'),
          meta: { requiresAuth: true, requiredPermission: 'propriumworkMaintain' },
        },
        {
          path: 'repertoire/propriumworks/:id(\\d+)',
          name: 'repertoire-propriumworks-show',
          component: () => import('@/views/repertoire/PropriumworkShowView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'propriumworkMaintain' },
        },
        {
          path: 'repertoire/propriumworks/:id(\\d+)/edit',
          name: 'repertoire-propriumworks-edit',
          component: () => import('@/views/repertoire/PropriumworkFormView.vue'),
          props: true,
          meta: { requiresAuth: true, requiredPermission: 'propriumworkMaintain' },
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
