<template>
    <div class="travel">
        <NavBar />
        <div class="travel-content">
            <el-card>
                <template #header>
                    <h2>出行规划</h2>
                </template>

                <div class="destination-input">
                    <el-input v-model="destination" placeholder="请输入目的地（如：北京市动物园）" size="large"
                        @keyup.enter="loadTravelInfo">
                        <template #prepend>
                            <el-icon>
                                <Location />
                            </el-icon>
                        </template>
                        <template #append>
                            <el-button type="primary" @click="loadTravelInfo" :loading="loading">
                                查询
                            </el-button>
                        </template>
                    </el-input>
                </div>

                <!-- 起点选择 -->
                <div class="origin-selector">
                    <div class="origin-row">
                        <span class="origin-label">起点</span>
                        <el-radio-group v-model="originMode" size="small" @change="handleOriginModeChange">
                            <el-radio-button label="current">当前位置</el-radio-button>
                            <el-radio-button label="manual">手动输入</el-radio-button>
                        </el-radio-group>
                        <el-button v-if="originMode === 'current'" size="small" type="primary"
                            :loading="originLoading" @click="refreshCurrentOrigin">
                            使用当前位置
                        </el-button>
                    </div>
                    <div v-if="originMode === 'manual'" class="origin-input">
                        <el-input v-model="originInput" placeholder="请输入起点位置（如：北京站）" size="small" clearable
                            @keyup.enter="applyManualOrigin" />
                        <el-button size="small" type="primary" :loading="originLoading" @click="applyManualOrigin">
                            设为起点
                        </el-button>
                    </div>
                    <div v-if="currentLocation" class="origin-display">
                        <el-tag type="info" size="small">
                            <el-icon>
                                <LocationFilled />
                            </el-icon>
                            起点：{{ currentLocation.address || `${currentLocation.lng}, ${currentLocation.lat}` }}
                        </el-tag>
                    </div>
                </div>

                <!-- 推荐信息展示 -->
                <el-card v-if="recommendationInfo" class="recommendation-card" shadow="never">
                    <template #header>
                        <h3>基于"{{ recommendationInfo.food_name }}"的推荐</h3>
                    </template>

                    <div class="recommendation-content">
                        <div v-if="recommendationInfo.recommendations?.attractions?.length > 0"
                            class="recommendation-section">
                            <h4>推荐景点</h4>
                            <div class="tags-container">
                                <el-tag v-for="attr in recommendationInfo.recommendations.attractions" :key="attr.name"
                                    style="margin: 4px;" type="success">
                                    {{ attr.name }}
                                </el-tag>
                            </div>
                        </div>

                        <div v-if="recommendationInfo.recommendations?.restaurants?.length > 0"
                            class="recommendation-section" style="margin-top: 16px;">
                            <h4>推荐餐厅</h4>
                            <div class="tags-container">
                                <el-tag v-for="rest in recommendationInfo.recommendations.restaurants" :key="rest.name"
                                    style="margin: 4px;" type="warning">
                                    {{ rest.name }}
                                </el-tag>
                            </div>
                        </div>

                        <div class="recommendation-summary" style="margin-top: 16px;">
                            <el-text v-if="recommendationInfo.recommendations?.estimated_budget">
                                预估每日预算：¥{{ recommendationInfo.recommendations.estimated_budget }}
                            </el-text>
                            <el-text v-if="recommendationInfo.recommendations?.estimated_calories"
                                style="margin-left: 16px;">
                                预估卡路里：{{ recommendationInfo.recommendations.estimated_calories }}大卡
                            </el-text>
                        </div>
                    </div>
                </el-card>

                <!-- 路线方式选择 -->
                <div class="route-type-selector" v-if="destination">
                    <el-radio-group v-model="routeType" @change="handleRouteTypeChange" size="large">
                        <el-radio-button label="driving">
                            <el-icon>
                                <Guide />
                            </el-icon>
                            <span>驾车</span>
                        </el-radio-button>
                        <el-radio-button label="walking">
                            <el-icon>
                                <Guide />
                            </el-icon>
                            <span>步行</span>
                        </el-radio-button>
                        <el-radio-button label="bicycling">
                            <el-icon>
                                <Guide />
                            </el-icon>
                            <span>骑行</span>
                        </el-radio-button>
                        <el-radio-button label="electrobike">
                            <el-icon>
                                <Guide />
                            </el-icon>
                            <span>电动车</span>
                        </el-radio-button>
                        <el-radio-button label="transit">
                            <el-icon>
                                <Guide />
                            </el-icon>
                            <span>公交</span>
                        </el-radio-button>
                    </el-radio-group>
                </div>

                <!-- 天气信息 -->
                <el-card v-if="weatherInfo" class="info-card" shadow="never">
                    <div class="weather-content">
                        <div class="weather-icon-wrapper">
                            <span class="weather-emoji">{{ getWeatherIcon(weatherInfo.icon) }}</span>
                        </div>
                        <div class="weather-info">
                            <div class="temperature">{{ weatherInfo.temperature }}℃</div>
                            <div class="weather-text">{{ weatherInfo.weather }}</div>
                            <div class="weather-tip">{{ weatherInfo.tip }}</div>
                            <div v-if="weatherInfo.winddir" class="weather-detail">
                                <span>风向：{{ weatherInfo.winddir }}</span>
                                <span style="margin-left: 16px">风力：{{ weatherInfo.windpower }}级</span>
                                <span style="margin-left: 16px">湿度：{{ weatherInfo.humidity }}%</span>
                            </div>
                        </div>
                    </div>
                </el-card>

                <!-- 美食地图 + 天气出行建议 -->
                <el-card class="map-card" shadow="never">
                    <template #header>
                        <div class="map-header">
                            <span>美食地图</span>
                            <el-button size="small" @click="refreshNearbyRestaurants" :loading="loadingRestaurants">
                                刷新附近餐厅
                            </el-button>
                        </div>
                    </template>
                    <div class="map-layout">
                        <div ref="mapContainer" class="amap-container"></div>
                        <div class="map-panel">
                            <div class="filter-section">
                                <el-input v-model="restaurantKeyword" placeholder="搜索餐厅/菜系" size="small" clearable
                                    @keyup.enter="refreshNearbyRestaurants" />
                                <el-select v-model="selectedCategory" size="small" placeholder="分类"
                                    @change="refreshNearbyRestaurants">
                                    <el-option v-for="item in restaurantCategories" :key="item.value"
                                        :label="item.label" :value="item.value" />
                                </el-select>
                                <el-select v-model="searchRadius" size="small" placeholder="范围"
                                    @change="refreshNearbyRestaurants">
                                    <el-option label="1公里内" :value="1000" />
                                    <el-option label="2公里内" :value="2000" />
                                    <el-option label="3公里内" :value="3000" />
                                    <el-option label="5公里内" :value="5000" />
                                </el-select>
                                <el-select v-model="sortRule" size="small" placeholder="排序"
                                    @change="refreshNearbyRestaurants">
                                    <el-option label="从近到远" value="distance" />
                                    <el-option label="热度优先" value="weight" />
                                </el-select>
                                <el-button size="small" type="primary" @click="refreshNearbyRestaurants">
                                    应用筛选
                                </el-button>
                            </div>
                            <div class="rule-section">
                                <div class="rule-title">天气出行建议</div>
                                <div v-if="currentWeatherInfo" class="rule-current">
                                    <div class="rule-current-title">起点天气</div>
                                    <div class="rule-current-meta">
                                        {{ currentWeatherInfo.weather }} · {{ currentWeatherInfo.temperature }}℃
                                        <span v-if="currentWeatherInfo.winddir">
                                            · {{ currentWeatherInfo.winddir }}风 {{ currentWeatherInfo.windpower }}级
                                        </span>
                                    </div>
                                    <div v-if="currentWeatherInfo.tip" class="rule-current-tip">
                                        {{ currentWeatherInfo.tip }}
                                    </div>
                                </div>
                                <div v-if="weatherRecommendations.length" class="rule-tags">
                                    <el-tag v-for="item in weatherRecommendations" :key="item" type="info"
                                        effect="plain">
                                        {{ item }}
                                    </el-tag>
                                </div>
                                <div v-if="recommendedCategories.length" class="rule-actions">
                                    <el-button v-for="item in recommendedCategories" :key="item.value" size="small"
                                        @click="applyCategoryFilter(item.value)">
                                        推荐：{{ item.label }}
                                    </el-button>
                                </div>
                                <div v-if="!weatherSource" class="rule-empty">先获取起点天气，再给出推荐规则</div>
                            </div>
                            <div class="restaurant-section">
                                <div class="restaurant-title">附近餐厅</div>
                                <el-skeleton v-if="loadingRestaurants" :rows="4" animated />
                                <div v-else class="restaurant-list">
                                    <div v-if="nearbyRestaurants.length === 0" class="restaurant-empty">
                                        暂无附近餐厅结果
                                    </div>
                                    <div v-for="rest in nearbyRestaurants" :key="rest.id" class="restaurant-item">
                                        <div class="restaurant-name">{{ rest.name }}</div>
                                        <div class="restaurant-address">{{ rest.address || '地址未知' }}</div>
                                        <div class="restaurant-distance">
                                            {{ formatDistance(rest.distance || 0) }}
                                        </div>
                                        <div class="restaurant-actions">
                                            <el-button size="small" type="primary" link
                                                v-if="!isStopSelected(rest.id)" @click="addRestaurantStop(rest)">
                                                加入路线
                                            </el-button>
                                            <el-button size="small" type="danger" link v-else
                                                @click="removeStop(rest.id)">
                                                移除路线
                                            </el-button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="route-section">
                                <div class="route-title">路线规划</div>
                                <div class="route-actions">

                                    <div class="route-origin-toggle">
                                        <span>以起点位置为起点</span>
                                        <el-switch v-model="useCurrentLocationAsOrigin" size="small" />
                                    </div>
                                    <el-button size="small" type="primary" @click="planRestaurantRoute"
                                        :disabled="selectedStops.length === 0">
                                        规划路线
                                    </el-button>
                                    <el-button size="small" @click="clearPlannedRoute" :disabled="!routePlanned">
                                        清除路线
                                    </el-button>
                                    <el-button size="small" :type="markingMode ? 'danger' : 'default'"
                                        @click="toggleMarkingMode">
                                        {{ markingMode ? '退出标记' : '标记地点' }}
                                    </el-button>
                                </div>
                                <div class="route-hint" v-if="markingMode">点击地图添加自定义点</div>
                                <div v-if="selectedStops.length === 0" class="route-empty">
                                    选择餐厅或标记地点后即可规划路线
                                </div>
                                <div v-else class="route-stops">
                                    <div v-for="(stop, index) in selectedStops" :key="stop.id" class="route-stop">
                                        <div class="route-index">{{ index + 1 }}</div>
                                        <div class="route-info">
                                            <div class="route-name">{{ stop.name }}</div>
                                            <div class="route-address">{{ stop.address || '地址未知' }}</div>
                                        </div>
                                        <el-button size="small" link type="danger" @click="removeStop(stop.id)">
                                            移除
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-card>

                <!-- 路线信息 -->
                
                <el-card class="route-segment-panel" shadow="never" v-if="routePointList.length">
                    <template #header>
                        <div class="route-segment-header">
                            <span>路线点位</span>
                        </div>
                    </template>
                    <div class="route-flow">
                        <div v-for="(point, index) in routePointList" :key="point.id" class="route-flow-point">
                            <div class="route-point-item">
                                <div class="route-point-index">{{ index + 1 }}</div>
                                <div class="route-point-info">
                                    <div class="route-point-name">{{ point.name }}</div>
                                    <div class="route-point-address" v-if="point.address">{{ point.address }}</div>
                                </div>
                            </div>

                            <div v-if="routeSegments[index]" class="route-flow-segment">
                                <div class="route-segment-title">分段路线（点击展开步骤）</div>
                                <el-collapse v-model="activeSegmentKeys" accordion>
                                    <el-collapse-item :key="routeSegments[index].key" :name="routeSegments[index].key">
                                        <template #title>
                                            <span>{{ routeSegments[index].fromName }} -> {{ routeSegments[index].toName }}</span>
                                            <span class="route-segment-meta">{{ formatDistance(routeSegments[index].distance) }} / {{ formatDuration(routeSegments[index].duration) }}</span>
                                        </template>
                                        <div class="route-segment-steps">
                                            <div v-if="routeSegments[index].steps.length" class="route-segment-step" v-for="(step, idx) in routeSegments[index].steps" :key="idx">
                                                <span class="route-segment-step-index">{{ idx + 1 }}</span>
                                                <div class="route-segment-step-text">
                                                    <div class="route-segment-step-main">{{ step.instruction }}</div>
                                                    <div class="route-segment-step-meta">
                                                        <span v-if="step.road_name">道路：{{ step.road_name }}</span>
                                                        <span v-if="step.orientation">方向：{{ step.orientation }}</span>
                                                        <span v-if="step.step_distance">距离：{{ formatDistance(step.step_distance) }}</span>
                                                        <span v-if="step.duration">耗时：{{ formatDuration(step.duration) }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-else class="route-segment-empty">暂无分段步骤</div>
                                        </div>
                                    </el-collapse-item>
                                </el-collapse>
                            </div>
                        </div>
                    </div>
                </el-card>

                <el-card v-if="routeInfo" class="info-card" shadow="never">
                    <template #header>
                        <div class="route-header">
                            <span>{{ getRouteTypeName(routeType) }}路线</span>
                            <el-tag v-if="routeInfo.distance" type="info">
                                距离: {{ formatDistance(routeInfo.distance) }}
                            </el-tag>
                        </div>
                    </template>
                    <div class="route-content">
                        <div v-if="routeInfo.steps && routeInfo.steps.length > 0" class="route-steps">
                            <!-- 显示前5步或全部步骤（根据展开状态） -->
                            <div v-for="(step, index) in displayedSteps" :key="index" class="route-step">
                                <div class="step-number">{{ index + 1 }}</div>
                                <div class="step-content">
                                    <div class="step-instruction">{{ step.instruction }}</div>
                                    <div v-if="step.road_name" class="step-road">道路：{{ step.road_name }}</div>
                                </div>
                            </div>

                            <!-- 展开/收起按钮 -->
                            <div v-if="routeInfo.steps.length > 5" class="expand-button">
                                <el-button type="primary" link @click="toggleRouteSteps">
                                    {{ showAllSteps ? '收起' : `展开全部（共${routeInfo.steps.length}步）` }}
                                    <el-icon style="margin-left: 4px;">
                                        <component :is="showAllSteps ? 'ArrowUp' : 'ArrowDown'" />
                                    </el-icon>
                                </el-button>
                            </div>
                        </div>
                        <div v-else class="route-text">
                            {{ routeInfo.summary || '暂无详细路线信息' }}
                        </div>
                    </div>
                </el-card>

                <el-button v-if="travelPlanComplete" type="primary" size="large" style="width: 100%; margin-top: 24px"
                    @click="saveCompletePlan" :loading="saving">
                    保存出行计划
                </el-button>
            </el-card>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Location, Guide, LocationFilled, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import NavBar from '@/components/NavBar.vue'
import { useTravelStore } from '@/stores/travel'
import { useRecognitionStore } from '@/stores/recognition'
import { travelApi } from '@/api'
import { getCurrentLocation, formatLocation } from '@/utils/location'
import { loadAmapScript } from '@/utils/amap'

const router = useRouter()
const route = useRoute()
const travelStore = useTravelStore()
const recognitionStore = useRecognitionStore()

const destination = ref('')
const loading = ref(false)
const saving = ref(false)
const routeType = ref('driving')
const currentLocation = ref(null)
const originMode = ref('current')
const originInput = ref('')
const originLoading = ref(false)
const currentLocationSource = ref('current')
const resolvedManualInput = ref('')
const manualOriginCache = ref(null)
const weatherInfo = ref(null)
const currentWeatherInfo = ref(null)
const routeInfo = ref(null)
const recommendationInfo = ref(null)
const showAllSteps = ref(false) // 控制是否展开所有路线步骤
const mapContainer = ref(null)
const nearbyRestaurants = ref([])
const loadingRestaurants = ref(false)
const restaurantKeyword = ref('')
const selectedCategory = ref('')
const sortRule = ref('distance')
const selectedStops = ref([])
const markingMode = ref(false)
const routePlanned = ref(false)
const useCurrentLocationAsOrigin = ref(true)
const routeSegments = ref([])
const activeSegmentKeys = ref([])
const searchRadius = ref(2000)
let mapInstance = null
let mapInfoWindow = null
let drivingInstance = null
let geocoderInstance = null
let routeLine = null
let lastRoutePoints = null
let markerOverlays = []
let mapSearchTimer = null
let suppressMapSearchUntil = 0

const restaurantCategories = [
    { label: '全部', value: '' },
    { label: '室内餐厅', value: 'indoor' },
    { label: '轻食', value: 'light' },
    { label: '饮品/冷饮', value: 'drink' },
    { label: '火锅', value: 'hotpot' },
    { label: '汤类', value: 'soup' },
    { label: '中餐', value: 'chinese' },
    { label: '快餐', value: 'fastfood' },
    { label: '烧烤', value: 'bbq' },
    { label: '甜品', value: 'dessert' }
]

const travelPlanComplete = computed(() => {
    return weatherInfo.value && routeInfo.value
})

const weatherSource = computed(() => currentWeatherInfo.value || weatherInfo.value)

const weatherRecommendations = computed(() => {
    if (!weatherSource.value) {
        return []
    }
    const tips = []
    const weatherText = weatherSource.value.weather || ''
    const temperature = Number(weatherSource.value.temperature)

    if (weatherSource.value.icon === 'rainy' || weatherText.includes('雨')) {
        tips.push('下雨优先选择室内餐厅')
    }
    if (Number.isFinite(temperature) && temperature > 30) {
        tips.push('高温推荐冷饮/轻食类餐厅')
    }
    if (Number.isFinite(temperature) && temperature < 10) {
        tips.push('低温推荐火锅/汤类餐厅')
    }
    if (tips.length === 0) {
        tips.push('天气适中，选择步行友好餐厅')
    }
    return tips
})

const recommendedCategories = computed(() => {
    if (!weatherSource.value) {
        return []
    }
    const weatherText = weatherSource.value.weather || ''
    const temperature = Number(weatherSource.value.temperature)
    const categories = []

    if (weatherSource.value.icon === 'rainy' || weatherText.includes('雨')) {
        categories.push({ label: '室内餐厅', value: 'indoor' })
    }
    if (Number.isFinite(temperature) && temperature > 30) {
        categories.push({ label: '冷饮/轻食', value: 'drink' })
        categories.push({ label: '轻食', value: 'light' })
    }
    if (Number.isFinite(temperature) && temperature < 10) {
        categories.push({ label: '火锅', value: 'hotpot' })
        categories.push({ label: '汤类', value: 'soup' })
    }

    const unique = new Map()
    categories.forEach((item) => {
        if (!unique.has(item.value)) {
            unique.set(item.value, item)
        }
    })
    return Array.from(unique.values())
})

// 计算显示的路线步骤
const displayedSteps = computed(() => {
    if (!routeInfo.value || !routeInfo.value.steps) {
        return []
    }

    const steps = routeInfo.value.steps

    // 如果步骤数小于等于5或已展开，显示全部
    if (steps.length <= 5 || showAllSteps.value) {
        return steps
    }

    // 否则只显示前5步
    return steps.slice(0, 5)
})

// 获取路线类型名称
const getRouteTypeName = (type) => {
    const nameMap = {
        'driving': '驾车',
        'walking': '步行',
        'bicycling': '骑行',
        'electrobike': '电动车',
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

const waitForAMap = (timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const start = Date.now()
        let finished = false
        const timer = setInterval(() => {
            if (typeof AMap !== 'undefined') {
                clearInterval(timer)
                if (!finished) {
                    finished = true
                    resolve()
                }
            } else if (Date.now() - start > timeout) {
                clearInterval(timer)
                if (!finished) {
                    finished = true
                    reject(new Error('高德地图未加载'))
                }
            }
        }, 100)

        loadAmapScript()
            .then(() => {
                if (!finished) {
                    clearInterval(timer)
                    finished = true
                    resolve()
                }
            })
            .catch((error) => {
                if (!finished) {
                    clearInterval(timer)
                    finished = true
                    reject(error)
                }
            })
    })
}

const parseLocation = (location) => {
    if (!location) return null
    const [lng, lat] = location.split(',').map(Number)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null
    }
    return [lng, lat]
}

