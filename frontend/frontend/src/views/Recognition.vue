<template>
    <div class="recognition">
        <NavBar />
        <div class="recognition-content">
            <el-card class="camera-card">
                <template #header>
                    <div class="card-header">
                        <span>食物识别</span>
                    </div>
                </template>

                <div class="camera-area">
                    <div v-if="!capturedImage" class="camera-preview">
                        <video ref="videoRef" autoplay playsinline class="video-preview"></video>
                        <div class="camera-actions">
                            <el-button type="primary" :icon="Camera" circle size="large" @click="capturePhoto"
                                :disabled="!streamActive" />
                            <el-button :icon="Upload" circle @click="triggerFileInput" />
                        </div>
                    </div>

                    <div v-else class="captured-image">
                        <img :src="capturedImage" alt="captured" />
                        <div class="image-actions">
                            <el-button @click="resetCamera">重新拍摄</el-button>
                            <el-button type="primary" @click="startRecognition">开始识别</el-button>
                        </div>
                    </div>

                    <input ref="fileInputRef" type="file" accept="image/*" style="display: none"
                        @change="handleFileUpload" />
                </div>
            </el-card>

            <!-- 识别结果 -->
            <div v-if="recognitionResult" class="result-area">
                <AllergenWarning :allergens="recognitionResult.rec_result.allergens" />

                <el-card>
                    <h2 class="food-name">{{ recognitionResult.rec_result.food_name }}</h2>

                    <div class="result-cards">
                        <el-card class="info-card">
                            <h4>成分清单</h4>
                            <div class="ingredients">
                                <el-tag v-for="(ingredient, index) in recognitionResult.rec_result.ingredients"
                                    :key="index" style="margin: 4px">
                                    {{ ingredient }}
                                </el-tag>
                            </div>
                        </el-card>

                        <el-card class="info-card">
                            <h4>过敏原提示</h4>
                            <div v-if="recognitionResult.rec_result.allergens.length > 0">
                                <el-tag v-for="(allergen, index) in recognitionResult.rec_result.allergens" :key="index"
                                    type="danger" style="margin: 4px">
                                    {{ allergen }}
                                </el-tag>
                            </div>
                            <span v-else style="color: #67c23a">无过敏原</span>
                        </el-card>

                        <el-card class="info-card">
                            <h4>营养信息</h4>
                            <div v-if="recognitionResult.rec_result.nutrition">
                                <el-descriptions :column="2" size="small" border>
                                    <el-descriptions-item label="热量">
                                        {{ recognitionResult.rec_result.nutrition.calorie_kcal ?? recognitionResult.rec_result.calorie ?? '--' }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="蛋白质">
                                        {{ formatGram(recognitionResult.rec_result.nutrition.protein_g) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="脂肪">
                                        {{ formatGram(recognitionResult.rec_result.nutrition.fat_g) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="碳水">
                                        {{ formatGram(recognitionResult.rec_result.nutrition.carb_g) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item v-if="recognitionResult.rec_result.nutrition.sodium_mg != null" label="钠">
                                        {{ formatMg(recognitionResult.rec_result.nutrition.sodium_mg) }}
                                    </el-descriptions-item>
                                </el-descriptions>
                            </div>
                            <div v-else>
                                <p class="calorie">{{ recognitionResult.rec_result.calorie || '--' }}</p>
                                <div class="muted">（模型未提供 nutrition 字段时仅显示热量）</div>
                            </div>
                        </el-card>

                        <el-card class="info-card">
                            <h4>Top-{{ (recognitionResult.rec_result.topk || []).length || 5 }} 候选</h4>
                            <div v-if="(recognitionResult.rec_result.topk || []).length > 0" class="topk-list">
                                <div v-for="(it, idx) in recognitionResult.rec_result.topk" :key="idx" class="topk-item">
                                    <div class="topk-row">
                                        <span class="topk-name">{{ idx + 1 }}. {{ it.name }}</span>
                                        <span class="topk-score">{{ formatTopkScore(it) }}</span>
                                    </div>
                                    <el-progress :percentage="toPercent(it)" :stroke-width="10" :show-text="false" />
                                </div>
                            </div>
                            <div v-else class="muted">暂无候选结果</div>
                        </el-card>

                        <el-card class="info-card">
                            <h4>健康建议</h4>
                            <div v-if="(recognitionResult.rec_result.health_tips || []).length > 0" class="tips">
                                <el-tag
                                    v-for="(tip, index) in recognitionResult.rec_result.health_tips"
                                    :key="index"
                                    type="success"
                                    style="margin: 4px"
                                >
                                    {{ tip }}
                                </el-tag>
                            </div>
                            <div v-else class="muted">暂无健康建议（可在模型侧补充 health_tips）</div>
                        </el-card>
                    </div>

                    <div class="action-buttons">
                        <el-button type="primary" size="large" style="width: 100%; margin-top: 24px; margin-left: 5px"
                            @click="generateTravelPlan" :loading="isGeneratingPlan">
                            <el-icon>
                                <Guide />
                            </el-icon>
                            生成出行计划
                        </el-button>
                        <el-button size="large" style="width: 100%; margin-top: 12px;" @click="goToTravel">
                            手动规划出行
                        </el-button>
                    </div>
                </el-card>
            </div>
        </div>

        <Loading :visible="isRecognizing" text="识别中..." />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, Upload, Guide } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import Loading from '@/components/Loading.vue'
import AllergenWarning from '@/components/AllergenWarning.vue'
import { useRecognitionStore } from '@/stores/recognition'
import { useTravelStore } from '@/stores/travel'
import { recognitionApi, travelApi } from '@/api'
import { getCurrentLocation, formatLocation } from '@/utils/location'

const router = useRouter()
const recognitionStore = useRecognitionStore()
const travelStore = useTravelStore()

const videoRef = ref(null)
const fileInputRef = ref(null)
const streamActive = ref(false)
const capturedImage = ref('')
const recognitionResult = ref(null)
const isRecognizing = ref(false)
const isGeneratingPlan = ref(false)
let mediaStream = null

// ===== 显示辅助 =====
const formatGram = (v) => {
    if (v == null || v === '') return '--'
    const n = Number(v)
    if (Number.isFinite(n)) return `${n.toFixed(1)} g`
    return String(v)
}

const formatMg = (v) => {
    if (v == null || v === '') return '--'
    const n = Number(v)
    if (Number.isFinite(n)) return `${n.toFixed(0)} mg`
    return String(v)
}

const formatTopkScore = (it) => {
    if (it?.prob != null && Number.isFinite(Number(it.prob))) {
        return `${(Number(it.prob) * 100).toFixed(1)}%`
    }
    if (it?.score != null && Number.isFinite(Number(it.score))) {
        return Number(it.score).toFixed(3)
    }
    return '--'
}

const toPercent = (it) => {
    if (it?.prob != null && Number.isFinite(Number(it.prob))) {
        return Math.round(Number(it.prob) * 100)
    }
    const score = Number(it?.score)
    const list = recognitionResult.value?.rec_result?.topk || []
    const scores = list.map(x => Number(x?.score)).filter(n => Number.isFinite(n))
    if (!scores.length || !Number.isFinite(score)) return 0
    const max = Math.max(...scores)
    const min = Math.min(...scores)
    if (max === min) return 100
    return Math.max(0, Math.min(100, Math.round(((score - min) / (max - min)) * 100)))
}

// 启动摄像头
const startCamera = async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        })
        if (videoRef.value) {
            videoRef.value.srcObject = mediaStream
            streamActive.value = true
        }
    } catch (error) {
        ElMessage.error('无法访问摄像头，请检查权限设置')
        console.error('Camera error:', error)
    }
}

// 拍摄照片
const capturePhoto = () => {
    if (!videoRef.value) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.value, 0, 0)
    capturedImage.value = canvas.toDataURL('image/jpeg')

    // 停止摄像头
    stopCamera()
}

// 停止摄像头
const stopCamera = () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
        mediaStream = null
        streamActive.value = false
    }
}

