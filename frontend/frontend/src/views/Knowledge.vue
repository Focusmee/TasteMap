<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <div>
          <h2>饮食知识库</h2>
          <p class="sub">查询卡路里、营养素、适配人群与过敏原</p>
        </div>
        <div class="actions">
          <el-button type="primary" plain @click="$router.push('/recommendation')">今日推荐</el-button>
        </div>
      </div>

      <el-card class="panel" shadow="never">
        <div class="filters">
          <el-input v-model="keyword" placeholder="搜索菜名/关键词" clearable @keyup.enter="load" style="width: 260px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="category" placeholder="分类" clearable style="width: 160px" @change="load">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
          <el-input-number v-model="minCal" :min="0" :max="5000" controls-position="right" placeholder="最低kcal" />
          <el-input-number v-model="maxCal" :min="0" :max="5000" controls-position="right" placeholder="最高kcal" />
          <el-button @click="load" type="primary">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>
      </el-card>

      <div class="grid">
        <el-card class="panel" shadow="never">
          <el-table :data="rows" v-loading="loading" style="width: 100%" @row-dblclick="open" @selection-change="onSelect">
          <el-table-column type="selection" width="42" />
          <el-table-column prop="name" label="菜名" min-width="160" />
          <el-table-column prop="category" label="分类" width="110" />
          <el-table-column prop="calorie_range" label="典型热量区间" width="170" />
          <el-table-column label="宏量营养" min-width="220">
            <template #default="{row}">
              <span class="macro">P {{ row.protein ?? '-' }}</span>
              <span class="macro">C {{ row.carbs ?? '-' }}</span>
              <span class="macro">F {{ row.fat ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="适合人群" min-width="170">
            <template #default="{row}">
              <template v-if="row.suitable_for?.length">
                <el-tag v-for="tag in row.suitable_for" :key="tag" type="success" class="pill">{{ tag }}</el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="不适合人群" min-width="170">
            <template #default="{row}">
              <template v-if="row.unsuitable_for?.length">
                <el-tag v-for="tag in row.unsuitable_for" :key="tag" type="danger" class="pill">{{ tag }}</el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{row}">
                <el-button size="small" type="primary" @click.stop="open(row)">详情</el-button>
                <el-button size="small" @click.stop="addToDiet(row)">加入</el-button>
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
            <el-button :disabled="selectedIds.length<2" @click="compare" type="primary" plain>对比选中</el-button>
          </div>
        </el-card>

        <el-card class="panel" shadow="never">
          <div class="panel-head">
            <div class="t">快捷搜索</div>
          </div>
          <el-autocomplete
            v-model="suggestText"
            :fetch-suggestions="fetchSuggest"
            placeholder="输入关键词，如：低脂、补蛋白、糖友"
            clearable
            @select="onSelectSuggest"
          />
          <el-divider />
          <el-alert title="提示" type="info" show-icon :closable="false">
            <template #default>
              <div>双击表格行可打开详情；按住 Ctrl/Shift 可多选后对比。</div>
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
        <el-button text @click="drawer=false">关闭</el-button>
      </div>

      <div class="tags" v-if="current?.suitable_for?.length">
        <div class="label">适合人群</div>
        <el-tag v-for="a in current.suitable_for" :key="a" type="success" class="pill">{{ a }}</el-tag>
      </div>
      <div class="tags warn" v-if="current?.unsuitable_for?.length">
        <div class="label">不适合人群</div>
        <el-tag v-for="a in current.unsuitable_for" :key="a" type="danger" class="pill">{{ a }}</el-tag>
      </div>

      <div class="tags" v-if="current?.allergens?.length">
        <div class="label">过敏原</div>
        <el-tag v-for="a in current.allergens" :key="a" type="danger" class="pill">{{ a }}</el-tag>
      </div>

        <el-divider />
        <div class="kv">
          <div class="k">蛋白</div><div class="v">{{ current?.protein ?? '-' }} g</div>
          <div class="k">碳水</div><div class="v">{{ current?.carbs ?? '-' }} g</div>
          <div class="k">脂肪</div><div class="v">{{ current?.fat ?? '-' }} g</div>
          <div class="k">纤维</div><div class="v">{{ current?.fiber ?? '-' }} g</div>
          <div class="k">糖</div><div class="v">{{ current?.sugar ?? '-' }} g</div>
          <div class="k">钠</div><div class="v">{{ current?.sodium ?? '-' }} mg</div>
        </div>

        <el-divider />
        <div class="drawer-actions">
          <el-button type="primary" @click="addToDiet(current)">加入饮食日历</el-button>
          <el-button @click="$router.push('/chat')">问营养助手</el-button>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="cmpDialog" title="营养对比" width="720px">
      <el-table :data="cmp" style="width:100%">
        <el-table-column prop="name" label="菜名" min-width="160" />
        <el-table-column prop="calories" label="kcal" width="90" />
        <el-table-column prop="protein" label="蛋白" width="90" />
        <el-table-column prop="carbs" label="碳水" width="90" />
        <el-table-column prop="fat" label="脂肪" width="90" />
        <el-table-column prop="sodium" label="钠(mg)" width="100" />
      </el-table>
      <template #footer>
        <el-button @click="cmpDialog=false">关闭</el-button>
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

const selectedIds = ref([])
const onSelect = (sel) => {
  selectedIds.value = (sel || []).map(r => r.id)
}
const cmpDialog = ref(false)
const cmp = ref([])

const suggestText = ref('')

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
      ElMessage.error(res.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '网络错误')
  } finally {
    loading.value = false
  }
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
  const res = await knowledgeApi.detail(row.id)
  if (res.success) {
    current.value = res.data
    drawer.value = true
  }
}

const addToDiet = async (row) => {
  if (!row) return
  const res = await dietApi.add({
    meal_type: 'lunch',
    food_name: row.name,
    calories: row.calories,
    nutrition: { protein: row.protein, carbs: row.carbs, fat: row.fat },
    allergens: row.allergens || []
  })
  if (res.success) ElMessage.success('已加入饮食日历')
  else ElMessage.error(res.message || '添加失败')
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
  else cb([])
}

const onSelectSuggest = (item) => {
  keyword.value = item.value
  page.value = 1
  load()
}

onMounted(async () => {
  await loadMeta()
  await load()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;
.page{min-height:100vh;background:$bg-color;}
.container{padding:24px 40px;max-width:1200px;margin:0 auto;}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px;}
.sub{margin:6px 0 0;color:$text-secondary;}
.panel{border-radius:14px;margin-bottom:16px;}
.filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;}
.pager{display:flex;justify-content:space-between;align-items:center;margin-top:12px;}
.macro{margin-right:10px;color:#2c3e50;}
.pill{margin:6px 6px 0 0;}
.tags.warn .label{color:#c0392b;}
.drawer{padding:8px 8px 18px;}
.drawer-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.drawer-sub{color:$text-secondary;margin-top:4px;}
.kv{display:grid;grid-template-columns:90px 1fr;row-gap:10px;column-gap:10px;}
.kv .k{color:$text-secondary;}
.kv .v{font-weight:700;}
.drawer-actions{display:flex;gap:10px;}
.panel-head .t{font-weight:700;}
@media (max-width: 980px){
  .container{padding:18px 16px;}
  .grid{grid-template-columns:1fr;}
}
</style>