const toLngLat = (coord) => {
    if (!coord || !Array.isArray(coord)) return null
    const [lng, lat] = coord
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null
    }
    return new AMap.LngLat(lng, lat)
}

const parsePolyline = (polyline) => {
    if (!polyline || typeof polyline !== 'string') return []
    return polyline
        .split(';')
        .map(parseLocation)
        .filter(Boolean)
        .map(([lng, lat]) => new AMap.LngLat(lng, lat))
}


const markerIconCache = new Map()
const buildCircleSvg = (color) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${color}" stroke="#ffffff" stroke-width="2"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
const getCircleIcon = (color) => {
    if (markerIconCache.has(color)) return markerIconCache.get(color)
    const icon = new AMap.Icon({
        size: new AMap.Size(24, 24),
        image: buildCircleSvg(color),
        imageSize: new AMap.Size(24, 24)
    })
    markerIconCache.set(color, icon)
    return icon
}

const clearRouteOverlay = () => {
    if (drivingInstance) {
        drivingInstance.clear()
    }
    if (routeLine && mapInstance) {
        mapInstance.remove(routeLine)
    }
    routeLine = null
    lastRoutePoints = null
    routePlanned.value = false
    routeSegments.value = []
        activeSegmentKeys.value = []
}

const collectBackendRoutePoints = (routeData) => {
    const path = routeData?.route?.paths?.[0]
    if (!path || !Array.isArray(path.steps)) {
        throw new Error('Backend route data is incomplete')
    }
    const points = path.steps.flatMap(step => parsePolyline(step.polyline || ''))
    if (points.length === 0) {
        throw new Error('Route points are empty')
    }
    return points
}