// 重置摄像头
const resetCamera = () => {
    capturedImage.value = ''
    recognitionResult.value = null
    startCamera()
}

// 触发文件选择
const triggerFileInput = () => {
    fileInputRef.value?.click()
}

// 处理文件上传
const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
            capturedImage.value = e.target.result
            stopCamera()
        }
        reader.readAsDataURL(file)
    }
}

// 开始识别
const startRecognition = async () => {
    if (!capturedImage.value) {
        ElMessage.warning('请先拍摄或上传图片')
        return
    }

    isRecognizing.value = true
    try {
        // 将base64转换为File对象用于模拟API
        const blob = await fetch(capturedImage.value).then(r => r.blob())
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })

        const response = await recognitionApi.recognize(file, 5) // 5 是 topk
        if (response.success) {
            recognitionResult.value = response.data
            recognitionStore.setCurrentResult(response.data)
        }
    } catch (error) {
        ElMessage.error('识别失败，请重试')
        console.error('Recognition error:', error)
    } finally {
        isRecognizing.value = false
    }
}

// 提取城市名称
const extractCityName = (destination) => {
    const cityMatch = destination.match(/(.+?市)/)
    if (cityMatch) {
        return cityMatch[1]
    }
    const provinceMatch = destination.match(/(.+?省)(.+?市)/)
    if (provinceMatch) {
        return provinceMatch[1] + provinceMatch[2]
    }
    return destination
}

