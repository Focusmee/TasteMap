<template>
    <div class="travel">
        <NavBar />
        <div class="travel-content">
            <el-card class="hero-card">
                <template #header>
                    <div class="hero-header">
                        <div class="hero-title-group">
                            <div class="hero-title">AI 行程决策驾驶舱</div>
                            <div class="hero-sub">不是在看地图找餐厅，而是 AI 在带你探索适合你的美食。</div>
                        </div>
                        <div class="hero-status">
                            <span class="hero-pill">AI 在线</span>
                            <span class="hero-pill">场景感知</span>
                            <span class="hero-pill">出行 × 饮食</span>
                        </div>
                    </div>
                </template>

                <div class="ai-hero-grid">
                    <div class="ai-card ai-food-card">
                        <div class="ai-card-title">{{ aiFoodInsight.title }}</div>
                        <div class="ai-card-actions">
                            <div class="ai-card-status" v-if="aiAdviceLoading">AI 建议生成中...</div>
                            <div class="ai-card-status is-error" v-else-if="aiAdviceError">{{ aiAdviceError }}</div>
                            <el-button size="small" @click="loadAiAdvice" :loading="aiAdviceLoading">
                                刷新AI建议
                            </el-button>
                        </div>
                        <div class="ai-card-sub">根据你的状态：</div>
                        <div class="ai-card-list">
                            <div v-for="(reason, idx) in aiFoodInsight.reasons" :key="idx" class="ai-card-item">✔ {{ reason }}</div>
                        </div>
                        <div class="ai-card-reco">👉 推荐你选择：{{ aiFoodInsight.recommendation }}</div>
                        <div class="ai-card-note">👉 这不是筛选条件，是 AI 决策解释</div>
                        <div v-if="aiDecisionExplanation" class="ai-card-explain">
                            <div class="ai-card-explain-title">AI 决策解释</div>
                            <div class="ai-card-explain-summary">{{ aiDecisionExplanation.summary }}</div>
                            <div v-if="aiDecisionExplanation.evidence?.length" class="ai-card-explain-list">
                                <div v-for="(item, idx) in aiDecisionExplanation.evidence" :key="`ev-${idx}`" class="ai-card-explain-item">• {{ item }}</div>
                            </div>
                            <div v-if="aiDecisionExplanation.cautions?.length" class="ai-card-explain-caution">
                                注意：<span v-for="(item, idx) in aiDecisionExplanation.cautions" :key="`ct-${idx}`">{{ item }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="ai-card ai-trip-card">
                        <div class="ai-card-title">{{ aiTripInsight.title }}</div>
                        <div class="ai-trip-grid">
                            <div class="ai-trip-item">
                                <span>📍 目的地</span>
                                <strong>{{ aiTripInsight.destination }}</strong>
                            </div>
                            <div class="ai-trip-item">
                                <span>🕒 最佳出发时间</span>
                                <strong>{{ aiTripInsight.departAt }}</strong>
                            </div>
                            <div class="ai-trip-item">
                                <span>🚦 当前路况</span>
                                <strong>{{ aiTripInsight.traffic }}</strong>
                            </div>
                            <div class="ai-trip-item">
                                <span>🍽 到达后推荐菜</span>
                                <strong>{{ aiTripInsight.dish }}</strong>
                            </div>
                        </div>
                        <div class="ai-card-note">这不是导航页，这是生活决策页</div>
                    </div>
                </div>

                <div class="hero-strip">
                    <div v-if="destination" class="hero-chip">
                        <span class="chip-label">目的地</span>
                        <span class="chip-value">{{ destination }}</span>
                    </div>
                    <div v-if="weatherInfo" class="hero-chip">
                        <span class="chip-label">气温</span>
                        <span class="chip-value">{{ weatherInfo.temperature }}℃</span>
                    </div>
                    <div v-if="routeType" class="hero-chip">
                        <span class="chip-label">方式</span>
                        <span class="chip-value">{{ getRouteTypeName(routeType) }}</span>
                    </div>
                </div>

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
                <el-card v-if="weatherInfo" class="info-card weather-card" shadow="never">
                    <div class="weather-content">
                        <div class="weather-icon-wrapper">
                            <span class="weather-emoji">{{ getWeatherIcon(weatherInfo.icon) }}</span>
                        </div>
                        <div class="weather-info">
                            <div class="temperature num-roll">{{ weatherInfo.temperature }}℃</div>
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
                            <div class="map-header-title">
                                <span>AI 美食探索驾驶舱</span>
                                <div class="map-sub">地图只是视觉承载，推荐逻辑才是主角</div>
                            </div>
                            <div class="map-actions">
                                <div class="ring-loader" v-show="loading || loadingRestaurants" />
                                <el-button size="small" @click="refreshNearbyRestaurants" :loading="loadingRestaurants">
                                    刷新附近餐厅
                                </el-button>
                            </div>
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
                            <div class="poi-focus" v-if="selectedPoi">
                                <div class="poi-focus-head">
                                    <div class="poi-focus-title">{{ selectedPoi.name }}</div>
                                    <div class="poi-focus-distance">{{ formatDistance(selectedPoi.distance || 0) }}</div>
                                </div>
                                <div class="poi-focus-addr">{{ selectedPoi.address || '地址未知' }}</div>
                                <div v-if="selectedPoiFoods.length" class="poi-focus-tags">
                                    <span v-for="food in selectedPoiFoods" :key="food.id || food.name" class="poi-tag">{{ food.name }}</span>
                                </div>
                                <div class="poi-focus-actions">
                                    <el-button size="small" type="primary" @click="addRestaurantStop(selectedPoi)">加入路线</el-button>
                                    <el-button size="small" @click="openFoodTagDialog(selectedPoi, selectedPoi.poi_source || 'amap')">标记菜品</el-button>
                                </div>
                            </div>
                            <div class="poi-focus poi-focus-empty" v-else>点击地图上的美食地点气泡，可以规划路线</div>
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
                                    <el-button size="small" type="success" @click="saveFootprint"
                                        :disabled="!routePlanned || selectedStops.length === 0"
                                        :loading="savingFootprint">
                                        保存足迹
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
                                    <div v-for="(stop, index) in selectedStops" :key="stop.id" class="route-stop"
                                        draggable="true" @dragstart="onStopDragStart(index)"
                                        @dragend="onStopDragEnd" @dragover.prevent="onStopDragOver(index)"
                                        @drop="onStopDrop(index)" :class="{
                                            'is-dragging': draggingStopIndex === index,
                                            'is-drag-over': dragOverIndex === index
                                        }">
                                        <span class="route-drag-handle" title="拖动排序">⋮⋮</span>
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
                        <div class="route-visual">
                            <div class="route-ribbon">
                                <span class="route-dot">🚗</span>
                                <span class="route-line"></span>
                                <span class="route-dot">🅿️</span>
                                <span class="route-line"></span>
                                <span class="route-dot">🍽️</span>
                            </div>
                            <div class="route-visual-meta">生活路径 · 路线 + 美食点</div>
                        </div>
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

    <el-drawer v-model="foodTagDialogVisible" title="地点美食标记" size="420px" :with-header="true">
        <div v-if="foodTagTarget" class="food-tag-panel">
            <div class="poi-head">
                <div class="poi-name">{{ foodTagTarget.name }}</div>
                <div class="poi-addr">{{ foodTagTarget.address }}</div>
                <div class="poi-meta">
                    <el-tag size="small" type="info">{{ foodTagTarget.poi_source }}</el-tag>
                </div>
            </div>

            <el-input v-model="foodKeyword" placeholder="搜索知识库食物（名称/标签）" clearable @change="() => { foodPage = 1; loadFoodCandidates(); }">
                <template #append>
                    <el-button @click="() => { foodPage = 1; loadFoodCandidates(); }">搜索</el-button>
                </template>
            </el-input>

            <div class="food-list">
                <el-checkbox-group v-model="selectedFoodIds">
                    <div v-for="f in foodList" :key="f.id" class="food-item">
                        <el-checkbox :label="f.id">
                            <div class="food-item-inner">
                                <img v-if="f.image_url" :src="f.image_url" class="food-img" />
                                <div class="food-info">
                                    <div class="food-title">{{ f.name }}</div>
                                    <div class="food-sub">
                                        <span>{{ f.category || '未分类' }}</span>
                                        <span style="margin-left:8px;">{{ f.calories }} 千卡/100g</span>
                                    </div>
                                </div>
                            </div>
                        </el-checkbox>
                    </div>
                </el-checkbox-group>

                <el-empty v-if="!foodList || foodList.length === 0" description="暂无数据" />
            </div>

            <div class="food-pager">
                <el-pagination
                    background
                    layout="prev, pager, next"
                    :page-size="foodSize"
                    :total="foodTotal"
                    :current-page="foodPage"
                    @current-change="(p) => { foodPage = p; loadFoodCandidates(); }"
                />
            </div>

            <div class="drawer-actions">
                <el-button @click="foodTagDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="savePoiFoodTags">保存标记</el-button>
            </div>
        </div>
    </el-drawer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Location, Guide, LocationFilled, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import NavBar from '@/components/NavBar.vue'
