const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

async function auth(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  return await verifyToken(token)
}

// 新增饮食记录
router.post('/add', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const {
    log_date,
    meal_type,
    food_name,
    img_url = '',
    calories = 0,
    protein = 0,
    fat = 0,
    carbs = 0,
    sodium = 0,
    sugar = 0,
    allergens = [],
    note = ''
  } = ctx.request.body || {}

  if (!log_date || !meal_type || !food_name) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少必要字段：log_date/meal_type/food_name' }
    return
  }

  const [ret] = await pool.execute(
    `INSERT INTO diet_log (user_id, log_date, meal_type, food_name, img_url,
       calories, protein, fat, carbs, sodium, sugar, allergens, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      decoded.userId,
      log_date,
      meal_type,
      food_name,
      img_url,
      Number(calories) || 0,
      Number(protein) || 0,
      Number(fat) || 0,
      Number(carbs) || 0,
      Number(sodium) || 0,
      Number(sugar) || 0,
      JSON.stringify(allergens || []),
      note
    ]
  )

  ctx.body = { success: true, data: { id: ret.insertId } }
})

// 某天列表
router.get('/list', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const date = ctx.query.date
  if (!date) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少 date' }
    return
  }

  const [rows] = await pool.execute(
    `SELECT id, log_date, meal_type, food_name, img_url, calories, protein, fat, carbs, sodium, sugar, allergens, note, create_time
     FROM diet_log
     WHERE user_id = ? AND log_date = ?
     ORDER BY FIELD(meal_type,'早餐','午餐','晚餐','加餐'), create_time ASC`,
    [decoded.userId, date]
  )

  ctx.body = {
    success: true,
    data: rows.map(r => ({
      ...r,
      allergens: typeof r.allergens === 'string' ? JSON.parse(r.allergens || '[]') : (r.allergens || [])
    }))
  }
})

// 删除一条记录
// 删除一条记录
router.post('/remove/:id', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const userId = decoded.id
  const id = ctx.params.id
  try {
    await pool.execute('DELETE FROM diet_log WHERE id = ? AND user_id = ?', [id, userId])
    ctx.body = { success: true, message: '已删除' }
  } catch (e) {
    ctx.status = 500
    ctx.body = { success: false, message: '删除失败', error: e.message }
  }
})

// 日历摘要：范围内每天的热量
router.get('/calendar', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const from = ctx.query.from
  const to = ctx.query.to
  if (!from || !to) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少 from/to' }
    return
  }

  const [rows] = await pool.execute(
    `SELECT log_date,
            SUM(calories) AS calories,
            SUM(protein) AS protein,
            SUM(fat) AS fat,
            SUM(carbs) AS carbs
     FROM diet_log
     WHERE user_id = ? AND log_date BETWEEN ? AND ?
     GROUP BY log_date
     ORDER BY log_date ASC`,
    [decoded.userId, from, to]
  )

  ctx.body = { success: true, data: rows }
})

// 趋势统计（默认7天）
router.get('/summary', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const days = Math.max(1, Math.min(90, Number(ctx.query.days || 7)))

  const [rows] = await pool.execute(
    `SELECT log_date,
            SUM(calories) AS calories,
            SUM(protein) AS protein,
            SUM(fat) AS fat,
            SUM(carbs) AS carbs,
            SUM(sodium) AS sodium,
            SUM(sugar) AS sugar
     FROM diet_log
     WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY log_date
     ORDER BY log_date ASC`,
    [decoded.userId, days]
  )

  ctx.body = { success: true, data: rows }
})

// 个人饮食分析（MVP）
router.get('/analysis', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }

  const date = ctx.query.date
  const useDate = Boolean(date)

  const [summaryRows] = await pool.execute(
    useDate
      ? `SELECT 
           IFNULL(SUM(calories),0) AS calories,
           IFNULL(SUM(protein),0) AS protein,
           IFNULL(SUM(fat),0) AS fat,
           IFNULL(SUM(carbs),0) AS carbs
         FROM diet_log
         WHERE user_id = ? AND log_date = ?`
      : `SELECT 
           IFNULL(SUM(calories),0) AS calories,
           IFNULL(SUM(protein),0) AS protein,
           IFNULL(SUM(fat),0) AS fat,
           IFNULL(SUM(carbs),0) AS carbs
         FROM diet_log
         WHERE user_id = ? AND log_date = CURDATE()`,
    useDate ? [decoded.userId, date] : [decoded.userId]
  )

  const [friedRows] = await pool.execute(
    useDate
      ? `SELECT COUNT(*) AS fried_count
         FROM diet_log
         WHERE user_id = ?
           AND log_date BETWEEN DATE_SUB(?, INTERVAL 2 DAY) AND ?
           AND (
             food_name LIKE '%油炸%' OR food_name LIKE '%炸%' OR
             note LIKE '%油炸%' OR note LIKE '%炸%'
           )`
      : `SELECT COUNT(*) AS fried_count
         FROM diet_log
         WHERE user_id = ?
           AND log_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 2 DAY) AND CURDATE()
           AND (
             food_name LIKE '%油炸%' OR food_name LIKE '%炸%' OR
             note LIKE '%油炸%' OR note LIKE '%炸%'
           )`,
    useDate ? [decoded.userId, date, date] : [decoded.userId]
  )

  const summary = summaryRows[0] || { calories: 0, protein: 0, fat: 0, carbs: 0 }
  const totalMacro = Number(summary.protein || 0) + Number(summary.fat || 0) + Number(summary.carbs || 0)
  const ratio = totalMacro > 0
    ? {
        protein: Math.round((Number(summary.protein || 0) / totalMacro) * 100),
        fat: Math.round((Number(summary.fat || 0) / totalMacro) * 100),
        carbs: Math.round((Number(summary.carbs || 0) / totalMacro) * 100)
      }
    : { protein: 0, fat: 0, carbs: 0 }

  const suggestions = []
  if (Number(summary.calories || 0) > 2000) {
    suggestions.push('今日热量摄入偏高，建议晚餐选择清淡食物')
  }
  if (Number(friedRows[0]?.fried_count || 0) > 2) {
    suggestions.push('最近油炸食品偏多，建议增加蔬菜摄入')
  }

  ctx.body = {
    success: true,
    data: {
      date: useDate ? date : null,
      total: summary,
      macro_ratio: ratio,
      suggestions
    }
  }
})

router.delete('/:id', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const id = Number(ctx.params.id)
  if (!id) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少 id' }
    return
  }
  const [ret] = await pool.execute('DELETE FROM diet_log WHERE id = ? AND user_id = ?', [id, decoded.userId])
  ctx.body = { success: true, data: { deleted: ret.affectedRows } }
})

module.exports = router
