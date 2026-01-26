<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <div>
          <h2>饮食知识库</h2>
          <p class="sub">查询热量、营养、标签与过敏原</p>
        </div>
        <div class="actions">
          <el-button type="primary" plain @click="$router.push('/recommendation')">今日推荐</el-button>
        </div>
      </div>

      <el-card class="panel" shadow="never">
        <div class="filters">
          <el-input
            v-model="keyword"
            placeholder="搜索菜名/关键词"
            clearable
            @keyup.enter="load"
            style="width: 260px"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="category" placeholder="分类" clearable style="width: 160px" @change="loadFirst">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
          <el-input-number v-model="minCal" :min="0" :max="5000" controls-position="right" placeholder="最低热量" />
          <el-input-number v-model="maxCal" :min="0" :max="5000" controls-position="right" placeholder="最高热量" />
          <el-button @click="loadFirst" type="primary">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>
      </el-card>

      <div class="grid">
        <el-card class="panel" shadow="never">
          <el-table
            :data="rows"
            v-loading="loading"
            style="width: 100%"
            @row-dblclick="open"
            @selection-change="onSelect"
          >
            <el-table-column type="selection" width="42" />
            <el-table-column prop="name" label="菜名" min-width="160" />
            <el-table-column prop="category" label="分类" width="110" />
            <el-table-column prop="calorie_range" label="典型热量区间" width="170" />
            <el-table-column label="宏量营养" min-width="220">
              <template #default="{ row }">
                <span class="macro">蛋白 {{ formatNumber(row.protein) }}</span>
                <span class="macro">碳水 {{ formatNumber(row.carbs) }}</span>
                <span class="macro">脂肪 {{ formatNumber(row.fat) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="标签" min-width="180">
              <template #default="{ row }">
                <el-tag v-for="t in previewTags(row.tags)" :key="t" size="small" class="pill">{{ formatTag(t) }}</el-tag>
                <span v-if="(row.tags || []).length > 3" class="muted">+{{ row.tags.length - 3 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click.stop="open(row)">详情</el-button>
                <el-button size="small" @click.stop="openAdd(row)">加入日历</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pager">
            <el-pagination
              layout="prev, pager, next"
              :total="total"
              :page-size="size"
              v-model:current-page="page"
              @current-change="load"
            />
            <el-button :disabled="selectedIds.length < 2" @click="compare" type="primary" plain>对比选中</el-button>
          </div>
        </el-card>

        <el-card class="panel" shadow="never">
          <div class="panel-head">
            <div class="t">快捷搜索</div>
          </div>
          <el-autocomplete
            v-model="suggestText"
            :fetch-suggestions="fetchSuggest"
            placeholder="输入关键词，如：低脂、补蛋白、控糖"
            clearable
            @select="onSelectSuggest"
          />
          <el-divider />
          <el-alert title="提示" type="info" show-icon :closable="false">
            <template #default>
              <div>双击表格行可打开详情；按住控制键或上档键可多选后对比。</div>
            </template>
          </el-alert>
        </el-card>
      </div>
    </div>

    <el-drawer v-model="drawer" size="460px" :with-header="false">
      <div class="drawer">
        <div class="drawer-title">
          <div>
            <h3>{{ current?.name }}</h3>
            <div class="drawer-sub">{{ current?.category || '-' }} · {{ current?.calorie_range || '-' }}</div>
          </div>
          <el-button text @click="drawer = false">关闭</el-button>
        </div>

        <div class="drawer-media" v-if="current?.image_url">
          <img :src="current.image_url" alt="food" />
        </div>

        <div class="tags" v-if="(current?.tags || []).length">
          <div class="label">标签</div>
          <el-tag v-for="t in current.tags" :key="t" class="pill">{{ formatTag(t) }}</el-tag>
        </div>

        <div class="tags" v-if="(current?.allergens || []).length">
          <div class="label">过敏原</div>
          <el-tag v-for="a in current.allergens" :key="a" type="danger" class="pill">{{ formatTag(a) }}</el-tag>
        </div>

        <div class="tags" v-if="(current?.ingredients || []).length">
          <div class="label">主要成分</div>
          <el-tag v-for="i in current.ingredients" :key="i" type="info" class="pill">{{ i }}</el-tag>
        </div>

        <div class="tags" v-if="(current?.risk_flags || []).length">
          <div class="label">风险提示</div>
          <el-tag v-for="r in current.risk_flags" :key="r" type="warning" class="pill">{{ formatTag(r) }}</el-tag>
        </div>

        <el-divider />
        <div class="kv">
          <div class="k">蛋白</div><div class="v">{{ formatNumber(current?.protein) }} 克</div>
          <div class="k">碳水</div><div class="v">{{ formatNumber(current?.carbs) }} 克</div>
          <div class="k">脂肪</div><div class="v">{{ formatNumber(current?.fat) }} 克</div>
          <div class="k">纤维</div><div class="v">{{ formatNumber(current?.fiber) }} 克</div>
          <div class="k">糖</div><div class="v">{{ formatNumber(current?.sugar) }} 克</div>
          <div class="k">钠</div><div class="v">{{ formatNumber(current?.sodium) }} 毫克</div>
        </div>

        <el-divider />
        <div class="kv">
          <div class="k">参考份量</div><div class="v">{{ servingLabel(current) }}</div>
          <div class="k">烹饪方式</div><div class="v">{{ current?.cook_method || '不详' }}</div>
          <div class="k">数据来源</div><div class="v">{{ current?.source || '未知' }}</div>
          <div class="k">更新时间</div><div class="v">{{ current?.update_time ? dayjs(current.update_time).format('YYYY-MM-DD') : '-' }}</div>
        </div>

        <el-divider />
        <div class="desc">{{ current?.description || '暂无描述' }}</div>

        <el-divider />
        <div class="drawer-actions">
          <el-button type="primary" @click="openAdd(current)">加入饮食日历</el-button>
          <el-button @click="$router.push('/chat')">问营养助手</el-button>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="cmpDialog" title="营养对比" width="720px">
      <el-table :data="cmp" style="width: 100%">
        <el-table-column prop="name" label="菜名" min-width="160" />
        <el-table-column prop="calories" label="千卡" width="90" />
        <el-table-column prop="protein" label="蛋白" width="90" />
        <el-table-column prop="carbs" label="碳水" width="90" />
        <el-table-column prop="fat" label="脂肪" width="90" />
        <el-table-column prop="sodium" label="钠（毫克）" width="100" />
      </el-table>
      <template #footer>
        <el-button @click="cmpDialog = false">关闭</el-button>
      </template>
    </el-dialog>


    <el-dialog v-model="addDialog" title="加入饮食日历" width="520px">
      <div class="add-head">
        <div class="add-title">{{ addTarget?.name || '-' }}</div>
        <div class="add-sub">参考份量：{{ servingLabel(addTarget) }}</div>
      </div>
      <el-form :model="addForm" label-width="90px">
        <el-form-item label="日期">
          <el-date-picker v-model="addForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="餐次">
          <el-select v-model="addForm.meal_type" style="width: 100%">
            <el-option label="早餐" value="breakfast" />
            <el-option label="午餐" value="lunch" />
            <el-option label="晚餐" value="dinner" />
            <el-option label="加餐" value="snack" />
          </el-select>
        </el-form-item>
        <el-form-item label="分量">
          <div class="portion">
            <el-input-number v-model="addForm.portion" :min="0.1" :max="10" :step="0.5" />
            <el-select v-model="addForm.portion_unit" style="width: 120px">
              <el-option label="份" value="份" />
              <el-option label="克" value="克" />
              <el-option label="毫升" value="毫升" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="addForm.note" placeholder="例如：少油、少盐" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialog=false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="confirmAdd">确认加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import { knowledgeApi, dietApi } from '@/api'
import { Search } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const loading = ref(false)
const categories = ref([])

const keyword = ref('')
const category = ref('')
const minCal = ref(null)
const maxCal = ref(null)

const page = ref(1)
const size = ref(10)
const total = ref(0)
const rows = ref([])

const drawer = ref(false)
const current = ref(null)
const addDialog = ref(false)
const adding = ref(false)
const addTarget = ref(null)
const addForm = ref({
  date: dayjs().format('YYYY-MM-DD'),
  meal_type: 'lunch',
  portion: 1,
  portion_unit: '\u4efd',
  note: ''
})

const selectedIds = ref([])
const onSelect = (sel) => {
  selectedIds.value = (sel || []).map(r => r.id)
}
const cmpDialog = ref(false)
const cmp = ref([])

const suggestText = ref('')

const tagMap = {
  high_fat: '\u9ad8\u8102',
  low_fat: '\u4f4e\u8102',
  fried: '\u6cb9\u70b8',
  roasted: '\u70e4\u5236',
  stewed: '\u7096\u716e',
  spicy: '\u8f9b\u8fa3',
  salty: '\u91cd\u53e3\u5473',
  sweet: '\u751c\u5473',
  soup: '\u6c64\u7c7b',
  drink: '\u996e\u54c1',
  fast_food: '\u5feb\u9910',
  processed: '\u52a0\u5de5\u98df\u54c1',
  high_protein: '\u9ad8\u86cb\u767d',
  low_carb: '\u4f4e\u78b3',
  high_carb: '\u9ad8\u78b3\u6c34',
  high_sodium: '\u9ad8\u94a0',
  high_sugar: '\u9ad8\u7cd6',
  carb: '\u78b3\u6c34\u4e3b\u8981',
  breakfast: '\u65e9\u9910',
  whole_grain: '\u5168\u8c37\u7269',
  vegan: '\u7d14\u7d20',
  noodle: '\u9762\u98df',
  light: '\u6e05\u6de1',
  veggie: '\u852c\u83dc'
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  return Number.isFinite(num) ? num : '-'
}

const formatTag = (value) => {
  if (!value) return ''
  const raw = String(value).trim()
  const key = raw.toLowerCase().replace(/\s+/g, '_')
  if (tagMap[key]) return tagMap[key]
  if (/[\u4e00-\u9fff]/.test(raw)) return raw
  return '\u5176\u4ed6'
}

const previewTags = (tags) => {
  if (!Array.isArray(tags)) return []
  return tags.slice(0, 3)
}

const loadMeta = async () => {
  const res = await knowledgeApi.meta()
  if (res.success) categories.value = res.data.categories || []
}

const load = async () => {
  loading.value = true
  try {
    const res = await knowledgeApi.list({
      keyword: keyword.value,
      category: category.value,
      minCal: minCal.value,
      maxCal: maxCal.value,
      page: page.value,
      size: size.value
    })
    if (res.success) {
      rows.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.message || '\u52a0\u8f7d\u5931\u8d25')
    }
  } catch (e) {
    ElMessage.error(e?.message || '\u7f51\u7edc\u9519\u8bef')
  } finally {
    loading.value = false
  }
}

const loadFirst = () => {
  page.value = 1
  load()
}

const reset = () => {
  keyword.value = ''
  category.value = ''
  minCal.value = null
  maxCal.value = null
  page.value = 1
  load()
}

const open = async (row) => {
  if (!row?.id) return
  const res = await knowledgeApi.detail(row.id)
  if (res.success) {
    current.value = res.data
    drawer.value = true
  }
}


const openAdd = (row) => {
  if (!row) return
  addTarget.value = row
  addForm.value = {
    date: dayjs().format('YYYY-MM-DD'),
    meal_type: 'lunch',
    portion: 1,
    portion_unit: '\u4efd',
    note: ''
  }
  addDialog.value = true
}

const confirmAdd = async () => {
  if (!addTarget.value) return
  adding.value = true
  try {
    const res = await dietApi.add({
      log_date: addForm.value.date,
      meal_type: addForm.value.meal_type,
      food_name: addTarget.value.name,
      calories: addTarget.value.calories,
      nutrition: { protein: addTarget.value.protein, carbs: addTarget.value.carbs, fat: addTarget.value.fat },
      allergens: addTarget.value.allergens || [],
      portion: addForm.value.portion,
      portion_unit: addForm.value.portion_unit,
      note: addForm.value.note
    })
    if (res.success) {
      ElMessage.success('已加入饮食日历')
      addDialog.value = false
    } else {
      ElMessage.error(res.message || '加入失败')
    }
  } finally {
    adding.value = false
  }
}

const servingLabel = (row) => {
  if (!row) return '-'
  const size = row.serving_size_g ?? 100
  const unitRaw = row.serving_unit || '\u514b'
  const unit = unitRaw === 'g' ? '\u514b' : unitRaw === 'ml' ? '\u6beb\u5347' : unitRaw
  return `${size}${unit}`
}

const compare = async () => {
  const res = await knowledgeApi.compare(selectedIds.value)
  if (res.success) {
    cmp.value = res.data.list || []
    cmpDialog.value = true
  }
}

const fetchSuggest = async (q, cb) => {
  const res = await knowledgeApi.suggest(q)
  if (res.success) cb((res.data.list || []).map(x => ({ value: x })))
}

const onSelectSuggest = () => {
  keyword.value = suggestText.value
  page.value = 1
  load()
}

onMounted(() => {
  loadMeta()
  load()
})
</script>

<style scoped>
.page {
  padding: 16px 20px 40px;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}
.sub {
  margin: 0;
  color: #667085;
}
.panel {
  margin-bottom: 16px;
}
.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.panel-head .t {
  font-weight: 600;
}
.macro {
  display: inline-block;
  min-width: 80px;
  color: #344054;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.pill {
  margin-right: 6px;
  margin-bottom: 6px;
}
.muted {
  color: #98a2b3;
  font-size: 12px;
}
.drawer {
  padding: 12px 18px 18px;
}
.drawer-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.drawer-sub {
  color: #667085;
  margin-top: 4px;
}
.drawer-media {
  margin: 12px 0 6px;
  border-radius: 10px;
  overflow: hidden;
}
.drawer-media img {
  width: 100%;
  display: block;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 12px;
}
.tags .label {
  font-weight: 600;
  margin-right: 6px;
}
.kv {
  display: grid;
  grid-template-columns: 70px 1fr;
  row-gap: 8px;
  column-gap: 12px;
}
.kv .k {
  color: #667085;
}
.kv .v {
  color: #111827;
}
.desc {
  color: #475467;
  line-height: 1.6;
}
.drawer-actions {
  display: flex;
  gap: 10px;
}
.add-head {
  margin-bottom: 12px;
}
.add-title {
  font-weight: 600;
  font-size: 16px;
}
.add-sub {
  color: #667085;
  margin-top: 4px;
}
.portion {
  display: flex;
  gap: 8px;
  align-items: center;
}
@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
