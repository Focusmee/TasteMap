<template>
    <el-header class="navbar">
        <div class="navbar-content">
            <div class="navbar-left">
                <h1 class="logo" @click="goToHome">食物识别 + 出行规划</h1>

                <el-menu
                    class="nav-menu"
                    mode="horizontal"
                    :default-active="activePath"
                    :ellipsis="false"
                    @select="handleNavSelect"
                >
                    <el-menu-item index="/">首页</el-menu-item>
                    <el-menu-item index="/recognition">识别</el-menu-item>
                    <el-menu-item index="/travel">出行</el-menu-item>
                    <el-sub-menu index="health">
                        <template #title>健康</template>
                        <el-menu-item index="/recommendation">饮食推荐</el-menu-item>
                        <el-menu-item index="/diet">饮食日历</el-menu-item>
                        <el-menu-item index="/knowledge">知识库</el-menu-item>
                        <el-menu-item index="/chat">营养助手</el-menu-item>
                    </el-sub-menu>
                    <el-menu-item index="/history">历史</el-menu-item>
                    <el-menu-item index="/dashboard">看板</el-menu-item>
                </el-menu>
            </div>
            <div class="navbar-actions">
                <el-input v-model="searchText" placeholder="搜索历史记录/景点" class="search-input" @keyup.enter="handleSearch">
                    <template #prefix>
                        <el-icon>
                            <Search />
                        </el-icon>
                    </template>
                </el-input>
                <el-button v-if="userStore.userInfo" type="text" @click="goToProfile">
                    <el-avatar :size="32" :src="avatarUrl">
                        {{ userStore.userInfo.nickname?.[0] || 'U' }}
                    </el-avatar>
                </el-button>
                <el-button v-else type="primary" size="small" @click="$router.push('/login')">
                    登录
                </el-button>
            </div>
        </div>
    </el-header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Search } from '@element-plus/icons-vue'
import { serverConfig } from '@/utils/ipconfig'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const searchText = ref('')

const activePath = computed(() => route.path)

// 计算头像URL
const avatarUrl = computed(() => {
    const avatar = userStore.userInfo?.avatar
    if (!avatar) return ''
    return `${serverConfig.baseURL}${avatar}`
})

const goToHome = () => {
    router.push('/')
}

const handleNavSelect = (index) => {
    if (index && index !== route.path) {
        router.push(index)
    }
}

const handleSearch = () => {
    if (searchText.value.trim()) {
        router.push({
            name: 'History',
            query: { keyword: searchText.value }
        })
    }
}

const goToProfile = () => {
    router.push('/profile')
}
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.navbar {
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 0;
    height: 64px !important;
    line-height: 64px;
    width: 100%;

    .navbar-content {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 0 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 100%;

        .navbar-left {
            display: flex;
            align-items: center;
            gap: 24px;

            .logo {
                font-size: 20px;
                font-weight: bold;
                color: $primary-color;
                margin: 0;
                cursor: pointer;
                transition: opacity 0.3s;
                user-select: none;

                &:hover {
                    opacity: 0.8;
                }
            }

            .nav-menu {
                border-bottom: none;
                background: transparent;

                :deep(.el-menu-item) {
                    height: 64px;
                    line-height: 64px;
                }
            }
        }

        .navbar-actions {
            display: flex;
            align-items: center;
            gap: 16px;

            .search-input {
                width: 300px;
            }
        }
    }
}

@media (max-width: 768px) {
    .navbar {
        .navbar-content {
            padding: 0 20px;

            .nav-menu {
                display: none;
            }

            .logo {
                font-size: 16px;
            }

            .navbar-actions {
                .search-input {
                    width: 150px;
                }
            }
        }
    }
}
</style>