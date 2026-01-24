import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
// 引入svg组件
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/styles/index.scss'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册svg全局组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')