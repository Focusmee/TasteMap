const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

const parseJson = (value, fallback) => {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
}

const pickNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

async function auth(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  return await verifyToken(token)
}

function buildReason(profile, dish) {
  const goal = profile?.goal || '均衡'
  if (goal === '减脂') {
    if ((dish.calories || 0) <= 350) return '热量较低，适合减脂目标'
    return '营养较均衡，建议控制分量'
  }
  if (goal === '增肌') {
    if ((dish.protein || 0) >= 20) return '蛋白质较高，有助增肌'
    return '建议搭配高蛋白食材'
  }
  if (goal === '控糖') {
    if ((dish.sugar || 0) <= 10) return '糖分较低，更适合控糖'
    return '建议减少含糖配料/搭配蔬菜'
  }
  if (goal === '降血压') {
    if ((dish.sodium || 0) <= 600) return '钠含量相对更低，适合低盐饮食'
    return '钠偏高，建议少盐版本'
  }
  return '基于你的偏好与近期记录推荐'
}

// 今日推荐
router.get('/today', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const userId = decoded.userId
  const [[p]] = await pool.execute('SELECT profile FROM user_profile WHERE user_id = ? LIMIT 1', [userId])
  const profile = p?.profile ? (typeof p.profile === 'string' ? JSON.parse(p.profile) : p.profile) : null
  const goal = profile?.goal || '减脂'
  const allergies = new Set((profile?.allergies || []).map(String))

  // 选菜策略：按目标排序 + 排除过敏原
  let orderBy = 'calories ASC'
  if (goal === '增肌') orderBy = 'COALESCE(JSON_EXTRACT(nutrition, \'$.protein_g\'), 0) + 0 DESC'
  if (goal === '控糖') orderBy = 'COALESCE(JSON_EXTRACT(nutrition, \'$.sugar_g\'), 0) + 0 ASC'
  if (goal === '降血压') orderBy = 'COALESCE(JSON_EXTRACT(nutrition, \'$.sodium_mg\'), 0) + 0 ASC'

  const [rows] = await pool.execute(
    `SELECT id, name, category, calories, nutrition, allergens, tags, image_url
     FROM food_knowledge
     ORDER BY ${orderBy}, id DESC
     LIMIT 60`
  )

  const list = []
  for (const r of rows) {
    const nutrition = parseJson(r.nutrition, {}) || {}
    const als = parseJson(r.allergens, []) || []
    const dish = {
      ...r,
      nutrition,
      protein: pickNumber(nutrition.protein_g ?? nutrition.protein),
      fat: pickNumber(nutrition.fat_g ?? nutrition.fat),
      carbs: pickNumber(nutrition.carb_g ?? nutrition.carbs ?? nutrition.carbohydrate_g),
      sodium: pickNumber(nutrition.sodium_mg ?? nutrition.sodium),
      sugar: pickNumber(nutrition.sugar_g ?? nutrition.sugar)
    }
    if (als.some(a => allergies.has(String(a)))) continue
    list.push({
      ...dish,
      reason: buildReason(profile, dish)
    })
    if (list.length >= 6) break
  }

  ctx.body = { success: true, data: list }
})

module.exports = router
