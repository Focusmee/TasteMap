<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <div>
          <h2>健康画像</h2>
          <p class="sub">完善个人信息，系统会更准确地给出推荐与建议</p>
        </div>
        <div class="actions">
          <el-button type="primary" @click="save" :loading="saving">保存</el-button>
        </div>
      </div>

      <div class="grid">
        <el-card class="panel" shadow="never">
          <div class="panel-head">
            <div class="t">画像设置</div>
            <div class="d">按步骤填写，支持随时修改</div>
          </div>

          <el-steps :active="active" align-center>
            <el-step title="基础" />
            <el-step title="目标" />
            <el-step title="过敏原" />
            <el-step title="偏好" />
          </el-steps>

          <div class="step-body">
            <div v-if="active===0">
              <el-form :model="form" label-width="90px">
                <el-form-item label="昵称">
                  <el-input v-model="form.nickname" placeholder="例如：小张" />
                </el-form-item>
                <el-form-item label="性别">
                  <el-radio-group v-model="form.gender">
                    <el-radio-button label="male">男</el-radio-button>
                    <el-radio-button label="female">女</el-radio-button>
                    <el-radio-button label="unknown">保密</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="年龄">
                  <el-input-number v-model="form.age" :min="1" :max="120" />
                </el-form-item>
                <el-form-item label="身高(cm)">
                  <el-input-number v-model="form.height" :min="50" :max="250" />
                </el-form-item>
                <el-form-item label="体重(kg)">
                  <el-input-number v-model="form.weight" :min="20" :max="250" />
                </el-form-item>
              </el-form>
            </div>

            <div v-else-if="active===1">
              <el-form :model="form" label-width="110px">
                <el-form-item label="健康目标">
                  <el-select v-model="form.goal" placeholder="请选择" style="width:260px">
                    <el-option label="减脂" value="cut" />
                    <el-option label="增肌" value="bulk" />
                    <el-option label="控糖" value="low_sugar" />
                    <el-option label="均衡" value="balanced" />
                  </el-select>
                </el-form-item>
                <el-form-item label="每日热量目标">
                  <el-input-number v-model="form.calorie_target" :min="800" :max="4000" />
                  <span class="hint">kcal</span>
                </el-form-item>
                <el-form-item label="运动频率">
                  <el-segmented v-model="form.activity" :options="activityOpts" />
                </el-form-item>
              </el-form>
            </div>

            <div v-else-if="active===2">
              <div class="tip">可多选，系统会在推荐和识别结果中标红提醒。</div>
              <el-check-tag
                v-for="a in allergenOpts"
                :key="a"
                :checked="form.allergens.includes(a)"
                @change="(v)=>toggleAllergen(a,v)"
                style="margin:8px 8px 0 0"
              >{{ a }}</el-check-tag>
              <el-divider />
              <el-input v-model="allergenCustom" placeholder="自定义过敏原，回车添加" @keyup.enter="addCustom" />
            </div>

            <div v-else>
              <el-form :model="form" label-width="110px">
                <el-form-item label="忌口/偏好">
                  <el-select v-model="form.preferences" multiple filterable allow-create default-first-option style="width:360px" placeholder="例如：少油、少辣、清淡">
                    <el-option v-for="p in prefSeed" :key="p" :label="p" :value="p" />
                  </el-select>
                </el-form-item>
                <el-form-item label="常见场景">
                  <el-checkbox-group v-model="form.scenes">
                    <el-checkbox label="外卖" />
                    <el-checkbox label="食堂" />
                    <el-checkbox label="自炊" />
                    <el-checkbox label="聚餐" />
                  </el-checkbox-group>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <div class="step-actions">
            <el-button :disabled="active===0" @click="active--">上一步</el-button>
            <el-button v-if="active<3" type="primary" @click="active++">下一步</el-button>
            <el-button v-else type="primary" @click="save" :loading="saving">保存画像</el-button>
          </div>
        </el-card>

        <el-card class="panel" shadow="never">
          <div class="panel-head">
            <div class="t">健康概览</div>
            <div class="d">近 7 天饮食与出行综合评分</div>
          </div>

          <div class="overview">
            <div class="score">
              <div class="num">{{ overview.score ?? '-' }}</div>
              <div class="label">健康评分</div>
            </div>
            <div class="stats">
              <div class="s">
                <div class="k">平均热量</div>
                <div class="v">{{ overview.avgCalories ?? '-' }} kcal</div>
              </div>
              <div class="s">
                <div class="k">识别次数</div>
                <div class="v">{{ overview.recCount ?? '-' }}</div>
              </div>
              <div class="s">
                <div class="k">出行次数</div>
                <div class="v">{{ overview.travelCount ?? '-' }}</div>
              </div>
            </div>
          </div>

          <div ref="chartRef" class="chart" />
          <el-divider />
          <el-alert type="info" show-icon :closable="false" title="小提示">
            <template #default>
              <div>评分仅用于演示：热量更接近目标、过敏原命中更少、规律出行会更高。</div>
            </template>
          </el-alert>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import { profileApi } from '@/api'
