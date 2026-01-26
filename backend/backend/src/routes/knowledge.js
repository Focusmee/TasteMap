const Router = require('koa-router')
const pool = require('../config/database')

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

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

const buildCalorieRange = (calories) => {
  const base = Number(calories) || 0
  if (!base) return { min: null, max: null, label: '-' }
  const min = Math.max(0, Math.round(base * 0.9))
  const max = Math.max(min, Math.round(base * 1.1))
  return { min, max, label: `${min}-${max} \u5343\u5361/\u0031\u0030\u0030\u514b` }
}

const normalizeTag = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_')
}

const normalizeFoodRow = (row) => {
  const rawNutrition = parseJson(row.nutrition, {}) || {}
  const nutrition = rawNutrition && typeof rawNutrition === 'object' && !Array.isArray(rawNutrition)
    ? rawNutrition
    : {}
  const allergens = normalizeStringArray(parseJson(row.allergens, [])).map(normalizeTag).filter(Boolean)
  const tags = normalizeStringArray(parseJson(row.tags, [])).map(normalizeTag).filter(Boolean)
  const protein = pickNumber(nutrition.protein_g ?? nutrition.protein)
  const fat = pickNumber(nutrition.fat_g ?? nutrition.fat)
  const carbs = pickNumber(nutrition.carb_g ?? nutrition.carbs ?? nutrition.carbohydrate_g)
  const sodium = pickNumber(nutrition.sodium_mg ?? nutrition.sodium)
  const sugar = pickNumber(nutrition.sugar_g ?? nutrition.sugar)
  const fiber = pickNumber(nutrition.fiber_g ?? nutrition.fiber)
  const calorieRange = buildCalorieRange(row.calories)
  const ingredients = parseJson(row.ingredients, [])
  const riskFlags = parseJson(row.risk_flags, [])

  return {
    ...row,
    nutrition,
    allergens,
    tags,
    protein,
    fat,
    carbs,
    sodium,
    sugar,
    fiber,
    serving_size_g: row.serving_size_g ?? 100,
    serving_unit: row.serving_unit ?? '\u514b',
    cook_method: row.cook_method || '',
    ingredients: Array.isArray(ingredients) ? ingredients : [],
    risk_flags: Array.isArray(riskFlags) ? riskFlags : [],
    source: row.source || '',
    update_time: row.update_time || null,
    calorie_min: calorieRange.min,
    calorie_max: calorieRange.max,
    calorie_range: calorieRange.label
  }
}

router.get('/meta', async (ctx) => {
  const [rows] = await pool.execute(
    'SELECT DISTINCT category FROM food_knowledge WHERE category IS NOT NULL AND category <> "" ORDER BY category ASC'
  )
  ctx.body = { success: true, data: { categories: rows.map(r => r.category) } }
})

router.get('/list', async (ctx) => {
  const {
    keyword = '',
    category = '',
    minCal = '',
    maxCal = '',
    page = 1,
    size = 12
  } = ctx.query

  const pageNum = Math.max(1, Number(page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(size) || 12))
  const offset = (pageNum - 1) * pageSize

  let where = 'WHERE 1=1'
  const params = []
  if (keyword) {
    where += ' AND (name LIKE ? OR description LIKE ? OR JSON_SEARCH(tags, \'one\', ?) IS NOT NULL)'
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (category) {
    where += ' AND category = ?'
    params.push(category)
  }
  let minValue = pickNumber(minCal)
  let maxValue = pickNumber(maxCal)
  if (minValue != null && maxValue != null && minValue > maxValue) {
    const temp = minValue
    minValue = maxValue
    maxValue = temp
  }
  if (minValue != null) {
    where += ' AND calories >= ?'
    params.push(minValue)
  }
  if (maxValue != null) {
    where += ' AND calories <= ?'
    params.push(maxValue)
  }

  const [[c]] = await pool.execute(`SELECT COUNT(*) AS total FROM food_knowledge ${where}`, params)
  const [rows] = await pool.execute(
    `SELECT id, name, category, calories, nutrition, allergens, tags, image_url, description,
            serving_size_g, serving_unit, cook_method, ingredients, risk_flags, source, update_time
     FROM food_knowledge
     ${where}
     ORDER BY calories ASC, id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  )

  ctx.body = { success: true, data: { total: c.total, list: rows.map(normalizeFoodRow) } }
})

router.get('/suggest', async (ctx) => {
  const q = String(ctx.query.q || ctx.query.keyword || '')
  if (!q) {
    ctx.body = { success: true, data: { list: [] } }
    return
  }
  const [rows] = await pool.execute(
    'SELECT name FROM food_knowledge WHERE name LIKE ? ORDER BY calories ASC LIMIT 10',
    [`%${q}%`]
  )
  ctx.body = { success: true, data: { list: rows.map(r => r.name) } }
})

router.get('/:id', async (ctx) => {
  const id = Number(ctx.params.id)
  const [rows] = await pool.execute('SELECT * FROM food_knowledge WHERE id = ? LIMIT 1', [id])
  if (rows.length === 0) {
    ctx.status = 404
    ctx.body = { success: false, message: '\u672a\u627e\u5230' }
    return
  }
  const row = normalizeFoodRow(rows[0])
  ctx.body = { success: true, data: row }
})

router.post('/compare', async (ctx) => {
  const ids = ctx.request.body?.ids
  if (!Array.isArray(ids) || ids.length < 2) {
    ctx.status = 400
    ctx.body = { success: false, message: '\u53c2\u6570\u9700\u8981\u81f3\u5c11\u4e24\u4e2a' }
    return
  }
  const use = ids.slice(0, 3).map(n => Number(n)).filter(Boolean)
  if (use.length < 2) {
    ctx.status = 400
    ctx.body = { success: false, message: '\u53c2\u6570\u9700\u8981\u81f3\u5c11\u4e24\u4e2a\u6709\u6548\u503c' }
    return
  }
  const placeholders = use.map(() => '?').join(',')
  const [rows] = await pool.execute(
    `SELECT id, name, category, calories, nutrition, allergens, tags, image_url,
            serving_size_g, serving_unit, cook_method, ingredients, risk_flags, source, update_time
     FROM food_knowledge
     WHERE id IN (${placeholders})`,
    use
  )
  ctx.body = { success: true, data: { list: rows.map(normalizeFoodRow) } }
})

module.exports = router
