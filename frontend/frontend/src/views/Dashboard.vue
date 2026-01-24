<template>
    <div class="dashboard">
        <NavBar />

        <div class="dashboard-content">
            <el-card class="page-header" shadow="never">
                <div class="header-row">
                    <div>
                        <h2 class="title">数据看板</h2>
                        <p class="subtitle">识别与出行的关键数据统计（按登录用户）</p>
                    </div>

                    <div class="header-actions">
                        <el-select v-model="days" size="small" style="width: 140px" @change="reloadAll">
                            <el-option :value="7" label="近7天" />
                            <el-option :value="30" label="近30天" />
                            <el-option :value="90" label="近90天" />
                        </el-select>

                        <el-button size="small" :loading="loading" @click="reloadAll">刷新</el-button>
                    </div>
                </div>
            </el-card>

            <!-- 概览统计 -->
            <el-row :gutter="16" class="summary-row">
                <el-col :xs="12" :sm="6">
                    <el-card shadow="never" class="summary-card">
                        <div class="summary-title">今日识别</div>
                        <div class="summary-value">{{ summary?.recognition?.today ?? 0 }}</div>
                        <div class="summary-desc">近7天：{{ summary?.recognition?.week ?? 0 }}</div>
                    </el-card>
                </el-col>

                <el-col :xs="12" :sm="6">
                    <el-card shadow="never" class="summary-card">
                        <div class="summary-title">识别Top（近30天）</div>
                        <div class="summary-value ellipsis">{{ summary?.recognition?.topFood?.name || '暂无' }}</div>
                        <div class="summary-desc">次数：{{ summary?.recognition?.topFood?.count ?? 0 }}</div>
                    </el-card>
                </el-col>

                <el-col :xs="12" :sm="6">
                    <el-card shadow="never" class="summary-card">
                        <div class="summary-title">今日出行</div>
                        <div class="summary-value">{{ summary?.travel?.today ?? 0 }}</div>
                        <div class="summary-desc">近7天：{{ summary?.travel?.week ?? 0 }}</div>
                    </el-card>
                </el-col>

                <el-col :xs="12" :sm="6">
                    <el-card shadow="never" class="summary-card">
                        <div class="summary-title">出行Top（近30天）</div>
                        <div class="summary-value ellipsis">{{ summary?.travel?.topDestination?.name || '暂无' }}</div>
                        <div class="summary-desc">次数：{{ summary?.travel?.topDestination?.count ?? 0 }}</div>
                    </el-card>
                </el-col>
            </el-row>

            <el-tabs v-model="activeTab" class="tabs" @tab-change="handleTabChange">
                <el-tab-pane label="识别分析" name="rec">
                    <el-row :gutter="16" class="chart-row">
                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header">识别次数趋势（近{{ days }}天）</div>
                                </template>
                                <div ref="recTrendEl" class="chart"></div>
                            </el-card>
                        </el-col>

                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header">菜品Top10（近{{ days }}天）</div>
                                </template>
                                <div ref="recTopFoodsEl" class="chart"></div>
                            </el-card>
                        </el-col>
                    </el-row>

                    <el-row :gutter="16" class="chart-row">
                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header">过敏原分布Top10（近{{ days }}天）</div>
                                </template>
                                <div ref="recAllergenEl" class="chart"></div>
                            </el-card>
                        </el-col>

                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header nutrition-header">
                                        <span>营养指标趋势（近{{ days }}天）</span>
                                        <el-select v-model="nutritionMetric" size="small" style="width: 180px"
                                            @change="loadNutritionTrend">
                                            <el-option value="calorie_kcal" label="热量（kcal，均值）" />
                                            <el-option value="protein_g" label="蛋白质（g，均值）" />
                                            <el-option value="fat_g" label="脂肪（g，均值）" />
                                            <el-option value="carb_g" label="碳水（g，均值）" />
                                            <el-option value="sodium_mg" label="钠（mg，均值）" />
                                        </el-select>
                                    </div>
                                </template>
                                <div ref="nutritionTrendEl" class="chart"></div>
                            </el-card>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane label="出行分析" name="travel">
                    <el-row :gutter="16" class="chart-row">
                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header">出行次数趋势（近{{ days }}天）</div>
                                </template>
                                <div ref="travelTrendEl" class="chart"></div>
                            </el-card>
                        </el-col>

                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header">目的地Top10（近{{ days }}天）</div>
                                </template>
                                <div ref="travelTopDestEl" class="chart"></div>
                            </el-card>
                        </el-col>
                    </el-row>

                    <el-row :gutter="16" class="chart-row">
                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card">
                                <template #header>
                                    <div class="card-header">出行方式分布（近{{ days }}天）</div>
                                </template>
                                <div ref="travelRouteTypeEl" class="chart"></div>
                            </el-card>
                        </el-col>

                        <el-col :xs="24" :lg="12">
                            <el-card shadow="never" class="chart-card tip-card">
                                <template #header>
                                    <div class="card-header">说明</div>
                                </template>
                                <div class="tip-content">
                                    <el-alert
                                        title="提示"
                                        type="info"
                                        :closable="false"
                                        show-icon
                                    >
                                        <template #default>
                                            <div>
                                                1）看板数据按当前登录用户统计；<br />
                                                2）“热量/营养趋势”是按当日识别结果的<strong>均值</strong>计算；<br />
                                                3）如果你模型服务暂时没有返回 nutrition 字段，营养趋势可能为空，这是正常的。
                                            </div>
                                        </template>
                                    </el-alert>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import NavBar from '@/components/NavBar.vue'
