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
          <div class="hint">点击日期查看每日汇总（悬浮可展开详情）</div>
        </div>

        <!-- ✅ 月历整体 loading（不会闪） -->
        <div class="cal-wrap" v-loading="calendarLoading">
          <el-calendar v-model="calendarDate">
            <template #header="{ date, prevMonth, nextMonth }">
              <div class="cal-header">
                <div class="cal-month">{{ formatMonth(date) }}</div>
                <div class="cal-actions">
                  <button class="cal-btn" type="button" @click="prevMonth()">上一月</button>
                  <button class="cal-btn" type="button" @click="nextMonth()">下一月</button>
                </div>
              </div>
            </template>

            <template #date-cell="{ data }">
              <!-- ✅ seed + key：每次重新加载月份能重播动画 -->
              <div
                :key="`${calendarAnimSeed}-${data.day}`"
                :style="{ '--d0': `${cellDelay(data.day)}ms` }"
                :class="[
                  'cal-cell',
                  overallClass(calendarMap[data.day]),
                  { empty: !calendarMap[data.day], loading: calendarLoading }
                ]"
                @click="openDaySummary(data.day)"
              >
                <!-- ✅ 骨架：加载时不显示“未记录” -->
                <div v-if="calendarLoading" class="cal-skeleton">
                  <div class="sk-top">
                    <div class="sk-day"></div>
                    <div class="sk-badge"></div>
                  </div>
                  <div class="sk-ring"></div>
                  <div class="sk-line"></div>
                  <div class="sk-bars">
                    <div class="sk-bar"></div>
                    <div class="sk-bar"></div>
                    <div class="sk-bar"></div>
                  </div>
                  <div class="sk-meals"></div>
                </div>

                <template v-else>
                  <div class="cal-top cal-anim a1" :style="{ '--delay': `${cellDelay(data.day)}ms` }">
                    <div class="cal-day">{{ data.day.split('-').slice(2).join('') }}</div>
                    <div
                      :class="['ai-badge', aiBadgeClass(calendarMap[data.day])]"
                      :title="aiBadgeLabel(calendarMap[data.day])"
                    >
                      {{ aiBadgeIcon(calendarMap[data.day]) }}
                    </div>
                  </div>

                  <div v-if="calendarMap[data.day]" class="cal-body">
                    <!-- ring -->
                    <div class="cal-anim a2" :style="{ '--delay': `${cellDelay(data.day) + 70}ms` }">
                      <div
                        class="cal-ring"
                        :class="progressClass(calendarMap[data.day], 'calories')"
                        :style="ringStyle(calendarMap[data.day])"
                        :title="calTitle(calendarMap[data.day])"
                      >
                        <div class="cal-ring-core">
                          <div class="cal-ring-center">
                            <span class="cal-ring-icon">🔥</span>
                            <span v-if="progressState(calendarMap[data.day], 'calories') === 'ok'" class="cal-check">✔</span>
                          </div>
                        </div>
                        <div v-if="progressState(calendarMap[data.day], 'calories') === 'low'" class="cal-ring-label">偏低</div>
                      </div>
                    </div>

                    <!-- kcal line -->
                    <div
                      class="cal-kcal-line cal-anim a3"
                      :style="{ '--delay': `${cellDelay(data.day) + 110}ms` }"
                      :class="progressClass(calendarMap[data.day], 'calories')"
                    >
                      {{ calLine(calendarMap[data.day]) }}
                    </div>

                    <!-- macro bars -->
                    <div class="macro-mini cal-anim a4" :style="{ '--delay': `${cellDelay(data.day) + 150}ms` }">
                      <div class="macro-item" :title="macroTitle(calendarMap[data.day], 'protein')">
                        <span class="m-emoji">🥩</span>
                        <div class="macro-bar">
                          <div
                            class="macro-fill p"
                            :class="progressClass(calendarMap[data.day], 'protein')"
                            :style="macroStyle(calendarMap[data.day], 'protein')"
                          />
                        </div>
                      </div>

                      <div class="macro-item" :title="macroTitle(calendarMap[data.day], 'carbs')">
                        <span class="m-emoji">🍚</span>
                        <div class="macro-bar">
                          <div
                            class="macro-fill c"
                            :class="progressClass(calendarMap[data.day], 'carbs')"
                            :style="macroStyle(calendarMap[data.day], 'carbs')"
                          />
                        </div>
                      </div>

                      <div class="macro-item" :title="macroTitle(calendarMap[data.day], 'fat')">
                        <span class="m-emoji">🧈</span>
                        <div class="macro-bar">
                          <div
                            class="macro-fill f"
                            :class="progressClass(calendarMap[data.day], 'fat')"
                            :style="macroStyle(calendarMap[data.day], 'fat')"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- ✅ 详情行默认收起：hover 才展开，减少拥挤 -->
                    <div class="macro-line cal-detail cal-anim a5" :style="{ '--delay': `${cellDelay(data.day) + 190}ms` }">
                      <span :class="['macro-text', progressClass(calendarMap[data.day], 'protein')]">
                        🥩 蛋白 {{ macroPercentLabel(calendarMap[data.day], 'protein') }}
                        <span v-if="progressState(calendarMap[data.day], 'protein') === 'low'" class="macro-hint">偏低</span>
                        <span v-else-if="progressState(calendarMap[data.day], 'protein') === 'ok'" class="macro-ok">✔</span>
                      </span>
                      <span class="sep">|</span>
                      <span :class="['macro-text', progressClass(calendarMap[data.day], 'carbs')]">
                        🍚 碳水 {{ macroPercentLabel(calendarMap[data.day], 'carbs') }}
                        <span v-if="progressState(calendarMap[data.day], 'carbs') === 'low'" class="macro-hint">偏低</span>
                        <span v-else-if="progressState(calendarMap[data.day], 'carbs') === 'ok'" class="macro-ok">✔</span>
                      </span>
                      <span class="sep">|</span>
                      <span :class="['macro-text', progressClass(calendarMap[data.day], 'fat')]">
                        🧈 脂肪 {{ macroPercentLabel(calendarMap[data.day], 'fat') }}
                        <span v-if="progressState(calendarMap[data.day], 'fat') === 'low'" class="macro-hint">偏低</span>
                        <span v-else-if="progressState(calendarMap[data.day], 'fat') === 'ok'" class="macro-ok">✔</span>
                      </span>
                    </div>
                  </div>

                  <div v-else class="cal-empty cal-anim a2" :style="{ '--delay': `${cellDelay(data.day) + 70}ms` }">
                    未记录
                  </div>

                  <!-- meals always -->
                  <div class="meal-status cal-anim a6" :style="{ '--delay': `${cellDelay(data.day) + 220}ms` }">
                    <span class="meal-item">早</span>
                    <span class="meal-mark">{{ mealMark(calendarMap[data.day], 'breakfast') }}</span>
                    <span class="meal-item">中</span>
                    <span class="meal-mark">{{ mealMark(calendarMap[data.day], 'lunch') }}</span>
                    <span class="meal-item">晚</span>
                    <span class="meal-mark">{{ mealMark(calendarMap[data.day], 'dinner') }}</span>
                  </div>
                </template>
              </div>
            </template>
          </el-calendar>
        </div>
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

            <el-empty v-if="analysis.suggestions.length === 0" description="无显著异常，继续保持" />
            <div v-else class="tips">
              <div v-for="(tip, idx) in analysis.suggestions" :key="idx" class="tip">{{ tip }}</div>
            </div>
          </div>

          <el-divider />

          <el-empty v-if="list.length === 0" description="今天还没有记录" />
          <div v-else class="list">
            <div v-for="it in list" :key="it.id" class="item">
              <div class="left">
                <el-tag size="small" :type="mealTypeColor(it.meal_type)">{{ mealTypeLabel(it.meal_type) }}</el-tag>
                <div class="name">
                  {{ it.food_name }}
                  <span class="portion-tag">{{ it.portion_num ?? 1 }}{{ it.portion_unit || "份" }}</span>
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

    <el-dialog v-model="summaryDialog" title="饮食时间轴" width="520px">
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
      <div v-else class="timeline">
        <div v-for="it in summaryList" :key="it.id" class="timeline-item">
          <div class="timeline-time">{{ formatTime(it.create_time) }}</div>
          <div class="timeline-dot" :class="mealTypeDot(it.meal_type)" />
          <div class="timeline-card">
            <div class="timeline-main">
              <el-tag size="small" :type="mealTypeColor(it.meal_type)">{{ mealTypeLabel(it.meal_type) }}</el-tag>
              <div class="name">
                {{ it.food_name }}
                <span class="portion-tag">{{ it.portion_num ?? 1 }}{{ it.portion_unit || "份" }}</span>
              </div>
            </div>
            <div class="timeline-meta">
              <span class="cal">{{ it.calories ?? 0 }} 千卡</span>
              <span v-if="it.note" class="note">{{ it.note }}</span>
            </div>
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
import { useRoute } from 'vue-router'

