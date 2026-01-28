const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

async function auth(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  return await verifyToken(token)
}

const normalizeGoal = (goal) => {
  if (!goal) return 'balanced'
  const map = {
    '减脂': 'cut',
    '增肌': 'bulk',
    '控糖': 'low_sugar',
    '低糖': 'low_sugar',
    '均衡': 'balanced',
    '低盐': 'low_salt',
    '降血压': 'low_salt',
    cut: 'cut',
    bulk: 'bulk',
    low_sugar: 'low_sugar',
    balanced: 'balanced',
    low_salt: 'low_salt'
  }
  return map[goal] || 'balanced'
}

const normalizeProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return profile
  const allergies = Array.isArray(profile.allergies)
    ? profile.allergies
    : Array.isArray(profile.allergens)
      ? profile.allergens
      : []

  return {
    ...profile,
    goal: normalizeGoal(profile.goal),
    conditions: Array.isArray(profile.conditions) ? profile.conditions : [],
    diet_style: profile.diet_style || 'normal',
    allergies
  }
}

const computeHealthScore = (profile) => {
  if (!profile || typeof profile !== 'object') return 70
  let score = 70
  if (profile.goal === 'low_sugar') score += 5
  if (profile.goal === 'low_salt') score += 5
  if (Array.isArray(profile.conditions) && profile.conditions.length > 0) score -= 2
  if (Array.isArray(profile.allergies) && profile.allergies.length > 0) score -= 2
  if (profile.lifestyle?.sport && String(profile.lifestyle.sport).includes('3')) score += 5
  return Math.max(0, Math.min(100, score))
}

// 获取用户画像
router.get('/', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const [rows] = await pool.execute(
    'SELECT id, profile, update_time FROM user_profile WHERE user_id = ? LIMIT 1',
    [decoded.userId]
  )

  if (rows.length === 0) {
    const profile = {
      goal: 'balanced',
      conditions: [],
      diet_style: 'normal',
      preferences: [],
      allergies: [],
      lifestyle: { sport: '每周1-2次', work: '中等' }
    }
    ctx.body = {
      success: true,
      data: {
        profile,
        health_score: computeHealthScore(profile)
      }
    }
    return
  }

  const row = rows[0]
  const rawProfile = typeof row.profile === 'string' ? JSON.parse(row.profile) : row.profile
  const profile = normalizeProfile(rawProfile)
  ctx.body = {
    success: true,
    data: {
      id: row.id,
      profile,
      health_score: computeHealthScore(profile),
      update_time: row.update_time
    }
  }
})

// 保存用户画像
router.post('/', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const body = ctx.request.body || {}
  const rawProfile = body.profile ?? body
  if (!rawProfile) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少 profile' }
    return
  }

  const profile = normalizeProfile(rawProfile)

  const score = computeHealthScore(profile)

  await pool.execute(
    `INSERT INTO user_profile (user_id, profile)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE profile = VALUES(profile)`,
    [decoded.userId, JSON.stringify(profile)]
  )

  ctx.body = { success: true, data: { health_score: score } }
})

// 画像概览（用于看板/个人中心）
router.get('/overview', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const userId = decoded.userId

  const [[p]] = await pool.execute(
    'SELECT profile FROM user_profile WHERE user_id = ? LIMIT 1',
    [userId]
  )

  const [[diet]] = await pool.execute(
    `SELECT 
        IFNULL(SUM(calories),0) AS total_calories,
        IFNULL(SUM(COALESCE(JSON_EXTRACT(nutrition, '$.protein_g'), JSON_EXTRACT(nutrition, '$.protein'), 0) + 0),0) AS total_protein,
        IFNULL(SUM(COALESCE(JSON_EXTRACT(nutrition, '$.fat_g'), JSON_EXTRACT(nutrition, '$.fat'), 0) + 0),0) AS total_fat,
        IFNULL(SUM(COALESCE(JSON_EXTRACT(nutrition, '$.carb_g'), JSON_EXTRACT(nutrition, '$.carbs'), JSON_EXTRACT(nutrition, '$.carbohydrate_g'), 0) + 0),0) AS total_carbs
     FROM diet_log 
     WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
    [userId]
  )

  const rawProfile = p?.profile ? (typeof p.profile === 'string' ? JSON.parse(p.profile) : p.profile) : null
  const profile = normalizeProfile(rawProfile)

  ctx.body = {
    success: true,
    data: {
      health_score: computeHealthScore(profile),
      profile,
      last7: diet
    }
  }
})

module.exports = router