import { useTravelStore } from '@/stores/travel'
import { useRecognitionStore } from '@/stores/recognition'
import { travelApi, knowledgeApi } from '@/api'
import { getCurrentLocation, formatLocation } from '@/utils/location'
import { loadAmapScript } from '@/utils/amap'

const router = useRouter()
const route = useRoute()
const travelStore = useTravelStore()
const recognitionStore = useRecognitionStore()

const destination = ref('')
const loading = ref(false)
const saving = ref(false)
const savingFootprint = ref(false)
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
const aiAdvice = ref(null)
const aiAdviceLoading = ref(false)
const aiAdviceError = ref('')
const aiAdviceKey = ref('')
const showAllSteps = ref(false) // 控制是否展开所有路线步骤
const mapContainer = ref(null)
const nearbyRestaurants = ref([])
const loadingRestaurants = ref(false)
const restaurantKeyword = ref('')
const selectedCategory = ref('')
const sortRule = ref('distance')
const selectedStops = ref([])
const selectedPoi = ref(null)
const markingMode = ref(false)
const draggingStopIndex = ref(null)
const dragOverIndex = ref(null)
const foodTagDialogVisible = ref(false)
const foodTagTarget = ref(null) // { poi_id, poi_source, name, address, location }
const poiFoodsMap = ref({}) // key: `${source}:${poi_id}` => food list
const foodKeyword = ref('')
const foodPage = ref(1)
const foodSize = ref(12)
const foodTotal = ref(0)
const foodList = ref([])
const selectedFoodIds = ref([])

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
let routeGlowLine = null
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