const route = useRoute()
const date = ref(dayjs().format('YYYY-MM-DD'))
const calendarDate = ref(new Date())

const chartRef = ref(null)
let chart

const trend = ref([])
const daySummary = ref({ calories: 0, protein: 0, carbs: 0, fat: 0 })
const list = ref([])
const analysis = ref({
  total: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  macro_ratio: { protein: 0, carbs: 0, fat: 0 },
  suggestions: []
})

const calendarMap = ref({})
const calendarTarget = ref(null)
const calendarLoading = ref(false)

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
  portion_unit: '份',
  note: '',
  allergens: []
})

/** ✅ 进入动画控制：每次 loadCalendar 成功后 seed++，让 key 变化触发重播 */
const calendarAnimSeed = ref(0)
const cellDelay = (dayStr) => {
  const d = Number(dayStr?.slice(-2)) || 1
  return Math.min(520, (d - 1) * 16)
}

const mealTypeLabel = (t) => ({ breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }[t] || t)
const mealTypeColor = (t) => ({ breakfast: 'success', lunch: 'primary', dinner: 'warning', snack: '' }[t] || '')
const formatTime = (ts) => (ts ? dayjs(ts).format('MM-DD HH:mm') : '')
const statusTagType = (s) => ({ OK: 'success', WARN: 'warning', HIGH: 'danger' }[s] || '')
const statusLabel = (s) => ({ OK: '达标', WARN: '接近超标', HIGH: '超标' }[s] || '')
const mealTypeDot = (t) => ({ breakfast: 'dot-breakfast', lunch: 'dot-lunch', dinner: 'dot-dinner', snack: 'dot-snack' }[t] || '')