import * as echarts from 'echarts'

const active = ref(0)
const saving = ref(false)
const chartRef = ref(null)
let chart = null

const activityOpts = [
  { label: '低', value: 'low' },
  { label: '中', value: 'mid' },
  { label: '高', value: 'high' }
]

const allergenOpts = ['花生', '坚果', '海鲜', '鸡蛋', '牛奶', '小麦', '大豆', '芝麻']
const prefSeed = ['少油', '少盐', '少糖', '清淡', '不辣', '高蛋白']
const allergenCustom = ref('')

const form = ref({
  nickname: '',
  gender: 'unknown',
  age: 22,
  height: 170,
  weight: 60,
  goal: 'balanced',
  calorie_target: 2000,
  activity: 'mid',
  allergens: [],
  preferences: [],
  scenes: []
})

const overview = ref({})

const toggleAllergen = (a, checked) => {
  const arr = new Set(form.value.allergens)
  if (checked) arr.add(a)
  else arr.delete(a)
  form.value.allergens = Array.from(arr)
}

const addCustom = () => {
  const t = allergenCustom.value.trim()
  if (!t) return
  if (!form.value.allergens.includes(t)) form.value.allergens.push(t)
  allergenCustom.value = ''
}

const load = async () => {
  const res = await profileApi.get()
  if (res.success) {
    form.value = { ...form.value, ...(res.data.profile || {}) }
  }
  const o = await profileApi.overview(7)
  if (o.success) {
    overview.value = o.data || {}
    await nextTick()
    renderChart()
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const trend = overview.value.trend || []
  const x = trend.map(t => t.date)
  const y = trend.map(t => t.calories)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 20, right: 20, top: 20, bottom: 42, containLabel: true },
    xAxis: { type: 'category', data: x, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: 'kcal' },
    series: [{ type: 'line', data: y, smooth: true, areaStyle: {} }]
  })
}

const save = async () => {
  saving.value = true
  try {
    const res = await profileApi.save(form.value)
    if (res.success) {
      ElMessage.success('已保存')
      await load()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

const onResize = () => chart && chart.resize()

onMounted(async () => {
  await load()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (chart) chart.dispose()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;
.page{min-height:100vh;background:$bg-color;}
.container{padding:24px 40px;max-width:1200px;margin:0 auto;}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px;}
.sub{margin:6px 0 0;color:$text-secondary;}
.actions{display:flex;gap:10px;}
.grid{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;}
.panel{border-radius:14px;}
.panel-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;}
.panel-head .t{font-weight:800;}
.panel-head .d{color:$text-secondary;font-size:12px;}
.step-body{margin-top:16px;}
.step-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;}
.hint{margin-left:8px;color:$text-secondary;}
.tip{color:$text-secondary;margin:8px 0 12px;}
.overview{display:flex;gap:16px;align-items:center;margin:8px 0 10px;}
.score{width:120px;height:120px;border-radius:16px;background:#f0f9ff;border:1px solid #dbeafe;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.score .num{font-size:34px;font-weight:900;color:#1d4ed8;}
.score .label{color:$text-secondary;margin-top:4px;}
.stats{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.s{background:#fff;border:1px solid #eef2ff;border-radius:14px;padding:12px;}
.s .k{font-size:12px;color:$text-secondary;}
.s .v{font-size:18px;font-weight:800;margin-top:6px;}
.chart{height:260px;}
@media (max-width: 980px){
  .container{padding:18px 16px;}
  .grid{grid-template-columns:1fr;}
  .stats{grid-template-columns:1fr;}
}
</style>