const aiReasonSeeds = ['血脂偏高', '聚餐场景', '今日已摄入 1200 kcal']
const aiDishSeeds = ['清蒸鲈鱼', '清炒虾仁', '蒸豆腐', '白灼生菜', '清汤牛腩']
const aiTravelTips = ['较顺畅', '轻微拥堵', '顺畅']

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


const aiFoodInsight = computed(() => {
    const fallback = {
        title: '🍜 今晚适合轻油饮食',
        reasons: aiReasonSeeds,
        recommendation: '川菜中的清炒类、蒸菜类'
    }
    const data = aiAdvice.value?.food_insight
    if (!data) return fallback
    return {
        title: data.title || fallback.title,
        reasons: Array.isArray(data.reasons) && data.reasons.length ? data.reasons : fallback.reasons,
        recommendation: data.recommendation || fallback.recommendation
    }
})

const aiTripInsight = computed(() => {
    const now = new Date()
    const depart = new Date(now.getTime() + 20 * 60 * 1000)
    const fallback = {
        title: '🚗 今晚行程建议',
        destination: destination.value || '川菜聚餐',
        departAt: formatClock(depart) || '18:20',
        traffic: aiTravelTips[0],
        dish: aiDishSeeds[0] || '清炒虾仁'
    }
    const data = aiAdvice.value?.trip_insight
    if (!data) return fallback
    return {
        title: data.title || fallback.title,
        destination: data.destination || fallback.destination,
        departAt: data.depart_at || data.departAt || fallback.departAt,
        traffic: data.traffic || fallback.traffic,
        dish: data.dish || fallback.dish
    }
})

const aiDecisionExplanation = computed(() => aiAdvice.value?.decision_explanation || null)

const displayedSteps = computed(() => {
    if (!routeInfo.value || !routeInfo.value.steps) {
        return []
    }

    const steps = routeInfo.value.steps
    if (steps.length <= 5 || showAllSteps.value) {
        return steps
    }
    return steps.slice(0, 5)
})

const getRouteTypeName = (type) => {
    const nameMap = {
        driving: '驾车',
        walking: '步行',
        bicycling: '骑行',
        electrobike: '电动车',
        transit: '公交'
    }
    return nameMap[type] || '路线'
}

const formatDistance = (distance) => {
    const dist = parseInt(distance, 10)
    if (dist < 1000) {
        return `${dist}米`
    }
    return `${(dist / 1000).toFixed(1)}公里`
}

const formatDuration = (duration) => {
    const dur = parseInt(duration, 10)
    if (dur < 60) {
        return `${dur}秒`
    }
    if (dur < 3600) {
        return `${Math.floor(dur / 60)}分钟`
    }
    const hours = Math.floor(dur / 3600)
    const minutes = Math.floor((dur % 3600) / 60)
    return `${hours}小时${minutes}分钟`
}

const formatClock = (dateObj) => {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
    if (Number.isNaN(d.getTime())) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
}