const formatMonth = (dateObj) => dayjs(dateObj).format('YYYY年M月')

const numVal = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

const overallState = (day) => {
  if (!day) return 'none'
  const target = numVal(calendarTarget.value)
  const total = numVal(day.total_calories)
  if (!target) return total > 0 ? 'warn' : 'none'
  const ratio = target > 0 ? total / target : 0
  if (ratio >= 0.9 && ratio <= 1.1) return 'ok'
  return 'warn'
}
const overallClass = (day) => {
  const s = overallState(day)
  if (s === 'ok') return 'ok'
  if (s === 'warn') return 'warn'
  return 'none'
}

const calorieOk = (day) => overallState(day) === 'ok'
const mealCount = (day, key) => numVal(day?.[`${key}_count`])
const mealOk = (day, key) => mealCount(day, key) > 0
const mealMark = (day, key) => (mealOk(day, key) ? '✅' : '❌')
const allMainMeals = (day) => mealOk(day, 'breakfast') && mealOk(day, 'lunch') && mealOk(day, 'dinner')
const badgeGood = (day) => Boolean(day) && allMainMeals(day) && calorieOk(day)
const aiBadgeIcon = (day) => (badgeGood(day) ? '👍' : '⚠️')
const aiBadgeClass = (day) => (badgeGood(day) ? 'good' : day ? 'bad' : 'empty')
const aiBadgeLabel = (day) => (badgeGood(day) ? '👍' : '⚠️')

const macroRatios = { protein: 0.3, carbs: 0.4, fat: 0.3 }
const macroTarget = (key) => {
  const target = numVal(calendarTarget.value)
  if (!target) return 0
  const ratio = macroRatios[key] || 0
  const calPerGram = key === 'fat' ? 9 : 4
  return Math.round((target * ratio) / calPerGram)
}

