<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <div>
          <h2>饮食日历</h2>
          <p class="sub">记录三餐，自动汇总热量与宏量营养素</p>
        </div>
        <div class="actions">
          <el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" @change="loadDay" />
          <el-button type="primary" @click="openAdd">手动添加</el-button>
        </div>
      </div>

      <el-card class="panel" shadow="never">
        <div class="panel-head">
          <div class="t">近7天趋势</div>
          <div class="hint">热量(千卡) / 蛋白 / 碳水 / 脂肪</div>
        </div>
        <div ref="chartRef" class="chart" />
      </el-card>


      <el-card class="panel" shadow="never">
        <div class="panel-head">
          <div class="t">月视图</div>
          <div class="hint">点击日期查看每日汇总</div>
        </div>
        <el-calendar v-model="calendarDate">
          <template #date-cell="{ data }">
            <div :class="['cal-cell', statusClass(calendarMap[data.day]?.status)]" @click="openDaySummary(data.day)">
              <div class="cal-day">{{ data.day.split('-').slice(2).join('') }}</div>
              <div v-if="calendarMap[data.day]" class="cal-meta">
                <div class="cal-kcal">{{ calendarMap[data.day].total_calories }} 千卡</div>
                <div class="cal-meals">{{ calendarMap[data.day].meals }} 餐</div>
                <el-tag
                  v-if="calendarMap[data.day].status"
                  size="small"
                  :type="statusTagType(calendarMap[data.day].status)"
                >{{ statusLabel(calendarMap[data.day].status) }}</el-tag>
              </div>
            </div>
          </template>
        </el-calendar>
      </el-card>


      <div class="grid">
        <el-card class="panel" shadow="never">
          <div class="panel-head">
            <div class="t">{{ date }} - 今日汇总</div>
            <div class="head-right">
              <el-tag v-if="summaryStatus" size="small" :type="statusTagType(summaryStatus)">{{ statusLabel(summaryStatus) }}</el-tag>
              <span v-if="summaryTarget" class="head-target">目标 {{ summaryTarget }} 千卡</span>
            </div>
          </div>
          <div class="kpi-row">
            <div class="kpi">
              <div class="k">总热量</div>
              <div class="v">{{ daySummary.calories ?? 0 }}</div>
              <div class="u">千卡</div>
            </div>
            <div class="kpi">
              <div class="k">蛋白</div>
              <div class="v">{{ daySummary.protein ?? 0 }}</div>
              <div class="u">克</div>
            </div>
            <div class="kpi">
              <div class="k">碳水</div>
              <div class="v">{{ daySummary.carbs ?? 0 }}</div>
              <div class="u">克</div>
            </div>
            <div class="kpi">
              <div class="k">脂肪</div>
              <div class="v">{{ daySummary.fat ?? 0 }}</div>
              <div class="u">克</div>
            </div>
          </div>
          <el-divider />
          <div class="analysis">
            <div class="analysis-title">今日分析</div>
            <div class="ratio-row">
              <div class="ratio-item">蛋白 {{ analysis.macro_ratio.protein ?? 0 }}%</div>
              <div class="ratio-item">碳水 {{ analysis.macro_ratio.carbs ?? 0 }}%</div>
              <div class="ratio-item">脂肪 {{ analysis.macro_ratio.fat ?? 0 }}%</div>
            </div>
            <el-empty v-if="analysis.suggestions.length===0" description="无显著异常，继续保持" />
            <div v-else class="tips">
              <div v-for="(tip, idx) in analysis.suggestions" :key="idx" class="tip">{{ tip }}</div>
            </div>
          </div>
          <el-divider />
          <el-empty v-if="list.length===0" description="今天还没有记录" />
          <div v-else class="list">
            <div v-for="it in list" :key="it.id" class="item">
              <div class="left">
                <el-tag size="small" :type="mealTypeColor(it.meal_type)">{{ mealTypeLabel(it.meal_type) }}</el-tag>
                <div class="name">
                  {{ it.food_name }}
                  <span class="portion-tag">{{ it.portion_num ?? 1 }}{{ it.portion_unit || "\u4efd" }}</span>
                </div>
                <div class="meta">{{ formatTime(it.create_time) }}</div>
              </div>
              <div class="right">
                <div class="cal">{{ it.calories ?? 0 }} 千卡</div>
                <el-button text type="danger" @click="remove(it.id)">删除</el-button>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="panel" shadow="never">
          <div class="panel-head">
            <div class="t">快捷入口</div>
          </div>
          <div class="quick">
            <el-button @click="$router.push('/recommendation')" type="primary" plain>去看今日推荐</el-button>
            <el-button @click="$router.push('/knowledge')" plain>查知识库</el-button>
            <el-button @click="$router.push('/dashboard')" plain>数据看板</el-button>
            <el-button @click="$router.push('/chat')" plain>问营养助手</el-button>
          </div>
          <el-divider />
          <el-alert title="小贴士" type="info" show-icon :closable="false">
            <template #default>
              <div>建议一日三餐尽量规律；减脂人群可优先提高蛋白比例，减少油炸/高糖饮品。</div>
            </template>
          </el-alert>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="addDialog" title="手动添加饮食记录" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="餐次">
          <el-select v-model="form.meal_type" style="width: 100%">
            <el-option label="早餐" value="breakfast" />
            <el-option label="午餐" value="lunch" />
            <el-option label="晚餐" value="dinner" />
            <el-option label="加餐" value="snack" />
          </el-select>
        </el-form-item>
        <el-form-item label="菜名">
          <el-input v-model="form.food_name" placeholder="例如：狮子头" />
        </el-form-item>
        <el-form-item label="热量">
          <el-input-number v-model="form.calories" :min="0" :max="5000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="蛋白/碳水/脂肪">
          <div class="triple">
            <el-input-number v-model="form.protein" :min="0" :max="300" />
            <el-input-number v-model="form.carbs" :min="0" :max="300" />
            <el-input-number v-model="form.fat" :min="0" :max="300" />
          </div>
        </el-form-item>
        <el-form-item label="分量">
          <div class="portion-row">
            <el-input-number v-model="form.portion" :min="0.1" :max="10" :step="0.5" />
            <el-select v-model="form.portion_unit" style="width: 120px">
              <el-option label="份" value="份" />
              <el-option label="克" value="克" />
              <el-option label="毫升" value="毫升" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" placeholder="例如：少油、少盐" />
        </el-form-item>
        <el-form-item label="过敏原">
          <el-select v-model="form.allergens" multiple filterable allow-create default-first-option style="width:100%" placeholder="可不填">
            <el-option v-for="a in commonAllergens" :key="a" :label="a" :value="a" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  
    <el-dialog v-model="summaryDialog" title="日期汇总" width="520px">
      <div class="summary-head">
        <div class="summary-date">{{ summaryDate }}</div>
        <div class="summary-status">
          <el-tag v-if="summaryStatus" :type="statusTagType(summaryStatus)" size="small">{{ statusLabel(summaryStatus) }}</el-tag>
          <span v-if="summaryTarget">目标 {{ summaryTarget }} 千卡</span>
        </div>
      </div>
      <div class="kpi-row">
        <div class="kpi">
          <div class="k">总热量</div>
          <div class="v">{{ summaryData.calories ?? 0 }}</div>
          <div class="u">千卡</div>
        </div>
        <div class="kpi">
          <div class="k">蛋白</div>
          <div class="v">{{ summaryData.protein ?? 0 }}</div>
          <div class="u">克</div>
        </div>
        <div class="kpi">
          <div class="k">碳水</div>
          <div class="v">{{ summaryData.carbs ?? 0 }}</div>
          <div class="u">克</div>
        </div>
        <div class="kpi">
          <div class="k">脂肪</div>
          <div class="v">{{ summaryData.fat ?? 0 }}</div>
          <div class="u">克</div>
        </div>
      </div>
      <el-divider />
      <el-empty v-if="summaryList.length===0" description="该日暂无记录" />
      <div v-else class="list">
        <div v-for="it in summaryList" :key="it.id" class="item">
          <div class="left">
            <el-tag size="small" :type="mealTypeColor(it.meal_type)">{{ mealTypeLabel(it.meal_type) }}</el-tag>
            <div class="name">
                  {{ it.food_name }}
                  <span class="portion-tag">{{ it.portion_num ?? 1 }}{{ it.portion_unit || "\u4efd" }}</span>
                </div>
            <div class="meta">{{ formatTime(it.create_time) }}</div>
          </div>
          <div class="right">
            <div class="cal">{{ it.calories ?? 0 }} 千卡</div>
          </div>
        </div>
      </div>
    </el-dialog>