// 解析路线规划结果（与Travel.vue中的相同）
const parseRouteResult = (data, type) => {
    if (!data || !data.route) {
        return {
            distance: '0',
            duration: '0',
            steps: [],
            summary: '暂无路线信息'
        }
    }

    const route = data.route
    const result = {
        distance: '',
        duration: '',
        steps: [],
        summary: ''
    }

    if (type === 'transit') {
        if (route.transits && route.transits.length > 0) {
            const transit = route.transits[0]
            result.distance = transit.walking_distance || '0'
            result.duration = transit.duration || '0'
            result.summary = `公交路线：${transit.segments?.length || 0}段换乘`
        }
    } else {
        if (route.paths && route.paths.length > 0) {
            const path = route.paths[0]
            result.distance = path.distance || '0'
            result.duration = path.duration || '0'
            if (path.steps && path.steps.length > 0) {
                result.steps = path.steps.map(step => ({
                    instruction: step.instruction || '',
                    road_name: step.road || '',
                    step_distance: step.distance || '0'
                }))
            }
        }
    }

    return result
}

// 生成出行计划（自动保存）
const generateTravelPlan = async () => {
    if (!recognitionResult.value) {
        ElMessage.warning('请先完成识别')
        return
    }

    isGeneratingPlan.value = true
    try {
        ElMessage.info('正在为您生成出行计划...')

        // 1. 获取推荐信息
        const recommendRes = await travelApi.recommendPlan(recognitionResult.value.id)

        if (!recommendRes.success) {
            ElMessage.error(recommendRes.message || '获取推荐信息失败')
            return
        }

        const recommendation = recommendRes.data.recommendations
        const destination = recommendation.destination || '推荐目的地'

        // 2. 获取当前位置
        let origin = '112.925759,27.850434' // 默认坐标
        let originLocation = null
        try {
            const location = await getCurrentLocation()
            originLocation = location
            origin = formatLocation(location.lng, location.lat)
        } catch (error) {
            console.warn('获取位置失败，使用默认位置:', error)
            ElMessage.warning('获取当前位置失败，使用默认起点')
        }

        // 3. 提取城市名称用于天气查询
        const cityName = extractCityName(destination)

        // 4. 并行获取天气和路线信息
        const [weatherRes, routeRes] = await Promise.all([
            travelApi.getWeather(cityName).catch(() => ({ success: false, data: null })),
            travelApi.getRoute('driving', origin, destination, cityName).catch(() => ({ success: false, data: null }))
        ])

        // 5. 构建出行计划数据
        const planData = {
            rec_id: recognitionResult.value.id,
            plan_name: `基于"${recommendRes.data.food_name}"的出行计划`,
            destination: destination,
            origin_location: origin,
            destination_location: '',
            route_type: 'driving',
            weather_info: weatherRes.success ? weatherRes.data : {
                temperature: 20,
                weather: '晴',
                icon: 'sunny',
                tip: '天气适宜，适合出行'
            },
            route_info: routeRes.success ? parseRouteResult(routeRes.data, 'driving') : {
                distance: '0',
                duration: '0',
                steps: [],
                summary: '路线信息获取失败'
            },
            recommended_restaurants: recommendation.recommended_restaurants || [],
            attractions: recommendation.recommended_attractions || [],
            daily_budget: recommendation.estimated_budget || 200,
            total_calories: recommendation.estimated_calories || recommendRes.data.calories * 2,
            plan_days: 1,
            plan_summary: `基于识别菜品"${recommendRes.data.food_name}"自动生成的出行计划，推荐前往${destination}体验相关美食文化。`
        }

        // 6. 保存到数据库
        const saveRes = await travelApi.savePlan(planData)

        if (saveRes.success) {
            ElMessage.success('出行计划已自动生成并保存！')
            // 可以选择跳转到历史记录页面查看
            setTimeout(() => {
                router.push('/history')
            }, 1500)
        } else {
            ElMessage.error(saveRes.message || '保存出行计划失败')
        }
    } catch (error) {
        console.error('Generate travel plan error:', error)
        ElMessage.error('生成出行计划失败，请重试')
    } finally {
        isGeneratingPlan.value = false
    }
}