const progressState = (day, key) => {
  if (!day) return 'none'
  const target = key === 'calories' ? numVal(calendarTarget.value) : macroTarget(key)
  if (!target) return 'none'
  const value = key === 'calories' ? numVal(day.total_calories) : numVal(day[key])
  const ratio = value / target
  if (ratio < 0.85) return 'low'
  if (ratio <= 1) return 'ok'
  return 'high'
}
const progressPercent = (day, key) => {
  if (!day) return 0
  const target = key === 'calories' ? numVal(calendarTarget.value) : macroTarget(key)
  if (!target) return 0
  const value = key === 'calories' ? numVal(day.total_calories) : numVal(day[key])
  return clamp(Math.round((value / target) * 100), 0, 100)
}
const progressClass = (day, key) => {
  const s = progressState(day, key)
  return s && s !== 'none' ? `state-${s}` : ''
}
const ringStyle = (day) => ({ '--value': progressPercent(day, 'calories') })
const macroStyle = (day, key) => ({ width: `${progressPercent(day, key)}%` })

const macroPercentLabel = (day, key) => {
  if (!day) return '--'
  const target = macroTarget(key)
  const val = numVal(day?.[key])
  if (!target) return `${val}克`
  return `${progressPercent(day, key)}%`
}
const calLine = (day) => {
  const total = numVal(day?.total_calories)
  const target = numVal(calendarTarget.value)
  if (!target) return `🔥 ${total} 千卡`
  return `🔥 ${total} / ${target} 千卡`
}
const calTitle = (day) => {
  const total = numVal(day?.total_calories)
  const target = numVal(calendarTarget.value)
  if (!target) return `🔥 ${total} 千卡`
  return `🔥 ${total} / ${target} 千卡`
}
const macroTitle = (day, key) => {
  const name = key === 'protein' ? '蛋白' : key === 'carbs' ? '碳水' : '脂肪'
  const val = numVal(day?.[key])
  const target = macroTarget(key)
  if (!target) return `${name} ${val} ?`
  return `${name} ${val} / ${target} ?`
}

const openAdd = () => {
  form.value = { meal_type: 'lunch', food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, portion: 1, portion_unit: '份', note: '', allergens: [] }
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
      await loadCalendar() // 保存后刷新月视图
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
  calendarLoading.value = true
  try {
    const start = dayjs(calendarDate.value).startOf('month').startOf('week').format('YYYY-MM-DD')
    const end = dayjs(calendarDate.value).endOf('month').endOf('week').format('YYYY-MM-DD')

    const res = await dietApi.calendar(start, end)

    if (res?.success) {
      const map = {}
      ;(res.data?.list || []).forEach((it) => {
        // ✅ 关键：强制变成 YYYY-MM-DD 字符串，避免全“未记录”
        const key = dayjs(it.log_date).format('YYYY-MM-DD')
        map[key] = it
      })
      calendarMap.value = map
      calendarTarget.value = res.data?.target_calories ?? null
      calendarAnimSeed.value++
    } else {
      calendarMap.value = {}
      calendarTarget.value = null
      calendarAnimSeed.value++
    }
  } finally {
    calendarLoading.value = false
  }
}

const resolveRouteDate = () => {
  const raw = typeof route.query.date === 'string' ? route.query.date : ''
  if (!raw) return null
  const parsed = dayjs(raw)
  if (!parsed.isValid()) return null
  return parsed.format('YYYY-MM-DD')
}

const syncFromRoute = async (options = {}) => {
  const { withTrend = false } = options
  const targetDate = resolveRouteDate()
  if (targetDate) {
    date.value = targetDate
    calendarDate.value = dayjs(targetDate).toDate()
  }
  if (withTrend) await loadTrend()
  if (route.query.summary === '1' && targetDate) {
    await openDaySummary(targetDate)
    return
  }
  await loadDay()
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
    summaryStatus.value = res.data.status || ''
    summaryTarget.value = res.data.target_calories || null
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
    await loadCalendar()
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
  await syncFromRoute({ withTrend: true })
})

watch(() => route.query, async () => {
  await syncFromRoute({ withTrend: true })
})

watch(
  () => dayjs(calendarDate.value).format('YYYY-MM'),
  async () => {
    await loadCalendar()
  },
  { immediate: true }
)
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

