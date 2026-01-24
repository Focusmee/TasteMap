<template>
    <div class="login">
        <NavBar />
        <div class="login-content">
            <el-card class="login-card">
                <template #header>
                    <h2>登录 / 注册</h2>
                </template>

                <el-tabs v-model="activeTab" @tab-change="handleTabChange">
                    <el-tab-pane label="登录" name="login">
                        <el-form ref="loginFormRef" :model="loginForm" :rules="rules" label-width="80px">
                            <el-form-item label="手机号" prop="phone">
                                <el-input v-model="loginForm.phone" placeholder="请输入手机号" maxlength="11" />
                            </el-form-item>

                            <el-form-item label="密码" prop="password">
                                <el-input v-model="loginForm.password" type="password" placeholder="请输入密码"
                                    show-password />
                            </el-form-item>

                            <el-form-item>
                                <el-button type="primary" style="width: 100%" :loading="loginLoading"
                                    @click="handleLogin">
                                    登录
                                </el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>

                    <el-tab-pane label="注册" name="register">
                        <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="80px">
                            <el-form-item label="手机号" prop="phone">
                                <el-input v-model="registerForm.phone" placeholder="请输入手机号" maxlength="11" />
                            </el-form-item>

                            <el-form-item label="密码" prop="password">
                                <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）"
                                    show-password />
                            </el-form-item>

                            <el-form-item label="确认密码" prop="confirmPassword">
                                <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码"
                                    show-password />
                            </el-form-item>

                            <el-form-item label="昵称" prop="nickname">
                                <el-input v-model="registerForm.nickname" placeholder="请输入昵称（可选）" />
                            </el-form-item>

                            <el-form-item>
                                <el-button type="primary" style="width: 100%" :loading="registerLoading"
                                    @click="handleRegister">
                                    注册
                                </el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>
                </el-tabs>
            </el-card>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')
const loginFormRef = ref(null)
const registerFormRef = ref(null)
const loginLoading = ref(false)
const registerLoading = ref(false)

const loginForm = reactive({
    phone: '',
    password: ''
})

const registerForm = reactive({
    phone: '',
    password: '',
    confirmPassword: '',
    nickname: ''
})

const rules = {
    phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
    ]
}

const validateConfirmPassword = (rule, value, callback) => {
    if (value !== registerForm.password) {
        callback(new Error('两次输入的密码不一致'))
    } else {
        callback()
    }
}

const registerRules = {
    phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
    ],
    confirmPassword: [
        { required: true, message: '请再次输入密码', trigger: 'blur' },
        { validator: validateConfirmPassword, trigger: 'blur' }
    ],
    nickname: []
}

const handleTabChange = () => {
    // 切换标签时重置表单
    if (loginFormRef.value) {
        loginFormRef.value.resetFields()
    }
    if (registerFormRef.value) {
        registerFormRef.value.resetFields()
    }
}

const handleLogin = async () => {
    if (!loginFormRef.value) return

    await loginFormRef.value.validate(async (valid) => {
        if (valid) {
            loginLoading.value = true
            try {
                const response = await userApi.login(loginForm.phone, loginForm.password)
                if (response.success) {
                    userStore.login(response.data, response.token)
                    ElMessage.success('登录成功')

                    // 检查是否有重定向路径
                    const redirect = router.currentRoute.value.query.redirect
                    if (redirect && typeof redirect === 'string') {
                        router.push(redirect)
                    } else {
                        router.push('/')
                    }
                } else {
                    ElMessage.error(response.message || '登录失败')
                }
            } catch (error) {
                ElMessage.error(error.message || '登录失败，请重试')
                console.error('Login error:', error)
            } finally {
                loginLoading.value = false
            }
        }
    })
}

const handleRegister = async () => {
    if (!registerFormRef.value) return

    await registerFormRef.value.validate(async (valid) => {
        if (valid) {
            registerLoading.value = true
            try {
                const response = await userApi.register(
                    registerForm.phone,
                    registerForm.password,
                    registerForm.nickname || undefined
                )
                if (response.success) {
                    userStore.login(response.data, response.token)
                    ElMessage.success('注册成功')

                    // 检查是否有重定向路径
                    const redirect = router.currentRoute.value.query.redirect
                    if (redirect && typeof redirect === 'string') {
                        router.push(redirect)
                    } else {
                        router.push('/')
                    }
                } else {
                    ElMessage.error(response.message || '注册失败')
                }
            } catch (error) {
                ElMessage.error(error.message || '注册失败，请重试')
                console.error('Register error:', error)
            } finally {
                registerLoading.value = false
            }
        }
    })
}

onMounted(() => {
    // 检查是否是token过期跳转过来的
    if (route.query.expired === 'true') {
        ElMessage.warning('登录已过期，请重新登录')
    }
})
</script>

<style scoped lang="scss">
.login {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;

    .login-content {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 40px 20px;

        .login-card {
            width: 100%;
            max-width: 400px;

            h2 {
                margin: 0;
                text-align: center;
                color: #303133;
            }
        }
    }
}
</style>