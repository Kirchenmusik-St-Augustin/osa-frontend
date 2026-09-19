<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { COREELEMENT_TYPES } from '@/constants/coreelementTypes'
import AppDropdown from '@/components/common/AppDropdown.vue'
import EmailThresholdWarning from '@/components/common/EmailThresholdWarning.vue'

const authStore = useAuthStore()
const router = useRouter()

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}

// The burger menu is closed on every navigation: router.afterEach covers
// both link clicks and back/forward navigation in one hook. Below the lg
// breakpoint Bootstrap's CSS shows the menu only while it carries `.show`;
// from lg up it is always visible, regardless of this state.
const menuOpen = ref(false)

const removeAfterEachHook = router.afterEach(() => {
  menuOpen.value = false
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
      aria-controls="mainNavBar"
      :aria-expanded="menuOpen"
      aria-label="Toggle navigation"
      @click="menuOpen = !menuOpen"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div id="mainNavBar" class="collapse navbar-collapse" :class="{ show: menuOpen }">
      <ul class="navbar-nav mb-2 mb-lg-0">
        <li
          v-if="
            authStore.hasPermission('artistMaintain') ||
            authStore.hasPermission('ordinariumworkMaintain') ||
            authStore.hasPermission('propriumworkMaintain') ||
            authStore.hasPermission('scoreMaintain')
          "
          class="nav-item"
        >
          <AppDropdown menu-theme="light">
            <template #toggle>
              <span>Repertoire</span>
            </template>
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
          </AppDropdown>
        </li>
        <!-- Item order: Benutzerverzeichnis, Benutzerkonten verwalten,
             Tarife verwalten. Each link is gated
             on the permission its route actually requires (userMaintain for
             the first two, feeMaintain for the third) -- those are distinct
             permissions (userMaintain also covers administrators without
             the 'disponent' role, feeMaintain does not), so the outer
             v-if must cover their union, same pattern as the Repertoire
             dropdown above. -->
        <li
          v-if="authStore.hasPermission('userMaintain') || authStore.hasPermission('feeMaintain')"
          class="nav-item"
        >
          <AppDropdown menu-theme="light">
            <template #toggle>
              <span>System</span>
            </template>
            <RouterLink
              v-if="authStore.hasPermission('userMaintain')"
              class="dropdown-item"
              :to="{ name: 'system-userdirectory' }"
            >
              <span>Benutzerverzeichnis</span>
            </RouterLink>
            <RouterLink
              v-if="authStore.hasPermission('userMaintain')"
              class="dropdown-item"
              :to="{ name: 'system-users-search' }"
            >
              <span>Benutzerkonten verwalten</span>
            </RouterLink>
            <RouterLink
              v-if="authStore.hasPermission('feeMaintain')"
              class="dropdown-item"
              :to="{ name: 'system-fees' }"
            >
              <span>Tarife verwalten</span>
            </RouterLink>
          </AppDropdown>
        </li>
        <li v-if="authStore.user?.administrator" class="nav-item">
          <AppDropdown menu-theme="light">
            <template #toggle>
              <span>Administrator</span>
            </template>
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
          </AppDropdown>
        </li>
        <li v-if="authStore.hasPermission('shorturlMaintain')" class="nav-item">
          <RouterLink class="btn" :to="{ name: 'shorturls' }">
            <span>Kurz-URLs</span>
          </RouterLink>
        </li>
      </ul>
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
        <li v-if="authStore.isAuthenticated" class="nav-item">
          <AppDropdown menu-theme="light" menu-end>
            <template #toggle>
              <i class="fas fa-fw fa-user me-1"></i>
              <span>{{ authStore.user?.surname }}, {{ authStore.user?.givenname }}</span>
              <EmailThresholdWarning variant="icon" />
            </template>
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
          </AppDropdown>
        </li>
        <li v-else class="nav-item">
          <RouterLink class="nav-link" :to="{ name: 'login' }">Log in</RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
