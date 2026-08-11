<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/SentEmails/Show.vue.
import { computed, onMounted, ref } from 'vue'
import { useSentEmails, type SentEmailShow } from '@/composables/useSentEmails'
import { formatUtcDateTime } from '@/services/dateFormat'

const props = defineProps<{ id: string }>()
const { get } = useSentEmails()

const email = ref<SentEmailShow | null>(null)

onMounted(async () => {
  email.value = await get(Number(props.id))
})

// Legacy's "zurück" returns to the Index for the month the email's own
// `datetime` (created_at) falls in -- not necessarily "now".
const backTarget = computed(() => {
  if (!email.value) return { name: 'administrator-sent-emails-index' as const }
  const at = new Date(email.value.datetime)
  return {
    name: 'administrator-sent-emails-index' as const,
    query: { year: at.getFullYear(), month: at.getMonth() + 1 },
  }
})

const mailerBadgeClass = computed(() =>
  email.value?.mailer === 'log' ? 'bg-danger' : 'bg-success',
)
</script>

<template>
  <h2 class="h2 text-center mb-4">Versandte Email</h2>

  <div v-if="email" class="row justify-content-center mt-4">
    <div class="col-md-11 justify-content-center">
      <div class="text-center my-4">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget">zurück</RouterLink>
      </div>

      <div class="row mb-3">
        <div class="col-md-2 fw-bold">Zeitpunkt:</div>
        <div class="col-md-10">{{ formatUtcDateTime(email.datetime) }}</div>
      </div>
      <div class="row mb-3">
        <div class="col-md-2 fw-bold">Von:</div>
        <div class="col-md-10">{{ email.from }}</div>
      </div>
      <div class="row mb-3">
        <div class="col-md-2 fw-bold">Via:</div>
        <div class="col-md-10">
          <span class="fw-bold p-1 rounded text-light" :class="mailerBadgeClass">{{
            email.mailer
          }}</span>
        </div>
      </div>
      <div v-if="email.to" class="row mb-3">
        <div class="col-md-2 fw-bold">An:</div>
        <div class="col-md-10">{{ email.to }}</div>
      </div>
      <div v-if="email.cc" class="row mb-3">
        <div class="col-md-2 fw-bold">CC:</div>
        <div class="col-md-10">{{ email.cc }}</div>
      </div>
      <div v-if="email.bcc" class="row mb-3">
        <div class="col-md-2 fw-bold">BCC:</div>
        <div class="col-md-10">{{ email.bcc }}</div>
      </div>
      <div class="row mb-3">
        <div class="col-md-2 fw-bold">Betreff:</div>
        <div class="col-md-10">{{ email.subject }}</div>
      </div>
      <div class="row mb-3">
        <div class="col-md-2 fw-bold">Nachricht:</div>
        <div class="col-md-10">
          <iframe :srcdoc="email.body ?? ''" class="border-top" width="100%" height="1000px" />
        </div>
      </div>
    </div>
  </div>
</template>
