<template>
    <div class="history">
        <NavBar />
        <div class="history-content">
            <el-card>
                <template #header>
                    <div class="header-content">
                        <h2>历史记录</h2>
                        <el-input v-model="keyword" placeholder="搜索关键词" style="width: 300px" clearable
                            @keyup.enter="loadHistory" @clear="loadHistory">
                            <template #prefix>
                                <el-icon>
                                    <Search />
                                </el-icon>
                            </template>
                        </el-input>
                    </div>
                </template>

                <el-tabs v-model="activeTab" @tab-change="handleTabChange">
                    <el-tab-pane label="识别记录" name="recognition">
                        <div v-loading="loading">
                            <el-empty v-if="!loading && recognitionList.length === 0" description="暂无识别记录" />
                            <div v-else class="history-list">
                                <el-card v-for="item in recognitionList" :key="item.id" class="history-item"
                                    shadow="hover">
                                    <div class="item-content">
                                        <img :src="getImageUrl(item.img_url)" alt="" class="item-image" />
                                        <div class="item-info" style="flex: 1;">
                                            <h3>{{ item.rec_result?.food_name || '未知菜品' }}</h3>
                                            <p class="item-time">{{ formatTime(item.create_time) }}</p>
                                            <div class="item-tags">
                                                <el-tag v-for="(allergen, index) in (item.rec_result?.allergens || [])"
                                                    :key="index" type="danger" size="small" style="margin-left: 8px">
                                                    {{ allergen }}
                                                </el-tag>
                                            </div>
                                            <p class="item-calorie">{{ item.rec_result?.calorie || '未知' }}</p>
                                        </div>
                                        <!-- 收藏按钮 -->
                                        <el-button :type="item.isCollected ? 'warning' : 'default'" :icon="Star" circle
                                            size="small" @click.stop="toggleCollection('rec', item.id, item)"
                                            style="margin-left: 12px; flex-shrink: 0;" />
                                    </div>
                                </el-card>
                            </div>

                            <el-pagination v-if="recognitionTotal > 0" v-model:current-page="recognitionPage"
                                :page-size="pageSize" :total="recognitionTotal" layout="prev, pager, next"
                                @current-change="loadHistory" style="margin-top: 24px; justify-content: center" />
                        </div>
                    </el-tab-pane>

                    <el-tab-pane label="出行规划" name="travel">
                        <div v-loading="loading">
                            <!-- 一键清空按钮 -->
                            <div v-if="travelList.length > 0" style="margin-bottom: 16px; text-align: right;">
                                <el-button type="danger" @click="handleClearAll" :loading="clearing">
                                    <el-icon>
                                        <Delete />
                                    </el-icon>
                                    一键清空
                                </el-button>
                            </div>

                            <el-empty v-if="!loading && travelList.length === 0" description="暂无出行规划" />
                            <div v-else class="history-list">
                                <el-card v-for="item in travelList" :key="item.id" class="history-item" shadow="hover"
                                    @click="showPlanDetail(item.id)" style="cursor: pointer;">
                                    <div class="item-content">
                                        <div class="item-info" style="width: 100%;">
                                            <div
                                                style="display: flex; justify-content: space-between; align-items: start;">
                                                <div style="flex: 1;">
                                                    <h3>{{ item.plan_name || item.destination }}</h3>
                                                    <p class="item-time">{{ formatTime(item.create_time) }}</p>

                                                    <div class="travel-info">
                                                        <p v-if="item.weather_info?.weather">
                                                            <strong>天气：</strong>
                                                            <span>{{ item.weather_info.weather }} {{
                                                                item.weather_info.temperature
                                                            }}℃</span>
                                                        </p>
                                                        <p
                                                            v-if="item.route_info?.distance || item.route_info?.duration">
                                                            <strong>路线：</strong>
                                                            <span>{{ getRouteTypeName(item.route_type) }}</span>
                                                            <span v-if="item.route_info.distance"
                                                                style="margin-left: 8px;">
                                                                距离：{{ formatDistance(item.route_info.distance) }}
                                                            </span>
                                                        </p>
                                                        <p v-if="item.daily_budget > 0">
                                                            <strong>预算：</strong>¥{{ item.daily_budget }}/天
                                                        </p>
                                                        <p v-if="item.total_calories > 0">
                                                            <strong>卡路里：</strong>{{ item.total_calories }}大卡
                                                        </p>
                                                        <div v-if="item.attractions && item.attractions.length > 0"
                                                            style="margin-top: 8px;">
                                                            <strong>推荐景点：</strong>
                                                            <el-tag v-for="attr in item.attractions.slice(0, 3)"
                                                                :key="attr.name" size="small" style="margin-left: 4px;"
                                                                type="success">
                                                                {{ attr.name }}
                                                            </el-tag>
                                                        </div>
                                                        <div v-if="item.recommended_restaurants && item.recommended_restaurants.length > 0"
                                                            style="margin-top: 8px;">
                                                            <strong>推荐餐厅：</strong>
                                                            <el-tag
                                                                v-for="rest in item.recommended_restaurants.slice(0, 3)"
                                                                :key="rest.name" size="small" style="margin-left: 4px;"
                                                                type="warning">
                                                                {{ rest.name }}
                                                            </el-tag>
                                                        </div>
                                                    </div>
                                                </div>
                                                <!-- 操作按钮组 -->
                                                <div
                                                    style="display: flex; gap: 8px; margin-left: 12px; flex-shrink: 0;">
                                                    <el-button :type="item.isCollected ? 'warning' : 'default'"
                                                        :icon="Star" circle size="small"
                                                        @click.stop="toggleCollection('travel', item.id, item)" />
                                                    <el-button type="danger" :icon="Delete" circle size="small"
                                                        @click.stop="handleDelete(item.id, item.plan_name || item.destination)" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </el-card>
                            </div>

                            <el-pagination v-if="travelTotal > 0" v-model:current-page="travelPage"
                                :page-size="pageSize" :total="travelTotal" layout="prev, pager, next"
                                @current-change="loadHistory" style="margin-top: 24px; justify-content: center" />
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </el-card>
        </div>

        <!-- 出行计划详情对话框 -->
        <el-dialog v-model="detailDialogVisible" title="出行计划详情" width="80%" :close-on-click-modal="false">
            <div v-loading="detailLoading" class="plan-detail">
                <div v-if="planDetail" class="detail-content">
                    <!-- 基本信息 -->
                    <el-card class="detail-section" shadow="never">
                        <template #header>
                            <h3>基本信息</h3>
                        </template>
                        <el-descriptions :column="2" border>
                            <el-descriptions-item label="计划名称">{{ planDetail.plan_name || planDetail.destination
                                }}</el-descriptions-item>
                            <el-descriptions-item label="目的地">{{ planDetail.destination }}</el-descriptions-item>
                            <el-descriptions-item label="路线类型">{{ getRouteTypeName(planDetail.route_type)
                                }}</el-descriptions-item>
                            <el-descriptions-item label="计划天数">{{ planDetail.plan_days }}天</el-descriptions-item>
                            <el-descriptions-item label="创建时间">{{ formatTime(planDetail.create_time)
                                }}</el-descriptions-item>
                            <el-descriptions-item label="起点位置" :span="2">
                                {{ formatLocation(planDetail.origin_location) || '未设置' }}
                            </el-descriptions-item>
                            <el-descriptions-item label="目的地位置" :span="2">
                                {{ formatLocation(planDetail.destination_location) || '未设置' }}
                            </el-descriptions-item>
                            <el-descriptions-item label="计划摘要" :span="2">
                                {{ planDetail.plan_summary || '暂无摘要' }}
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>

                    <!-- 关联识别记录 -->
                    <el-card v-if="planDetail.rec_result" class="detail-section" shadow="never">
                        <template #header>
                            <h3>关联识别记录</h3>
                        </template>
                        <div class="recognition-info">
                            <div v-if="planDetail.img_url" class="recognition-image">
                                <img :src="getImageUrl(planDetail.img_url)" alt="识别图片" />
                            </div>
                            <div class="recognition-details">
                                <h4>{{ planDetail.rec_result.food_name || '未知菜品' }}</h4>
                                <p v-if="planDetail.rec_result.ingredients">
                                    <strong>成分：</strong>
                                    <el-tag v-for="(ingredient, index) in planDetail.rec_result.ingredients"
                                        :key="index" size="small" style="margin-left: 4px;">
                                        {{ ingredient }}
                                    </el-tag>
                                </p>
                                <p v-if="planDetail.rec_result.allergens && planDetail.rec_result.allergens.length > 0">
                                    <strong>过敏原：</strong>
                                    <el-tag v-for="(allergen, index) in planDetail.rec_result.allergens" :key="index"
                                        type="danger" size="small" style="margin-left: 4px;">
                                        {{ allergen }}
                                    </el-tag>
                                </p>
                                <p v-if="planDetail.rec_result.calorie">
                                    <strong>热量：</strong>{{ planDetail.rec_result.calorie }}
                                </p>
                                <p v-if="planDetail.rec_create_time">
                                    <strong>识别时间：</strong>{{ formatTime(planDetail.rec_create_time) }}
                                </p>
                            </div>
                        </div>
                    </el-card>

                    <!-- 天气信息 -->
                    <el-card v-if="planDetail.weather_info" class="detail-section" shadow="never">
                        <template #header>
                            <h3>天气信息</h3>
                        </template>
                        <div class="weather-display">
                            <div class="weather-main">
                                <span class="weather-emoji">{{ getWeatherIcon(planDetail.weather_info.icon) }}</span>
                                <div class="weather-text">
                                    <div class="temperature">{{ planDetail.weather_info.temperature }}℃</div>
                                    <div class="weather-desc">{{ planDetail.weather_info.weather }}</div>
                                    <div class="weather-tip">{{ planDetail.weather_info.tip }}</div>
                                </div>
                            </div>
                            <el-descriptions v-if="planDetail.weather_info.winddir" :column="3" border>
                                <el-descriptions-item label="风向">{{ planDetail.weather_info.winddir
                                }}</el-descriptions-item>
                                <el-descriptions-item label="风力">{{ planDetail.weather_info.windpower
                                }}级</el-descriptions-item>
                                <el-descriptions-item label="湿度">{{ planDetail.weather_info.humidity
                                }}%</el-descriptions-item>
                            </el-descriptions>
                        </div>
                    </el-card>

                    <!-- 路线信息 -->
                    <el-card v-if="planDetail.route_info" class="detail-section" shadow="never">
                        <template #header>
                            <h3>路线信息</h3>
                        </template>
                        <div class="route-display">
                            <el-descriptions :column="2" border>
                                <el-descriptions-item label="路线类型">{{ getRouteTypeName(planDetail.route_type)
                                }}</el-descriptions-item>
                                <el-descriptions-item label="距离">
                                    {{ planDetail.route_info.distance ? formatDistance(planDetail.route_info.distance) :
                                        '未知' }}
                                </el-descriptions-item>
                                <el-descriptions-item label="路线摘要" :span="2">
                                    {{ planDetail.route_info.summary || '暂无摘要' }}
                                </el-descriptions-item>
                            </el-descriptions>

                            <!-- 路线步骤 -->
                            <div v-if="planDetail.route_info.steps && planDetail.route_info.steps.length > 0"
                                class="route-steps">
                                <h4>详细路线指引</h4>
                                <!-- 显示前5步或全部步骤（根据展开状态） -->
                                <div v-for="(step, index) in displayedSteps" :key="index" class="route-step">
                                    <div class="step-number">{{ index + 1 }}</div>
                                    <div class="step-content">
                                        <div class="step-instruction">{{ step.instruction }}</div>
                                        <div v-if="step.road_name" class="step-road">道路：{{ step.road_name }}</div>
                                    </div>
                                </div>

                                <!-- 展开/收起按钮 -->
                                <div v-if="planDetail.route_info.steps.length > 5" class="expand-button">
                                    <el-button type="primary" link @click="toggleRouteSteps">
                                        {{ showAllSteps ? '收起' : `展开全部（共${planDetail.route_info.steps.length}步）` }}
                                        <el-icon style="margin-left: 4px;">
                                            <component :is="showAllSteps ? 'ArrowUp' : 'ArrowDown'" />
                                        </el-icon>
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </el-card>

                    <!-- 推荐景点 -->
                    <el-card v-if="planDetail.attractions && planDetail.attractions.length > 0" class="detail-section"
                        shadow="never">
                        <template #header>
                            <h3>推荐景点</h3>
                        </template>
                        <div class="attractions-list">
                            <el-card v-for="(attr, index) in planDetail.attractions" :key="index"
                                class="attraction-item" shadow="hover">
                                <h4>{{ attr.name }}</h4>
                                <p><strong>地址：</strong>{{ attr.address }}</p>
                                <p><strong>门票：</strong>¥{{ attr.ticket_price || 0 }}</p>
                                <p><strong>开放时间：</strong>{{ attr.open_time || '未知' }}</p>
                            </el-card>
                        </div>
                    </el-card>

                    <!-- 推荐餐厅 -->
                    <el-card v-if="planDetail.recommended_restaurants && planDetail.recommended_restaurants.length > 0"
                        class="detail-section" shadow="never">
                        <template #header>
                            <h3>推荐餐厅</h3>
                        </template>
                        <div class="restaurants-list">
                            <el-card v-for="(rest, index) in planDetail.recommended_restaurants" :key="index"
                                class="restaurant-item" shadow="hover">
                                <h4>{{ rest.name }}</h4>
                                <p><strong>地址：</strong>{{ rest.address }}</p>
                                <p><strong>人均消费：</strong>¥{{ rest.avg_price || 0 }}</p>
                                <p v-if="rest.recommended_dishes">
                                    <strong>推荐菜品：</strong>
                                    <el-tag v-for="(dish, idx) in rest.recommended_dishes" :key="idx" size="small"
                                        style="margin-left: 4px;">
                                        {{ dish }}
                                    </el-tag>
                                </p>
                            </el-card>
                        </div>
                    </el-card>

                    <!-- 预算和卡路里 -->
                    <el-card class="detail-section" shadow="never">
                        <template #header>
                            <h3>预算与卡路里</h3>
                        </template>
                        <el-descriptions :column="2" border>
                            <el-descriptions-item label="每日预算">¥{{ planDetail.daily_budget || 0
                            }}</el-descriptions-item>
                            <el-descriptions-item label="总卡路里">{{ planDetail.total_calories || 0
                            }}大卡</el-descriptions-item>
                        </el-descriptions>
                    </el-card>
                </div>
            </div>
            <template #footer>
                <el-button @click="detailDialogVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, ArrowDown, ArrowUp, Delete, Star } from '@element-plus/icons-vue'
