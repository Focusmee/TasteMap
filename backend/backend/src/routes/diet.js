const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

async function auth(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  return await verifyToken(token)
}

const parseJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
}

const toYmd = (d = new Date()) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const macroSql = {
  protein: "COALESCE(JSON_EXTRACT(nutrition, '$.protein_g'), JSON_EXTRACT(nutrition, '$.protein'), 0) + 0",
  fat: "COALESCE(JSON_EXTRACT(nutrition, '$.fat_g'), JSON_EXTRACT(nutrition, '$.fat'), 0) + 0",
  carbs: "COALESCE(JSON_EXTRACT(nutrition, '$.carb_g'), JSON_EXTRACT(nutrition, '$.carbs'), JSON_EXTRACT(nutrition, '$.carbohydrate_g'), 0) + 0",
  sodium: "COALESCE(JSON_EXTRACT(nutrition, '$.sodium_mg'), JSON_EXTRACT(nutrition, '$.sodium'), 0) + 0",
  sugar: "COALESCE(JSON_EXTRACT(nutrition, '$.sugar_g'), JSON_EXTRACT(nutrition, '$.sugar'), 0) + 0"
}

const getTargetCalories = async (userId) => {
  const [[row]] = await pool.execute(
    'SELECT profile FROM user_profile WHERE user_id = ? LIMIT 1',
    [userId]
  )
  if (!row) return null
  const profile = parseJson(row.profile, null)
  if (!profile || typeof profile !== 'object') return null
  const target = Number(profile.calorie_target ?? profile.goal ?? profile.target_calories)
  return Number.isFinite(target) ? target : null
}

const computeStatus = (totalCalories, targetCalories) => {
  if (!targetCalories || !Number.isFinite(Number(totalCalories))) return null
  const total = Number(totalCalories)
  if (total <= targetCalories) return 'OK'
  if (total <= targetCalories * 1.1) return 'WARN'
  return 'HIGH'
}

const scaleNutrition = (nutrition, ratio) => {
  if (!nutrition || typeof nutrition !== 'object') return nutrition
  const scaled = {}
  for (const [key, value] of Object.entries(nutrition)) {
    const num = Number(value)
    scaled[key] = Number.isFinite(num) ? Math.round(num * ratio * 100) / 100 : value
  }
  return scaled
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
    date,
    meal_type,
    food_name,
    calories = 0,
    nutrition = null,
    allergens = [],
    portion = 1,
    portion_unit = '\u4efd',
    note = ''
  } = ctx.request.body || {}

  const logDate = log_date || date || toYmd()

  if (!logDate || !meal_type || !food_name) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少必要字段：log_date/meal_type/food_name' }
    return
  }

  const portionNum = Number(portion) || 1
  const portionUnit = String(portion_unit || '\u4efd')

  let resolvedCalories = Number(calories) || 0
  let resolvedNutrition = nutrition
  let resolvedAllergens = allergens || []

  const [foodRows] = await pool.execute(
    'SELECT calories, nutrition, allergens FROM food_knowledge WHERE name = ? LIMIT 1',
    [food_name]
  )
  if (foodRows.length) {
    const food = foodRows[0]
    const foodCalories = Number(food.calories)
    if (Number.isFinite(foodCalories) && foodCalories >= 0) {
      resolvedCalories = foodCalories
    }
    const foodNutrition = parseJson(food.nutrition, null)
    if (foodNutrition && typeof foodNutrition === 'object') {
      resolvedNutrition = foodNutrition
    }
    const foodAllergens = parseJson(food.allergens, [])
    if (Array.isArray(foodAllergens)) {
      resolvedAllergens = foodAllergens
    }
  }

  const scaledCalories = Math.round((Number(resolvedCalories) || 0) * portionNum)
  const scaledNutrition = portionNum !== 1 ? scaleNutrition(resolvedNutrition, portionNum) : resolvedNutrition

  const nutritionValue = scaledNutrition == null
    ? null
    : (typeof scaledNutrition === 'string' ? scaledNutrition : JSON.stringify(scaledNutrition))
  const allergensValue = Array.isArray(resolvedAllergens)
    ? JSON.stringify(resolvedAllergens)
    : JSON.stringify([])

  try {
    const [ret] = await pool.execute(
      `INSERT INTO diet_log (user_id, log_date, meal_type, food_name, calories, nutrition, allergens, note, portion_num, portion_unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        decoded.userId,
        logDate,
        meal_type,
        food_name,
        scaledCalories,
        nutritionValue,
        allergensValue,
        note,
        portionNum,
        portionUnit
      ]
    )

    ctx.body = { success: true, data: { id: ret.insertId } }
  } catch (e) {
    // Backward compatibility for older schema without portion columns.
    if (e && e.code === 'ER_BAD_FIELD_ERROR') {
      const [ret] = await pool.execute(
        `INSERT INTO diet_log (user_id, log_date, meal_type, food_name, calories, nutrition, allergens, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          decoded.userId,
          logDate,
          meal_type,
          food_name,
          scaledCalories,
          nutritionValue,
          allergensValue,
          note
        ]
      )
      ctx.body = { success: true, data: { id: ret.insertId } }
      return
    }
    ctx.status = 500
    ctx.body = { success: false, message: '添加失败', error: e?.message }
  }
})

