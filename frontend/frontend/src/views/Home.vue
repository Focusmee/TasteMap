<template>
    <div class="home">
        <NavBar />
        <div class="home-content">
            <div class="feature-cards">
                <el-card class="feature-card" shadow="hover" @click="$router.push('/recognition')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <Camera />
                    </el-icon>
                    <h3>拍照识别</h3>
                    <p>快速识别菜品成分和过敏原</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/recommendation')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                    <Dish />
                    </el-icon>
                    <h3>饮食推荐</h3>
                    <p>根据目标给出今日推荐</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/diet')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <Calendar />
                    </el-icon>
                    <h3>饮食日历</h3>
                    <p>记录三餐，查看热量趋势</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/knowledge')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <Notebook />
                    </el-icon>
                    <h3>知识库</h3>
                    <p>查卡路里/营养/适配人群</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/chat')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <ChatLineRound />
                    </el-icon>
                    <h3>营养助手</h3>
                    <p>问一问：过敏/减脂/糖友</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/travel')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <Location />
                    </el-icon>
                    <h3>出行规划</h3>
                    <p>天气、路线一站式服务</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/history')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <Clock />
                    </el-icon>
                    <h3>历史记录</h3>
                    <p>查看识别和出行规划</p>
                </el-card>

                <el-card class="feature-card" shadow="hover" @click="$router.push('/dashboard')">
                    <el-icon class="card-icon" :size="48" color="#409EFF">
                        <DataAnalysis />
                    </el-icon>
                    <h3>数据看板</h3>
                    <p>识别与出行数据可视化统计</p>
                </el-card>
            </div>

            <div class="home-footer">
                <p class="slogan">餐前识别过敏原，餐后规划出行路</p>
                <p class="copyright">© YOLO + 食物识别 + 出行规划</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import { Camera, Location, Clock, DataAnalysis, Dish, Calendar, Notebook, ChatLineRound } from '@element-plus/icons-vue'
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;

.home {
    min-height: 100vh;
    width: 100%;
    background: $bg-color;
    display: flex;
    flex-direction: column;

    .home-content {
        flex: 1;
        width: 100%;
        padding: 60px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .feature-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
            margin-bottom: 80px;
            width: 100%;
            padding: 0;

            .feature-card {
                cursor: pointer;
                text-align: center;
                transition: transform 0.3s, box-shadow 0.3s;
                border-radius: 12px;
                padding: 40px 30px;
                min-height: 280px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;

                &:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
                }

                .card-icon {
                    margin-bottom: 24px;
                }

                h3 {
                    margin: 0 0 12px;
                    font-size: 24px;
                    color: $text-primary;
                    font-weight: 600;
                }

                p {
                    color: $text-secondary;
                    font-size: 16px;
                    margin: 0;
                }
            }
        }

        .home-footer {
            text-align: center;
            padding: 40px 0;
            margin-top: auto;
            width: 100%;

            .slogan {
                font-size: 20px;
                color: $text-primary;
                margin-bottom: 16px;
                font-weight: 500;
            }

            .copyright {
                font-size: 14px;
                color: $text-secondary;
            }
        }
    }
}

@media (max-width: 1200px) {
    .home {
        .home-content {
            .feature-cards {
                grid-template-columns: repeat(2, 1fr);
                gap: 24px;
            }
        }
    }
}

@media (max-width: 768px) {
    .home {
        .home-content {
            padding: 40px 20px;

            .feature-cards {
                grid-template-columns: 1fr;
                gap: 20px;
                margin-bottom: 40px;

                .feature-card {
                    min-height: 220px;
                    padding: 30px 20px;

                    h3 {
                        font-size: 20px;
                    }

                    p {
                        font-size: 14px;
                    }
                }
            }

            .home-footer {
                .slogan {
                    font-size: 18px;
                }
            }
        }
    }
}
</style>