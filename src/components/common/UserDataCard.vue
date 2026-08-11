<script setup lang="ts">
// Shared "Benutzer-Daten" + "Eigenschaften" card pair -- 1:1 port of
// Legacy's Components/Common/ShowUserComponent.vue, which both
// System::UserController's Show page (UserShowView.vue) and Selfadmin's
// own Profile Show page (ProfileShowView.vue) embed -- Legacy renders both
// from the exact same `User\Show` resource, so this component is genuinely
// shared, not a premature abstraction (CLAUDE.md AHA principle).
import { computed } from 'vue'
import type { User } from '@/composables/useUsers'
import { formatUtcDateTime } from '@/services/dateFormat'

const props = defineProps<{ user: User }>()

const lastActivity = computed(() =>
  props.user.auth_lastsignal ? formatUtcDateTime(props.user.auth_lastsignal) : 'nicht bekannt',
)

const abilityColumns = computed(() => [
  { title: 'Instrumente', items: props.user.instruments },
  { title: 'Stimmen', items: props.user.voices },
  { title: 'Choraufgaben', items: props.user.choirjobs },
  { title: 'Rollen', items: props.user.roles },
])
</script>

<template>
  <div class="card my-4">
    <div class="card-header">
      <div class="h5">Benutzer-Daten</div>
    </div>
    <div class="card-body">
      <div class="my-3">
        <strong>Vorname</strong>
        <div>{{ user.givenname }}</div>
      </div>
      <div class="my-3">
        <strong>Nachname</strong>
        <div>{{ user.surname }}</div>
      </div>
      <div class="my-3">
        <strong>E-Mail</strong>
        <div v-if="user.email">
          <div>{{ user.email }}</div>
          <div v-if="user.email_verified_at" class="small text-secondary">
            E-Mail-Adresse verifiziert am: {{ formatUtcDateTime(user.email_verified_at) }}
          </div>
          <div v-else class="small text-danger">nicht verifiziert</div>
        </div>
        <div v-else class="text-danger">unbekannt</div>
      </div>
      <div class="my-3">
        <strong>Telefon</strong>
        <div>{{ user.phone }}</div>
      </div>
    </div>
    <div class="card-footer">
      <div class="small text-body-secondary text-center">
        <div>Letzte Aktivität:</div>
        <div>{{ lastActivity }}</div>
      </div>
    </div>
  </div>

  <div class="card my-4">
    <div class="card-header">
      <div class="h5">Eigenschaften</div>
    </div>
    <div class="card-body">
      <div class="row">
        <div v-for="column in abilityColumns" :key="column.title" class="col-md-3">
          <div>
            <strong>{{ column.title }}</strong>
          </div>
          <div v-for="item in column.items" :key="item.id">{{ item.name }}</div>
        </div>
        <div v-if="user.administrator" class="text-center mt-4">
          <span class="badge bg-danger">Benutzer ist Administrator</span>
        </div>
        <div v-if="user.auth_locked" class="text-center mt-4">
          <span class="badge bg-warning">Benutzer ist gesperrt</span>
        </div>
      </div>
    </div>
    <div class="card-footer">
      <div class="small text-body-secondary text-center">
        <div>Instrumente, Stimmen und Choraufgaben werden vom Disponenten verwaltet.</div>
        <div>Rollen werden vom Administrator verwaltet.</div>
      </div>
    </div>
  </div>
</template>
