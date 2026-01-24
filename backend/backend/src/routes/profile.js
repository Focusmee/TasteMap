const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

async function auth(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  return await verifyToken(token)
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
    'SELECT id, profile_json, health_score, update_time FROM user_profile WHERE user_id = ? LIMIT 1',
    [decoded.userId]
  )

  if (rows.length === 0) {
    ctx.body = {
      success: true,
      data: {
        profile: {
          goal: '减脂',
          preferences: [],
          allergies: [],
          lifestyle: { sport: '每周1-2次', work: '中等' }
        },
        health_score: 70
      }
    }
    return
  }

  const row = rows[0]
  ctx.body = {
    success: true,
    data: {
      id: row.id,
      profile: typeof row.profile_json === 'string' ? JSON.parse(row.profile_json) : row.profile_json,
      health_score: row.health_score,
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

  const profile = ctx.request.body?.profile
  if (!profile) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少 profile' }
    return
  }

  // 简单健康分：目标/过敏原/运动频率粗略估计（前端会再做更丰富的展示）
  let score = 70
  if (profile.goal === '控糖') score += 5
  if (profile.goal === '降血压') score += 5
  if (Array.isArray(profile.allergies) && profile.allergies.length > 0) score -= 2
  if (profile.lifestyle?.sport && String(profile.lifestyle.sport).includes('3')) score += 5
  score = Math.max(0, Math.min(100, score))

  await pool.execute(
    `INSERT INTO user_profile (user_id, profile_json, health_score)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE profile_json = VALUES(profile_json), health_score = VALUES(health_score)`,
    [decoded.userId, JSON.stringify(profile), score]
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
    'SELECT health_score, profile_json FROM user_profile WHERE user_id = ? LIMIT 1',
    [userId]
  )

  const [[diet]] = await pool.execute(
    `SELECT 
        IFNULL(SUM(calories),0) AS total_calories,
        IFNULL(SUM(protein),0) AS total_protein,
        IFNULL(SUM(fat),0) AS total_fat,
        IFNULL(SUM(carbs),0) AS total_carbs
     FROM diet_log 
     WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
    [userId]
  )

  ctx.body = {
    success: true,
    data: {
      health_score: p?.health_score ?? 70,
      profile: p?.profile_json ? (typeof p.profile_json === 'string' ? JSON.parse(p.profile_json) : p.profile_json) : null,
      last7: diet
    }
  }
})

module.exports = router