import { dashboardApi } from '@/api'

const days = ref(30)
const activeTab = ref('rec')
const loading = ref(false)

const summary = ref(null)

// ===== charts DOM =====
const recTrendEl = ref(null)
const recTopFoodsEl = ref(null)
const recAllergenEl = ref(null)
const nutritionTrendEl = ref(null)

const travelTrendEl = ref(null)
const travelTopDestEl = ref(null)
const travelRouteTypeEl = ref(null)

// ===== charts instances =====
let recTrendChart = null
let recTopFoodsChart = null
let recAllergenChart = null
let nutritionTrendChart = null
let travelTrendChart = null
let travelTopDestChart = null
let travelRouteTypeChart = null

const nutritionMetric = ref('calorie_kcal')

const ensureChart = (el, instance) => {
    if (!el) return null
    if (instance) return instance
    return echarts.init(el)
}

const buildLineOption = (x, y, yName = '次数') => {
    return {
        tooltip: { trigger: 'axis' },
        grid: { left: 36, right: 16, top: 20, bottom: 56, containLabel: true },
        xAxis: {
            type: 'category',
            data: x,
            axisLabel: { rotate: 30, hideOverlap: true }
        },
        yAxis: {
            type: 'value',
            name: yName,
            minInterval: 1
        },
        series: [
            {
                type: 'line',
                data: y,
                smooth: true,
                showSymbol: false,
                areaStyle: { opacity: 0.08 }
            }
        ]
    }
}

const buildBarOption = (labels, values, rotate = 0) => {
    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 36, right: 16, top: 20, bottom: 60 },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { rotate }
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
            {
                type: 'bar',
                data: values,
                barMaxWidth: 36
            }
        ]
    }
}

const buildHorizontalBarOption = (labels, values) => {
    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 120, right: 16, top: 20, bottom: 20 },
        xAxis: { type: 'value', minInterval: 1 },
        yAxis: {
            type: 'category',
            data: labels,
            axisLabel: { width: 110, overflow: 'truncate' }
        },
        series: [
            {
                type: 'bar',
                data: values,
                barMaxWidth: 18
            }
        ]
    }
}

const safeFillDays = (list, daysValue) => {
    // 把后端返回的稀疏 date-count 填成连续日期（缺失用 0）
    const map = new Map(list.map(i => [i.date, i.count ?? i.value ?? 0]))
    const x = []
    const y = []
    const start = dayjs().subtract(daysValue - 1, 'day').startOf('day')
    for (let i = 0; i < daysValue; i++) {
        const ds = start.add(i, 'day').format('YYYY-MM-DD')
        x.push(ds)
        y.push(map.get(ds) ?? 0)
    }
    return { x, y }
}

const loadSummary = async () => {
    const res = await dashboardApi.getSummary()
    if (res.success) summary.value = res.data
}

const loadRecTrend = async () => {
    const res = await dashboardApi.getRecognitionTrend(days.value)
    if (!res.success) return
    const { x, y } = safeFillDays(res.data.list || [], days.value)
    recTrendChart = ensureChart(recTrendEl.value, recTrendChart)
    recTrendChart?.setOption(buildLineOption(x, y, '次数'), true)
}

const loadRecTopFoods = async () => {
    const res = await dashboardApi.getRecognitionTopFoods(days.value, 10)
    if (!res.success) return
    const list = res.data.list || []
    const labels = list.map(i => i.name)
    const values = list.map(i => i.count)
    recTopFoodsChart = ensureChart(recTopFoodsEl.value, recTopFoodsChart)
    recTopFoodsChart?.setOption(buildHorizontalBarOption(labels.reverse(), values.reverse()), true)
}

const loadRecAllergens = async () => {
    const res = await dashboardApi.getRecognitionAllergens(days.value, 10)
    if (!res.success) return
    const list = res.data.list || []
    const labels = list.map(i => i.name)
    const values = list.map(i => i.count)
    recAllergenChart = ensureChart(recAllergenEl.value, recAllergenChart)
    recAllergenChart?.setOption(buildBarOption(labels, values, labels.length > 6 ? 35 : 0), true)
}

