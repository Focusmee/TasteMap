<template>
    <el-header class="navbar">
        <div class="navbar-content">
            <div class="navbar-left">
                <h1 class="logo" @click="goToHome">
                    <span class="logo-mark">🍜</span>
                    <span class="logo-text">TasteMap · 味图</span>
                </h1>

                <el-menu
                    class="nav-menu"
                    mode="horizontal"
                    :default-active="activePath"
                    :ellipsis="false"
                    @select="handleNavSelect"
                >
                    <el-menu-item index="/">🏠 首页</el-menu-item>
                    <el-menu-item index="/recognition">🔍 识别</el-menu-item>
                    <el-menu-item index="/travel">🧭 出行</el-menu-item>
                    <el-sub-menu index="health">
                        <template #title>🥗 健康</template>
                        <el-menu-item index="/recommendation">🍱 饮食推荐</el-menu-item>
                        <el-menu-item index="/diet">📅 饮食日历</el-menu-item>
                        <el-menu-item index="/knowledge">📚 知识库</el-menu-item>
                        <el-menu-item index="/chat">🤖 营养助手</el-menu-item>
                    </el-sub-menu>
                    <el-menu-item index="/history">🕘 历史</el-menu-item>
                    <el-menu-item index="/dashboard">📊 看板</el-menu-item>
                </el-menu>
            </div>
            <div class="navbar-actions">
                <el-input
                    v-model="searchText"
                    placeholder="搜索历史记录/景点"
                    class="search-input"
                    @keyup.enter="handleSearch"
                >
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
    background: linear-gradient(90deg, #fff7ef 0%, #f6fbff 50%, #ffffff 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 6px 18px rgba(17, 24, 39, 0.06);
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
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
                cursor: pointer;
                transition: transform 0.2s ease, opacity 0.2s ease;
                user-select: none;

                &:hover {
                    opacity: 0.85;
                    transform: translateY(-1px);
                }
            }

            .logo-mark {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 34px;
                height: 34px;
                border-radius: 10px;
                background: #ffffff;
                box-shadow: 0 6px 14px rgba(17, 24, 39, 0.08);
                font-size: 18px;
                line-height: 1;
                letter-spacing: 0;
                text-align: center;
                white-space: nowrap;
                font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
            }

            .logo-text {
                letter-spacing: 0.2px;
            }

            .nav-menu {
                border-bottom: none;
                background: transparent;
                gap: 6px;

                :deep(.el-menu-item) {
                    height: 64px;
                    line-height: 64px;
                    border-radius: 12px;
                    margin: 0 2px;
                    padding: 0 14px;
                    color: #374151;
                    transition: background-color 0.2s ease, color 0.2s ease;
                }

                :deep(.el-menu-item:hover) {
                    background: rgba(255, 255, 255, 0.7);
                    color: #111827;
                }

                :deep(.el-menu-item.is-active) {
                    background: rgba(59, 130, 246, 0.12);
                    color: #1d4ed8;
                    font-weight: 600;
                }

                :deep(.el-sub-menu__title) {
                    height: 64px;
                    line-height: 64px;
                    border-radius: 12px;
                    padding: 0 14px;
                    color: #374151;
                    transition: background-color 0.2s ease, color 0.2s ease;
                }

                :deep(.el-sub-menu__icon-arrow) {
                    display: none;
                }

                :deep(.el-sub-menu__title:hover) {
                    background: rgba(255, 255, 255, 0.7);
                    color: #111827;
                }

                :deep(.el-sub-menu.is-active .el-sub-menu__title) {
                    background: rgba(59, 130, 246, 0.12);
                    color: #1d4ed8;
                    font-weight: 600;
                }

                :deep(.el-menu--popup) {
                    border-radius: 12px;
                    border: 1px solid rgba(0, 0, 0, 0.06);
                    box-shadow: 0 12px 26px rgba(17, 24, 39, 0.12);
                    padding: 8px;
                }
            }
        }

        .navbar-actions {
            display: flex;
            align-items: center;
            gap: 16px;

            .search-input {
                width: 280px;
                :deep(.el-input__wrapper) {
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.9);
                    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
                }
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
                    width: 160px;
                }
            }
        }
    }
}
</style>