</div>


    

</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import NavBar from '@/components/NavBar.vue'
import { dietApi } from '@/api'
import dayjs from 'dayjs'

const date = ref(dayjs().format('YYYY-MM-DD'))
const calendarDate = ref(new Date())


const chartRef = ref(null)
let chart

const trend = ref([])
const daySummary = ref({ calories: 0, protein: 0, carbs: 0, fat: 0 })
const list = ref([])
const analysis = ref({ total: { calories: 0, protein: 0, carbs: 0, fat: 0 }, macro_ratio: { protein: 0, carbs: 0, fat: 0 }, suggestions: [] })
const calendarMap = ref({})
const calendarTarget = ref(null)
const summaryDialog = ref(false)
const summaryDate = ref('')
const summaryData = ref({ calories: 0, protein: 0, carbs: 0, fat: 0 })
const summaryList = ref([])
const summaryStatus = ref('')
const summaryTarget = ref(null)


const addDialog = ref(false)
const saving = ref(false)

const commonAllergens = ['花生','坚果','牛奶','鸡蛋','海鲜','小麦','大豆','芝麻']
const form = ref({
  meal_type: 'lunch',
  food_name: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  portion: 1,
  portion_unit: '\u4efd',
  note: '',
  allergens: []
})

const mealTypeLabel = (t) => ({ breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }[t] || t)
const mealTypeColor = (t) => ({ breakfast: 'success', lunch: 'primary', dinner: 'warning', snack: '' }[t] || '')
const formatTime = (ts) => ts ? dayjs(ts).format('MM-DD HH:mm') : ''
const statusTagType = (s) => ({ OK: 'success', WARN: 'warning', HIGH: 'danger' }[s] || '')
const statusLabel = (s) => ({ OK: '\u8fbe\u6807', WARN: '\u63a5\u8fd1\u8d85\u6807', HIGH: '\u8d85\u6807' }[s] || '')
const statusClass = (s) => ({ OK: 'ok', WARN: 'warn', HIGH: 'high' }[s] || '')