const loadNutritionTrend = async () => {
    const res = await dashboardApi.getNutritionTrend(nutritionMetric.value, days.value)
    if (!res.success) return
    const list = (res.data.list || []).map(i => ({ date: i.date, value: i.value }))
    const map = new Map(list.map(i => [i.date, i.value]))
    const x = []
    const y = []
    const start = dayjs().subtract(days.value - 1, 'day').startOf('day')
    for (let i = 0; i < days.value; i++) {
        const ds = start.add(i, 'day').format('YYYY-MM-DD')
        x.push(ds)
        y.push(map.get(ds) ?? 0)
    }
    nutritionTrendChart = ensureChart(nutritionTrendEl.value, nutritionTrendChart)
    nutritionTrendChart?.setOption(buildLineOption(x, y, '均值'), true)
}

const loadTravelTrend = async () => {
    const res = await dashboardApi.getTravelTrend(days.value)
    if (!res.success) return
    const { x, y } = safeFillDays(res.data.list || [], days.value)
    travelTrendChart = ensureChart(travelTrendEl.value, travelTrendChart)
    travelTrendChart?.setOption(buildLineOption(x, y, '次数'), true)
}

const loadTravelTopDest = async () => {
    const res = await dashboardApi.getTravelTopDestinations(days.value, 10)
    if (!res.success) return
    const list = res.data.list || []
    const labels = list.map(i => i.name)
    const values = list.map(i => i.count)
    travelTopDestChart = ensureChart(travelTopDestEl.value, travelTopDestChart)
    travelTopDestChart?.setOption(buildHorizontalBarOption(labels.reverse(), values.reverse()), true)
}

const loadTravelRouteTypes = async () => {
    const res = await dashboardApi.getTravelRouteTypes(days.value)
    if (!res.success) return
    const list = res.data.list || []
    const labels = list.map(i => i.name)
    const values = list.map(i => i.count)
    travelRouteTypeChart = ensureChart(travelRouteTypeEl.value, travelRouteTypeChart)
    travelRouteTypeChart?.setOption(buildBarOption(labels, values), true)
}

const handleTabChange = async () => {
    // 切换 tab 时重新 resize，避免首次渲染尺寸为 0
    setTimeout(() => {
        recTrendChart?.resize()
        recTopFoodsChart?.resize()
        recAllergenChart?.resize()
        nutritionTrendChart?.resize()
        travelTrendChart?.resize()
        travelTopDestChart?.resize()
        travelRouteTypeChart?.resize()
    }, 50)
}

const reloadAll = async () => {
    loading.value = true
    try {
        await loadSummary()
        await loadRecTrend()
        await loadRecTopFoods()
        await loadRecAllergens()
        await loadNutritionTrend()
        await loadTravelTrend()
        await loadTravelTopDest()
        await loadTravelRouteTypes()
    } catch (e) {
        console.error(e)
        ElMessage.error('加载看板数据失败，请检查后端服务是否运行')
    } finally {
        loading.value = false
        handleTabChange()
    }
}

onMounted(async () => {
    await reloadAll()
    window.addEventListener('resize', handleTabChange)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleTabChange)
    recTrendChart?.dispose()
    recTopFoodsChart?.dispose()
    recAllergenChart?.dispose()
    nutritionTrendChart?.dispose()
    travelTrendChart?.dispose()
    travelTopDestChart?.dispose()
    travelRouteTypeChart?.dispose()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.dashboard {
    min-height: 100vh;
    width: 100%;
    background: $bg-color;
}

.dashboard-content {
    padding: 24px 40px 40px;
}

.page-header {
    margin-bottom: 16px;

    .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
    }

    .title {
        margin: 0;
        font-size: 22px;
        color: $text-primary;
    }

    .subtitle {
        margin: 6px 0 0;
        color: $text-secondary;
        font-size: 13px;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }
}

.summary-row {
    margin-bottom: 16px;
}

.summary-card {
    .summary-title {
        color: $text-secondary;
        font-size: 13px;
        margin-bottom: 8px;
    }

    .summary-value {
        font-size: 26px;
        font-weight: 700;
        color: $text-primary;
        line-height: 1.2;
    }

    .summary-desc {
        margin-top: 8px;
        color: $text-secondary;
        font-size: 12px;
    }

    .ellipsis {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

.tabs {
    background: #fff;
    padding: 8px 12px;
    border-radius: 12px;
}

.chart-row {
    margin-top: 16px;
}

.chart-card {
    border-radius: 12px;

    .card-header {
        font-weight: 600;
        color: $text-primary;
    }

    .nutrition-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
}

.chart {
    width: 100%;
    height: 320px;
}

.tip-card {
    .tip-content {
        padding: 4px;
    }
}

@media (max-width: 768px) {
    .dashboard-content {
        padding: 16px;
    }

    .chart {
        height: 260px;
    }
}
</style>
