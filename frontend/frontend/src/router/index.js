import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: 'YOLO 食行智联', requiresAuth: true }
    },
    {
        path: '/recognition',
        name: 'Recognition',
        component: () => import('@/views/Recognition.vue'),
        meta: { title: '食物识别', requiresAuth: true }
    },
    {
        path: '/travel',
        name: 'Travel',
        component: () => import('@/views/Travel.vue'),
        meta: { title: '出行规划', requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心', requiresAuth: true }
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { title: '登录', requiresAuth: false }
    },
    {
        path: '/history',
        name: 'History',
        component: () => import('@/views/History.vue'),
        meta: { title: '历史记录', requiresAuth: true }
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据看板', requiresAuth: true }
    },
    {
        path: '/recommendation',
        name: 'Recommendation',
        component: () => import('@/views/Recommendation.vue'),
        meta: { title: '饮食推荐', requiresAuth: true }
    },
    {
        path: '/diet',
        name: 'Diet',
        component: () => import('@/views/Diet.vue'),
        meta: { title: '饮食日历', requiresAuth: true }
    },
    {
        path: '/knowledge',
        name: 'Knowledge',
        component: () => import('@/views/Knowledge.vue'),
        meta: { title: '饮食知识库', requiresAuth: true }
    },
    {
        path: '/chat',
        name: 'Chat',
        component: () => import('@/views/Chat.vue'),
        meta: { title: '营养助手', requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = to.meta.title || 'YOLO 食行智联'

    // 获取用户store
    const userStore = useUserStore()

    // 检查是否需要登录
    const requiresAuth = to.meta.requiresAuth !== false // 默认为true

    // 检查登录状态（从localStorage和store双重检查，确保状态同步）
    const token = localStorage.getItem('token')
    const userInfo = localStorage.getItem('userInfo')
    const isLoggedIn = userStore.userInfo !== null && userStore.token !== '' && token && userInfo

    if (requiresAuth && !isLoggedIn) {
        // 需要登录但未登录，跳转到登录页
        next({
            name: 'Login',
            query: { redirect: to.fullPath } // 保存原始路径，登录后可以跳转回去
        })
    } else if (to.name === 'Login' && isLoggedIn) {
        // 已登录但访问登录页，跳转到首页
        next({ name: 'Home' })
    } else {
        // 允许访问
        next()
    }
})

export default router