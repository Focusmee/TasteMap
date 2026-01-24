<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <div>
          <h2>今日饮食推荐</h2>
          <p class="sub">结合你的画像（目标/过敏原/偏好）自动生成</p>
        </div>
        <div class="actions">
          <el-button @click="refresh" :loading="loading" type="primary">刷新推荐</el-button>
          <el-button @click="$router.push('/profile')">完善画像</el-button>
        </div>
      </div>

      <el-alert
        v-if="banner"
        :title="banner"
        type="info"
        show-icon
        :closable="false"
        class="banner"
      />

      <el-skeleton :loading="loading" animated>
        <template #template>
          <div class="grid">
            <el-card v-for="i in 6" :key="i" class="card"><div style="height:140px" /></el-card>
          </div>
        </template>
        <template #default>
          <el-empty v-if="items.length===0" description="暂无推荐（请先导入知识库/完善画像）" />

          <div class="grid" v-else>
            <el-card v-for="it in items" :key="it.id" class="card" shadow="hover">
              <div class="card-head">
                <div>
                  <div class="name">{{ it.name }}</div>
                  <div class="meta">
                    <el-tag size="small" type="success" v-if="it.calories">{{ it.calories }} kcal/100g</el-tag>
                    <el-tag size="small" v-if="it.category" style="margin-left:8px">{{ it.category }}</el-tag>
                  </div>
                </div>
                <el-button size="small" type="primary" @click="openDetail(it)">查看</el-button>
              </div>
              <div class="reason">
                <el-icon><Star /></el-icon>
                <span>{{ it.reason || '适合今日搭配' }}</span>
              </div>
              <div class="row">
                <div class="kpi">
                  <div class="k">蛋白</div>
                  <div class="v">{{ it.protein ?? '-' }} g</div>
                </div>
                <div class="kpi">
                  <div class="k">碳水</div>
                  <div class="v">{{ it.carbs ?? '-' }} g</div>
                </div>
                <div class="kpi">
                  <div class="k">脂肪</div>
                  <div class="v">{{ it.fat ?? '-' }} g</div>
                </div>
              </div>
              <div class="foot">
                <el-button size="small" @click="addToDiet(it,'breakfast')">早餐</el-button>
                <el-button size="small" @click="addToDiet(it,'lunch')">午餐</el-button>
                <el-button size="small" @click="addToDiet(it,'dinner')">晚餐</el-button>
              </div>
            </el-card>
          </div>
        </template>
      </el-skeleton>
    </div>

    <el-drawer v-model="drawer" size="420px" :with-header="false">
      <div class="drawer">
        <div class="drawer-title">
          <div>
            <h3>{{ current?.name }}</h3>
            <div class="drawer-sub">{{ current?.summary || '营养信息仅供参考' }}</div>
          </div>
          <el-button text @click="drawer=false">关闭</el-button>
        </div>

        <div class="drawer-grid">
          <div class="mini">
            <div class="k">热量</div>
            <div class="v">{{ current?.calories ?? '-' }} kcal</div>
          </div>
          <div class="mini">
            <div class="k">蛋白</div>
            <div class="v">{{ current?.protein ?? '-' }} g</div>
          </div>
          <div class="mini">
            <div class="k">碳水</div>
            <div class="v">{{ current?.carbs ?? '-' }} g</div>
          </div>
          <div class="mini">
            <div class="k">脂肪</div>
            <div class="v">{{ current?.fat ?? '-' }} g</div>
          </div>
        </div>

        <el-divider />
        <div v-if="current?.allergens?.length" class="allergens">
          <div class="label">可能过敏原</div>
          <el-tag v-for="a in current.allergens" :key="a" type="danger" style="margin:6px 6px 0 0">{{ a }}</el-tag>
        </div>
        <div v-else class="allergens none">未标注过敏原</div>

        <el-divider />
        <div class="drawer-actions">
          <el-button type="primary" @click="addToDiet(current,'lunch')">加入午餐</el-button>
          <el-button @click="$router.push('/knowledge')">去知识库查看</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import { recommendationApi, dietApi } from '@/api'
import { Star } from '@element-plus/icons-vue'

const loading = ref(false)
const items = ref([])
const banner = ref('')

const drawer = ref(false)
const current = ref(null)

const refresh = async () => {
  loading.value = true
  try {
    const res = await recommendationApi.getToday()
    if (res.success) {
      items.value = res.data.items || []
      banner.value = res.data.banner || ''
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const openDetail = (it) => {
  current.value = it
  drawer.value = true
}

const addToDiet = async (it, meal_type) => {
  if (!it) return
  try {
    const res = await dietApi.add({
      meal_type,
      food_name: it.name,
      calories: it.calories,
      nutrition: {
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat
      },
      allergens: it.allergens || []
    })
    if (res.success) {
      ElMessage.success('已加入饮食日历')
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '网络错误')
  }
}

onMounted(refresh)
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.page{min-height:100vh;background:$bg-color;}
.container{padding:24px 40px;max-width:1200px;margin:0 auto;}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px;}
.sub{margin:6px 0 0;color:$text-secondary;}
.banner{margin:10px 0 18px;border-radius:12px;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.card{border-radius:14px;}
.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.name{font-size:18px;font-weight:700;color:$text-primary;}
.meta{margin-top:8px;}
.reason{display:flex;align-items:center;gap:8px;margin:14px 0;color:#2c3e50;}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px;}
.kpi{background:#f7f9ff;border-radius:12px;padding:10px 12px;}
.k{font-size:12px;color:$text-secondary;}
.v{margin-top:4px;font-weight:700;}
.foot{margin-top:14px;display:flex;gap:8px;justify-content:flex-end;}
.drawer{padding:8px 8px 18px;}
.drawer-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.drawer-sub{color:$text-secondary;margin-top:4px;}
.drawer-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:18px;}
.mini{background:#f7f9ff;border-radius:14px;padding:12px;}
.allergens .label{font-weight:600;margin-bottom:6px;}
.allergens.none{color:$text-secondary;}
.drawer-actions{display:flex;gap:10px;}

@media (max-width: 980px){
  .container{padding:18px 16px;}
  .grid{grid-template-columns:repeat(1,1fr);}
}
</style>
