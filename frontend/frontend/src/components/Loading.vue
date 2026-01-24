<template>
    <div v-if="visible" class="loading-overlay">
        <div class="loading-content">
            <el-icon class="loading-icon" :size="40" color="#FF9F43">
                <Loading />
            </el-icon>
            <p class="loading-text">{{ text }}</p>
        </div>
    </div>
</template>

<script setup>
defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    text: {
        type: String,
        default: '识别中...'
    }
})
</script>

<style scoped lang="scss">
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;

    .loading-content {
        text-align: center;
        color: #fff;

        .loading-icon {
            animation: rotate 1s linear infinite;
        }

        .loading-text {
            margin-top: 16px;
            font-size: 16px;
        }
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>