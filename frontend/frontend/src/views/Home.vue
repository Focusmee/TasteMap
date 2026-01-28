<template>
    <div class="home">
        <NavBar />
        <div class="home-content">
            <section class="insight-hero">
                <div class="hero-card">
                    <div class="hero-topline">
                        <span class="hero-kicker">AI 今日洞察</span>
                        <span class="hero-chip">{{ timeGreeting }}</span>
                    </div>
                    <h1 class="hero-title">
                        <span class="hero-name">{{ userProfile.name }}</span>，{{ timeGreetingText }}
                    </h1>
                    <p class="hero-subtitle">今天是「{{ userProfile.dayLabel }}」 🍱</p>
                    <div class="hero-grid">
                        <div class="hero-stat">
                            <span class="stat-label">📊 今日状态预测</span>
                            <span class="stat-value">✔ 推荐摄入 {{ userProfile.kcalTarget }} kcal</span>
                        </div>
                        <div class="hero-stat">
                            <span class="stat-label">⚠ 健康提醒</span>
                            <span class="stat-value">{{ userProfile.healthHint }}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="stat-label">🍜 适合场景</span>
                            <span class="stat-value">{{ userProfile.scene }}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="stat-label">📍 附近推荐</span>
                            <span class="stat-value">{{ userProfile.nearby }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section class="cockpit">
                <div class="section-header">
                    <h2>生活驾驶舱</h2>
                    <p>吃与出行的合体视角，像车载中控一样清晰。</p>
                </div>
                <div class="cockpit-grid">
                    <div class="cockpit-card">
                        <div class="card-header">
                            <span>🍽 今日饮食进度</span>
                            <span class="pill">实时</span>
                        </div>
                        <div class="progress-ring">
                            <div class="ring" :style="ringStyle">
                                <div class="ring-center">
                                    <div class="ring-value">{{ userProfile.currentKcal }}</div>
                                    <div class="ring-label">/ {{ userProfile.kcalTarget }} kcal</div>
                                </div>
                            </div>
                            <div class="ring-metas">
                                <div class="meta-row">
                                    <span>蛋白达标</span>
                                    <strong>{{ userProfile.proteinPercent }}%</strong>
                                </div>
                                <div class="meta-row">
                                    <span>蔬菜完成</span>
                                    <strong>{{ userProfile.veggiePercent }}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cockpit-card">
                        <div class="card-header">
                            <span>🗺 今日出行计划</span>
                            <span class="pill secondary">智能规划</span>
                        </div>
                        <div class="route-block">
                            <div class="route-time">{{ userProfile.travelTime }}</div>
                            <div class="route-title">{{ userProfile.travelTitle }}</div>
                            <div class="route-meta">路线 + 推荐菜：{{ userProfile.travelFood }}</div>
                        </div>
                        <div class="route-steps">
                            <div class="step-item" v-for="(step, index) in userProfile.routeSteps" :key="index">
                                <span class="step-index">{{ index + 1 }}</span>
                                <span class="step-text">{{ step }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="quick-modes">
                <div class="section-header">
                    <h2>智能快捷功能区</h2>
                    <p>从「功能入口」升级为「情景模式入口」。</p>
                </div>
                <div class="mode-grid">
                    <div class="mode-card" @click="$router.push('/recognition')">
                        <div class="mode-icon">🍜</div>
                        <h3>今天吃什么</h3>
                        <p>拍照识别 · 推荐 · 知识库</p>
                    </div>
                    <div class="mode-card" @click="$router.push('/travel')">
                        <div class="mode-icon">🧳</div>
                        <h3>出门去吃</h3>
                        <p>出行规划 · 推荐路线</p>
                    </div>
                    <div class="mode-card" @click="$router.push('/diet')">
                        <div class="mode-icon">📅</div>
                        <h3>管理饮食</h3>
                        <p>日历 · 数据看板</p>
                    </div>
                    <div class="mode-card" @click="$router.push('/chat')">
                        <div class="mode-icon">🤖</div>
                        <h3>问营养师</h3>
                        <p>营养助手 · 即时建议</p>
                    </div>
                    <div class="mode-card" @click="$router.push('/knowledge')">
                        <div class="mode-icon">📖</div>
                        <h3>探索知识</h3>
                        <p>知识库 · 健康百科</p>
                    </div>
                    <div class="mode-card" @click="$router.push('/history')">
                        <div class="mode-icon">🕘</div>
                        <h3>我的记录</h3>
                        <p>历史记录 · 习惯追踪</p>
                    </div>
                </div>
            </section>

            <section class="data-flow">
                <div class="section-header">
                    <h2>生活数据动态区</h2>
                    <p>不是冷冰冰的图表，而是动态故事。</p>
                </div>
                <div class="data-scroll">
                    <div class="data-card">
                        <h4>📈 本周趋势</h4>
                        <p>🔥 热量控制优秀（连续3天达标）</p>
                        <p>🥦 蔬菜摄入不足（低于目标 20%）</p>
                        <p>🚶 出行里程 {{ userProfile.weekDistance }} km</p>
                    </div>
                    <div class="data-card">
                        <h4>🌙 夜间恢复</h4>
                        <p>睡前建议：{{ userProfile.nightAdvice }}</p>
                        <p>补水提醒：{{ userProfile.waterHint }}</p>
                        <p>预计明日精力 +{{ userProfile.energyBoost }}%</p>
                    </div>
                    <div class="data-card">
                        <h4>🥗 饮食偏好</h4>
                        <p>最常点：{{ userProfile.favFood }}</p>
                        <p>口味趋势：{{ userProfile.tasteTrend }}</p>
                        <p>新推荐：{{ userProfile.newPick }}</p>
                    </div>
                </div>
            </section>

            <section class="growth">
                <div class="section-header">
                    <h2>成长记录区</h2>
                    <p>把情绪价值写在每一次反馈里。</p>
                </div>
                <div class="growth-grid">
                    <div class="growth-card">
                        <div class="growth-icon">🏅</div>
                        <div class="growth-text">
                            <h3>本周你击败了 {{ userProfile.winRate }}% 的用户</h3>
                            <p>保持节奏，你正在形成稳定的健康势能。</p>
                        </div>
                    </div>
                    <div class="growth-card">
                        <div class="growth-icon">🍱</div>
                        <div class="growth-text">
                            <h3>已建立 {{ userProfile.habitDays }} 天健康饮食习惯</h3>
                            <p>坚持越久，AI 会越懂你的节奏。</p>
                        </div>
                    </div>
                    <div class="growth-card">
                        <div class="growth-icon">🌏</div>
                        <div class="growth-text">
                            <h3>探索了 {{ userProfile.newRestaurants }} 家新餐厅</h3>
                            <p>你正在扩展自己的健康地图。</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import { computed, reactive } from 'vue'

const userProfile = reactive({
    name: 'Ju Jin',
    dayLabel: '均衡目标日',
    kcalTarget: 2000,
    currentKcal: 1200,
    proteinPercent: 60,
    veggiePercent: 45,
    healthHint: '血脂偏高，建议减少油炸',
    scene: '聚餐',
    nearby: '低油川菜馆',
    travelTime: '晚上 7 点',
    travelTitle: '聚餐 · 3 人同行',
    travelFood: '酸汤鱼 + 少油小炒',
    routeSteps: ['打车 12 分钟', '步行 600 米', '候位 8 分钟'],
    weekDistance: 8.4,
    nightAdvice: '20:30 前完成晚餐',
    waterHint: '今日已饮水 1200ml',
    energyBoost: 12,
    favFood: '清淡川菜',
    tasteTrend: '微辣 · 低油',
    newPick: '山城轻油锅',
    winRate: 72,
    habitDays: 15,
    newRestaurants: 6
})

const now = new Date()
const timeGreeting = computed(() => {
    const hour = now.getHours()
    if (hour < 11) return '早安'
    if (hour < 17) return '午后好'
    return '晚上好'
})

const timeGreetingText = computed(() => {
    const hour = now.getHours()
    if (hour < 11) return '早上好'
    if (hour < 17) return '下午好'
    return '晚上好'
})

const ringStyle = computed(() => {
    const percent = Math.min(100, Math.round((userProfile.currentKcal / userProfile.kcalTarget) * 100))
    return {
        '--progress': `${percent}deg`
    }
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.home {
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(180deg, #fff7f0 0%, #f3f8ff 35%, #ffffff 100%);
    display: flex;
    flex-direction: column;

    .home-content {
        flex: 1;
        width: 100%;
        padding: 48px 40px 80px;
        display: flex;
        flex-direction: column;
        gap: 48px;
        position: relative;

        &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 10% 20%, rgba(255, 194, 144, 0.35), transparent 45%),
                radial-gradient(circle at 90% 10%, rgba(120, 187, 255, 0.25), transparent 40%),
                radial-gradient(circle at 30% 90%, rgba(255, 232, 200, 0.5), transparent 45%);
            opacity: 0.8;
            z-index: 0;
        }

        > section {
            position: relative;
            z-index: 1;
        }

        .insight-hero {
            .hero-card {
                border-radius: 28px;
                padding: 36px 40px;
                background: linear-gradient(135deg, rgba(255, 208, 167, 0.75), rgba(130, 198, 255, 0.65));
                box-shadow: 0 18px 40px rgba(36, 93, 160, 0.18);
                backdrop-filter: blur(6px);
            }

            .hero-topline {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .hero-kicker {
                font-size: 14px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: rgba(28, 46, 77, 0.75);
                font-weight: 600;
            }

            .hero-chip {
                background: rgba(255, 255, 255, 0.65);
                padding: 6px 14px;
                border-radius: 999px;
                font-size: 14px;
                color: #1f3557;
                font-weight: 600;
            }

            .hero-title {
                font-size: 32px;
                margin: 0 0 10px;
                color: #1a2a3d;
                font-weight: 700;
            }

            .hero-name {
                font-weight: 800;
            }

            .hero-subtitle {
                margin: 0 0 24px;
                font-size: 18px;
                color: rgba(26, 42, 61, 0.8);
            }

            .hero-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px 28px;
            }

            .hero-stat {
                background: rgba(255, 255, 255, 0.55);
                padding: 16px 18px;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 96px;
                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
            }

            .stat-label {
                font-size: 14px;
                color: rgba(24, 38, 60, 0.7);
            }

            .stat-value {
                font-size: 16px;
                color: #1a2a3d;
                font-weight: 600;
            }
        }

        .section-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 20px;

            h2 {
                margin: 0;
                font-size: 24px;
                color: #1a2a3d;
                font-weight: 700;
            }

            p {
                margin: 0;
                color: rgba(27, 45, 70, 0.7);
                font-size: 14px;
            }
        }

        .cockpit-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
        }

        .cockpit-card {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 12px 30px rgba(26, 57, 104, 0.12);
            backdrop-filter: blur(8px);
            min-height: 280px;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            color: #1b2d46;
            margin-bottom: 18px;
        }

        .pill {
            background: rgba(87, 168, 255, 0.15);
            color: #2a6fd6;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 12px;
        }

        .pill.secondary {
            background: rgba(255, 185, 128, 0.2);
            color: #d06b2d;
        }

        .progress-ring {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 24px;
            align-items: center;
        }

        .ring {
            width: 160px;
            height: 160px;
            border-radius: 50%;
            background: conic-gradient(#5b9dff var(--progress), rgba(94, 140, 200, 0.18) 0deg);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            animation: ringReveal 1.1s ease-out;

            &::after {
                content: '';
                position: absolute;
                inset: 14px;
                border-radius: 50%;
                background: #f7faff;
                box-shadow: inset 0 0 0 1px rgba(91, 157, 255, 0.15);
            }
        }

        .ring-center {
            position: relative;
            z-index: 1;
            text-align: center;
        }

        .ring-value {
            font-size: 28px;
            font-weight: 700;
            color: #1a2a3d;
        }

        .ring-label {
            font-size: 12px;
            color: rgba(26, 42, 61, 0.6);
        }

        .ring-metas {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: rgba(26, 42, 61, 0.7);
        }

        .meta-row strong {
            color: #1a2a3d;
        }

        .route-block {
            background: linear-gradient(135deg, rgba(255, 232, 200, 0.8), rgba(210, 232, 255, 0.7));
            padding: 18px 20px;
            border-radius: 18px;
            margin-bottom: 18px;
        }

        .route-time {
            font-size: 14px;
            color: rgba(26, 42, 61, 0.7);
        }

        .route-title {
            font-size: 20px;
            font-weight: 700;
            margin: 6px 0;
            color: #1a2a3d;
        }

        .route-meta {
            font-size: 14px;
            color: rgba(26, 42, 61, 0.7);
        }

        .route-steps {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .step-item {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: rgba(26, 42, 61, 0.8);
        }

        .step-index {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(91, 157, 255, 0.15);
            color: #2a6fd6;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }

        .quick-modes {
            .mode-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 20px;
            }

            .mode-card {
                background: #ffffff;
                border-radius: 22px;
                padding: 24px;
                box-shadow: 0 14px 30px rgba(26, 57, 104, 0.1);
                cursor: pointer;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                position: relative;
                overflow: hidden;

                &::after {
                    content: '';
                    position: absolute;
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(255, 204, 163, 0.35), transparent 70%);
                    top: -60px;
                    right: -60px;
                }

                &:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 18px 36px rgba(26, 57, 104, 0.16);
                }

                h3 {
                    margin: 12px 0 6px;
                    font-size: 18px;
                    color: #1a2a3d;
                }

                p {
                    margin: 0;
                    color: rgba(26, 42, 61, 0.65);
                    font-size: 14px;
                }
            }

            .mode-icon {
                width: 46px;
                height: 46px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(91, 157, 255, 0.15);
                font-size: 22px;
            }
        }

        .data-flow {
            .data-scroll {
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: minmax(240px, 1fr);
                gap: 18px;
                overflow-x: auto;
                padding-bottom: 10px;
            }

            .data-card {
                background: rgba(255, 255, 255, 0.9);
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 10px 26px rgba(26, 57, 104, 0.1);
                min-height: 180px;

                h4 {
                    margin: 0 0 12px;
                    font-size: 16px;
                    color: #1a2a3d;
                }

                p {
                    margin: 0 0 8px;
                    color: rgba(26, 42, 61, 0.7);
                    font-size: 14px;
                }
            }
        }

        .growth {
            .growth-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 20px;
            }

            .growth-card {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(231, 242, 255, 0.9));
                border-radius: 22px;
                padding: 22px;
                display: flex;
                gap: 16px;
                align-items: flex-start;
                box-shadow: 0 14px 32px rgba(26, 57, 104, 0.12);
            }

            .growth-icon {
                font-size: 28px;
            }

            .growth-text {
                h3 {
                    margin: 0 0 6px;
                    font-size: 18px;
                    color: #1a2a3d;
                }

                p {
                    margin: 0;
                    color: rgba(26, 42, 61, 0.65);
                    font-size: 14px;
                }
            }
        }
    }
}

@media (max-width: 1200px) {
    .home {
        .home-content {
            .cockpit-grid,
            .quick-modes .mode-grid,
            .growth .growth-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
    }
}

@media (max-width: 768px) {
    .home {
        .home-content {
            padding: 40px 20px;
            gap: 32px;

            .insight-hero {
                .hero-card {
                    padding: 28px;
                }

                .hero-title {
                    font-size: 26px;
                }

                .hero-grid {
                    grid-template-columns: 1fr;
                }
            }

            .cockpit-grid,
            .quick-modes .mode-grid,
            .growth .growth-grid {
                grid-template-columns: 1fr;
            }

            .progress-ring {
                grid-template-columns: 1fr;
                justify-items: center;
                text-align: center;
            }

            .ring {
                width: 140px;
                height: 140px;
            }

            .section-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }

            .data-flow {
                .data-scroll {
                    grid-auto-columns: minmax(200px, 1fr);
                }
            }
        }
    }
}

@keyframes ringReveal {
    from {
        transform: scale(0.9);
        opacity: 0;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
