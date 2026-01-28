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
            <el-step title="健康" />
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
              <el-form :model="form" label-width="110px">
                <el-form-item label="健康情况">
                  <el-checkbox-group v-model="form.conditions">
                    <el-checkbox v-for="c in conditionOpts" :key="c.value" :label="c.value">{{ c.label }}</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
                <el-form-item label="饮食方式">
                  <el-select v-model="form.diet_style" style="width:260px">
                    <el-option label="普通" value="normal" />
                    <el-option label="素食" value="vegetarian" />
                    <el-option label="纯素" value="vegan" />
                    <el-option label="低糖/低碳" value="low_carb" />
                    <el-option label="低盐" value="low_salt" />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>

            <div v-else-if="active===3">
              <div class="tip">可多选，系统会在推荐和识别结果中标红提醒。</div>
              <el-check-tag
                v-for="a in allergenOpts"
                :key="a"
                :checked="form.allergies.includes(a)"
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
            <el-button v-if="active<4" type="primary" @click="active++">下一步</el-button>
            <el-button v-else type="primary" @click="save" :loading="saving">保存画像</el-button>
          </div>
        </el-card>

                <div class="side">
          <el-card class="panel role-card" shadow="never">
            <div class="role-head">
              <div class="role-title">健康角色卡</div>
              <div class="role-sub">RPG 风格实时属性展示</div>
            </div>

            <div class="role-body">
              <div class="identity">
                <div class="avatar">{{ avatarLetter }}</div>
                <div class="id-item">
                  <div class="id-key">👤 昵称</div>
                  <div class="id-val">{{ nicknameDisplay }}</div>
                </div>
                <div class="id-item">
                  <div class="id-key">🎂 年龄</div>
                  <div class="id-val">{{ form.age ?? '-' }}</div>
                </div>
                <div class="id-item">
                  <div class="id-key">📏 身高体重</div>
                  <div class="id-val">{{ form.height ?? '-' }}cm / {{ form.weight ?? '-' }}kg</div>
                </div>
                <div class="id-item">
                  <div class="id-key">⚖️ BMI</div>
                  <div class="id-val">
                    {{ bmiText }}
                    <span class="badge" :class="`badge-${bmiStatus.tone}`">{{ bmiStatus.label }}</span>
                  </div>
                </div>
                <div class="id-item">
                  <div class="id-key">🎯 当前目标</div>
                  <div class="id-val">{{ goalLabel }}</div>
                </div>
              </div>

              <div class="attrs">
                <div class="attr">
                  <div class="attr-head">
                    <div>🔋 能量需求</div>
                    <div class="attr-text">目标 {{ form.calorie_target ?? '-' }} kcal</div>
                  </div>
                  <el-progress :percentage="caloriePercent" :show-text="false" :color="calorieColor" />
                </div>
                <div class="attr">
                  <div class="attr-head">
                    <div>💪 活跃度</div>
                    <div class="attr-text">{{ activityMeta.label }}</div>
                  </div>
                  <el-progress :percentage="activityMeta.percent" :show-text="false" :color="activityColor" />
                </div>
                <div class="attr">
                  <div class="attr-head">
                    <div>⚖️ 体型状态</div>
                    <div class="attr-text">
                      <span class="badge" :class="`badge-${bmiStatus.tone}`">{{ bmiStatus.label }}</span>
                    </div>
                  </div>
                </div>
                <div class="attr">
                  <div class="attr-head">
                    <div>🧠 饮食模式</div>
                    <div class="attr-text">
                      <span class="tag">{{ dietStyleLabel }}</span>
                    </div>
                  </div>
                </div>
              </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
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

const conditionOpts = [
  { label: '高血压', value: 'hypertension' },
  { label: '糖尿病/控糖', value: 'diabetes' },
  { label: '高血脂', value: 'hyperlipidemia' },
  { label: '痛风', value: 'gout' },
  { label: '肠胃敏感', value: 'sensitive_gut' }
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
  conditions: [],
  diet_style: 'normal',
  allergies: [],
  preferences: [],
  scenes: []
})

