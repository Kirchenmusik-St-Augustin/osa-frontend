<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, parseWallClock } from '@/services/dateFormat'
import type {
  BookingStatus,
  PerformancePropriumItem,
  PerformanceRehearsal,
} from '@/composables/usePerformances'
import BookingStatusBadge from '@/components/bookings/BookingStatusBadge.vue'
import PropriumSetup from './PropriumSetup.vue'

// Structural subset shared by PerformanceCalendarItem and PerformanceShow --
// this card is used on both the calendar and (with showMenu off) the Show
// page, 1:1 Legacy's dual-purpose PerformanceCardComponent.vue. `user_booking`
// is optional -- only the calendar (PerformanceCalendarItem) carries it,
// Cast/Billing/RequestsAndBookings/MessageToCast's own PerformanceShortBase
// don't need the self-service badge on their own card (Schritt 6 plan B.4
// correction: Legacy's Show.vue passes neither with-status nor
// booking-trigger either).
export interface PerformanceCardData {
  id: number
  schedule: string
  location: { name: string; color: string }
  ordinariumwork_name: string
  ordinariumwork_artist_name: string
  ordinariumwork_demanding: boolean
  artist_name: string | null
  user_booking?: BookingStatus
  proprium: PerformancePropriumItem[]
  demanding_proprium: boolean
  rehearsals: PerformanceRehearsal[]
}

const props = withDefaults(
  defineProps<{
    performance: PerformanceCardData
    showMenu?: boolean
    bookingTrigger?: boolean
    initShowRehearsals?: boolean
    initShowProprium?: boolean
  }>(),
  {
    showMenu: false,
    bookingTrigger: false,
    initShowRehearsals: false,
    initShowProprium: false,
  },
)

const emit = defineEmits<{ 'change-status': [] }>()

const authStore = useAuthStore()

const rehearsalsOpen = ref(props.initShowRehearsals)
const propriumOpen = ref(props.initShowProprium)

// Legacy's `upcoming` computed: `moment(schedule).isAfter()` (no argument,
// i.e. "is this after right now").
const upcoming = computed(() => parseWallClock(props.performance.schedule).getTime() > Date.now())
</script>

<template>
  <div class="card performance mb-3 mx-auto" :class="upcoming ? 'border-primary' : ''">
    <div class="card-header">
      <div class="row">
        <div class="col-lg-5 order-lg-2 text-nowrap text-end">
          <BookingStatusBadge
            v-if="performance.user_booking"
            :status="performance.user_booking"
            :interactive="bookingTrigger"
            @trigger="emit('change-status')"
          />
        </div>
        <div class="col-lg-7 order-lg-1 text-nowrap text-start">
          <span>{{ formatDateTime(performance.schedule) }}, </span>
          <span class="me-2" :style="{ color: `#${performance.location.color}` }">{{
            performance.location.name
          }}</span>
          <div v-if="performance.rehearsals.length" class="d-print-none">
            <small class="c-pointer" @click="rehearsalsOpen = !rehearsalsOpen">
              <i
                :class="
                  rehearsalsOpen
                    ? 'fas fa-eye-slash fa-fw text-black-50'
                    : 'fas fa-eye fa-fw text-black-50'
                "
              ></i>
              <span class="ms-2">Proben</span>
            </small>
          </div>
          <div v-if="rehearsalsOpen && performance.rehearsals.length" class="ms-2">
            <small class="d-none d-print-block">Proben:</small>
            <div v-for="(rehearsal, index) in performance.rehearsals" :key="index">
              <small>{{ formatDateTime(rehearsal.schedule) }}</small>
              <small v-if="rehearsal.comment?.length"> ({{ rehearsal.comment }})</small>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div class="row">
        <div class="col-lg-2 order-lg-2 text-end">
          <div v-if="showMenu" class="dropdown">
            <button
              class="btn btn-sm btn-primary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            ></button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <RouterLink
                  class="dropdown-item"
                  :to="{ name: 'performances-show', params: { id: performance.id } }"
                >
                  <i class="fas fa-info-circle me-1"></i>Information
                </RouterLink>
              </li>
              <template v-if="upcoming && authStore.hasPermission('performanceMaintain')">
                <li><hr class="dropdown-divider" /></li>
                <li>
                  <RouterLink
                    class="dropdown-item"
                    :to="{ name: 'performances-edit', params: { id: performance.id } }"
                  >
                    <i class="fas fa-edit me-1"></i>Bearbeiten
                  </RouterLink>
                </li>
                <li v-if="authStore.hasPermission('performanceCast')">
                  <RouterLink
                    class="dropdown-item"
                    :to="{
                      name: 'performances-requests-and-bookings',
                      params: { id: performance.id },
                    }"
                  >
                    <i class="fas fa-eye me-1"></i>Anfragen und Buchungen
                  </RouterLink>
                </li>
                <li v-if="authStore.hasPermission('performanceCast')">
                  <RouterLink
                    class="dropdown-item"
                    :to="{ name: 'performances-cast', params: { id: performance.id } }"
                  >
                    <i class="fas fa-boxes me-1"></i>Besetzung
                  </RouterLink>
                </li>
                <li v-if="authStore.hasPermission('performanceCast')">
                  <RouterLink
                    class="dropdown-item"
                    :to="{
                      name: 'performances-message-to-cast',
                      params: { id: performance.id },
                    }"
                  >
                    <i class="fas fa-envelope me-1"></i>Nachricht an aktuelle Besetzung
                  </RouterLink>
                </li>
              </template>
              <template v-if="authStore.hasPermission('performanceBilling')">
                <li><hr class="dropdown-divider" /></li>
                <li>
                  <RouterLink
                    class="dropdown-item"
                    :to="{ name: 'performances-billing', params: { id: performance.id } }"
                  >
                    <i class="fas fa-euro-sign me-1"></i>Abrechnung
                  </RouterLink>
                </li>
              </template>
            </ul>
          </div>
        </div>
        <div class="col-lg-10 order-lg-1 text-start">
          <small>{{ performance.ordinariumwork_artist_name }}</small>
          <div>
            <strong>{{ performance.ordinariumwork_name }}</strong>
            <i
              v-if="performance.ordinariumwork_demanding"
              class="fas fa-exclamation-circle text-warning ms-1"
              title="anspruchsvolles Ordinarium"
            ></i>
            <i
              v-if="performance.demanding_proprium"
              class="fas fa-exclamation-circle text-warning ms-1"
              title="anspruchsvolles Proprium"
            ></i>
          </div>
          <div v-if="performance.proprium.length">
            <small class="c-pointer d-print-none" @click="propriumOpen = !propriumOpen">
              <i :class="propriumOpen ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
              <span class="ms-1">Proprium</span><span v-if="propriumOpen">:</span>
            </small>
            <div v-if="propriumOpen" class="d-print-none ps-3">
              <PropriumSetup :proprium="performance.proprium" />
            </div>
          </div>
          <div v-if="performance.artist_name?.length" class="mt-2">
            <small>
              <span class="fw-bolder">Dirigent:</span>
              <span class="ms-1">{{ performance.artist_name }}</span>
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance {
  max-width: 700px;
}
</style>
