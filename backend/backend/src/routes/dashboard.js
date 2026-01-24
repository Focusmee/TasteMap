const Router = require('koa-router')
const pool = require('../config/database')
const dayjs = require('dayjs')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

/**
 * 从请求头里解析 Bearer Token 并校验，返回 userId。
 */
async function getUserIdOrThrow(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权，请先登录' }
    return null
  }

  const decoded = await verifyToken(token)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: 'Token无效或已过期' }
    return null
  }

  return decoded.userId
}

function clampDays(days, def = 7) {
  const n = parseInt(days)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(365, n)
}

function toDateStart(days) {
  return dayjs().subtract(days - 1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss')
}

function safeJsonParse(v) {
  if (v == null) return null
  if (typeof v === 'object') return v
  try {
    return JSON.parse(v)
  } catch {
    return null
  }
}

function parseNumberLike(v) {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    // 提取第一个数字（支持 123 / 123.4 / "约123大卡" 等）
    const m = v.match(/-?\d+(?:\.\d+)?/)
    if (!m) return null
    const num = parseFloat(m[0])
    return Number.isFinite(num) ? num : null
  }
  return null
}

function extractNutritionMetric(recResult, metric) {
  // 优先 nutrition 对象
  const nutrition = recResult?.nutrition
  if (nutrition && typeof nutrition === 'object') {
    const v = nutrition[metric]
    const num = parseNumberLike(v)
    if (num != null) return num
  }

  // 兼容旧字段：calorie 可能是 "xxx大卡" 或 "xxx" 字符串
  if (metric === 'calorie_kcal' || metric === 'calorie') {
    const num = parseNumberLike(recResult?.calorie)
    if (num != null) return num
  }

  // 兼容：部分实现可能直接把蛋白/脂肪/碳水放在顶层
  const num = parseNumberLike(recResult?.[metric])
  if (num != null) return num

  return null
}

/**
 * 概览：用于看板顶部统计卡片
 */
router.get('/summary', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const weekStart = toDateStart(7)
    const monthStart = toDateStart(30)

    // 识别统计
    const [[recToday]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM recognition WHERE user_id = ? AND DATE(create_time) = CURDATE()',
      [userId]
    )
    const [[recWeek]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM recognition WHERE user_id = ? AND create_time >= ?',
      [userId, weekStart]
    )
    const [[recMonth]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM recognition WHERE user_id = ? AND create_time >= ?',
      [userId, monthStart]
    )
    const [topFoodRows] = await pool.execute(
      `SELECT 
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.food_name')),
          JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.name'))
        ) AS name,
        COUNT(*) AS c
      FROM recognition
      WHERE user_id = ? AND create_time >= ?
      GROUP BY name
      ORDER BY c DESC
      LIMIT 1`,
      [userId, monthStart]
    )
    const topFood = topFoodRows?.[0] || null

    // 出行统计
    const [[trToday]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM travel_plan WHERE user_id = ? AND DATE(create_time) = CURDATE()',
      [userId]
    )
    const [[trWeek]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM travel_plan WHERE user_id = ? AND create_time >= ?',
      [userId, weekStart]
    )
    const [[trMonth]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM travel_plan WHERE user_id = ? AND create_time >= ?',
      [userId, monthStart]
    )
    const [topDestRows] = await pool.execute(
      `SELECT destination AS name, COUNT(*) AS c
       FROM travel_plan
       WHERE user_id = ? AND create_time >= ?
       GROUP BY destination
       ORDER BY c DESC
       LIMIT 1`,
      [userId, monthStart]
    )
    const topDestination = topDestRows?.[0] || null

    ctx.body = {
      success: true,
      data: {
        recognition: {
          today: recToday.c,
          week: recWeek.c,
          month: recMonth.c,
          topFood: topFood ? { name: topFood.name || '未知', count: topFood.c } : null
        },
        travel: {
          today: trToday.c,
          week: trWeek.c,
          month: trMonth.c,
          topDestination: topDestination
            ? { name: topDestination.name || '未知', count: topDestination.c }
            : null
        }
      }
    }
  } catch (error) {
    console.error('dashboard summary error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取概览数据失败' }
  }
})

/**
 * 识别次数趋势（按天）
 */
router.get('/recognition/trend', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      `SELECT DATE(create_time) AS d, COUNT(*) AS c
       FROM recognition
       WHERE user_id = ? AND create_time >= ?
       GROUP BY DATE(create_time)
       ORDER BY d ASC`,
      [userId, start]
    )

    ctx.body = {
      success: true,
      data: {
        days,
        list: rows.map(r => ({ date: dayjs(r.d).format('YYYY-MM-DD'), count: Number(r.c) }))
      }
    }
  } catch (error) {
    console.error('dashboard rec trend error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取识别趋势失败' }
  }
})

/**
 * 识别菜品 TopN
 */
