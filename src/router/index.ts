import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { coreelementRouteGuard } from './coreelementGuard'
import { runAuthGuards } from './guards'
import { setPageTitle } from './pageTitle'

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
          meta: { requiresAuth: true, title: 'Kalender' },
        },
        {
          path: 'performances/create',
          name: 'performances-create',
          component: () => import('@/views/performances/PerformanceFormView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'performanceMaintain',
            title: 'Aufführung bearbeiten',
          },
        },
        {
          path: 'performances/:id(\\d+)',
          name: 'performances-show',
          component: () => import('@/views/performances/PerformanceShowView.vue'),
          props: true,
          meta: { requiresAuth: true, title: 'Aufführung - Details' },
        },
        {
          path: 'performances/:id(\\d+)/edit',
          name: 'performances-edit',
          component: () => import('@/views/performances/PerformanceFormView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'performanceMaintain',
            title: 'Aufführung bearbeiten',
          },
        },
        {
          path: 'performances/:id(\\d+)/cast',
          name: 'performances-cast',
          component: () => import('@/views/performances/CastView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'performanceCast',
            title: 'Besetzung bearbeiten',
          },
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
          meta: {
            requiresAuth: true,
            requiredPermission: 'performanceBilling',
            title: 'Abrechnung',
          },
        },
        {
          path: 'performances/:id(\\d+)/requests-and-bookings',
          name: 'performances-requests-and-bookings',
          component: () => import('@/views/performances/RequestsAndBookingsView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'performanceMaintain',
            title: 'Anfragen und Buchungen',
          },
        },
        {
          path: 'performances/:id(\\d+)/message-to-cast',
          name: 'performances-message-to-cast',
          component: () => import('@/views/performances/MessageToCastView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'performanceMaintain',
            title: 'Nachricht an aktuelle Besetzung',
          },
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { requiresGuest: true, title: 'Login' },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
          meta: { requiresGuest: true, title: 'Registrierung' },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/views/auth/ForgotPasswordView.vue'),
          meta: { requiresGuest: true, title: 'Passwort setzen' },
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('@/views/auth/ResetPasswordView.vue'),
          meta: { requiresGuest: true, title: 'Passwort setzen' },
        },
        {
          // No requiresAuth/requiresGuest -- self-contained via the token
          // in the URL, works whether or not the visitor already has an
          // active session (see VerifyEmailView.vue).
          path: 'verify-email',
          name: 'verify-email',
          component: () => import('@/views/auth/VerifyEmailView.vue'),
          meta: { title: 'E-Mail-Prüfung' },
        },
        {
          // One dynamic route for all six Coreelement types (see
          // constants/coreelementTypes.ts) instead of six near-identical
          // route entries -- mirrors the backend's single generic
          // /coreelements/{element_type} router. The required permission
          // depends on `type` (only known at navigation time), so it's
          // checked in `beforeEnter` rather than via a static `meta`
          // value (1:1 the backend's `ensure_permission` reasoning). Same
          // reasoning for the page title: no static `meta.title` here,
          // setPageTitle (router/pageTitle.ts) special-cases this one
          // route and derives it from `:type` via the same registry.
          path: 'administrator/:type(instrument|voice|choirjob|location|role|propriumelement)',
          name: 'administrator-coreelement',
          component: () => import('@/views/administrator/CoreelementView.vue'),
          props: true,
          meta: { requiresAuth: true },
          beforeEnter: coreelementRouteGuard,
        },
        {
          // Legacy's Fee/Index.vue lives under content/system/fees, its own
          // dedicated FeeController -- not part of the Coreelement pool
          // (see FeeView.vue's docstring) and gated by role 'disponent'
          // (FeePolicy::maintain()), not the Coreelement types' shared
          // administrator-Flag. Path/permission corrected 2026-07-31
          // (User-reported: was wrongly living under administrator/fees).
          path: 'system/fees',
          name: 'system-fees',
          component: () => import('@/views/system/FeeView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'feeMaintain',
            title: 'Tarife verwalten',
          },
        },
        {
          path: 'repertoire/artists',
          name: 'repertoire-artists-search',
          component: () => import('@/views/repertoire/ArtistSearchView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'artistMaintain',
            title: 'Komponisten und Dirigenten',
          },
        },
        {
          path: 'repertoire/artists/create',
          name: 'repertoire-artists-create',
          component: () => import('@/views/repertoire/ArtistFormView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'artistMaintain',
            title: 'Komponist/Dirigent bearbeiten',
          },
        },
        {
          path: 'repertoire/artists/:id(\\d+)',
          name: 'repertoire-artists-show',
          component: () => import('@/views/repertoire/ArtistShowView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'artistMaintain',
            title: 'Komponist / Dirigent',
          },
        },
        {
          path: 'repertoire/artists/:id(\\d+)/edit',
          name: 'repertoire-artists-edit',
          component: () => import('@/views/repertoire/ArtistFormView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'artistMaintain',
            title: 'Komponist/Dirigent bearbeiten',
          },
        },
        {
          path: 'repertoire/ordinariumworks',
          name: 'repertoire-ordinariumworks-search',
          component: () => import('@/views/repertoire/OrdinariumworkSearchView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'ordinariumworkMaintain',
            title: 'Ordinarium-Kompositionen',
          },
        },
        {
          path: 'repertoire/ordinariumworks/create',
          name: 'repertoire-ordinariumworks-create',
          component: () => import('@/views/repertoire/OrdinariumworkFormView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'ordinariumworkMaintain',
            title: 'Ordinarium-Komposition bearbeiten',
          },
        },
        {
          path: 'repertoire/ordinariumworks/:id(\\d+)',
          name: 'repertoire-ordinariumworks-show',
          component: () => import('@/views/repertoire/OrdinariumworkShowView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'ordinariumworkMaintain',
            title: 'Ordinarium-Komposition',
          },
        },
        {
          path: 'repertoire/ordinariumworks/:id(\\d+)/edit',
          name: 'repertoire-ordinariumworks-edit',
          component: () => import('@/views/repertoire/OrdinariumworkFormView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'ordinariumworkMaintain',
            title: 'Ordinarium-Komposition bearbeiten',
          },
        },
        {
          path: 'repertoire/propriumworks',
          name: 'repertoire-propriumworks-search',
          component: () => import('@/views/repertoire/PropriumworkSearchView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'propriumworkMaintain',
            title: 'Proprium-Kompositionen',
          },
        },
        {
          path: 'repertoire/propriumworks/create',
          name: 'repertoire-propriumworks-create',
          component: () => import('@/views/repertoire/PropriumworkFormView.vue'),
          meta: {
            requiresAuth: true,
            requiredPermission: 'propriumworkMaintain',
            title: 'Proprium-Komposition bearbeiten',
          },
        },
        {
          path: 'repertoire/propriumworks/:id(\\d+)',
          name: 'repertoire-propriumworks-show',
          component: () => import('@/views/repertoire/PropriumworkShowView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'propriumworkMaintain',
            title: 'Proprium-Komposition',
          },
        },
        {
          path: 'repertoire/propriumworks/:id(\\d+)/edit',
          name: 'repertoire-propriumworks-edit',
          component: () => import('@/views/repertoire/PropriumworkFormView.vue'),
          props: true,
          meta: {
            requiresAuth: true,
            requiredPermission: 'propriumworkMaintain',
            title: 'Proprium-Komposition bearbeiten',
          },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: 'Seite nicht gefunden' },
        },
      ],
    },
  ],
})

router.beforeEach(runAuthGuards)
router.afterEach(setPageTitle)

export default router
