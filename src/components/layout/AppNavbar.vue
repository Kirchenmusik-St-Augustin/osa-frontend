<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { COREELEMENT_TYPES } from '@/constants/coreelementTypes'

const authStore = useAuthStore()
const router = useRouter()

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}
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
            authStore.hasPermission('propriumworkMaintain')
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
              Repertoire
            </button>
            <div class="dropdown-menu" data-bs-theme="light">
              <RouterLink
                v-if="authStore.hasPermission('ordinariumworkMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-ordinariumworks-search' }"
              >
                Ordinarium-Werke
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('propriumworkMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-propriumworks-search' }"
              >
                Proprium-Werke
              </RouterLink>
              <RouterLink
                v-if="authStore.hasPermission('artistMaintain')"
                class="dropdown-item"
                :to="{ name: 'repertoire-artists-search' }"
              >
                Komponisten und Dirigenten
              </RouterLink>
            </div>
          </div>
        </li>
        <!-- Legacy's "System" menu (AuthLeftMenu.vue) is gated on role
             'disponent' and currently only has one built item here
             (Fees/"Tarife verwalten") -- Benutzerverzeichnis/Benutzerkonten
             verwalten land with User-/System-Verwaltung (Schritt 7). Fees
             was wrongly wired under the Administrator dropdown before
             (User-reported 2026-07-31) -- it belongs here, gated by its own
             feeMaintain permission (role 'disponent'), not the
             Coreelement types' administrator-Flag. -->
        <li v-if="authStore.hasPermission('feeMaintain')" class="nav-item">
          <div class="dropdown">
            <button
              class="btn dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              System
            </button>
            <div class="dropdown-menu" data-bs-theme="light">
              <RouterLink class="dropdown-item" :to="{ name: 'system-fees' }">
                Tarife verwalten
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
              Administrator
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
            </div>
          </div>
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
            </button>
            <!-- "Mein Benutzerkonto"/"Meine Anfragen und Buchungen"/"Statistiken" etc.
                 land with their respective future domain slices (User-/System-Verwaltung,
                 Schritt 6) -- no route exists for them yet in this Auth-only slice. -->
            <div class="dropdown-menu dropdown-menu-end" data-bs-theme="light">
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
