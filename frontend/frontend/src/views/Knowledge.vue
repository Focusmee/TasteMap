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
          <el-radio-group v-model="viewMode" size="small" class="view-toggle">
            <el-radio-button label="card">卡片视图</el-radio-button>
            <el-radio-button label="table">表格视图</el-radio-button>
          </el-radio-group>
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
          <el-select v-model="targetFilter" placeholder="目标" clearable style="width: 140px">
            <el-option label="减脂" value="cut" />
            <el-option label="增肌" value="bulk" />
            <el-option label="控糖" value="low_sugar" />
            <el-option label="清淡" value="light" />
          </el-select>
          <el-select v-model="tagFilter" multiple collapse-tags placeholder="标签" style="width: 220px">
            <el-option v-for="t in tagOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
          <el-select v-model="allergenFilter" multiple collapse-tags placeholder="排除过敏原" style="width: 220px">
            <el-option v-for="a in commonAllergens" :key="a" :label="a" :value="a" />
          </el-select>
          <div class="range">
            <div class="range-label">热量区间</div>
            <el-slider v-model="calRange" range :min="0" :max="1200" :step="50" style="width: 220px" />
            <div class="range-val">{{ calRange[0] }} - {{ calRange[1] }} 千卡</div>
          </div>
          <el-button @click="applyFilters" type="primary">应用</el-button>
          <el-button @click="reset">重置</el-button>
        </div>
      </el-card>

      <div class="grid">
        <el-card class="panel" shadow="never">
          <div class="cards">
            <template v-if="viewMode === 'card'">
              <el-skeleton v-if="loading" :rows="3" animated>
                <template #template>
                  <div class="card-grid">
                    <div v-for="i in 6" :key="i" class="food-card skeleton">
                      <div class="card-top">
                        <div class="sk-line" style="width: 20px; height: 20px;"></div>
                        <div class="card-title">
                          <div class="sk-line" style="width: 120px;"></div>
                          <div class="sk-line" style="width: 60px;"></div>
                        </div>
                        <div class="card-actions">
                          <div class="sk-line" style="width: 60px;"></div>
                          <div class="sk-line" style="width: 72px;"></div>
                        </div>
                      </div>
                      <div class="card-media">
                        <div class="media-placeholder"></div>
                      </div>
                      <div class="pill-row">
                        <div class="sk-pill"></div>
                        <div class="sk-pill"></div>
                      </div>
                      <div class="pill-row">
                        <div class="sk-pill"></div>
                        <div class="sk-pill"></div>
                        <div class="sk-pill"></div>
                      </div>
                    </div>
                  </div>
                </template>
              </el-skeleton>

              <el-empty v-else-if="displayedRows.length === 0" description="暂无菜品" />
              <div v-else class="card-grid">
                <div class="food-card add-card" @click="openCreate">
                  <div class="add-inner">
                    <el-icon size="22"><Plus /></el-icon>
                    <div class="add-title">添加菜品</div>
                    <div class="add-sub">录入热量与营养信息</div>
                  </div>
                </div>
                <div v-for="row in displayedRows" :key="row.id" class="food-card">
                  <div class="card-top">
                    <el-checkbox
                      :model-value="isSelected(row.id)"
                      @change="val => toggleSelect(row, val)"
                    >加入对比</el-checkbox>
                    <div class="card-title">
                      <div class="name">{{ row.name }}</div>
                      <div class="sub">{{ row.category || '未分类' }}</div>
                    </div>
                    <div class="card-actions">
                      <el-button size="small" type="primary" @click.stop="open(row)">展开</el-button>
                      <el-button size="small" @click.stop="openAdd(row)">加入日历</el-button>
                    </div>
                  </div>

                  <div class="card-media">
                    <img v-if="row.image_url" :src="row.image_url" alt="food" />
                    <div v-else class="media-placeholder">{{ row.name?.slice(0, 1) || '食' }}</div>
                  </div>

                  <div class="pill-row">
                    <span class="pill chip kcal">热量 {{ row.calories ?? 0 }} 千卡/每{{ servingLabel(row) }}</span>
                    <span class="pill chip pcf">P/C/F {{ pcfLabel(row) }}</span>
                  </div>

                  <div class="macro-stack">
                    <div class="stack">
                      <div class="seg p" :style="{ width: macroPercent(row, 'protein') }"></div>
                      <div class="seg c" :style="{ width: macroPercent(row, 'carbs') }"></div>
                      <div class="seg f" :style="{ width: macroPercent(row, 'fat') }"></div>
                    </div>
                    <div class="macro-legend">
                      <span class="dot p"></span>蛋白
                      <span class="dot c"></span>碳水
                      <span class="dot f"></span>脂肪
                    </div>
                  </div>

                  <div class="density">
                    <div class="density-head">
                      热量密度
                      <span class="density-val">{{ densityMeta(row).value }} {{ densityMeta(row).label }}</span>
                    </div>
                    <div class="density-bar">
                      <div class="density-fill" :style="{ width: densityPercent(row) }"></div>
                    </div>
                  </div>

                  <div class="pill-row" v-if="(row.tags || []).length">
                    <span v-for="t in previewTags(row.tags)" :key="t" class="pill chip tag">{{ formatTag(t) }}</span>
                    <span v-if="(row.tags || []).length > 3" class="pill chip more">+{{ row.tags.length - 3 }}</span>
                  </div>

                  <div class="pill-row" v-if="(row.allergens || []).length">
                    <span class="pill chip allergen">&#9888; {{ (row.allergens || []).map(formatTag).join(' / ') }}</span>
                  </div>

                  <div class="pill-row">
                    <span v-for="s in sceneTags(row)" :key="s" class="pill chip scene">{{ s }}</span>
                  </div>

                  <div class="hover-detail">
                    <div class="bar-row protein">
                      <span class="bar-label">蛋白</span>
                      <div class="bar"><div class="fill" :style="{ width: macroPercent(row, 'protein') }"></div></div>
                      <span class="bar-val">{{ formatNumber(row.protein) }}克</span>
                    </div>
                    <div class="bar-row carbs">
                      <span class="bar-label">碳水</span>
                      <div class="bar"><div class="fill" :style="{ width: macroPercent(row, 'carbs') }"></div></div>
                      <span class="bar-val">{{ formatNumber(row.carbs) }}克</span>
                    </div>
                    <div class="bar-row fat">
                      <span class="bar-label">脂肪</span>
                      <div class="bar"><div class="fill" :style="{ width: macroPercent(row, 'fat') }"></div></div>
                      <span class="bar-val">{{ formatNumber(row.fat) }}克</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <el-table
                v-loading="loading"
                :data="displayedRows"
                style="width: 100%"
                @row-dblclick="open"
              >
                <el-table-column label="对比" width="70">
                  <template #default="{ row }">
                    <el-checkbox
                      :model-value="isSelected(row.id)"
                      @change="val => toggleSelect(row, val)"
                    />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="菜品" min-width="160" />
                <el-table-column prop="category" label="分类" width="100" />
                <el-table-column prop="calories" label="千卡" width="90" />
                <el-table-column label="P/C/F" min-width="150">
                  <template #default="{ row }">
                    <div class="stack table-stack">
                      <div class="seg p" :style="{ width: macroPercent(row, 'protein') }"></div>
                      <div class="seg c" :style="{ width: macroPercent(row, 'carbs') }"></div>
                      <div class="seg f" :style="{ width: macroPercent(row, 'fat') }"></div>
                    </div>
                    <div class="muted">{{ pcfLabel(row) }}</div>
                  </template>
                </el-table-column>
                <el-table-column label="热量密度" min-width="180">
                  <template #default="{ row }">
                    <div class="density table-density">
                      <div class="density-head">
                        <span class="density-val">{{ densityMeta(row).value }} {{ densityMeta(row).label }}</span>
                      </div>
                      <div class="density-bar">
                        <div class="density-fill" :style="{ width: densityPercent(row) }"></div>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="160">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" @click.stop="open(row)">展开</el-button>
                    <el-button size="small" @click.stop="openAdd(row)">加入</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="!loading && displayedRows.length === 0" description="暂无菜品" />
            </template>
          </div>
          <div class="pager">
            <el-pagination
              layout="prev, pager, next"
              :total="total"
              :page-size="size"
              v-model:current-page="page"
              @current-change="load"
            />
            <el-button :disabled="compareItems.length < 2" @click="compare" type="primary" plain>对比选中</el-button>
          </div>
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
      <el-divider />
      <div class="date-summary">
        <div class="summary-title">所选日期汇总</div>
        <div class="summary-kpi">
          <span class="kpi-item">总热量：{{ addSummary.calories ?? 0 }} 千卡</span>
          <span class="kpi-item">蛋白：{{ addSummary.protein ?? 0 }} 克</span>
          <span class="kpi-item">碳水：{{ addSummary.carbs ?? 0 }} 克</span>
          <span class="kpi-item">脂肪：{{ addSummary.fat ?? 0 }} 克</span>
        </div>
        <el-empty v-if="!addSummaryLoading && addSummaryList.length === 0" description="暂无记录" />
        <div v-else class="summary-list">
          <div v-for="it in addSummaryList" :key="it.id" class="summary-item">
            <div class="name">{{ it.food_name }}</div>
            <div class="meta">{{ it.calories ?? 0 }} 千卡 · {{ it.meal_type }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="addDialog=false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="confirmAdd">确认加入</el-button>
      </template>
    </el-dialog>


    <el-dialog v-model="bulkDialog" title="批量加入饮食日历" width="520px">
      <div class="add-head">
        <div class="add-title">共选中 {{ compareItems.length }} 个菜品</div>
        <div class="add-sub">将统一写入同一日期与餐次</div>
      </div>
      <el-form :model="bulkForm" label-width="90px">
        <el-form-item label="日期">
          <el-date-picker v-model="bulkForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="餐次">
          <el-select v-model="bulkForm.meal_type" style="width: 100%">
            <el-option label="早餐" value="breakfast" />
            <el-option label="午餐" value="lunch" />
            <el-option label="晚餐" value="dinner" />
            <el-option label="加餐" value="snack" />
          </el-select>
        </el-form-item>
        <el-form-item label="分量">
          <div class="portion">
            <el-input-number v-model="bulkForm.portion" :min="0.1" :max="10" :step="0.5" />
            <el-select v-model="bulkForm.portion_unit" style="width: 120px">
              <el-option label="份" value="份" />
              <el-option label="克" value="克" />
              <el-option label="毫升" value="毫升" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="bulkForm.note" placeholder="例如：少油、少盐" />
        </el-form-item>
      </el-form>
      <el-divider />
      <div class="date-summary">
        <div class="summary-title">所选日期汇总</div>
        <div class="summary-kpi">
          <span class="kpi-item">总热量：{{ bulkSummary.calories ?? 0 }} 千卡</span>
          <span class="kpi-item">蛋白：{{ bulkSummary.protein ?? 0 }} 克</span>
          <span class="kpi-item">碳水：{{ bulkSummary.carbs ?? 0 }} 克</span>
          <span class="kpi-item">脂肪：{{ bulkSummary.fat ?? 0 }} 克</span>
        </div>
        <el-empty v-if="!bulkSummaryLoading && bulkSummaryList.length === 0" description="暂无记录" />
        <div v-else class="summary-list">
          <div v-for="it in bulkSummaryList" :key="it.id" class="summary-item">
            <div class="name">{{ it.food_name }}</div>
            <div class="meta">{{ it.calories ?? 0 }} 千卡 · {{ it.meal_type }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="bulkDialog=false">取消</el-button>
        <el-button type="primary" :loading="bulkAdding" @click="confirmBulkAdd">确认加入</el-button>
      </template>
    </el-dialog>


    <el-dialog v-model="createDialog" title="添加菜品" width="640px">
      <el-form :model="createForm" label-width="92px">
        <el-form-item label="菜品名" required>
          <el-input v-model="createForm.name" placeholder="例如：鸡胸肉沙拉" />
        </el-form-item>

        <el-form-item label="分类">
          <el-input v-model="createForm.category" placeholder="例如：沙拉/主食/饮品" />
        </el-form-item>

        <el-form-item label="热量(千卡)" required>
          <el-input-number v-model="createForm.calories" :min="0" :max="5000" controls-position="right" />
          <span class="hint"> /100克</span>
        </el-form-item>

        <el-form-item label="蛋白/碳水/脂肪">
          <el-input-number v-model="createForm.protein" :min="0" :max="200" controls-position="right" />
          <span class="hint">g</span>
          <el-input-number v-model="createForm.carbs" :min="0" :max="200" controls-position="right" style="margin-left:12px;" />
          <span class="hint">g</span>
          <el-input-number v-model="createForm.fat" :min="0" :max="200" controls-position="right" style="margin-left:12px;" />
          <span class="hint">g</span>
        </el-form-item>

        <el-form-item label="其他营养">
          <div class="row-2">
            <div class="row-2-item">
              <div class="row-2-label">纤维</div>
              <el-input-number v-model="createForm.fiber" :min="0" :max="200" controls-position="right" />
              <span class="hint">g</span>
            </div>
            <div class="row-2-item">
              <div class="row-2-label">糖</div>
              <el-input-number v-model="createForm.sugar" :min="0" :max="200" controls-position="right" />
              <span class="hint">g</span>
            </div>
            <div class="row-2-item">
              <div class="row-2-label">钠</div>
              <el-input-number v-model="createForm.sodium" :min="0" :max="10000" controls-position="right" />
              <span class="hint">mg</span>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="标签">
          <el-input v-model="createForm.tags" placeholder="逗号分隔：low_fat,high_protein,spicy" />
        </el-form-item>

        <el-form-item label="过敏原">
          <el-input v-model="createForm.allergens" placeholder="逗号分隔：peanut,milk,egg" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="可选：口味/做法/注意事项" />
        </el-form-item>

        <el-form-item label="图片URL">
          <el-input v-model="createForm.image_url" placeholder="可选：https://..." />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialog=false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>
    <div v-if="compareItems.length >= 2" class="compare-bar">
      <div class="compare-left">
        <div class="compare-title">对比模式 · 已选 {{ compareItems.length }} 个</div>
        <div class="compare-actions">
          <el-button size="small" @click="clearCompare">清空</el-button>
          <el-button size="small" type="primary" @click="compare">查看对比</el-button>
          <el-button size="small" type="success" @click="bulkDialog = true">一键加入日历</el-button>
        </div>
      </div>
      <div class="compare-body">
        <div class="cmp-section">
          <div class="cmp-title">热量对比</div>
          <div class="cmp-bars">
            <div v-for="it in compareItems" :key="it.id" class="cmp-row">
              <div class="cmp-name">{{ it.name }}</div>
              <div class="cmp-bar">
                <div class="cmp-fill" :style="{ width: caloriePercent(it) }"></div>
              </div>
              <div class="cmp-val">{{ it.calories ?? 0 }} 千卡</div>
            </div>
          </div>
        </div>
        <div class="cmp-section">
          <div class="cmp-title">P/C/F 对比</div>
          <div class="cmp-stacks">
            <div v-for="it in compareItems" :key="it.id" class="cmp-row">
              <div class="cmp-name">{{ it.name }}</div>
              <div class="stack">
                <div class="seg p" :style="{ width: macroPercent(it, 'protein') }"></div>
                <div class="seg c" :style="{ width: macroPercent(it, 'carbs') }"></div>
                <div class="seg f" :style="{ width: macroPercent(it, 'fat') }"></div>
              </div>
              <div class="cmp-val">{{ pcfLabel(it) }}</div>
            </div>
          </div>
        </div>
        <div class="cmp-section">
          <div class="cmp-title">过敏原冲突</div>
          <div class="cmp-allergen" :class="{ danger: conflictAllergens.length }">
            <span v-if="conflictAllergens.length">&#9888; {{ conflictAllergens.join(' / ') }}</span>
            <span v-else>未检测到冲突</span>
          </div>
        </div>
        <div class="cmp-section">
          <div class="cmp-title">目标适配</div>
          <div class="cmp-score">
            <div v-for="it in compareItems" :key="it.id" class="cmp-row">
              <div class="cmp-name">{{ it.name }}</div>
              <div class="score" :class="scoreClass(scoreForTarget(it, targetFilter))">
                {{ scoreLabel(scoreForTarget(it, targetFilter)) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import { knowledgeApi, dietApi } from '@/api'
import { Search, Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
const loading = ref(false)
const categories = ref([])

const keyword = ref('')
const category = ref('')
const minCal = ref(null)
const maxCal = ref(null)
const calRange = ref([0, 1200])
const targetFilter = ref('')
const allergenFilter = ref([])
const tagFilter = ref([])
const viewMode = ref('card')

const page = ref(1)
const size = ref(10)
const total = ref(0)
const rows = ref([])

const drawer = ref(false)
const current = ref(null)
const bulkDialog = ref(false)
const bulkAdding = ref(false)
const bulkForm = ref({
  date: dayjs().format('YYYY-MM-DD'),
  meal_type: 'lunch',
  portion: 1,
  portion_unit: '\u4efd',
  note: ''
})
const bulkSummaryLoading = ref(false)
const bulkSummary = ref({ calories: 0, protein: 0, carbs: 0, fat: 0 })
const bulkSummaryList = ref([])


const createDialog = ref(false)
const creating = ref(false)
const createForm = ref({
  name: '',
  category: '',
  calories: 0,
  protein: null,
  carbs: null,
  fat: null,
  fiber: null,
  sugar: null,
  sodium: null,
  tags: '',
  allergens: '',
  description: '',
  image_url: ''
})

const openCreate = () => {
  createForm.value = {
    name: '',
    category: '',
    calories: 0,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sugar: null,
    sodium: null,
    tags: '',
    allergens: '',
    description: '',
    image_url: ''
  }
  createDialog.value = true
}

const submitCreate = async () => {
  const name = String(createForm.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请先填写菜品名')
    return
  }
  creating.value = true
  try {
    const payload = {
      name,
      category: createForm.value.category || null,
      calories: Number(createForm.value.calories) || 0,
      protein: createForm.value.protein,
      carbs: createForm.value.carbs,
      fat: createForm.value.fat,
      fiber: createForm.value.fiber,
      sugar: createForm.value.sugar,
      sodium: createForm.value.sodium,
      tags: createForm.value.tags,
      allergens: createForm.value.allergens,
      description: createForm.value.description || null,
      image_url: createForm.value.image_url || null
    }
    const res = await knowledgeApi.create(payload)
    if (res.success) {
      ElMessage.success('已添加')
      createDialog.value = false
      await loadMeta()
      await loadFirst()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '添加失败')
  } finally {
    creating.value = false
  }
}

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
const addSummaryLoading = ref(false)
const addSummary = ref({ calories: 0, protein: 0, carbs: 0, fat: 0 })
const addSummaryList = ref([])

const selectedMap = ref({})

const isSelected = (id) => Boolean(selectedMap.value[id])

const toggleSelect = (row, checked) => {
  if (!row?.id) return
  if (checked) {
    if (Object.keys(selectedMap.value).length >= 4) {
      ElMessage.warning('\u6700\u591a\u9009\u62e9 4 \u4e2a\u83dc\u8fdb\u884c\u5bf9\u6bd4')
      return
    }
    selectedMap.value = { ...selectedMap.value, [row.id]: row }
  } else {
    const next = { ...selectedMap.value }
    delete next[row.id]
    selectedMap.value = next
  }
}

const compareItems = computed(() => Object.values(selectedMap.value))

const numVal = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const pcfLabel = (row) => {
  return `${numVal(row?.protein)}/${numVal(row?.carbs)}/${numVal(row?.fat)}`
}

const macroPercent = (row, key) => {
  const p = numVal(row?.protein)
  const c = numVal(row?.carbs)
  const f = numVal(row?.fat)
  const total = p + c + f
  if (!total) return '0%'
  const val = key === 'protein' ? p : key === 'carbs' ? c : f
  return `${Math.round((val / total) * 100)}%`
}

const densityMeta = (row) => {
  const calories = numVal(row?.calories)
  const size = numVal(row?.serving_size_g)
  const unitRaw = String(row?.serving_unit || 'g').toLowerCase()
  const isWeight = unitRaw === 'g' || unitRaw === 'ml' || unitRaw === '克' || unitRaw === '毫升'
  if (size > 0 && isWeight) {
    const per100 = (calories / size) * 100
    const unit = unitRaw === 'ml' || unitRaw === '毫升' ? 'ml' : 'g'
    return { value: Math.round(per100), label: `kcal/100${unit}`, max: 600 }
  }
  return { value: Math.round(calories), label: `kcal/${servingLabel(row)}`, max: 1200 }
}

const densityPercent = (row) => {
  const meta = densityMeta(row)
  if (!meta.max) return '0%'
  return `${Math.min(100, Math.round((meta.value / meta.max) * 100))}%`
}

const sceneTags = (row) => {
  const tags = Array.isArray(row?.tags) ? row.tags : []
  const scenes = []
  if (tags.includes('high_protein')) scenes.push('增肌')
  if (tags.includes('low_fat') || tags.includes('low_carb')) scenes.push('减脂')
  if (tags.includes('low_carb') || tags.includes('whole_grain')) scenes.push('控糖')
  if (tags.includes('vegan')) scenes.push('素食')
  if (tags.includes('light')) scenes.push('轻断食')
  if (tags.includes('breakfast')) scenes.push('早餐')
  if (scenes.length === 0) scenes.push('日常')
  return scenes.slice(0, 3)
}


const cmpDialog = ref(false)
const cmp = ref([])

const commonAllergens = ['花生','牛奶','乳制品','鸸质','鸡蛋','大豆','豆类','海鲜','鱼','牛肉','猪肉','小麦']

const tagOptions = computed(() => {
  return Object.entries(tagMap).map(([value, label]) => ({ value, label }))
})

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
  low_gi: '\u4f4eGI',
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

const displayedRows = computed(() => {
  let list = rows.value || []
  const [minV, maxV] = calRange.value || [0, 1200]
  list = list.filter(it => {
    const cal = numVal(it.calories)
    if (minV != null && cal < minV) return false
    if (maxV != null && cal > maxV) return false
    return true
  })
  if (tagFilter.value.length) {
    list = list.filter(it => {
      const tags = Array.isArray(it.tags) ? it.tags : []
      return tagFilter.value.every(t => tags.includes(t))
    })
  }
  if (allergenFilter.value.length) {
    list = list.filter(it => {
      const allergens = Array.isArray(it.allergens) ? it.allergens : []
      return allergenFilter.value.every(a => !allergens.includes(a))
    })
  }
  if (targetFilter.value) {
    list = list.filter(it => scoreForTarget(it, targetFilter.value) !== 'low')
  }
  return list
})

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
      ElMessage.error(res.message || 'Load failed')
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

const applyFilters = () => {
  minCal.value = calRange.value[0]
  maxCal.value = calRange.value[1]
  page.value = 1
  load()
}

const reset = () => {
  keyword.value = ''
  category.value = ''
  minCal.value = null
  maxCal.value = null
  calRange.value = [0, 1200]
  targetFilter.value = ''
  allergenFilter.value = []
  tagFilter.value = []
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
  loadAddSummary(addForm.value.date)
}

const loadAddSummary = async (date) => {
  if (!date) return
  addSummaryLoading.value = true
  try {
    const res = await dietApi.list(date)
    if (res.success) {
      addSummary.value = res.data.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 }
      addSummaryList.value = res.data.list || []
    } else {
      addSummary.value = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      addSummaryList.value = []
    }
  } finally {
    addSummaryLoading.value = false
  }
}

const loadBulkSummary = async (date) => {
  if (!date) return
  bulkSummaryLoading.value = true
  try {
    const res = await dietApi.list(date)
    if (res.success) {
      bulkSummary.value = res.data.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 }
      bulkSummaryList.value = res.data.list || []
    } else {
      bulkSummary.value = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      bulkSummaryList.value = []
    }
  } finally {
    bulkSummaryLoading.value = false
  }
}

const confirmBulkAdd = async () => {
  if (compareItems.value.length < 2) return
  bulkAdding.value = true
  let success = 0
  try {
    for (const it of compareItems.value) {
      const res = await dietApi.add({
        log_date: bulkForm.value.date,
        meal_type: bulkForm.value.meal_type,
        food_name: it.name,
        calories: it.calories,
        nutrition: { protein: it.protein, carbs: it.carbs, fat: it.fat },
        allergens: it.allergens || [],
        portion: bulkForm.value.portion,
        portion_unit: bulkForm.value.portion_unit,
        note: bulkForm.value.note
      })
      if (res.success) success += 1
    }
    ElMessage.success(`Added ${success} items`)
    bulkDialog.value = false
    clearCompare()
  } finally {
    bulkAdding.value = false
  }
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
      ElMessage.success('Added to diet calendar')
      addDialog.value = false
    } else {
      ElMessage.error(res.message || 'Add failed')
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

const caloriePercent = (row) => {
  const max = Math.max(...compareItems.value.map(it => numVal(it.calories)), 1)
  const val = numVal(row?.calories)
  return `${Math.round((val / max) * 100)}%`
}

const conflictAllergens = computed(() => {
  const all = compareItems.value.map(it => (Array.isArray(it.allergens) ? it.allergens : []))
  const flat = all.flat().map(formatTag)
  const uniq = Array.from(new Set(flat))
  return uniq
})

const scoreForTarget = (row, target) => {
  if (!target) return 'mid'
  const tags = Array.isArray(row?.tags) ? row.tags : []
  if (target === 'cut') {
    if (tags.includes('low_fat') || tags.includes('low_carb')) return 'high'
    if (tags.includes('high_fat')) return 'low'
  }
  if (target === 'bulk') {
    if (tags.includes('high_protein')) return 'high'
  }
  if (target === 'low_sugar') {
    if (tags.includes('low_carb') || tags.includes('whole_grain')) return 'high'
    if (tags.includes('sweet')) return 'low'
  }
  if (target === 'light') {
    if (tags.includes('light') || tags.includes('veggie')) return 'high'
    if (tags.includes('high_fat')) return 'low'
  }
  return 'mid'
}

const scoreLabel = (score) => ({ high: '高适配', mid: '中性', low: '不推荐' }[score] || '中性')
const scoreClass = (score) => ({ high: 'good', mid: 'mid', low: 'bad' }[score] || 'mid')

const clearCompare = () => {
  selectedMap.value = {}
}

const compare = async () => {
  const ids = Object.keys(selectedMap.value)
  if (ids.length < 2) {
    ElMessage.warning('请至少选两个菜品对比')
    return
  }
  if (ids.length > 4) {
    ElMessage.warning('最多对比 4 个菜品')
    return
  }
  const res = await knowledgeApi.compare(ids)
  if (res.success) {
    cmp.value = res.data.list || []
    cmpDialog.value = true
  }
}

watch(() => addForm.value.date, (val) => {
  if (addDialog.value) loadAddSummary(val)
})

watch(() => bulkForm.value.date, (val) => {
  if (bulkDialog.value) loadBulkSummary(val)
})

watch(addDialog, (val) => {
  if (val) loadAddSummary(addForm.value.date)
})

watch(bulkDialog, (val) => {
  if (val) loadBulkSummary(bulkForm.value.date)
})

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
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.view-toggle {
  margin-right: 6px;
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
.range {
  display: flex;
  align-items: center;
  gap: 10px;
}
.range-label {
  color: #475467;
  font-size: 13px;
}
.range-val {
  color: #667085;
  font-size: 12px;
  min-width: 120px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr;
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
.cards {
  min-height: 240px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1100px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
.food-card {
  position: relative;
  padding: 14px 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}
.food-card.skeleton {
  pointer-events: none;
}
.food-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}
.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.card-title .name {
  font-weight: 600;
  font-size: 16px;
}
.card-title .sub {
  color: #667085;
  font-size: 12px;
  margin-top: 2px;
}
.card-actions {
  display: flex;
  gap: 6px;
}
.card-media {
  margin: 8px 0 10px;
  border-radius: 10px;
  overflow: hidden;
  height: 120px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
}
.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.macro-stack {
  margin-top: 8px;
}
.macro-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.macro-legend .dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  display: inline-block;
  margin-right: 4px;
}
.macro-legend .dot.p { background: #22c55e; }
.macro-legend .dot.c { background: #60a5fa; }
.macro-legend .dot.f { background: #f59e0b; }
.density {
  margin-top: 8px;
}
.density-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
.density-val {
  color: #111827;
  font-weight: 600;
}
.density-bar {
  height: 10px;
  border-radius: 999px;
  background: repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.4), rgba(148, 163, 184, 0.4) 1px, transparent 1px, transparent 12px),
    linear-gradient(90deg, #f1f5f9, #e2e8f0);
  overflow: hidden;
}
.density-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
}
.table-density .density-head {
  margin-bottom: 4px;
}
.stack.table-stack {
  height: 8px;
}
.pill.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}
.pill.kcal {
  background: #eef2ff;
  color: #3730a3;
}
.pill.pcf {
  background: #ecfeff;
  color: #0f766e;
}
.pill.tag {
  background: #fef3c7;
  color: #92400e;
}
.pill.allergen {
  background: #fee2e2;
  color: #991b1b;
}
.pill.scene {
  background: #dcfce7;
  color: #166534;
}
.pill.more {
  background: #e5e7eb;
  color: #4b5563;
}
.sk-line {
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
}
.sk-pill {
  width: 70px;
  height: 20px;
  border-radius: 999px;
  background: #e5e7eb;
}
.hover-detail {
  margin-top: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.25s ease, opacity 0.2s ease, margin-top 0.2s ease;
}
.food-card:hover .hover-detail {
  margin-top: 8px;
  max-height: 140px;
  opacity: 1;
}
.bar-row {
  display: grid;
  grid-template-columns: 38px 1fr 44px;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.bar .fill {
  height: 100%;
}
.bar-row.protein .fill { background: #22c55e; }
.bar-row.carbs .fill { background: #60a5fa; }
.bar-row.fat .fill { background: #f59e0b; }
.bar-label {
  font-size: 12px;
  color: #6b7280;
}
.bar-val {
  font-size: 12px;
  color: #111827;
  text-align: right;
}
.compare-bar {
  position: fixed;
  left: 20px;
  right: 20px;
  bottom: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
  padding: 14px 16px 16px;
  z-index: 50;
}
.compare-left {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.compare-title {
  font-weight: 600;
}
.compare-actions {
  display: flex;
  gap: 8px;
}
.compare-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.cmp-section {
  padding: 10px;
  border-radius: 12px;
  background: #f8fafc;
}
.cmp-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.cmp-row {
  display: grid;
  grid-template-columns: 80px 1fr 70px;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
}
.cmp-name {
  color: #475467;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cmp-bar {
  height: 10px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.cmp-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #22c55e 100%);
}
.cmp-val {
  text-align: right;
  color: #111827;
}
.stack {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e7eb;
}
.stack .seg {
  height: 100%;
}
.stack .p { background: #22c55e; }
.stack .c { background: #60a5fa; }
.stack .f { background: #f59e0b; }
.cmp-allergen {
  padding: 6px 8px;
  border-radius: 8px;
  background: #ecfeff;
  color: #0f766e;
}
.cmp-allergen.danger {
  background: #fee2e2;
  color: #991b1b;
}
.cmp-score .score {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
  text-align: center;
}
.cmp-score .score.good { background: #dcfce7; color: #166534; }
.cmp-score .score.mid { background: #e5e7eb; color: #374151; }
.cmp-score .score.bad { background: #fee2e2; color: #991b1b; }
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
.date-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary-title {
  font-weight: 600;
}
.summary-kpi {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #667085;
}
.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow: auto;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 12px;
}
.summary-item .meta {
  color: #98a2b3;
}
@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.add-card {
  cursor: pointer;
  border: 1px dashed var(--el-border-color);
  background: var(--el-fill-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 170px;
}

.add-card:hover {
  border-color: var(--el-color-primary);
}

.add-inner {
  text-align: center;
  color: var(--el-text-color-regular);
}

.add-title {
  margin-top: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.add-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.hint {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.row-2 {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.row-2-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.row-2-label {
  width: 32px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
