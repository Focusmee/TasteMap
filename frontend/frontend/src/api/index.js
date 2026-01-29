import axios from 'axios'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import { isTokenExpired } from '@/utils/token'
import { serverConfig } from '@/utils/ipconfig'
 
// 创建axios实例
const api = axios.create({
  baseURL: `${serverConfig.baseURL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    // 检查token是否存在
    if (token) {
      // 检查token是否过期
      if (isTokenExpired(token)) {
        // token已过期，清除本地存储
        const userStore = useUserStore()
        userStore.logout()

        // 跳转到登录页
        router.push({
          name: 'Login',
          query: {
            redirect: router.currentRoute.value.fullPath,
            expired: 'true' // 标记为过期跳转
          }
        })

        // 取消当前请求
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }

      // token有效，添加到请求头
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        // token过期或无效，清除本地存储
        const userStore = useUserStore()
        userStore.logout()

        // 跳转到登录页
        router.push({
          name: 'Login',
          query: {
            redirect: router.currentRoute.value.fullPath,
            expired: 'true'
          }
        })
      }
      return Promise.reject(data || { success: false, message: '请求失败' })
    }
    return Promise.reject({ success: false, message: error.message || '网络错误' })
  }
)

// 用户相关API
export const userApi = {
  // 登录
  login: (phone, password) => {
    return api.post('/user/login', { phone, password })
  },

  // 注册
  register: (phone, password, nickname) => {
    return api.post('/user/register', { phone, password, nickname })
  },

  // 退出登录
  logout: () => {
    return api.post('/user/logout')
  },

  // 上传头像
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/user/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 更新昵称
  updateNickname: (nickname) => {
    return api.put('/user/update-nickname', { nickname })
  }
}

// 识别记录相关API
export const recognitionApi = {
  // 获取识别记录列表
  getList: (page = 1, size = 10, keyword = '') => {
    return api.get('/recognition/list', {
      params: { page, size, keyword }
    })
  },

  // 获取识别记录详情
  getDetail: (id) => {
    return api.get(`/recognition/${id}`)
  },

  // 上传图片并识别
  recognize: (file, topk = 5) => {
    const formData = new FormData()
    formData.append('file', file) // 字段名必须叫 file

    return api.post(`/recognition/recognize?topk=${topk}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // 搜索联想
  suggest: (keyword = '') => {
    return api.get('/recognition/suggest', { params: { keyword } })
  },

  // 修正识别结果（仅修改展示名称）
  correct: (id, food_name) => {
    return api.post(`/recognition/${id}/correct`, { food_name })
  },
}

// 用户画像 / 健康概览
export const profileApi = {
  get: () => api.get('/profile'),
  save: (profile) => api.post('/profile', profile),
  overview: (days = 7) => api.get('/profile/overview', { params: { days } })
}

// 饮食记录
export const dietApi = {
  add: (payload) => api.post('/diet/add', payload),
  list: (date) => api.get('/diet/list', { params: { date } }),
  calendar: (from, to) => api.get('/diet/calendar', { params: { from, to } }),
  summary: (days = 7) => api.get('/diet/summary', { params: { days } }),
  analysis: (date) => api.get('/diet/analysis', { params: { date } }),
  remove: (id) => api.post(`/diet/remove/${id}`)
}

// 知识库
export const knowledgeApi = {
  meta: () => api.get('/knowledge/meta'),
  list: (params = {}) => api.get('/knowledge/list', { params }),
  detail: (id) => api.get(`/knowledge/${id}`),
  suggest: (q = '') => api.get('/knowledge/suggest', { params: { q } }),
  compare: (ids = []) => api.post('/knowledge/compare', { ids }),
  create: (payload) => api.post('/knowledge', payload),
  update: (id, payload) => api.put(`/knowledge/${id}`, payload),
  remove: (id) => api.delete(`/knowledge/${id}`)
}

// 推荐
export const recommendationApi = {
  today: () => api.get('/recommendation/today'),
  forDish: (name) => api.get('/recommendation/for-dish', { params: { name } })
}

// 健康咨询（规则机器人版本）
export const chatApi = {
  sessions: () => api.get('/chat/sessions'),
  createSession: (topic = '健康咨询') => api.post('/chat/sessions', { topic }),
  messages: (sessionId) => api.get(`/chat/${sessionId}/messages`),
  send: (sessionId, content, context = {}) => api.post(`/chat/${sessionId}/send`, { content, context })
}


// 出行相关API
export const travelApi = {
  // 获取天气信息
  getWeather: (params) => {
    const query = typeof params === 'string' ? { city: params } : (params || {})
    return api.get('/travel/weather', {
      params: query
    })
  },

  // 获取附近餐厅
  getNearbyRestaurants: (params) => {
    return api.get('/travel/nearby-restaurants', {
      params
    })
  },

  // 获取路线规划
  getRoute: (type, origin, destination, city) => {
    return api.get('/travel/route', {
      params: { type, origin, destination, city }
    })
  },

  // 地址地理编码
  geocodeAddress: (address) => {
    return api.get('/travel/geocode', {
      params: { address }
    })
  },

  // 根据识别记录推荐出行计划
  recommendPlan: (rec_id) => {
    return api.post('/travel/recommend-plan', { rec_id })
  },

  // AI 行程决策驾驶舱建议
  getAiAdvice: (payload = {}) => {
    return api.post('/travel/ai-advice', payload)
  },

  // 保存出行计划
  savePlan: (planData) => {
    return api.post('/travel/save-plan', planData)
  },

  
  // ===== 地图地点标记（关联美食知识库） =====
  // 获取某个地点已标记的食物
  getPoiFoods: (poi_id, poi_source = 'amap') => {
    return api.get('/travel/poi-foods', { params: { poi_id, poi_source } })
  },

  // 批量获取多个地点的标记（用于渲染地图/列表）
  batchPoiFoods: (items = []) => {
    return api.post('/travel/poi-foods/batch', { items })
  },

  // 保存某个地点的标记（会覆盖该地点原有标记）
  savePoiFoods: (payload) => {
    return api.post('/travel/poi-foods', payload)
  },

// 获取出行计划列表
  getPlans: (page = 1, size = 10, status = '', keyword = '') => {
    return api.get('/travel/plans', {
      params: { page, size, status, keyword }
    })
  },

  // 获取出行计划详情
  getPlanDetail: (id) => {
    return api.get(`/travel/plan/${id}`)
  },

  // 删除单条出行计划
  deletePlan: (id) => {
    return api.delete(`/travel/plan/${id}`)
  },

  // 清空所有出行计划
  clearAllPlans: () => {
    return api.delete('/travel/plans')
  }
}

// 收藏相关API
export const collectionApi = {
  // 添加收藏
  add: (coll_type, target_id) => {
    return api.post('/collection/add', { coll_type, target_id })
  },

  // 取消收藏
  remove: (coll_type, target_id) => {
    return api.post('/collection/remove', { coll_type, target_id })
  },

  // 检查是否已收藏
  check: (coll_type, target_id) => {
    return api.get('/collection/check', {
      params: { coll_type, target_id }
    })
  },

  // 获取收藏列表
  getList: (coll_type = '', page = 1, size = 10) => {
    return api.get('/collection/list', {
      params: { coll_type, page, size }
    })
  }
}

// 数据看板相关API
export const dashboardApi = {
  // 概览统计
  getSummary: () => {
    return api.get('/dashboard/summary')
  },

  // ===== 识别分析 =====
  getRecognitionTrend: (days = 30) => {
    return api.get('/dashboard/recognition/trend', { params: { days } })
  },

  getRecognitionTopFoods: (days = 30, limit = 10) => {
    return api.get('/dashboard/recognition/top-foods', { params: { days, limit } })
  },

  getRecognitionAllergens: (days = 30, limit = 10) => {
    return api.get('/dashboard/recognition/allergens', { params: { days, limit } })
  },

  getNutritionTrend: (metric = 'calorie_kcal', days = 30) => {
    return api.get('/dashboard/recognition/nutrition-trend', { params: { metric, days } })
  },

  // ===== 出行分析 =====
  getTravelTrend: (days = 30) => {
    return api.get('/dashboard/travel/trend', { params: { days } })
  },

  getTravelTopDestinations: (days = 30, limit = 10) => {
    return api.get('/dashboard/travel/top-destinations', { params: { days, limit } })
  },

  getTravelRouteTypes: (days = 30) => {
    return api.get('/dashboard/travel/route-types', { params: { days } })
  }
}

export default api