import NavBar from '@/components/NavBar.vue'
import { recognitionApi, travelApi } from '@/api'
import { formatTime } from '@/utils/dayjs'
import { collectionApi } from '@/api'
import { serverConfig } from '@/utils/ipconfig'

const clearing = ref(false) // 清空操作loading状态

const route = useRoute()

const activeTab = ref('recognition')
const keyword = ref(route.query.keyword || '')
const loading = ref(false)
const recognitionList = ref([])
const travelList = ref([])
const recognitionPage = ref(1)
const travelPage = ref(1)
const recognitionTotal = ref(0)
const travelTotal = ref(0)
const pageSize = 10

// 详情对话框相关
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const planDetail = ref(null)
const showAllSteps = ref(false) // 控制是否展开所有路线步骤

// 存储收藏状态
const collectedMap = ref({})

// 切换收藏状态
const toggleCollection = async (coll_type, target_id, item) => {
    try {
        if (item.isCollected) {
            // 取消收藏
            const response = await collectionApi.remove(coll_type, target_id)
            if (response.success) {
                item.isCollected = false
                ElMessage.success('已取消收藏')
            } else {
                ElMessage.error(response.message || '取消收藏失败')
            }
        } else {
            // 添加收藏
            const response = await collectionApi.add(coll_type, target_id)
            if (response.success) {
                item.isCollected = true
                ElMessage.success('收藏成功')
            } else {
                ElMessage.error(response.message || '收藏失败')
            }
        }
    } catch (error) {
        console.error('Toggle collection error:', error)
        ElMessage.error('操作失败，请重试')
    }
}

