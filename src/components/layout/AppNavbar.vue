<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
        <!-- Left-hand navigation entries are added as real views land in later slices. -->
      </ul>
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
        <!-- Right-hand navigation entries (auth/user menu) land with the Auth slice. -->
      </ul>
    </div>
  </nav>
</template>