router.get('/recognition/top-foods', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const limit = Math.min(50, Math.max(1, parseInt(ctx.query.limit || '10')))
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      `SELECT 
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.food_name')),
          JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.name'))
        ) AS name,
        COUNT(*) AS c
      FROM recognition
      WHERE user_id = ? AND create_time >= ?
      GROUP BY name
      ORDER BY c DESC
      LIMIT ${limit}`,
      [userId, start]
    )

    ctx.body = {
      success: true,
      data: {
        days,
        list: rows.map(r => ({ name: r.name || '未知', count: Number(r.c) }))
      }
    }
  } catch (error) {
    console.error('dashboard rec top-foods error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取菜品Top失败' }
  }
})

/**
 * 过敏原分布（统计近 N 天出现次数）
 * 注：JSON 数组统计在不同 MySQL 版本上兼容性差，这里在 Node 侧统计，稳定。
 */
router.get('/recognition/allergens', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const limit = Math.min(50, Math.max(1, parseInt(ctx.query.limit || '10')))
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      'SELECT rec_result FROM recognition WHERE user_id = ? AND create_time >= ?',
      [userId, start]
    )

    const counter = new Map()
    for (const r of rows) {
      const rec = safeJsonParse(r.rec_result)
      const allergens = Array.isArray(rec?.allergens) ? rec.allergens : []
      for (const a of allergens) {
        const key = String(a || '').trim()
        if (!key) continue
        counter.set(key, (counter.get(key) || 0) + 1)
      }
    }

    const list = Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    ctx.body = {
      success: true,
      data: { days, list }
    }
  } catch (error) {
    console.error('dashboard rec allergens error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取过敏原统计失败' }
  }
})

/**
 * 营养指标趋势（按天）
 * metric:
 *  - calorie_kcal（默认）
 *  - protein_g
 *  - fat_g
 *  - carb_g
 *  - sodium_mg
 */
router.get('/recognition/nutrition-trend', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const metric = String(ctx.query.metric || 'calorie_kcal')
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      'SELECT rec_result, create_time FROM recognition WHERE user_id = ? AND create_time >= ? ORDER BY create_time ASC',
      [userId, start]
    )

    const agg = new Map() // date -> {sum,count}
    for (const r of rows) {
      const date = dayjs(r.create_time).format('YYYY-MM-DD')
      const rec = safeJsonParse(r.rec_result)
      const v = extractNutritionMetric(rec, metric)
      if (v == null) continue
      const cur = agg.get(date) || { sum: 0, count: 0 }
      cur.sum += v
      cur.count += 1
      agg.set(date, cur)
    }

    const list = Array.from(agg.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        value: v.count > 0 ? Number((v.sum / v.count).toFixed(2)) : 0,
        count: v.count
      }))

    ctx.body = { success: true, data: { days, metric, list } }
  } catch (error) {
    console.error('dashboard nutrition trend error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取营养趋势失败' }
  }
})

/**
 * 出行次数趋势（按天）
 */
router.get('/travel/trend', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      `SELECT DATE(create_time) AS d, COUNT(*) AS c
       FROM travel_plan
       WHERE user_id = ? AND create_time >= ?
       GROUP BY DATE(create_time)
       ORDER BY d ASC`,
      [userId, start]
    )

    ctx.body = {
      success: true,
      data: {
        days,
        list: rows.map(r => ({ date: dayjs(r.d).format('YYYY-MM-DD'), count: Number(r.c) }))
      }
    }
  } catch (error) {
    console.error('dashboard travel trend error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取出行趋势失败' }
  }
})

/**
 * 目的地 TopN
 */
router.get('/travel/top-destinations', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const limit = Math.min(50, Math.max(1, parseInt(ctx.query.limit || '10')))
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      `SELECT destination AS name, COUNT(*) AS c
       FROM travel_plan
       WHERE user_id = ? AND create_time >= ?
       GROUP BY destination
       ORDER BY c DESC
       LIMIT ${limit}`,
      [userId, start]
    )

    ctx.body = {
      success: true,
      data: {
        days,
        list: rows.map(r => ({ name: r.name || '未知', count: Number(r.c) }))
      }
    }
  } catch (error) {
    console.error('dashboard travel top-destinations error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取目的地Top失败' }
  }
})

/**
 * 出行方式分布（route_type）
 */
router.get('/travel/route-types', async (ctx) => {
  try {
    const userId = await getUserIdOrThrow(ctx)
    if (!userId) return

    const days = clampDays(ctx.query.days, 30)
    const start = toDateStart(days)

    const [rows] = await pool.execute(
      `SELECT route_type AS name, COUNT(*) AS c
       FROM travel_plan
       WHERE user_id = ? AND create_time >= ?
       GROUP BY route_type
       ORDER BY c DESC`,
      [userId, start]
    )

    ctx.body = {
      success: true,
      data: {
        days,
        list: rows.map(r => ({ name: r.name || 'unknown', count: Number(r.c) }))
      }
    }
  } catch (error) {
    console.error('dashboard travel route-types error:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '获取出行方式统计失败' }
  }
})

module.exports = router
