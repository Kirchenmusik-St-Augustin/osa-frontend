import '@/assets/scss/app.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vue3GoogleLogin from 'vue3-google-login'

import App from './App.vue'
import router from './router'
import { googleClientId } from './runtimeConfig'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vue3GoogleLogin, { clientId: googleClientId() })
app.mount('#app')
