import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useRecognitionStore = defineStore('recognition', () => {
    const currentResult = ref(null) // 当前识别结果
    const recognitionHistory = ref([]) // 识别历史记录

    // 设置当前识别结果
    const setCurrentResult = (result) => {
        currentResult.value = result
    }

    // 添加识别记录到历史
    const addToHistory = (record) => {
        recognitionHistory.value.unshift(record)
    }

    // 清空当前结果
    const clearCurrentResult = () => {
        currentResult.value = null
    }

    return {
        currentResult,
        recognitionHistory,
        setCurrentResult,
        addToHistory,
        clearCurrentResult
    }
})