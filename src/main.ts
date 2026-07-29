import '@/assets/scss/app.scss'
// Same module specifier ('bootstrap') that CoreelementView.vue (and any
// future component) uses for named imports like `{ Modal }` -- Vite/ESM
// module resolution only evaluates a given specifier once and caches it,
// so this dedupes to a single Bootstrap runtime. Importing the deep
// 'bootstrap/dist/js/bootstrap.bundle.min.js' path here instead (as
// before) pulled in a SECOND, separate copy of Bootstrap's JS, which
// re-registered its document-level delegated click listeners for every
// component (Dropdown, Collapse, ...) a second time -- every click ended
// up toggling twice, which looked like "the navbar dropdown only opens
// once and then won't reopen."
import 'bootstrap'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
