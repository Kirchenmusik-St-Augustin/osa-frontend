<script setup lang="ts">
// Two 1:1 ports of the same Legacy data source (usePage().props.emailThresholdStatus,
// see app.helper.emailsDisabled()), merged into one component since both variants
// render the same authStore.user.email_kill_switch value -- one shared
// component, not two near-duplicate mini-components.
//
// - "icon": Layouts/Default/Menu/AuthRightMenu.vue's warning triangle next to the
//   username on the navbar dropdown toggle -- always visible, no dropdown needed.
// - "card": Components/Common/EmailThresholdMessageComponent.vue -- replaces a mail
//   form's textarea+send button while the kill switch is active.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{ variant?: 'icon' | 'card' }>(), {
  variant: 'icon',
})

const authStore = useAuthStore()
const status = computed(() => authStore.user?.email_kill_switch)
const active = computed(() => status.value?.active ?? false)
</script>

<template>
  <i
    v-if="props.variant === 'icon' && active"
    class="fas fa-fw fa-triangle-exclamation fa-fade text-warning ms-1"
  ></i>
  <div
    v-else-if="props.variant === 'card' && active && status"
    class="card mx-auto mb-3"
    style="max-width: 30rem"
  >
    <div class="card-header text-bg-warning">
      <i class="fas fa-fw fa-triangle-exclamation fa-fade text-danger me-2"></i>
      <strong>Email-Versand aktuell deaktiviert</strong>
    </div>
    <div class="card-body text-bg-light">
      <div class="small">Derzeit werden keine Emails aus dem System versandt!</div>
      <div class="small">
        Der Versand ist vermutlich deshalb deaktiviert,<br />
        da derzeit der {{ status.period_days }}-Tage-Grenzwert von {{ status.threshold }} Emails
        erreicht ist.
      </div>
    </div>
  </div>
</template>