// 检查收藏状态
const checkCollectionStatus = async (coll_type, target_id, item) => {
    try {
        const response = await collectionApi.check(coll_type, target_id)
        if (response.success) {
            item.isCollected = response.data.isCollected
        }
    } catch (error) {
        console.error('Check collection status error:', error)
    }
}

// 删除单条记录
const handleDelete = async (planId, planName) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除出行计划"${planName}"吗？`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )

        const response = await travelApi.deletePlan(planId)

        if (response.success) {
            ElMessage.success('删除成功')
            // 重新加载列表
            await loadHistory()
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('Delete plan error:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 清空所有记录
const handleClearAll = async () => {
    try {
        await ElMessageBox.confirm(
            '确定要清空所有出行规划记录吗？此操作不可恢复！',
            '确认清空',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
                dangerouslyUseHTMLString: false
            }
        )

        clearing.value = true
        const response = await travelApi.clearAllPlans()

        if (response.success) {
            ElMessage.success('清空成功')
            // 重新加载列表
            await loadHistory()
        } else {
            ElMessage.error(response.message || '清空失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('Clear all error:', error)
            ElMessage.error('清空失败')
        }
    } finally {
        clearing.value = false
    }
}

// 格式化坐标（保留4位小数）
const formatLocation = (location) => {
    if (!location) return ''

    // 如果是经纬度格式（包含逗号），格式化坐标
    if (location.includes(',')) {
        const [lng, lat] = location.split(',')
        const formattedLng = parseFloat(lng).toFixed(4)
        const formattedLat = parseFloat(lat).toFixed(4)
        return `${formattedLng}, ${formattedLat}`
    }

    // 如果不是坐标格式，直接返回
    return location
}

// 计算显示的路线步骤
const displayedSteps = computed(() => {
    if (!planDetail.value || !planDetail.value.route_info || !planDetail.value.route_info.steps) {
        return []
    }

    const steps = planDetail.value.route_info.steps

    // 如果步骤数小于等于5或已展开，显示全部
    if (steps.length <= 5 || showAllSteps.value) {
        return steps
    }

    // 否则只显示前5步
    return steps.slice(0, 5)
})

// 切换路线步骤展开/收起
const toggleRouteSteps = () => {
    showAllSteps.value = !showAllSteps.value
}

// 显示出行计划详情
const showPlanDetail = async (planId) => {
    detailDialogVisible.value = true
    detailLoading.value = true
    planDetail.value = null
    showAllSteps.value = false // 重置展开状态

    try {
        const response = await travelApi.getPlanDetail(planId)
        if (response.success) {
            planDetail.value = response.data
        } else {
            ElMessage.error(response.message || '获取详情失败')
            detailDialogVisible.value = false
        }
    } catch (error) {
        console.error('Get plan detail error:', error)
        ElMessage.error('获取详情失败')
        detailDialogVisible.value = false
    } finally {
        detailLoading.value = false
    }
}

// 获取图片完整URL
const getImageUrl = (imgUrl) => {
    if (!imgUrl) return ''
    if (imgUrl.startsWith('https')) {
        return imgUrl
    }
    if (imgUrl.startsWith('/uploads')) {
        return `${serverConfig.baseURL}${imgUrl}`
    }
    return `${serverConfig.baseURL}${imgUrl}`
}

// 获取天气图标
const getWeatherIcon = (iconType) => {
    const iconMap = {
        'sunny': '☀️',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'snowy': '❄️',
        'windy': '💨'
    }
    return iconMap[iconType] || '🌤️'
}

// 获取路线类型名称
const getRouteTypeName = (type) => {
    const nameMap = {
        'driving': '驾车',
        'walking': '步行',
        'bicycling': '骑行',
        'transit': '公交'
    }
    return nameMap[type] || '路线'
}

// 格式化距离
const formatDistance = (distance) => {
    const dist = parseInt(distance)
    if (dist < 1000) {
        return `${dist}米`
    } else {
        return `${(dist / 1000).toFixed(1)}公里`
    }
}

// 格式化时长
const formatDuration = (duration) => {
    const dur = parseInt(duration)
    if (dur < 60) {
        return `${dur}秒`
    } else if (dur < 3600) {
        return `${Math.floor(dur / 60)}分钟`
    } else {
        const hours = Math.floor(dur / 3600)
        const minutes = Math.floor((dur % 3600) / 60)
        return `${hours}小时${minutes}分钟`
    }
}

// 切换标签页
const handleTabChange = (tab) => {
    if (tab === 'recognition') {
        recognitionPage.value = 1
    } else {
        travelPage.value = 1
    }
    loadHistory()
}

const loadHistory = async () => {
    loading.value = true
    try {
        if (activeTab.value === 'recognition') {
            const response = await recognitionApi.getList(recognitionPage.value, pageSize.value, keyword.value)
            if (response.success) {
                recognitionList.value = response.data.list
                recognitionTotal.value = response.data.total
                // 检查每条记录的收藏状态
                recognitionList.value.forEach(item => {
                    checkCollectionStatus('rec', item.id, item)
                })
            } else {
                ElMessage.error(response.message || '加载失败')
            }
        } else {
            const response = await travelApi.getPlans(travelPage.value, pageSize.value, '', keyword.value)
            if (response.success) {
                travelList.value = response.data.list
                travelTotal.value = response.data.total
                // 检查每条记录的收藏状态
                travelList.value.forEach(item => {
                    checkCollectionStatus('travel', item.id, item)
                })
            } else {
                ElMessage.error(response.message || '加载失败')
            }
        }
    } catch (error) {
        console.error('Load history error:', error)
        ElMessage.error('加载失败，请重试')
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadHistory()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.history {
    min-height: 100vh;
    background: $bg-color;

    .history-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 20px;

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;

            h2 {
                margin: 0;
                color: $text-primary;
            }
        }

        .history-list {
            .history-item {
                margin-bottom: 16px;
                transition: transform 0.2s;

                &:hover {
                    transform: translateY(-2px);
                }

                .item-content {
                    display: flex;
                    gap: 16px;

                    .item-image {
                        width: 120px;
                        height: 120px;
                        object-fit: cover;
                        border-radius: 8px;
                    }

                    .item-info {
                        // 确保删除按钮可见
                        position: relative;
                        flex: 1;

                        h3 {
                            margin: 0 0 8px;
                            color: $text-primary;
                        }

                        .item-time {
                            color: $text-secondary;
                            font-size: 12px;
                            margin: 0 0 12px;
                        }

                        .item-tags {
                            margin-bottom: 8px;
                        }

                        .item-calorie {
                            color: $primary-color;
                            font-weight: bold;
                            margin: 0;
                        }

                        .travel-info {
                            p {
                                margin: 8px 0;
                                color: $text-primary;
                                font-size: 14px;
                            }
                        }
                    }
                }
            }
        }
    }

    // 详情对话框样式
    .plan-detail {
        .detail-content {
            .detail-section {
                margin-bottom: 24px;

                h3 {
                    margin: 0;
                    color: $text-primary;
                }

                .recognition-info {
                    display: flex;
                    gap: 24px;

                    .recognition-image {
                        width: 200px;
                        flex-shrink: 0;

                        img {
                            width: 100%;
                            border-radius: 8px;
                        }
                    }

                    .recognition-details {
                        flex: 1;

                        h4 {
                            margin: 0 0 12px;
                            color: $text-primary;
                        }

                        p {
                            margin: 8px 0;
                            color: $text-primary;
                        }
                    }
                }

                .weather-display {
                    .weather-main {
                        display: flex;
                        align-items: center;
                        gap: 24px;
                        margin-bottom: 16px;

                        .weather-emoji {
                            font-size: 64px;
                            line-height: 1;
                        }

                        .weather-text {
                            .temperature {
                                font-size: 32px;
                                font-weight: bold;
                                color: $text-primary;
                            }

                            .weather-desc {
                                font-size: 16px;
                                color: $text-secondary;
                                margin: 8px 0;
                            }

                            .weather-tip {
                                font-size: 14px;
                                color: $primary-color;
                            }
                        }
                    }
                }

                .route-display {
                    .route-steps {
                        margin-top: 24px;

                        h4 {
                            margin: 0 0 16px;
                            color: $text-primary;
                        }

                        .route-step {
                            display: flex;
                            gap: 16px;
                            margin-bottom: 16px;
                            padding-bottom: 16px;
                            border-bottom: 1px solid #eee;

                            &:last-child {
                                border-bottom: none;
                            }

                            .step-number {
                                width: 32px;
                                height: 32px;
                                border-radius: 50%;
                                background: $primary-color;
                                color: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                flex-shrink: 0;
                            }

                            .step-content {
                                flex: 1;

                                .step-instruction {
                                    font-size: 16px;
                                    color: $text-primary;
                                    margin-bottom: 8px;
                                }

                                .step-road,
                                .step-distance {
                                    font-size: 14px;
                                    color: $text-secondary;
                                    margin-top: 4px;
                                }
                            }
                        }

                        .expand-button {
                            text-align: center;
                            margin-top: 16px;
                            padding-top: 16px;
                            border-top: 1px solid #eee;
                        }
                    }
                }

                .attractions-list,
                .restaurants-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 16px;

                    .attraction-item,
                    .restaurant-item {
                        h4 {
                            margin: 0 0 12px;
                            color: $text-primary;
                        }

                        p {
                            margin: 8px 0;
                            color: $text-primary;
                            font-size: 14px;
                        }
                    }
                }
            }
        }
    }
}

@media (max-width: 768px) {
    .history {
        .history-content {
            .header-content {
                flex-direction: column;
                gap: 16px;
                align-items: stretch;
            }
        }
    }
}
</style>