const openAdd = () => {
  form.value = { meal_type: 'lunch', food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, portion: 1, portion_unit: '\u4efd', note: '', allergens: [] }
  addDialog.value = true
}

const save = async () => {
  if (!form.value.food_name) {
    ElMessage.warning('请填写菜名')
    return
  }
  saving.value = true
  try {
    const res = await dietApi.add({
      ...form.value,
      nutrition: { protein: form.value.protein, carbs: form.value.carbs, fat: form.value.fat },
      date: date.value
    })
    if (res.success) {
      ElMessage.success('已保存')
      addDialog.value = false
      await loadDay()
      await loadTrend()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '网络错误')
  } finally {
    saving.value = false
  }
}

const loadTrend = async () => {
  const res = await dietApi.summary(7)
  if (res.success) {
    trend.value = res.data.trend || []
    await nextTick()
    renderChart()
  }
}


const loadCalendar = async () => {
  const start = dayjs(calendarDate.value).startOf('month').format('YYYY-MM-DD')
  const end = dayjs(calendarDate.value).endOf('month').format('YYYY-MM-DD')
  const res = await dietApi.calendar(start, end)
  if (res.success) {
    const map = {}
    const list = res.data.list || []
    list.forEach((it) => {
      map[it.log_date] = it
    })
    calendarMap.value = map
    calendarTarget.value = res.data.target_calories || null
  }
}

const openDaySummary = async (day) => {
  summaryDate.value = day
  summaryDialog.value = true
  date.value = day
  const res = await dietApi.list(day)
  if (res.success) {
    summaryList.value = res.data.list || []
    list.value = res.data.list || []
    daySummary.value = res.data.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    summaryData.value = res.data.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    summaryStatus.value = res.data.status || ''
    summaryTarget.value = res.data.target_calories || null
  }
  const analysisRes = await dietApi.analysis(day)
  if (analysisRes.success) {
    analysis.value = analysisRes.data || { total: { calories: 0, protein: 0, carbs: 0, fat: 0 }, macro_ratio: { protein: 0, carbs: 0, fat: 0 }, suggestions: [] }
  }
}

const loadDay = async () => {
  const res = await dietApi.list(date.value)
  if (res.success) {
    list.value = res.data.list || []
    daySummary.value = res.data.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  }
  const analysisRes = await dietApi.analysis(date.value)
  if (analysisRes.success) {
    analysis.value = analysisRes.data || { total: { calories: 0, protein: 0, carbs: 0, fat: 0 }, macro_ratio: { protein: 0, carbs: 0, fat: 0 }, suggestions: [] }
  }
}