// 某天列表
// list by date
router.get('/list', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: 'unauthorized' }
    return
  }

  const date = ctx.query.date
  if (!date) {
    ctx.status = 400
    ctx.body = { success: false, message: 'missing date' }
    return
  }

  let rows = []
  try {
    const [ret] = await pool.execute(
      `SELECT id, log_date, meal_type, food_name, calories, nutrition, allergens, note, portion_num, portion_unit, create_time
       FROM diet_log
       WHERE user_id = ? AND log_date = ?
       ORDER BY FIELD(meal_type,'breakfast','lunch','dinner','snack'), create_time ASC`,
      [decoded.userId, date]
    )
    rows = ret
  } catch (e) {
    if (e && e.code === 'ER_BAD_FIELD_ERROR') {
      const [ret] = await pool.execute(
        `SELECT id, log_date, meal_type, food_name, calories, nutrition, allergens, note, create_time
         FROM diet_log
         WHERE user_id = ? AND log_date = ?
         ORDER BY FIELD(meal_type,'breakfast','lunch','dinner','snack'), create_time ASC`,
        [decoded.userId, date]
      )
      rows = ret.map((r) => ({ ...r, portion_num: 1, portion_unit: '\u4efd' }))
    } else {
      throw e
    }
  }

  const list = rows.map((r) => ({
    ...r,
    nutrition: parseJson(r.nutrition, null),
    allergens: parseJson(r.allergens, []),
    portion_num: r.portion_num ?? 1,
    portion_unit: r.portion_unit ?? '\u4efd'
  }))

  const [summaryRows] = await pool.execute(
    `SELECT 
        IFNULL(SUM(calories),0) AS calories,
        IFNULL(SUM(${macroSql['protein']}),0) AS protein,
        IFNULL(SUM(${macroSql['fat']}),0) AS fat,
        IFNULL(SUM(${macroSql['carbs']}),0) AS carbs
     FROM diet_log
     WHERE user_id = ? AND log_date = ?`,
    [decoded.userId, date]
  )

  const summary = summaryRows[0] || { calories: 0, protein: 0, fat: 0, carbs: 0 }
  const targetCalories = await getTargetCalories(decoded.userId)
  const status = computeStatus(summary.calories, targetCalories)

  ctx.body = {
    success: true,
    data: {
      list,
      summary,
      target_calories: targetCalories,
      status
    }
  }
})

