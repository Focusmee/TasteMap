import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userApi } from '@/api'
import { isTokenExpired } from '@/utils/token' // 使用 import 导入

export const useUserStore = defineStore('user', () => {
    const userInfo = ref(null)
    const token = ref('')

    // 登录
    const login = (userData, authToken) => {
        userInfo.value = userData
        token.value = authToken || 'mock_token_' + Date.now()
        localStorage.setItem('token', token.value)
        localStorage.setItem('userInfo', JSON.stringify(userData))
    }

    // 退出登录
    const logout = async () => {
        try {
            // 调用后端接口使token失效
            const currentToken = token.value || localStorage.getItem('token')
            if (currentToken && !currentToken.startsWith('mock_token_')) {
                // 只对真实token调用接口，mock token不需要
                try {
                    await userApi.logout()
                } catch (error) {
                    // 接口调用失败不影响本地清除
                    console.error('退出登录接口调用失败:', error)
                }
            }
        } catch (error) {
            console.error('退出登录错误:', error)
        } finally {
            // 清除本地数据
            userInfo.value = null
            token.value = ''
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
        }
    }

    // 初始化用户信息
    const initUser = () => {
        const savedToken = localStorage.getItem('token')
        const savedUserInfo = localStorage.getItem('userInfo')
        if (savedToken && savedUserInfo) {
            // 检查token是否过期
            if (!isTokenExpired(savedToken)) {
                token.value = savedToken
                userInfo.value = JSON.parse(savedUserInfo)
            } else {
                // token已过期，清除
                localStorage.removeItem('token')
                localStorage.removeItem('userInfo')
            }
        }
    }

    // 检查是否已登录
    const isAuthenticated = () => {
        return userInfo.value !== null && token.value !== ''
    }

    return {
        userInfo,
        token,
        login,
        logout,
        initUser,
        isAuthenticated
    }
})