const formatDateTimeLabel = (dateObj) => {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const buildPoiKey = (poi_id, poi_source = 'amap') => `${poi_source}:${poi_id}`

const selectedPoiFoods = computed(() => {
    if (!selectedPoi.value) return []
    const poiId = String(selectedPoi.value?.id ?? selectedPoi.value?.poi_id ?? '')
    if (!poiId) return []
    const key = buildPoiKey(poiId, selectedPoi.value?.poi_source || 'amap')
    return poiFoodsMap.value?.[key] || []
})

const loadFoodCandidates = async () => {
    try {
        const res = await knowledgeApi.list({
            keyword: foodKeyword.value,
            page: foodPage.value,
            size: foodSize.value
        })
        if (res?.success) {
            foodList.value = res.data?.list || []
            foodTotal.value = res.data?.total || 0
        }
    } catch (e) {
        // ignore
    }
}

const openFoodTagDialog = async (poi, poi_source = 'amap') => {
    const poi_id = String(poi?.id ?? poi?.poi_id ?? '')
    if (!poi_id) return

    foodTagTarget.value = {
        poi_id,
        poi_source,
        name: poi?.name || '',
        address: poi?.address || '',
        location: poi?.location || ''
    }

    // 预加载候选食物列表
    foodKeyword.value = ''
    foodPage.value = 1
    await loadFoodCandidates()

    // 拉取该地点已标记的食物
    try {
        const r = await travelApi.getPoiFoods(poi_id, poi_source)
        if (r?.success) {
            selectedFoodIds.value = r.data?.food_ids || []
            const key = buildPoiKey(poi_id, poi_source)
            poiFoodsMap.value = { ...(poiFoodsMap.value || {}), [key]: r.data?.list || [] }
        } else {
            selectedFoodIds.value = []
        }
    } catch (e) {
        selectedFoodIds.value = []
    }

    foodTagDialogVisible.value = true
}

const savePoiFoodTags = async () => {
    if (!foodTagTarget.value) return
    try {
        const payload = {
            poi_id: foodTagTarget.value.poi_id,
            poi_source: foodTagTarget.value.poi_source,
            poi_name: foodTagTarget.value.name,
            poi_location: foodTagTarget.value.location,
            food_ids: selectedFoodIds.value || []
        }
        const r = await travelApi.savePoiFoods(payload)
        if (r?.success) {
            // 更新缓存 + 重新刷新地图标注颜色
            const key = buildPoiKey(payload.poi_id, payload.poi_source)
            const selected = (foodList.value || []).filter(f => (selectedFoodIds.value || []).includes(f.id))
            // 注意：候选列表可能不包含全部已选（翻页），所以再批量拉一下保证一致
            try {
                const b = await travelApi.getPoiFoods(payload.poi_id, payload.poi_source)
                if (b?.success) {
                    poiFoodsMap.value = { ...(poiFoodsMap.value || {}), [key]: b.data?.list || [] }
                } else {
                    poiFoodsMap.value = { ...(poiFoodsMap.value || {}), [key]: selected }
                }
            } catch {
                poiFoodsMap.value = { ...(poiFoodsMap.value || {}), [key]: selected }
            }

            ElMessage.success('已标记到该地点')
            foodTagDialogVisible.value = false
            // 触发一次地图刷新，让marker颜色/label更新
            updateMapMarkers(currentLocation.value, nearbyRestaurants.value, { preserveView: true, preserveRoute: true })
        } else {
            ElMessage.error(r?.message || '保存失败')
        }
    } catch (e) {
        ElMessage.error(e?.message || '保存失败')
    }
}

const refreshPoiFoodsForCurrent = async () => {
    // 批量获取当前展示的地点标记（用于渲染颜色/提示）
    const items = []

    for (const r of (nearbyRestaurants.value || [])) {
        if (r?.id) items.push({ poi_id: String(r.id), poi_source: 'amap' })
    }
    for (const s of (selectedStops.value || [])) {
        if (s?.id) items.push({ poi_id: String(s.id), poi_source: String(s.source || 'custom') })
    }

    if (items.length === 0) return
    try {
        const res = await travelApi.batchPoiFoods(items)
        if (res?.success) {
            poiFoodsMap.value = { ...(poiFoodsMap.value || {}), ...(res.data?.map || {}) }
        }
    } catch (e) {
        // ignore
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
const buildFoodBubbleSvg = (color, emoji = '🍜', glow = false) => {
    const glowFilter = glow
        ? '<filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
        : ''
    const glowCircle = glow ? '<circle cx="14" cy="14" r="11" fill="rgba(255,255,255,0.35)" />' : ''
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            ${glowFilter}
            <g ${glow ? 'filter="url(#g)"' : ''}>
                ${glowCircle}
                <circle cx="16" cy="16" r="12" fill="${color}" stroke="#ffffff" stroke-width="2" />
            </g>
            <text x="16" y="20" text-anchor="middle" font-size="14">${emoji}</text>
        </svg>
    `
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
const getCircleIcon = (color, emoji = '🍜', glow = false) => {
    const key = `${color}-${emoji}-${glow ? 'g' : 'n'}`
    if (markerIconCache.has(key)) return markerIconCache.get(key)
    const icon = new AMap.Icon({
        size: new AMap.Size(32, 32),
        image: buildFoodBubbleSvg(color, emoji, glow),
        imageSize: new AMap.Size(32, 32)
    })
    markerIconCache.set(key, icon)
    return icon
}

const clearRouteOverlay = () => {
    if (drivingInstance) {
        drivingInstance.clear()
    }
    if (routeLine && mapInstance) {
        mapInstance.remove(routeLine)
    }
    if (routeGlowLine && mapInstance) {
        mapInstance.remove(routeGlowLine)
    }
    routeLine = null
    routeGlowLine = null
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
    routeGlowLine = new AMap.Polyline({
        path: points,
        strokeColor: '#f97316',
        strokeWeight: 10,
        strokeOpacity: 0.25
    })
    routeLine = new AMap.Polyline({
        path: points,
        strokeColor: '#38bdf8',
        strokeWeight: 6,
        strokeOpacity: 0.9
    })
    mapInstance.add([routeGlowLine, routeLine])
    mapInstance.setFitView([routeGlowLine, routeLine], false, [40, 40, 40, 40])
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

const selectPoi = (poi, source = 'amap') => {
    if (!poi) return
    selectedPoi.value = {
        id: poi.id ?? poi.poi_id ?? '',
        poi_id: poi.poi_id ?? poi.id ?? '',
        poi_source: poi.poi_source || source,
        name: poi.name || '推荐餐厅',
        address: poi.address || '',
        location: poi.location || '',
        distance: poi.distance || 0
    }
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
        tagged: '#f59e0b',
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
        title: '当前位置',
        anchor: 'bottom-center',
        icon: getCircleIcon(markerColors.current, '📍', true)
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
                icon: (() => {
                    const key = buildPoiKey(rest.id, 'amap')
                    const hasFood = ((poiFoodsMap.value || {})[key] || []).length > 0
                    if (selectedIdSet.has(rest.id)) {
                        return getCircleIcon(plannedHighlight ? markerColors.planned : markerColors.selected, '🍽️', true)
                    }
                    return getCircleIcon(hasFood ? markerColors.tagged : markerColors.default, hasFood ? '✨' : '🍜', hasFood)
                })()
            })
            marker.on('click', () => {
                selectPoi({ ...rest, poi_source: 'amap' }, 'amap')
                if (mapInfoWindow) {
                    mapInfoWindow.close()
                }
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
            const marker = new AMap.Marker({
                position: loc,
                title: stop.name,
                label: stopIndex ? { content: String(stopIndex), direction: 'top' } : {
                    content: stop.name,
                    direction: 'top'
                },
                icon: (() => {
                    const key = buildPoiKey(stop.id, String(stop.source || 'custom'))
                    const hasFood = ((poiFoodsMap.value || {})[key] || []).length > 0
                    return getCircleIcon(hasFood ? markerColors.tagged : (plannedHighlight ? markerColors.planned : markerColors.selected), hasFood ? '✨' : '🍽️', hasFood)
                })()
            })
            marker.on('click', () => {
                selectPoi({ ...stop, poi_source: stop.poi_source || 'custom' }, stop.poi_source || 'custom')
                if (mapInfoWindow) {
                    mapInfoWindow.close()
                }
            })
            return marker
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

const onStopDragStart = (index) => {
    draggingStopIndex.value = index
    dragOverIndex.value = index
}

const onStopDragOver = (index) => {
    dragOverIndex.value = index
}

const onStopDragEnd = () => {
    draggingStopIndex.value = null
    dragOverIndex.value = null
}

const onStopDrop = async (index) => {
    const fromIndex = draggingStopIndex.value
    if (fromIndex === null || fromIndex === undefined) {
        return
    }
    if (fromIndex !== index) {
        const updated = [...selectedStops.value]
        const [moved] = updated.splice(fromIndex, 1)
        updated.splice(index, 0, moved)
        selectedStops.value = updated
        updateMapMarkers(currentLocation.value, nearbyRestaurants.value)
        if (routePlanned.value) {
            await planRestaurantRoute()
        }
    }
    onStopDragEnd()
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

const getMealPeriod = (dateObj = new Date()) => {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
    const hour = d.getHours()
    if (hour >= 5 && hour < 10) return '早餐'
    if (hour >= 10 && hour < 14) return '中餐'
    if (hour >= 14 && hour < 17) return '下午茶'
    if (hour >= 17 && hour < 21) return '晚餐'
    return '夜宵'
}

const formatLocalTime = (dateObj = new Date()) => {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const buildAiAdvicePayload = () => {
    const now = new Date()
    const routeSummary = routeInfo.value
        ? {
            distance: routeInfo.value.distance,
            duration: routeInfo.value.duration,
            summary: routeInfo.value.summary
        }
        : null
    return {
        destination: destination.value.trim(),
        route_type: routeType.value,
        origin_address: currentLocation.value?.address || '',
        weather: weatherSource.value || null,
        route: routeSummary,
        local_time: formatLocalTime(now),
        meal_period: getMealPeriod(now)
    }
}

const loadAiAdvice = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
        aiAdviceError.value = '未登录，无法生成AI建议'
        return
    }
    aiAdviceLoading.value = true
    aiAdviceError.value = ''
    try {
        const payload = buildAiAdvicePayload()
        console.debug('AI advice request payload:', payload)
        const res = await travelApi.getAiAdvice(payload)
        if (res?.success) {
            aiAdvice.value = res.data
        } else {
            aiAdviceError.value = res?.message || 'AI建议获取失败'
        }
    } catch (error) {
        aiAdviceError.value = error?.message || 'AI建议获取失败'
    } finally {
        aiAdviceLoading.value = false
    }
}

const buildAdviceKey = () => {
    const weatherTag = weatherInfo.value?.reporttime || weatherInfo.value?.temperature || ''
    const routeTag = routeInfo.value?.distance || routeInfo.value?.duration || ''
    return [
        destination.value.trim(),
        routeType.value,
        weatherTag,
        routeTag
    ].join('|')
}

// 加载出行信息
const loadTravelInfo = async () => {
    if (!destination.value.trim()) {
        ElMessage.warning('请输入目的地')
        return
    }

    loading.value = true
    aiAdvice.value = null
    aiAdviceError.value = ''
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
        await loadAiAdvice()
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
            await loadAiAdvice()
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

const saveFootprint = async () => {
    if (selectedStops.value.length === 0 || !routePlanned.value) {
        ElMessage.warning('请先规划路线后再保存足迹')
        return
    }

    const stopNames = selectedStops.value.map((stop) => stop.name).filter(Boolean)
    const fallbackDestination = stopNames[stopNames.length - 1] || '美食路线'
    const nowLabel = formatDateTimeLabel(new Date())

    const planData = {
        rec_id: route.query.rec_id ? parseInt(route.query.rec_id) : null,
        plan_name: `足迹-${fallbackDestination}-${nowLabel}`,
        destination: destination.value || fallbackDestination,
        origin_location: currentLocation.value
            ? formatLocation(currentLocation.value.lng, currentLocation.value.lat)
            : '',
        destination_location: '',
        route_type: routeType.value,
        weather_info: weatherInfo.value || {},
        route_info: {
            type: 'multi-stop',
            stops: selectedStops.value,
            segments: routeSegments.value,
            points: routePointList.value
        },
        recommended_restaurants: [],
        attractions: [],
        daily_budget: 0,
        total_calories: 0,
        plan_days: 1,
        plan_summary: stopNames.length ? `足迹路线：${stopNames.join(' → ')}` : '足迹路线'
    }

    savingFootprint.value = true
    try {
        const res = await travelApi.savePlan(planData)
        if (res.success) {
            ElMessage.success('足迹已保存')
            router.push('/history')
        } else {
            ElMessage.error(res.message || '足迹保存失败')
        }
    } catch (error) {
        ElMessage.error('足迹保存失败')
        console.error('Save footprint error:', error)
    } finally {
        savingFootprint.value = false
    }
}

onMounted(async () => {
    try {
        if (!destination.value) {
            destination.value = travelStore.getCachedDestination() || ''
        }
        await getLocation()
        await loadNearbyRestaurants()
        await loadAiAdvice()
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

watch(
    [destination, routeType, weatherInfo, routeInfo],
    async () => {
        if (!destination.value.trim()) return
        if (!weatherInfo.value || !routeInfo.value) return
        if (aiAdviceLoading.value) return
        const key = buildAdviceKey()
        if (key && aiAdviceKey.value === key && aiAdvice.value) return
        aiAdviceKey.value = key
        await loadAiAdvice()
    }
)
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.travel {
    min-height: 100vh;
    background: linear-gradient(135deg, #fff7ed 0%, #eff6ff 45%, #f8fafc 100%);
    position: relative;
    isolation: isolate;
    overflow: hidden;
    --tm-blue: #1e7dd9;
    --tm-blue-soft: #e6f2ff;
    --tm-food: #ff9a4d;
    --tm-food-soft: #fff0e6;
    --tm-ink: #0f172a;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 12% 18%, rgba(255, 154, 77, 0.22), transparent 45%),
            radial-gradient(circle at 80% 12%, rgba(30, 125, 217, 0.2), transparent 45%),
            radial-gradient(circle at 60% 80%, rgba(14, 116, 144, 0.12), transparent 55%);
        opacity: 0.8;
        pointer-events: none;
        z-index: 0;
    }

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(30, 125, 217, 0.2) 1px, transparent 1px);
        background-size: 26px 26px;
        opacity: 0.25;
        pointer-events: none;
        z-index: 0;
    }

    :deep(.el-card) {
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(10px);
    }

    :deep(.el-card__header) {
        border-bottom: none;
        padding: 16px 18px 10px;
        background: linear-gradient(120deg, rgba(255, 154, 77, 0.12), rgba(30, 125, 217, 0.12));
    }

    .travel-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 20px;
        position: relative;
        z-index: 1;

        .hero-card {
            border-radius: 24px;
        }

        .hero-card :deep(.el-card__header) {
            padding: 18px 20px 14px;
        }

        .hero-card :deep(h2) {
            font-size: 22px;
            font-weight: 800;
            color: var(--tm-ink);
            letter-spacing: 0.8px;
            margin: 0;
        }

        .hero-strip {
            margin: 6px 0 18px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .hero-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            border: 1px solid rgba(148, 163, 184, 0.25);
            background: rgba(255, 255, 255, 0.7);
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
            font-size: 12px;
            color: $text-secondary;
        }

        .hero-chip .chip-label {
            color: #64748b;
            font-weight: 600;
        }

        .hero-chip .chip-value {
            color: var(--tm-ink);
            font-weight: 700;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .destination-input {
            margin-bottom: 16px;
        }

        .destination-input :deep(.el-input__wrapper) {
            padding: 6px 12px;
            
            border: 1px solid rgba(148, 163, 184, 0.25);
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        }

        .destination-input :deep(.el-input-group__prepend),
        .destination-input :deep(.el-input-group__append) {
            background: transparent;
            border: none;
            
        }

        .destination-input :deep(.el-button--primary) {
            border-radius: 12px;
            
            border: none;
            
        }

        .origin-selector {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(148, 163, 184, 0.2);
            backdrop-filter: blur(6px);
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
            background: linear-gradient(120deg, rgba(255, 247, 237, 0.9), rgba(239, 246, 255, 0.9));

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
                        border-radius: 14px;
                        border: 1px solid rgba(148, 163, 184, 0.4);
                        background: rgba(255, 255, 255, 0.8);
                        color: #1f2937;
                        transition: all 220ms ease;
                    }

                    .el-radio-button__original-radio:checked + .el-radio-button__inner {
                        background: linear-gradient(120deg, var(--tm-blue), #3b82f6);
                        border-color: transparent;
                        color: #fff;
                        box-shadow: 0 12px 20px rgba(30, 125, 217, 0.3);
                    }
                }
            }
        }

            .map-card {
                margin-bottom: 16px;
                position: relative;
                overflow: hidden;

                &::after {
                    content: '';
                    position: absolute;
                    top: -60px;
                    right: -40px;
                    width: 160px;
                    height: 160px;
                    background: radial-gradient(circle, rgba(255, 154, 77, 0.25), transparent 60%);
                    opacity: 0.6;
                    pointer-events: none;
                }

                .map-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    font-weight: 700;
                    color: var(--tm-ink);
                }

                .map-actions {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                }

                .ring-loader {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid rgba(30, 125, 217, 0.2);
                    border-top-color: var(--tm-blue);
                    animation: ringSpin 1s linear infinite;
                    box-shadow: 0 6px 12px rgba(30, 125, 217, 0.2);
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
                    border: 1px solid rgba(148, 163, 184, 0.25);
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
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
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 12px;
                    padding: 12px;
                    background: linear-gradient(160deg, rgba(255, 247, 237, 0.8), rgba(239, 246, 255, 0.9));

                    .rule-title {
                        font-weight: 600;
                        color: $text-primary;
                        margin-bottom: 8px;
                    }

                    .rule-current {
                        padding: 8px 10px;
                        border-radius: 10px;
                        background: rgba(255, 255, 255, 0.9);
                        border: 1px solid rgba(148, 163, 184, 0.2);
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
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.9);

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
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.9);

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
                    cursor: grab;

                    &:last-child {
                        border-bottom: none;
                        padding-bottom: 0;
                    }
                }

                .route-stop.is-dragging {
                    opacity: 0.6;
                }

                .route-stop.is-drag-over {
                    border-radius: 10px;
                    background: rgba(59, 130, 246, 0.08);
                    border-bottom-color: transparent;
                }

                .route-drag-handle {
                    font-size: 14px;
                    color: #64748b;
                    cursor: grab;
                    user-select: none;
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

            &.weather-card {
                background: linear-gradient(135deg, rgba(255, 247, 237, 0.95), rgba(239, 246, 255, 0.95));
                border: 1px solid rgba(148, 163, 184, 0.22);
            }

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
                    background: linear-gradient(140deg, rgba(255, 154, 77, 0.25), rgba(30, 125, 217, 0.2));
                    border-radius: 50%;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);

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

.num-roll {
    animation: numRoll 680ms cubic-bezier(.2,.9,.2,1);
    display: inline-block;
}

@keyframes numRoll {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes ringSpin {
    to { transform: rotate(360deg); }
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


.food-tag-panel{display:flex;flex-direction:column;gap:12px}
.poi-head{padding:4px 0 8px;border-bottom:1px solid #f0f0f0}
.poi-name{font-weight:600;font-size:14px;color:#111}
.poi-addr{margin-top:4px;font-size:12px;color:#666;line-height:1.4}
.poi-meta{margin-top:8px}
.food-list{margin-top:6px;flex:1;overflow:auto;max-height:55vh;padding-right:6px}
.food-item{padding:8px 6px;border-bottom:1px dashed #eee}
.food-item-inner{display:flex;gap:10px;align-items:center}
.food-img{width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid #f0f0f0}
.food-info{display:flex;flex-direction:column;gap:4px}
.food-title{font-size:13px;color:#111;font-weight:600}
.food-sub{font-size:12px;color:#666}
.food-pager{display:flex;justify-content:center;margin-top:8px}
.drawer-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:10px}

.travel-content {
    font-family: 'Space Grotesk', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.hero-header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;}
.hero-title{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:0.6px;}
.hero-sub{font-size:12px;color:#64748b;margin-top:6px;}
.hero-status{display:flex;gap:8px;flex-wrap:wrap;}
.hero-pill{padding:4px 10px;border-radius:999px;border:1px solid rgba(148,163,184,0.35);background:rgba(255,255,255,0.7);font-size:11px;color:#334155;}

.ai-hero-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:8px 0 16px;}
.ai-card{border-radius:18px;padding:16px;background:linear-gradient(140deg, rgba(255,250,242,0.95), rgba(239,246,255,0.95));border:1px solid rgba(148,163,184,0.2);box-shadow:0 14px 26px rgba(15,23,42,0.08);animation:cockpitRise 520ms ease both;}
.ai-food-card{background:linear-gradient(135deg, rgba(255,239,219,0.9), rgba(236,254,255,0.9));}
.ai-trip-card{background:linear-gradient(135deg, rgba(224,231,255,0.9), rgba(255,247,237,0.9));}
.ai-card-title{font-weight:800;font-size:16px;color:#0f172a;}
.ai-card-sub{margin-top:8px;font-size:12px;color:#64748b;}
.ai-card-list{display:grid;gap:6px;margin-top:8px;}
.ai-card-item{font-size:12px;color:#0f172a;}
.ai-card-reco{margin-top:10px;font-size:13px;color:#0f172a;font-weight:700;}
.ai-card-note{margin-top:8px;font-size:12px;color:#475569;}
.ai-card-actions{margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ai-card-status{margin-top:6px;font-size:12px;color:#0ea5e9;font-weight:600;}
.ai-card-status.is-error{color:#ef4444;}
.ai-card-explain{margin-top:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,0.8);border:1px solid rgba(148,163,184,0.18);display:grid;gap:6px;}
.ai-card-explain-title{font-size:12px;font-weight:700;color:#0f172a;}
.ai-card-explain-summary{font-size:12px;color:#334155;}
.ai-card-explain-list{display:grid;gap:4px;font-size:12px;color:#1f2937;}
.ai-card-explain-caution{font-size:11px;color:#b45309;display:flex;gap:6px;flex-wrap:wrap;}
.ai-trip-grid{display:grid;gap:8px;margin-top:10px;}
.ai-trip-item{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#0f172a;}
.ai-trip-item strong{color:#111827;}

.hero-strip{margin-top:6px;}

.poi-focus{padding:12px;border-radius:14px;border:1px solid rgba(148,163,184,0.25);background:rgba(255,255,255,0.9);display:grid;gap:8px;}
.poi-focus-empty{color:#64748b;font-size:12px;text-align:center;}
.poi-focus-head{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.poi-focus-title{font-weight:700;color:#0f172a;}
.poi-focus-distance{font-size:12px;color:#1d4ed8;font-weight:700;}
.poi-focus-addr{font-size:12px;color:#64748b;}
.poi-focus-tags{display:flex;flex-wrap:wrap;gap:6px;}
.poi-tag{background:#f1f5f9;color:#0f172a;border-radius:999px;padding:2px 8px;font-size:11px;}
.poi-focus-actions{display:flex;gap:8px;flex-wrap:wrap;}

.map-card .map-layout{grid-template-columns:1.5fr 1fr;gap:18px;}
.map-card .amap-container{height:320px;border-radius:16px;filter:saturate(0.9) contrast(1.05);}
.map-card .map-panel{gap:12px;}
.map-header-title{display:flex;flex-direction:column;gap:4px;}
.map-sub{font-size:12px;color:#64748b;}

.route-visual{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:10px 12px;border-radius:12px;background:linear-gradient(120deg, rgba(224,231,255,0.7), rgba(240,253,250,0.7));border:1px solid rgba(148,163,184,0.2);}
.route-ribbon{display:flex;align-items:center;gap:10px;}
.route-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid rgba(148,163,184,0.3);box-shadow:0 6px 12px rgba(15,23,42,0.12);font-size:14px;}
.route-line{width:40px;height:4px;border-radius:999px;background:linear-gradient(90deg, #38bdf8, #f97316);}
.route-visual-meta{font-size:12px;color:#475569;}

@keyframes cockpitRise{
    from{opacity:0;transform:translateY(12px);}
    to{opacity:1;transform:translateY(0);}
}

@media (max-width: 980px){
    .ai-hero-grid{grid-template-columns:1fr;}
}
</style>