router.post('/remove/:id', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const userId = decoded.userId
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
// calendar month summary
router.get('/calendar', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: 'unauthorized' }
    return
  }

  const from = ctx.query.from
  const to = ctx.query.to
  if (!from || !to) {
    ctx.status = 400
    ctx.body = { success: false, message: 'missing from/to' }
    return
  }

  const [rows] = await pool.execute(
    `SELECT log_date,
            SUM(calories) AS total_calories,
            COUNT(*) AS meals
     FROM diet_log
     WHERE user_id = ? AND log_date BETWEEN ? AND ?
     GROUP BY log_date
     ORDER BY log_date ASC`,
    [decoded.userId, from, to]
  )

  const targetCalories = await getTargetCalories(decoded.userId)
  const list = rows.map((row) => ({
    ...row,
    status: computeStatus(row.total_calories, targetCalories)
  }))

  ctx.body = {
    success: true,
    data: {
      list,
      target_calories: targetCalories
    }
  }
})

// trend summary
router.get('/summary', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: 'unauthorized' }
    return
  }
  const days = Math.max(1, Math.min(90, Number(ctx.query.days || 7)))

  const [rows] = await pool.execute(
    `SELECT log_date,
            SUM(calories) AS calories,
            SUM(${macroSql['protein']}) AS protein,
            SUM(${macroSql['fat']}) AS fat,
            SUM(${macroSql['carbs']}) AS carbs,
            SUM(${macroSql['sodium']}) AS sodium,
            SUM(${macroSql['sugar']}) AS sugar
     FROM diet_log
     WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY log_date
     ORDER BY log_date ASC`,
    [decoded.userId, days]
  )

  ctx.body = {
    success: true,
    data: {
      trend: rows.map((r) => ({
        date: r.log_date,
        calories: r.calories ?? 0,
        protein: r.protein ?? 0,
        carbs: r.carbs ?? 0,
        fat: r.fat ?? 0
      }))
    }
  }
})

// day analysis
router.get('/analysis', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: 'unauthorized' }
    return
  }

  const date = ctx.query.date
  const useDate = Boolean(date)

  const [summaryRows] = await pool.execute(
    useDate
      ? `SELECT 
           IFNULL(SUM(calories),0) AS calories,
           IFNULL(SUM(${macroSql['protein']}),0) AS protein,
           IFNULL(SUM(${macroSql['fat']}),0) AS fat,
           IFNULL(SUM(${macroSql['carbs']}),0) AS carbs
         FROM diet_log
         WHERE user_id = ? AND log_date = ?`
      : `SELECT 
           IFNULL(SUM(calories),0) AS calories,
           IFNULL(SUM(${macroSql['protein']}),0) AS protein,
           IFNULL(SUM(${macroSql['fat']}),0) AS fat,
           IFNULL(SUM(${macroSql['carbs']}),0) AS carbs
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
             food_name LIKE '%油炸%' OR food_name LIKE '%炸%' OR food_name LIKE '%煎%' OR
             note LIKE '%油炸%' OR note LIKE '%炸%' OR note LIKE '%煎%'
           )`
      : `SELECT COUNT(*) AS fried_count
         FROM diet_log
         WHERE user_id = ?
           AND log_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 2 DAY) AND CURDATE()
           AND (
             food_name LIKE '%油炸%' OR food_name LIKE '%炸%' OR food_name LIKE '%煎%' OR
             note LIKE '%油炸%' OR note LIKE '%炸%' OR note LIKE '%煎%'
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
  const targetCalories = await getTargetCalories(decoded.userId)
  if (targetCalories && Number(summary.calories || 0) > targetCalories) {
    suggestions.push('今日热量摄入偏高，建议晚餐选择清淡一些')
  }
  if (Number(friedRows[0]?.fried_count || 0) > 2) {
    suggestions.push('近两天油炸/煎类偏多，建议增加蔬菜摄入')
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
    ctx.body = { success: false, message: 'unauthorized' }
    return
  }
  const id = Number(ctx.params.id)
  if (!id) {
    ctx.status = 400
    ctx.body = { success: false, message: 'missing id' }
    return
  }
  const [ret] = await pool.execute('DELETE FROM diet_log WHERE id = ? AND user_id = ?', [id, decoded.userId])
  ctx.body = { success: true, data: { deleted: ret.affectedRows } }
})

module.exports = router
