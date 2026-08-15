<script setup lang="ts">
import { onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Collapse } from 'bootstrap'
import { useAuthStore } from '@/stores/auth'
import { COREELEMENT_TYPES } from '@/constants/coreelementTypes'
import EmailThresholdWarning from '@/components/common/EmailThresholdWarning.vue'

const authStore = useAuthStore()
const router = useRouter()

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}

// Legacy parity (NavigationGuards.vue): Bootstrap's Collapse has no
// built-in "close on inner link click" behavior -- force the burger menu
// closed on every navigation. router.afterEach covers both link clicks
// and back/forward navigation in one hook (Legacy needed a separate
// popstate listener only because of Inertia's own event system).
const removeAfterEachHook = router.afterEach(() => {
  const element = document.getElementById('mainNavBar')
  if (element) new Collapse(element, { toggle: false }).hide()
})
onUnmounted(removeAfterEachHook)
</script>

<template>
  <nav
    class="navbar navbar-expand-lg sticky-top px-3 mb-5 text-bg-primary d-print-none"
    data-bs-theme="dark"
  >
    <RouterLink class="navbar-brand" to="/">
      <i class="fas fa-music text-warning"></i>
      <span class="ps-2">Orchester-Einteilung</span>
    </RouterLink>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#mainNavBar"
      aria-controls="mainNavBar"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div id="mainNavBar" class="collapse navbar-collapse">
      <ul class="navbar-nav mb-2 mb-lg-0">
        <!-- Further left-hand navigation entries are added as real views land in later slices. -->
        <li
          v-if="
            authStore.hasPermission('artistMaintain') ||
            authStore.hasPermission('ordinariumworkMaintain') ||
            authStore.hasPermission('propriumworkMaintain') ||
            authStore.hasPermission('scoreMaintain')
          "
          class="nav-item"
        >
          <div class="dropdown">
            <button
              class="btn dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span>Repertoire</span>
            </button>
            <div class="dropdown-menu" data-bs-theme="light">
              <RouterLink
                v-if="authStore.hasPermission('ordinariumworkMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-ordinariumworks-search' }"
              >
                <span>Ordinarium-Werke</span>
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('propriumworkMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-propriumworks-search' }"
              >
                <span>Proprium-Werke</span>
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('artistMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-artists-search' }"
              >
                <span>Komponisten und Dirigenten</span>
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('scoreMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-scores-search' }"
              >
                <span>Notenarchiv</span>
              </RouterLink>
            </div>
          </div>
        </li>
        <!-- Legacy's "System" menu (AuthLeftMenu.vue) is gated on role
             'disponent', not the broader userMaintain permission (which also
             allows administrators) -- Legacy's own System dropdown is
             disponent-only too, administrators reach user management via
             their own separate "Administrator" dropdown instead. Item order
             matches Legacy exactly: Benutzerverzeichnis, Benutzerkonten
             verwalten, Tarife verwalten. -->
        <li v-if="authStore.hasPermission('feeMaintain')" class="nav-item">
          <div class="dropdown">
            <button
              class="btn dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span>System</span>
            </button>
            <div class="dropdown-menu" data-bs-theme="light">
              <RouterLink class="dropdown-item" :to="{ name: 'system-userdirectory' }">
                <span>Benutzerverzeichnis</span>
              </RouterLink>
              <RouterLink class="dropdown-item" :to="{ name: 'system-users-search' }">
                <span>Benutzerkonten verwalten</span>
              </RouterLink>
              <RouterLink class="dropdown-item" :to="{ name: 'system-fees' }">
                <span>Tarife verwalten</span>
              </RouterLink>
            </div>
          </div>
        </li>
        <li v-if="authStore.user?.administrator" class="nav-item">
          <div class="dropdown">
            <button
              class="btn dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span>Administrator</span>
            </button>
            <div class="dropdown-menu" data-bs-theme="light">
              <RouterLink
                v-for="typeMeta in COREELEMENT_TYPES"
                :key="typeMeta.type"
                class="dropdown-item"
                :to="{ name: 'administrator-coreelement', params: { type: typeMeta.type } }"
              >
                {{ typeMeta.label }}
              </RouterLink>
              <RouterLink class="dropdown-item" :to="{ name: 'administrator-users-search' }">
                <span>Benutzerkonten (Administration)</span>
              </RouterLink>
              <hr class="dropdown-divider" />
              <RouterLink
                v-if="authStore.hasPermission('sentEmailView')"
                class="dropdown-item"
                :to="{ name: 'administrator-sent-emails-index' }"
              >
                <span>Versandte E-Mails ansehen</span>
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('requestLogView')"
                class="dropdown-item"
                :to="{ name: 'administrator-request-logs-index' }"
              >
                <span>Logbuch</span>
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('sqlInspectorView')"
                class="dropdown-item"
                :to="{ name: 'administrator-sql-inspector' }"
              >
                <span>SQL-Einsicht</span>
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('schedulerView')"
                class="dropdown-item"
                :to="{ name: 'administrator-scheduler' }"
              >
                <span>Scheduler</span>
              </RouterLink>
            </div>
          </div>
        </li>
        <li v-if="authStore.hasPermission('shorturlMaintain')" class="nav-item">
          <RouterLink class="btn" :to="{ name: 'shorturls' }">
            <span>Kurz-URLs</span>
          </RouterLink>
        </li>
      </ul>
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
        <li v-if="authStore.isAuthenticated" class="nav-item">
          <div class="dropdown">
            <button
              class="btn dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="fas fa-fw fa-user me-1"></i>
              <span>{{ authStore.user?.surname }}, {{ authStore.user?.givenname }}</span>
              <EmailThresholdWarning variant="icon" />
            </button>
            <div class="dropdown-menu dropdown-menu-end" data-bs-theme="light">
              <RouterLink class="dropdown-item" :to="{ name: 'selfadmin-profile-show' }">
                <i class="fas fa-fw fa-user-circle me-1"></i>
                <span>Mein Benutzerkonto</span>
              </RouterLink>
              <RouterLink class="dropdown-item" :to="{ name: 'support-requests-and-bookings' }">
                <i class="fas fa-fw fa-tasks me-1"></i>
                <span>Meine Anfragen und Buchungen</span>
              </RouterLink>
              <RouterLink class="dropdown-item" :to="{ name: 'support-message-to-contactperson' }">
                <i class="fas fa-fw fa-anchor me-1"></i>
                <span>Meine Ansprechpersonen</span>
              </RouterLink>
              <hr class="dropdown-divider" />
              <RouterLink class="dropdown-item" :to="{ name: 'statistics' }">
                <i class="fas fa-fw fa-chart-line me-1"></i>
                <span>Statistiken</span>
                <EmailThresholdWarning variant="icon" />
              </RouterLink>
              <hr class="dropdown-divider" />
              <button type="button" class="dropdown-item text-danger" @click="logout">
                <i class="fas fa-fw fa-sign-out-alt me-1"></i>
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </li>
        <li v-else class="nav-item">
          <RouterLink class="nav-link" :to="{ name: 'login' }">Log in</RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
