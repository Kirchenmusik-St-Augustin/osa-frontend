<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/layout/ConfirmDialog.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
</script>

<template>
  <RouterView />
  <ToastHost />
  <ConfirmDialog />
</template>