.cal-wrap{position:relative;}
:deep(.el-calendar-table .el-calendar-day){padding:0;height:100%;}
:deep(.el-calendar-table td){height:160px;vertical-align:top;}

.cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.cal-month{font-weight:800;font-size:16px;color:#1f2a44;}
.cal-actions{display:flex;gap:8px;}
.cal-btn{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;font-size:12px;color:#374151;cursor:pointer;}
.cal-btn:hover{background:#f8fafc;}

.cal-cell{
  padding:6px 6px;border-radius:10px;cursor:pointer;height:100%;width:100%;
  box-sizing:border-box;display:flex;flex-direction:column;gap:6px;
  position:relative; overflow:hidden;
}
.cal-cell:hover{background:#f4f7ff;}
.cal-cell.empty{background:#fff;border:1px dashed #e5e7eb;color:#9ca3af;}

.cal-top{display:flex;justify-content:space-between;align-items:center;}
.cal-day{font-weight:700;font-size:12px;color:#1f2a44;}
.ai-badge{min-width:18px;height:18px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px;background:#f3f4f6;color:#9ca3af;}
.ai-badge.good{background:#e8fff1;color:#16a34a;}
.ai-badge.bad{background:#fee2e2;color:#dc2626;}
.ai-badge.empty{background:#f3f4f6;color:#9ca3af;}

.cal-body{display:flex;flex-direction:column;gap:6px;}

.cal-ring{display:flex;flex-direction:column;align-items:center;gap:4px;}
.cal-ring-core{
  width:44px;height:44px;border-radius:50%;
  background:conic-gradient(var(--ring-color) calc(var(--value) * 1%), #e5e7eb 0);
  display:flex;align-items:center;justify-content:center;
  --ring-color:#a3a3a3;--value:0;
  transition: background 420ms ease;
}
.cal-ring-center{width:30px;height:30px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;gap:2px;font-size:12px;}
.cal-ring-icon{font-size:12px;}
.cal-check{color:#16a34a;font-weight:700;}
.cal-ring-label{font-size:10px;color:#2563eb;}
.cal-ring.state-ok .cal-ring-core{--ring-color:#22c55e;}
.cal-ring.state-low .cal-ring-core{--ring-color:#3b82f6;}
.cal-ring.state-high .cal-ring-core{--ring-color:#ef4444;}

.cal-kcal-line{font-size:11px;color:#374151;text-align:center;}
.cal-kcal-line.state-ok{color:#16a34a;}
.cal-kcal-line.state-low{color:#2563eb;}
.cal-kcal-line.state-high{color:#dc2626;}

.macro-mini{display:flex;flex-direction:column;gap:4px;}
.macro-item{display:flex;align-items:center;gap:4px;}
.m-emoji{font-size:12px;}
.macro-bar{flex:1;height:6px;background:#eef2f7;border-radius:999px;overflow:hidden;}
.macro-fill{height:100%;border-radius:999px;transition: width 520ms ease;}
.macro-fill.p{background:#22c55e;}
.macro-fill.c{background:#60a5fa;}
.macro-fill.f{background:#f59e0b;}
.macro-fill.state-high{background:#ef4444;}

.macro-line{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:10px;color:#6b7280;}
.macro-text{display:inline-flex;align-items:center;gap:4px;}
.macro-line .sep{color:#cbd5f5;}
.macro-line .state-ok{color:#16a34a;font-weight:600;}
.macro-line .state-low{color:#2563eb;font-weight:600;}
.macro-line .state-high{color:#dc2626;font-weight:600;}
.macro-hint{margin-left:2px;font-size:9px;padding:0 4px;border-radius:999px;background:#dbeafe;color:#2563eb;}
.macro-ok{margin-left:2px;color:#16a34a;}

.meal-status{display:flex;align-items:center;justify-content:flex-start;gap:4px;flex-wrap:wrap;font-size:11px;color:#475569;margin-top:2px;}
.meal-item{font-weight:600;}
.meal-mark{font-size:13px;line-height:1;}

.cal-empty{font-size:11px;color:#94a3b8;text-align:center;margin-top:18px;}

/* ✅ 达标背景 */
.cal-cell.ok{background:#ecfdf3;border:1px solid #d1fae5;}
.cal-cell.warn{background:#fef9c3;border:1px solid #fde68a;}
.cal-cell.none{background:#f3f4f6;border:1px solid #e5e7eb;}

/* ------------------ 高级动画：错峰 + 分层 ------------------ */
.cal-anim{
  opacity: 0;
  transform: translateY(8px);
  animation: calFadeUp 360ms cubic-bezier(.2,.8,.2,1) forwards;
  animation-delay: var(--delay, 0ms);
  will-change: opacity, transform;
}
@keyframes calFadeUp{
  to { opacity: 1; transform: translateY(0); }
}

/* a1~a6 只是标识，可后续扩展不同动效 */
.a1,.a2,.a3,.a4,.a5,.a6{}

/* ✅ 详情行默认折叠，hover 展开（降低拥挤感） */
.cal-detail{
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateY(6px);
  transition: max-height 240ms ease, opacity 240ms ease, transform 240ms ease;
  animation: none; /* 先不靠 keyframes，交给 hover */
}
.cal-cell:hover .cal-detail{
  max-height: 60px;
  opacity: 1;
  transform: translateY(0);
}

/* ------------------ 骨架 shimmer ------------------ */
.cal-skeleton{
  display:flex; flex-direction:column; gap:10px;
  padding:2px 2px;
}
.sk-top{display:flex; justify-content:space-between; align-items:center;}
.sk-day{width:16px;height:10px;border-radius:6px;}
.sk-badge{width:18px;height:18px;border-radius:999px;}
.sk-ring{width:44px;height:44px;border-radius:50%; margin:0 auto;}
.sk-line{height:10px;border-radius:6px;}
.sk-bars{display:flex;flex-direction:column;gap:6px;}
.sk-bar{height:6px;border-radius:999px;}
.sk-meals{height:14px;border-radius:8px;margin-top:4px;}

.cal-skeleton > * , .sk-top > *{
  background: linear-gradient(90deg, #eef2f7 0%, #f6f7fb 40%, #eef2f7 80%);
  background-size: 200% 100%;
  animation: shimmer 1.1s ease-in-out infinite;
}
@keyframes shimmer{
  0%{background-position: 180% 0;}
  100%{background-position: -20% 0;}
}

/* ✅ 低动效偏好 */
@media (prefers-reduced-motion: reduce){
  .cal-anim{animation:none; opacity:1; transform:none;}
  .cal-detail{transition:none; max-height:none; opacity:1; transform:none;}
  .cal-skeleton > * , .sk-top > *{animation:none;}
  .macro-fill{transition:none;}
  .cal-ring-core{transition:none;}
}

/* ------------------ 下面保持你原样 ------------------ */
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

.timeline{display:flex;flex-direction:column;gap:12px;position:relative;padding-left:60px;}
.timeline::before{content:'';position:absolute;left:30px;top:6px;bottom:6px;width:2px;background:#e5e7eb;}
.timeline-item{display:grid;grid-template-columns:48px 20px 1fr;align-items:flex-start;gap:8px;}
.timeline-time{font-size:11px;color:#6b7280;text-align:right;margin-top:2px;}
.timeline-dot{width:10px;height:10px;border-radius:999px;background:#cbd5f5;margin-top:6px;}
.timeline-dot.dot-breakfast{background:#10b981;}
.timeline-dot.dot-lunch{background:#3b82f6;}
.timeline-dot.dot-dinner{background:#f59e0b;}
.timeline-dot.dot-snack{background:#a855f7;}
.timeline-card{background:#fff;border:1px solid #eef1f6;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;}
.timeline-main{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.timeline-meta{display:flex;gap:10px;font-size:12px;color:#6b7280;}
.timeline-meta .note{color:#475569;}
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
.summary-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.summary-date{font-weight:800;}
.summary-status{display:flex;gap:8px;align-items:center;color:$text-secondary;font-size:12px;}
.head-right{display:flex;gap:8px;align-items:center;color:$text-secondary;font-size:12px;}
.head-target{color:$text-secondary;font-size:12px;}

@media(max-width: 980px){
  .container{padding:18px 16px;}
  .grid{grid-template-columns:1fr;}
  .kpi-row{grid-template-columns:repeat(2,1fr);}
}
</style>