// 跳转到出行页面
const goToTravel = () => {
    router.push('/travel')
}

onMounted(() => {
    startCamera()
})

onUnmounted(() => {
    stopCamera()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.recognition {
    min-height: 100vh;
    background: $bg-color;

    .recognition-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 20px;

        .camera-card {
            margin-bottom: 24px;

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .camera-area {
                .camera-preview {
                    position: relative;
                    width: 100%;
                    padding-bottom: 75%; // 4:3 比例
                    background: #000;
                    border-radius: 8px;
                    overflow: hidden;

                    .video-preview {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }

                    .camera-actions {
                        position: absolute;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        display: flex;
                        gap: 16px;
                        align-items: center;
                    }
                }

                .captured-image {
                    img {
                        width: 100%;
                        border-radius: 8px;
                    }

                    .image-actions {
                        margin-top: 16px;
                        display: flex;
                        gap: 16px;
                        justify-content: center;
                    }
                }
            }
        }

        .result-area {
            .food-name {
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 24px;
                color: $text-primary;
            }

            .result-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 24px;

                .info-card {
                    h4 {
                        margin: 0 0 12px;
                        color: $text-primary;
                    }

                    .ingredients {
                        display: flex;
                        flex-wrap: wrap;
                    }

                    .calorie {
                        font-size: 18px;
                        font-weight: bold;
                        color: $primary-color;
                        margin: 0;
                    }

                    .muted {
                        color: $text-secondary;
                        font-size: 12px;
                        margin-top: 8px;
                    }

                    .topk-list {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .topk-item {
                        .topk-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 6px;
                        }

                        .topk-name {
                            font-size: 13px;
                            color: $text-primary;
                        }

                        .topk-score {
                            font-size: 12px;
                            color: $text-secondary;
                        }
                    }
                }
            }

            .recommend {
                text-align: center;
                margin: 24px 0;
            }

            .action-buttons {
                margin-top: 24px;
            }
        }
    }
}
</style>