import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTravelStore = defineStore('travel', () => {
    const currentPlan = ref(null) // 当前出行规划
    const travelHistory = ref([]) // 出行历史记录
    const cachedDestination = ref('') // 缓存的目的地

    // 设置当前出行规划
    const setCurrentPlan = (plan) => {
        currentPlan.value = plan
    }

    // 设置缓存目的地
    const setCachedDestination = (dest) => {
        cachedDestination.value = dest
        localStorage.setItem('cachedDestination', dest)
    }

    // 获取缓存目的地
    const getCachedDestination = () => {
        const cached = localStorage.getItem('cachedDestination')
        if (cached) {
            cachedDestination.value = cached
        }
        return cachedDestination.value
    }

    // 添加出行记录到历史
    const addToHistory = (record) => {
        travelHistory.value.unshift(record)
    }

    return {
        currentPlan,
        travelHistory,
        cachedDestination,
        setCurrentPlan,
        setCachedDestination,
        getCachedDestination,
        addToHistory
    }
})