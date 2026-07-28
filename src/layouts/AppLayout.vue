<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
</script>

<template>
  <div id="container" class="container">
    <AppNavbar />
    <div class="mx-4">
      <RouterView />
    </div>
  </div>
</template>