const drawRouteFromPoints = (points) => {
    if (!points || points.length === 0) {
        throw new Error('Route points are empty')
    }
    lastRoutePoints = points
    routeLine = new AMap.Polyline({
        path: points,
        strokeColor: '#409EFF',
        strokeWeight: 6,
        strokeOpacity: 0.85
    })
    mapInstance.add(routeLine)
    mapInstance.setFitView([routeLine], false, [40, 40, 40, 40])
    routePlanned.value = true
}

const drawRouteFromBackend = (routeData) => {
    const points = collectBackendRoutePoints(routeData)
    drawRouteFromPoints(points)
}

const toRadians = (value) => (value * Math.PI) / 180

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const calcDistanceMeters = (lng1, lat1, lng2, lat2) => {
    const earthRadius = 6371000
    const dLat = toRadians(lat2 - lat1)
    const dLng = toRadians(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadius * c
}

const getRadiusFromMap = () => {
    if (!mapInstance) return null
    const bounds = mapInstance.getBounds?.()
    const center = mapInstance.getCenter?.()
    if (!bounds || !center) return null
    const northeast = bounds.getNorthEast?.()
    if (!northeast) return null
    const radius = calcDistanceMeters(
        center.getLng(),
        center.getLat(),
        northeast.getLng(),
        northeast.getLat()
    )
    if (!Number.isFinite(radius)) return null
    return clamp(Math.round(radius), 300, 50000)
}

const getEffectiveRadius = () => {
    const mapRadius = getRadiusFromMap()
    return Number.isFinite(mapRadius) ? mapRadius : searchRadius.value
}


const routePointList = computed(() => {
    const points = []
    if (useCurrentLocationAsOrigin.value && currentLocation.value) {
        points.push({
            id: 'origin',
            name: '起点',
            address: currentLocation.value.address || ''
        })
    }
    selectedStops.value.forEach((stop) => {
        points.push({
            id: stop.id,
            name: stop.name,
            address: stop.address || ''
        })
    })
    return points
})

const scheduleMapNearbyRefresh = (radius) => {
    if (mapSearchTimer) {
        clearTimeout(mapSearchTimer)
    }
    mapSearchTimer = setTimeout(() => {
        loadNearbyRestaurants(radius, { preserveRoute: true, preserveView: true })
    }, 500)
}

const handleMapViewChange = () => {
    if (!mapInstance) return
    const now = Date.now()
    if (now < suppressMapSearchUntil) {
        return
    }
    const radius = getRadiusFromMap()
    if (!radius) return
    scheduleMapNearbyRefresh(radius)
}

const ensureMap = async (location) => {
    if (!mapContainer.value || !location) return
    await waitForAMap()
    const center = [location.lng, location.lat]

    if (!mapInstance) {
        mapInstance = new AMap.Map(mapContainer.value, {
            zoom: 13,
            center,
            resizeEnable: true,
            viewMode: '2D',
            layers: [new AMap.TileLayer(), new AMap.TileLayer.RoadNet()]
        })
        mapInfoWindow = new AMap.InfoWindow({
            offset: new AMap.Pixel(0, -28)
        })
        mapInstance.on('click', handleMapClick)
        mapInstance.on('moveend', handleMapViewChange)
        mapInstance.on('zoomend', handleMapViewChange)

        AMap.plugin(['AMap.ToolBar', 'AMap.Scale', 'AMap.MapType'], () => {
            mapInstance.addControl(new AMap.ToolBar())
            mapInstance.addControl(new AMap.Scale())
            mapInstance.addControl(new AMap.MapType({
                defaultType: 0
            }))
        })
        setTimeout(() => {
            handleMapViewChange()
        }, 0)
    } else {
        suppressMapSearchUntil = Date.now() + 600
        mapInstance.setCenter(center)
    }
}

const ensureGeocoder = async () => {
    if (geocoderInstance) return
    await waitForAMap()
    await new Promise((resolve, reject) => {
        AMap.plugin('AMap.Geocoder', () => {
            if (AMap.Geocoder) {
                geocoderInstance = new AMap.Geocoder()
                resolve()
            } else {
                reject(new Error('地理编码服务加载失败'))
            }
        })
    })
}

const getAddressByLngLat = async (lng, lat) => {
    try {
        await ensureGeocoder()
        return await new Promise((resolve) => {
            geocoderInstance.getAddress([lng, lat], (status, result) => {
                if (status === 'complete' && result?.regeocode?.formattedAddress) {
                    resolve(result.regeocode.formattedAddress)
                } else {
                    resolve('')
                }
            })
        })
    } catch (error) {
        console.warn('获取地址失败:', error)
        return ''
    }
}

const ensureDriving = async () => {
    if (drivingInstance) return
    await waitForAMap()
    await new Promise((resolve, reject) => {
        AMap.plugin('AMap.Driving', () => {
            if (AMap.Driving) {
                drivingInstance = new AMap.Driving({
                    map: mapInstance,
                    autoFitView: true
                })
                resolve()
            } else {
                reject(new Error('路线规划服务加载失败'))
            }
        })
    })
}

const updateMapMarkers = (location, restaurants, options = {}) => {
    if (!mapInstance || !location) return
    const { preserveRoute = false, preserveView = false } = options

    const stopIndexById = new Map(selectedStops.value.map((stop, index) => [stop.id, index + 1]))
    const selectedIdSet = new Set(selectedStops.value.map(stop => stop.id))
    const plannedHighlight = routePlanned.value
    const markerColors = {
        default: '#2f74ff',
        selected: '#f59e0b',
        planned: '#22c55e',
        current: '#ef4444'
    }

    if (markerOverlays.length > 0) {
        mapInstance.remove(markerOverlays)
        markerOverlays = []
    }
    if (!preserveRoute) {
        clearRouteOverlay()
    }

    const center = [location.lng, location.lat]
    const userMarker = new AMap.Marker({
        position: center,
        title: '??',
        anchor: 'bottom-center',
        icon: getCircleIcon(markerColors.current)
    })
    markerOverlays.push(userMarker)
    mapInstance.add(userMarker)

    const markers = (restaurants || [])
        .map((rest) => {
            const loc = parseLocation(rest.location)
            if (!loc) return null
            const stopIndex = stopIndexById.get(rest.id)
            const marker = new AMap.Marker({
                position: loc,
                title: rest.name,
                label: stopIndex ? { content: String(stopIndex), direction: 'top' } : undefined,
                icon: selectedIdSet.has(rest.id)
                    ? getCircleIcon(plannedHighlight ? markerColors.planned : markerColors.selected)
                    : getCircleIcon(markerColors.default)
            })
            marker.on('click', () => {
                if (!mapInfoWindow) return
                const content = `
                    <div style="font-size:12px;line-height:1.4;">
                        <div style="font-weight:600;margin-bottom:4px;">${rest.name}</div>
                        <div style="color:#666;margin-bottom:2px;">${rest.address || ''}</div>
                        <div style="color:#409EFF;">${formatDistance(rest.distance || 0)}</div>
                    </div>
                `
                mapInfoWindow.setContent(content)
                mapInfoWindow.open(mapInstance, loc)
            })
            return marker
        })
        .filter(Boolean)

    const customMarkers = selectedStops.value
        .filter((stop) => stop.source === 'custom')
        .map((stop) => {
            const loc = parseLocation(stop.location)
            if (!loc) return null
            const stopIndex = stopIndexById.get(stop.id)
            return new AMap.Marker({
                position: loc,
                title: stop.name,
                label: stopIndex ? { content: String(stopIndex), direction: 'top' } : {
                    content: stop.name,
                    direction: 'top'
                },
                icon: getCircleIcon(plannedHighlight ? markerColors.planned : markerColors.selected)
            })
        })
        .filter(Boolean)

    const allMarkers = markers.concat(customMarkers)
    if (allMarkers.length > 0) {
        markerOverlays.push(...allMarkers)
        mapInstance.add(allMarkers)
        suppressMapSearchUntil = Date.now() + 600
        if (!preserveView) {
            mapInstance.setFitView([userMarker, ...allMarkers], false, [40, 40, 40, 40])
        }
    } else if (!preserveView) {
        mapInstance.setZoom(13)
    }

    if (preserveRoute && !routeLine && lastRoutePoints?.length) {
        try {
            drawRouteFromPoints(lastRoutePoints)
        } catch (error) {
            console.warn('Restore route failed:', error)
        }
    }
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

// 获取起点天气
const loadCurrentWeather = async (location) => {
    if (!location?.lng || !location?.lat) {
        return
    }
    try {
        const res = await travelApi.getWeather({
            location: formatLocation(location.lng, location.lat)
        })
        if (res.success) {
            currentWeatherInfo.value = res.data
        } else {
            console.warn(res.message || '获取起点天气失败')
        }
    } catch (error) {
        console.warn('获取起点天气失败:', error)
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

// 解析路线规划结果
const parseRouteResult = (data, type) => {
    if (!data || !data.route) {
        return null
    }

    const route = data.route
    const normalizePaths = () => {
        if (!route.paths) return []
        return Array.isArray(route.paths) ? route.paths : [route.paths]
    }
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

            if (transit.segments) {
                transit.segments.forEach((segment) => {
                    if (segment.walking) {
                        result.steps.push({
                            instruction: `步行${formatDistance(segment.walking.distance)}`,
                            step_distance: segment.walking.distance,
                            duration: segment.walking.duration || ''
                        })
                    }
                    if (segment.bus && segment.bus.buslines && segment.bus.buslines.length > 0) {
                        const busline = segment.bus.buslines[0]
                        result.steps.push({
                            instruction: `乘坐${busline.name}，${busline.departure_stop.name} → ${busline.arrival_stop.name}`,
                            step_distance: busline.distance,
                            duration: busline.duration || ''
                        })
                    }
                })
            }
        }
    } else {
        const paths = normalizePaths()
        if (paths.length > 0) {
            const path = paths[0]
            result.distance = path.distance || '0'
            result.duration = path.duration || '0'

            const steps = Array.isArray(path.steps) ? path.steps : (path.steps ? [path.steps] : [])
            if (steps.length > 0) {
                result.steps = steps.map(step => ({
                    instruction: step.instruction || '',
                    road_name: step.road || '',
                    step_distance: step.distance || '0',
                    orientation: step.orientation || '',
                    duration: step.duration || ''
                }))
            }
        }
    }

    return result
}

// 获取起点

const setOriginLocation = async (location, source) => {
    currentLocation.value = location
    currentLocationSource.value = source
    if (location?.lng && location?.lat) {
        loadCurrentWeather(location)
        ensureMap(location).then(() => {
            updateMapMarkers(currentLocation.value, nearbyRestaurants.value)
        }).catch(() => { })
    }
}

const geocodeOriginAddress = async (address) => {
    const res = await travelApi.geocodeAddress(address)
    if (!res?.success) {
        throw new Error(res?.message || '起点解析失败')
    }
    const [lngStr, latStr] = String(res.data?.location || '').split(',')
    const lng = Number(lngStr)
    const lat = Number(latStr)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error('起点坐标解析失败')
    }
    return {
        lng,
        lat,
        address: res.data?.address || address
    }
}

const ensureOriginLocation = async () => {
    if (originMode.value === 'current') {
        if (currentLocation.value && currentLocationSource.value === 'current') {
            return formatLocation(currentLocation.value.lng, currentLocation.value.lat)
        }
        return await getLocation()
    }

    const address = originInput.value.trim()
    if (!address) {
        return ''
    }

    if (manualOriginCache.value && resolvedManualInput.value === address) {
        await setOriginLocation(manualOriginCache.value, 'manual')
        return formatLocation(manualOriginCache.value.lng, manualOriginCache.value.lat)
    }

    const location = await geocodeOriginAddress(address)
    resolvedManualInput.value = address
    manualOriginCache.value = location
    await setOriginLocation(location, 'manual')
    return formatLocation(location.lng, location.lat)
}

const refreshCurrentOrigin = async () => {
    originLoading.value = true
    try {
        await getLocation()
        await loadNearbyRestaurants()
    } catch (error) {
        console.error('Refresh origin error:', error)
    } finally {
        originLoading.value = false
    }
}

const applyManualOrigin = async () => {
    const address = originInput.value.trim()
    if (!address) {
        ElMessage.warning('请输入起点位置')
        return
    }

    originLoading.value = true
    try {
        const location = await geocodeOriginAddress(address)
        resolvedManualInput.value = address
        manualOriginCache.value = location
        await setOriginLocation(location, 'manual')
        await loadNearbyRestaurants()
    } catch (error) {
        ElMessage.warning(error.message || '起点解析失败')
    } finally {
        originLoading.value = false
    }
}

const handleOriginModeChange = async () => {
    if (originMode.value === 'current') {
        await refreshCurrentOrigin()
        return
    }
    if (manualOriginCache.value) {
        if (resolvedManualInput.value) {
            originInput.value = resolvedManualInput.value
        }
        await setOriginLocation(manualOriginCache.value, 'manual')
        await loadNearbyRestaurants()
    }
}

const getLocation = async () => {
    try {
        const location = await getCurrentLocation()
        if (!location.address) {
            const addr = await getAddressByLngLat(location.lng, location.lat)
            if (addr) {
                location.address = addr
            }
        }
        await setOriginLocation(location, 'current')
        return formatLocation(location.lng, location.lat)
    } catch (error) {
        console.error('获取位置失败:', error)
        ElMessage.warning('获取起点失败，将使用默认起点')
        const fallback = {
            lng: 116.397428,
            lat: 39.90923,
            address: '默认位置'
        }
        await setOriginLocation(fallback, 'current')
        return '116.397428,39.90923'
    }
}

const handleMapClick = async (event) => {
    if (!markingMode.value || !event?.lnglat) {
        return
    }
    const lng = event.lnglat.lng
    const lat = event.lnglat.lat
    const address = await getAddressByLngLat(lng, lat)
    const name = `自定义点${selectedStops.value.filter(s => s.source === 'custom').length + 1}`
    const stop = {
        id: `custom-${Date.now()}`,
        name,
        address: address || `${lng},${lat}`,
        location: `${lng},${lat}`,
        source: 'custom'
    }
    selectedStops.value.push(stop)
    updateMapMarkers(currentLocation.value, nearbyRestaurants.value)
}

const toggleMarkingMode = async () => {
    const next = !markingMode.value
    markingMode.value = next
    try {
        if (!currentLocation.value) {
            await getLocation()
        }
        await ensureMap(currentLocation.value)
        if (mapInstance) {
            mapInstance.setDefaultCursor(next ? 'crosshair' : 'default')
            mapInstance.off('click', handleMapClick)
            mapInstance.on('click', handleMapClick)
        }
    } catch (error) {
        console.error('Map init error:', error)
    }
}

const isStopSelected = (restaurantId) => {
    return selectedStops.value.some((stop) => stop.id === restaurantId)
}

const addRestaurantStop = (rest) => {
    if (isStopSelected(rest.id)) {
        return
    }
    selectedStops.value.push({
        id: rest.id,
        name: rest.name,
        address: rest.address || '',
        location: rest.location,
        source: 'poi'
    })
    updateMapMarkers(currentLocation.value, nearbyRestaurants.value)
}

const removeStop = (stopId) => {
    selectedStops.value = selectedStops.value.filter((stop) => stop.id !== stopId)
    updateMapMarkers(currentLocation.value, nearbyRestaurants.value)
}

const planRestaurantRoute = async () => {
    if (useCurrentLocationAsOrigin.value) {
        const origin = await ensureOriginLocation()
        if (!origin || !currentLocation.value) {
            ElMessage.warning('请先设置起点')
            return
        }
    }
    const validStops = selectedStops.value
        .map((stop) => ({ ...stop, coord: parseLocation(stop.location) }))
        .filter((stop) => stop.coord)

    if (validStops.length === 0) {
        ElMessage.warning('Please select or mark at least one place')
        return
    }
    if (validStops.length > 16) {
        ElMessage.warning('At most 16 waypoints are supported')
        return
    }
    if (!useCurrentLocationAsOrigin.value && validStops.length < 2) {
        ElMessage.warning('不使用起点作为起点时，请至少选择两个地点')
        return
    }

    try {
        await ensureMap(currentLocation.value || validStops[0])
        clearRouteOverlay()

        const stopLocations = validStops
            .map((stop) => formatLocation(stop.coord[0], stop.coord[1]))
            .filter(Boolean)

        let segmentStart = null
        let startName = ''
        let stopsForSegments = [...validStops]
        if (useCurrentLocationAsOrigin.value) {
            segmentStart = formatLocation(currentLocation.value.lng, currentLocation.value.lat)
            startName = currentLocation.value.address || '起点'
        } else {
            segmentStart = stopLocations.shift()
            const firstStop = stopsForSegments.shift()
            startName = firstStop?.name || 'Start'
        }

        if (!segmentStart || stopLocations.length === 0) {
            ElMessage.error('Invalid route coordinates')
            return
        }

        const allPoints = []
        const segments = []
        let segmentFromName = startName
        for (let i = 0; i < stopLocations.length; i += 1) {
            const segmentEnd = stopLocations[i]
            const stopMeta = stopsForSegments[i]
            const routeRes = await travelApi.getRoute('driving', segmentStart, segmentEnd, '')
            if (!routeRes.success) {
                ElMessage.error(routeRes.message || 'Backend route planning failed')
                return
            }
            const segmentPoints = collectBackendRoutePoints(routeRes.data)
            if (allPoints.length > 0 && segmentPoints.length > 0) {
                segmentPoints.shift()
            }
            allPoints.push(...segmentPoints)

            const parsed = parseRouteResult(routeRes.data, 'driving')
            segments.push({
                key: `${segmentFromName}-${stopMeta?.name || 'Stop'}`,
                fromName: segmentFromName,
                toName: stopMeta?.name || 'Stop',
                distance: parsed.distance || '0',
                duration: parsed.duration || '0',
                steps: parsed.steps || []
            })

            segmentStart = segmentEnd
            segmentFromName = stopMeta?.name || 'Stop'
        }

        routeSegments.value = segments
                activeSegmentKeys.value = segments.length ? [segments[0].key] : []
        drawRouteFromPoints(allPoints)
        updateMapMarkers(currentLocation.value || validStops[0], nearbyRestaurants.value, { preserveRoute: true, preserveView: true })
    } catch (error) {
        ElMessage.error(error.message || 'Backend route planning failed')
    }
}


const clearPlannedRoute = () => {
    clearRouteOverlay()
}

const loadNearbyRestaurants = async (radiusOverride = null, options = {}) => {
    const origin = await ensureOriginLocation()
    if (!origin || !currentLocation.value) {
        return
    }

    loadingRestaurants.value = true
    try {
        await ensureMap(currentLocation.value)
        const location = origin
        const radiusValue = Number.isFinite(radiusOverride) ? radiusOverride : getEffectiveRadius()
        const params = {
            location,
            radius: radiusValue,
            category: selectedCategory.value,
            keyword: restaurantKeyword.value,
            sort: sortRule.value
        }
        const res = await travelApi.getNearbyRestaurants(params)
        if (res.success) {
            nearbyRestaurants.value = res.data.list || []
            updateMapMarkers(currentLocation.value, nearbyRestaurants.value, options)
        } else {
            ElMessage.warning(res.message || '获取附近餐厅失败')
            updateMapMarkers(currentLocation.value, [], options)
        }
    } catch (error) {
        ElMessage.error(error.message || '获取附近餐厅失败')
        console.error('Nearby restaurants error:', error)
        updateMapMarkers(currentLocation.value, [], options)
    } finally {
        loadingRestaurants.value = false
    }
}

const refreshNearbyRestaurants = async () => {
    await loadNearbyRestaurants()
}

const applyCategoryFilter = async (value) => {
    selectedCategory.value = value
    await refreshNearbyRestaurants()
}

// 加载出行信息
const loadTravelInfo = async () => {
    if (!destination.value.trim()) {
        ElMessage.warning('请输入目的地')
        return
    }

    loading.value = true
    showAllSteps.value = false // 重新查询时重置展开状态
    try {
        const origin = await ensureOriginLocation()
        if (!origin) {
            ElMessage.warning('请先设置起点')
            return
        }
        const cityName = extractCityName(destination.value)

        const [weatherRes, routeRes] = await Promise.all([
            travelApi.getWeather(cityName),
            travelApi.getRoute(routeType.value, origin, destination.value, cityName)
        ])

        if (weatherRes.success) {
            weatherInfo.value = weatherRes.data
        } else {
            ElMessage.warning(weatherRes.message || '获取天气信息失败')
        }

        if (routeRes.success) {
            const parsedRoute = parseRouteResult(routeRes.data, routeType.value)
            if (parsedRoute) {
                routeInfo.value = parsedRoute
            } else {
                ElMessage.warning('路线解析失败')
            }
        } else {
            ElMessage.warning(routeRes.message || '获取路线信息失败')
        }
    } catch (error) {
        ElMessage.error(error.message || '加载出行信息失败')
        console.error('Travel info error:', error)
    } finally {
        loading.value = false
    }
}

// 切换路线步骤展开/收起
const toggleRouteSteps = () => {
    showAllSteps.value = !showAllSteps.value
}

// 切换路线类型
const handleRouteTypeChange = async () => {
    if (destination.value) {
        loading.value = true
        showAllSteps.value = false // 切换路线类型时重置展开状态
        try {
            const origin = await ensureOriginLocation()
            if (!origin) {
            ElMessage.warning('请先设置起点')
                return
            }
            const cityName = extractCityName(destination.value)

            const routeRes = await travelApi.getRoute(routeType.value, origin, destination.value, cityName)

            if (routeRes.success) {
                const parsedRoute = parseRouteResult(routeRes.data, routeType.value)
                if (parsedRoute) {
                    routeInfo.value = parsedRoute
                }
            } else {
                ElMessage.warning(routeRes.message || '获取路线信息失败')
            }
        } catch (error) {
            ElMessage.error(error.message || '获取路线信息失败')
        } finally {
            loading.value = false
        }
    }
}

// 保存完整出行计划
const saveCompletePlan = async () => {
    if (!destination.value || !weatherInfo.value || !routeInfo.value) {
        ElMessage.warning('请先完成查询')
        return
    }

    saving.value = true
    try {
        const planData = {
            rec_id: route.query.rec_id ? parseInt(route.query.rec_id) : null,
            plan_name: `${destination.value}出行计划`,
            destination: destination.value,
            origin_location: currentLocation.value
                ? formatLocation(currentLocation.value.lng, currentLocation.value.lat)
                : '',
            destination_location: '',
            route_type: routeType.value,
            weather_info: weatherInfo.value,
            route_info: routeInfo.value,
            recommended_restaurants: recommendationInfo.value?.recommendations?.restaurants || [],
            attractions: recommendationInfo.value?.recommendations?.attractions || [],
            daily_budget: recommendationInfo.value?.recommendations?.estimated_budget || 0,
            total_calories: recommendationInfo.value?.recommendations?.estimated_calories || 0,
            plan_days: 1,
            plan_summary: `前往${destination.value}的出行计划`
        }

        const res = await travelApi.savePlan(planData)

        if (res.success) {
            ElMessage.success('出行计划保存成功')
            router.push('/history')
        } else {
            ElMessage.error(res.message || '保存失败')
        }
    } catch (error) {
        ElMessage.error('保存失败')
        console.error('Save plan error:', error)
    } finally {
        saving.value = false
    }
}

onMounted(async () => {
    try {
        await getLocation()
        await loadNearbyRestaurants()
    } catch (error) {
        console.error('初始化定位失败:', error)
    }

    // 如果有推荐参数，加载推荐信息
    if (route.query.recommended === 'true' && route.query.rec_id) {
        try {
            const res = await travelApi.recommendPlan(parseInt(route.query.rec_id))
            if (res.success) {
                recommendationInfo.value = res.data
                if (res.data.recommendations?.destination) {
                    destination.value = res.data.recommendations.destination
                }
            }
        } catch (error) {
            console.error('Load recommendation error:', error)
        }
    }

    if (recognitionStore.currentResult) {
        // 可以根据识别结果推荐目的地
    }
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.travel {
    min-height: 100vh;
    background: $bg-color;

    .travel-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 20px;

        .destination-input {
            margin-bottom: 16px;
        }

        .origin-selector {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .origin-row {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .origin-label {
            font-weight: 600;
            color: $text-primary;
        }

        .origin-input {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .origin-input :deep(.el-input) {
            flex: 1;
        }

        .origin-display {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .recommendation-card {
            margin-bottom: 16px;

            .recommendation-content {
                .recommendation-section {
                    h4 {
                        margin: 0 0 8px;
                        color: $text-primary;
                        font-size: 16px;
                    }

                    .tags-container {
                        display: flex;
                        flex-wrap: wrap;
                    }
                }

                .recommendation-summary {
                    padding-top: 12px;
                    border-top: 1px solid #eee;
                }
            }
        }

        .route-type-selector {
            margin-bottom: 24px;
            display: flex;
            justify-content: center;

            :deep(.el-radio-group) {
                width: 100%;
                display: flex;
                gap: 8px;

                .el-radio-button {
                    flex: 1;

                    .el-radio-button__inner {
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                }
            }
        }

        .map-card {
            margin-bottom: 16px;

            .map-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            }

            .map-layout {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 16px;
            }

            .amap-container {
                width: 100%;
                height: 360px;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #f0f0f0;
            }

            .map-panel {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .filter-section {
                display: grid;
                grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr auto;
                gap: 8px;
                align-items: center;
            }

                .rule-section {
                    border: 1px solid #f0f0f0;
                    border-radius: 12px;
                    padding: 12px;
                    background: #fafafa;

                    .rule-title {
                        font-weight: 600;
                        color: $text-primary;
                        margin-bottom: 8px;
                    }

                    .rule-current {
                        padding: 8px 10px;
                        border-radius: 10px;
                        background: #fff;
                        border: 1px solid #f0f0f0;
                        margin-bottom: 8px;
                    }

                    .rule-current-title {
                        font-size: 13px;
                        color: $text-secondary;
                        margin-bottom: 4px;
                    }

                    .rule-current-meta {
                        font-weight: 600;
                        color: $text-primary;
                        font-size: 14px;
                    }

                    .rule-current-tip {
                        margin-top: 4px;
                        font-size: 12px;
                        color: $primary-color;
                    }

                    .rule-tags {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    }

                .rule-actions {
                    margin-top: 8px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .rule-empty {
                    color: $text-secondary;
                    font-size: 13px;
                }
            }

            .restaurant-section {
                border: 1px solid #f0f0f0;
                border-radius: 12px;
                padding: 12px;
                background: #fff;

                .restaurant-title {
                    font-weight: 600;
                    color: $text-primary;
                    margin-bottom: 8px;
                }

                .restaurant-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: 260px;
                    overflow: auto;
                    padding-right: 4px;
                }

                .restaurant-item {
                    border-bottom: 1px dashed #eee;
                    padding-bottom: 10px;

                    &:last-child {
                        border-bottom: none;
                        padding-bottom: 0;
                    }
                }

                .restaurant-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: $text-primary;
                }

                .restaurant-address {
                    font-size: 12px;
                    color: $text-secondary;
                    margin-top: 4px;
                }

                .restaurant-distance {
                    font-size: 12px;
                    color: $primary-color;
                    margin-top: 4px;
                }

                .restaurant-actions {
                    margin-top: 6px;
                }

                .restaurant-empty {
                    color: $text-secondary;
                    font-size: 13px;
                    padding: 8px 0;
                }
            }

            .route-section {
                border: 1px solid #f0f0f0;
                border-radius: 12px;
                padding: 12px;
                background: #fff;

                .route-title {
                    font-weight: 600;
                    color: $text-primary;
                    margin-bottom: 8px;
                }

                .route-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .route-hint {
                    font-size: 12px;
                    color: $primary-color;
                    margin-bottom: 8px;
                }

                .route-empty {
                    font-size: 13px;
                    color: $text-secondary;
                }

                .route-stops {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .route-stop {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed #eee;

                    &:last-child {
                        border-bottom: none;
                        padding-bottom: 0;
                    }
                }

                .route-index {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: $primary-color;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    flex-shrink: 0;
                }

                .route-info {
                    flex: 1;
                }

                .route-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: $text-primary;
                }

                .route-address {
                    font-size: 12px;
                    color: $text-secondary;
                    margin-top: 2px;
                }
            }
        }

        .info-card {
            margin-bottom: 16px;

            .route-header {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .weather-content {
                display: flex;
                align-items: center;
                gap: 24px;

                .weather-icon-wrapper {
                    width: 64px;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 159, 67, 0.1);
                    border-radius: 50%;

                    .weather-emoji {
                        font-size: 48px;
                        line-height: 1;
                    }
                }

                .weather-info {
                    flex: 1;

                    .temperature {
                        font-size: 32px;
                        font-weight: bold;
                        color: $text-primary;
                    }

                    .weather-text {
                        font-size: 16px;
                        color: $text-secondary;
                        margin: 8px 0;
                    }

                    .weather-tip {
                        font-size: 14px;
                        color: $primary-color;
                        margin-bottom: 8px;
                    }

                    .weather-detail {
                        font-size: 12px;
                        color: $text-secondary;
                        margin-top: 8px;
                    }
                }
            }

            .route-content {
                .route-steps {
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

                .route-text {
                    line-height: 1.6;
                    color: $text-primary;
                }
            }
        }
    }
}

@media (max-width: 900px) {
    .travel {
        .travel-content {
            .map-card {
                .map-layout {
                    grid-template-columns: 1fr;
                }

                .amap-container {
                    height: 300px;
                }

                .filter-section {
                    grid-template-columns: 1fr;
                }
            }
        }
    }
}

.route-origin-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: auto;
}
.route-segment-panel {
    margin-top: 16px;
}
.route-point-list {
    display: grid;
    gap: 10px;
}
.route-flow {
    display: grid;
    gap: 14px;
}
.route-flow-point {
    display: grid;
    gap: 10px;
}
.route-point-item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(255, 255, 255, 1));
    border: 1px solid #e5e7eb;
}
.route-point-index {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: #111827;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 6px 12px rgba(15, 23, 42, 0.18);
}
.route-point-name {
    font-weight: 600;
}
.route-point-address {
    color: #6b7280;
    font-size: 12px;
}
.route-flow-segment {
    position: relative;
    padding-left: 18px;
}
.route-flow-segment::before {
    content: '';
    position: absolute;
    left: 7px;
    top: -6px;
    bottom: -6px;
    width: 2px;
    background: linear-gradient(180deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 0.45), rgba(59, 130, 246, 0));
}
.route-segment-title {
    margin-top: 4px;
    margin-bottom: 8px;
    font-weight: 600;
    color: #111827;
}
.route-segment-meta {
    margin-left: 10px;
    color: #6b7280;
    font-size: 12px;
}
.route-segment-steps {
    display: grid;
    gap: 6px;
    padding: 6px 0;
}
.route-segment-step {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 13px;
    padding: 6px 8px;
    border-radius: 10px;
    background: #f9fafb;
    border: 1px solid #eef2f7;
}
.route-segment-step-index {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: #e5e7eb;
    color: #111827;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}
.route-segment-step-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.route-segment-step-main {
    color: #111827;
    line-height: 1.4;
}
.route-segment-step-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: #6b7280;
    font-size: 12px;
}
.route-segment-empty {
    color: #9ca3af;
    font-size: 12px;
}

</style>