const overview = ref({})
const calorieColor = '#2563eb'
const activityColor = '#f59e0b'

const nicknameDisplay = computed(() => form.value.nickname?.trim() || '未命名探索者')
const avatarLetter = computed(() => nicknameDisplay.value[0]?.toUpperCase() || '?')

const bmi = computed(() => {
  const h = Number(form.value.height)
  const w = Number(form.value.weight)
  if (!h || !w) return null
  const m = h / 100
  return w / (m * m)
})

const bmiText = computed(() => (bmi.value ? bmi.value.toFixed(1) : '-'))

const bmiStatus = computed(() => {
  if (!bmi.value) return { label: '未知', tone: 'muted' }
  if (bmi.value < 18.5) return { label: '偏瘦', tone: 'blue' }
  if (bmi.value < 24) return { label: '正常区间', tone: 'green' }
  if (bmi.value < 28) return { label: '偏胖', tone: 'orange' }
  return { label: '肥胖', tone: 'red' }
})

const goalLabel = computed(() => {
  const map = {
    cut: '减脂',
    bulk: '增肌',
    low_sugar: '控糖',
    low_salt: '低盐',
    balanced: '均衡'
  }
  return map[form.value.goal] || '未知'
})

const caloriePercent = computed(() => {
  const target = Number(form.value.calorie_target) || 0
  const base = 2400
  const pct = Math.round((target / base) * 100)
  return Math.max(0, Math.min(100, pct))
})

const activityMeta = computed(() => {
  const map = {
    low: { label: '低', percent: 35 },
    mid: { label: '中', percent: 65 },
    high: { label: '高', percent: 90 }
  }
  return map[form.value.activity] || { label: '未知', percent: 0 }
})

const dietStyleLabel = computed(() => {
  const map = {
    normal: '普通型饮食者',
    vegetarian: '素食',
    vegan: '纯素',
    low_carb: '低糖/低碳',
    low_salt: '低盐'
  }
  return map[form.value.diet_style] || '未知'
})


const toggleAllergen = (a, checked) => {
  const arr = new Set(form.value.allergies)
  if (checked) arr.add(a)
  else arr.delete(a)
  form.value.allergies = Array.from(arr)
}

const addCustom = () => {
  const t = allergenCustom.value.trim()
  if (!t) return
  if (!form.value.allergies.includes(t)) form.value.allergies.push(t)
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
.side{display:flex;flex-direction:column;gap:16px;}
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

.role-card{background:linear-gradient(135deg,#f8fafc 0%, #eef2ff 60%, #e0f2fe 100%);border:1px solid #e0e7ff;}
.role-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;}
.role-title{font-size:18px;font-weight:900;}
.role-sub{font-size:12px;color:$text-secondary;}
.role-body{display:grid;grid-template-columns:1fr 1.2fr;gap:16px;}
.identity{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;}
.avatar{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#fef3c7,#bfdbfe);display:flex;align-items:center;justify-content:center;font-weight:900;color:#1f2937;margin-bottom:10px;font-size:20px;}
.id-item{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:13px;}
.id-item:last-child{border-bottom:0;}
.id-key{color:$text-secondary;}
.id-val{font-weight:700;display:flex;align-items:center;gap:8px;}
.attrs{display:flex;flex-direction:column;gap:12px;}
.attr{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;}
.attr-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;}
.attr-text{color:$text-secondary;}
.badge{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;}
.badge-green{background:#dcfce7;color:#166534;}
.badge-blue{background:#dbeafe;color:#1d4ed8;}
.badge-orange{background:#ffedd5;color:#9a3412;}
.badge-red{background:#fee2e2;color:#991b1b;}
.badge-muted{background:#f3f4f6;color:#6b7280;}
.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700;}
@media (max-width: 980px){
  .container{padding:18px 16px;}
  .grid{grid-template-columns:1fr;}
  .stats{grid-template-columns:1fr;}
  .role-body{grid-template-columns:1fr;}
}
</style>
