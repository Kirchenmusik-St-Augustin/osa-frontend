<script setup lang="ts">
// 1:1 port of Legacy's Content/System/Users/RequestsAndBookings.vue -- a
// plain table (NOT PerformanceCard, unlike the Selfadmin counterpart in
// MyRequestsAndBookingsView.vue), backed by the exact same generic backend
// function (GET /users/{id}/requests-and-bookings, see
// app/api/router_includes/user.py).
import { computed, onMounted, ref } from 'vue'
import { useUsers, type User } from '@/composables/useUsers'
import type { PerformanceShortBase } from '@/composables/useBookings'
import { formatDateTime } from '@/services/dateFormat'
import BookingStatusBadge from '@/components/bookings/BookingStatusBadge.vue'

const props = defineProps<{ id: string }>()
const { get, getRequestsAndBookings } = useUsers()

const user = ref<User | null>(null)
const entries = ref<PerformanceShortBase[]>([])

const subtitle = computed(() =>
  user.value ? `${user.value.surname}, ${user.value.givenname}` : '',
)

onMounted(async () => {
  const [loadedUser, loadedEntries] = await Promise.all([
    get(Number(props.id)),
    getRequestsAndBookings(Number(props.id)),
  ])
  user.value = loadedUser
  entries.value = loadedEntries
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerkonto verwalten</h2>
  <p class="h4 text-center mb-4">Anfragen und Buchungen für</p>
  <p class="h4 text-center mb-4">{{ subtitle }}</p>

  <div class="row justify-content-center mt-4">
    <div class="col-md-10">
      <div class="text-center my-4">
        <div class="my-3">
          <RouterLink
            class="btn btn-secondary mb-3"
            :to="{ name: 'system-users-show', params: { id } }"
          >
            zurück
          </RouterLink>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <tbody>
            <tr v-for="entry in entries" :key="entry.id">
              <td>{{ formatDateTime(entry.schedule) }}</td>
              <td>{{ entry.ordinariumwork_artist_name }}: {{ entry.ordinariumwork_name }}</td>
              <td><BookingStatusBadge :status="entry.user_booking" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-center my-4">
        <div class="my-3">
          <RouterLink
            class="btn btn-secondary mb-3"
            :to="{ name: 'system-users-show', params: { id } }"
          >
            zurück
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
