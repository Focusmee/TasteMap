<template>
    <el-alert
        v-if="visible && allergens && allergens.length > 0"
        :title="`警告：该菜品含${allergens.join('、')}，过敏者慎食`"
        type="error"
        :closable="true"
        show-icon
        class="allergen-warning"
        @close="handleClose"
    />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    allergens: {
        type: Array,
        default: () => []
    }
})

const visible = ref(true)

const handleClose = () => {
    visible.value = false
}

watch(() => props.allergens, () => {
    visible.value = true
    // 3秒后自动关闭
    setTimeout(() => {
        visible.value = false
    }, 3000)
})
</script>

<style scoped lang="scss">
.allergen-warning {
    margin-bottom: 16px;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>