const remove = async (id) => {
  const res = await dietApi.remove(id)
  if (res.success) {
    ElMessage.success('已删除')
    await loadDay()
    await loadTrend()
  } else {
    ElMessage.error(res.message || '删除失败')
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const x = trend.value.map(d => (d.date ? dayjs(d.date).format('YYYY-MM-DD') : ''))
  const cal = trend.value.map(d => d.calories)
  const p = trend.value.map(d => d.protein)
  const c = trend.value.map(d => d.carbs)
  const f = trend.value.map(d => d.fat)
  chart.setOption({
    grid: { left: 46, right: 20, top: 20, bottom: 40 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: { type: 'category', data: x, axisLabel: { rotate: 30, formatter: (v) => dayjs(v).format('YYYY-MM-DD') } },
    yAxis: { type: 'value' },
    series: [
      { name: '热量', type: 'line', data: cal, smooth: true },
      { name: '蛋白', type: 'line', data: p, smooth: true },
      { name: '碳水', type: 'line', data: c, smooth: true },
      { name: '脂肪', type: 'line', data: f, smooth: true }
    ]
  })
  window.addEventListener('resize', () => chart && chart.resize())
}

onMounted(async () => {
  await loadTrend()
  await loadCalendar()
  await loadDay()
})

watch(calendarDate, async () => {
  await loadCalendar()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.page{min-height:100vh;background:$bg-color;}
.container{padding:24px 40px;max-width:1200px;margin:0 auto;}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px;}
.sub{margin:6px 0 0;color:$text-secondary;}
.actions{display:flex;gap:10px;align-items:center;}
.panel{border-radius:14px;}
.panel-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;}
.panel-head .t{font-weight:700;}
.hint{color:$text-secondary;font-size:12px;}
.chart{height:260px;}
.cal-cell{padding:6px 4px;border-radius:10px;cursor:pointer;}
.cal-cell:hover{background:#f4f7ff;}
.cal-day{font-weight:700;font-size:12px;color:#1f2a44;}
.cal-meta{margin-top:4px;font-size:11px;color:#6b7280;display:flex;flex-direction:column;gap:2px;}
.cal-kcal{font-weight:700;color:#2563eb;}
.cal-meals{color:#6b7280;}
.summary-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.summary-date{font-weight:800;}
.summary-status{display:flex;gap:8px;align-items:center;color:$text-secondary;font-size:12px;}
.head-right{display:flex;gap:8px;align-items:center;color:$text-secondary;font-size:12px;}
.head-target{color:$text-secondary;font-size:12px;}
.cal-cell.ok{background:#ecfdf3;border:1px solid #d1fae5;}
.cal-cell.warn{background:#fff7ed;border:1px solid #fed7aa;}
.cal-cell.high{background:#fef2f2;border:1px solid #fecaca;}

.grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-top:16px;}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.kpi{background:#f7f9ff;border-radius:14px;padding:12px;}
.k{font-size:12px;color:$text-secondary;}
.v{font-size:22px;font-weight:800;margin-top:4px;}
.u{font-size:12px;color:$text-secondary;margin-top:2px;}
.analysis{display:flex;flex-direction:column;gap:10px;}
.analysis-title{font-weight:700;}
.ratio-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.ratio-item{background:#fff8f0;border-radius:12px;padding:10px;font-size:12px;color:#8a5a2b;}
.tips{display:flex;flex-direction:column;gap:6px;}
.tip{background:#f6fbff;border:1px solid #e7f1ff;border-radius:10px;padding:8px;font-size:12px;color:#3b6aa0;}
.list{display:flex;flex-direction:column;gap:10px;}
.item{display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:#fff;border:1px solid #eef1f6;}
.left{display:flex;flex-direction:column;gap:6px;}
.name{font-weight:700;}
.meta{color:$text-secondary;font-size:12px;}
.right{display:flex;align-items:center;gap:10px;}
.cal{font-weight:700;}
.quick{display:flex;flex-direction:column;gap:10px;}
.triple{display:flex;gap:10px;width:100%;}
.portion-row{display:flex;gap:10px;align-items:center;}
.portion-tag{margin-left:8px;color:#667085;font-size:12px;}

@media(max-width: 980px){
  .container{padding:18px 16px;}
  .grid{grid-template-columns:1fr;}
  .kpi-row{grid-template-columns:repeat(2,1fr);}
}
</style>




