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

const normalizeTag = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_')
}

const buildCalorieRange = (calories) => {
  const base = Number(calories) || 0
  if (!base) return { min: null, max: null, label: '-' }
  const min = Math.max(0, Math.round(base * 0.9))
  const max = Math.max(min, Math.round(base * 1.1))
  return { min, max, label: `${min}-${max} \u5343\u5361/\u0031\u0030\u0030\u514b` }
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
    calorie_min: calorieRange.min,
    calorie_max: calorieRange.max,
    calorie_range: calorieRange.label
  }
}

router.get('/search', async (ctx) => {
  const q = String(ctx.query.q || '').trim()
  if (!q) {
    ctx.body = { success: true, data: { list: [] } }
    return
  }
  const tagQuery = normalizeTag(q)
  const params = [
    `%${q}%`,
    `%${q}%`,
    `%${q}%`,
    `%${tagQuery}%`
  ]
  const [rows] = await pool.execute(
    `SELECT id, name, category, calories, nutrition, allergens, tags, image_url, description
     FROM food_knowledge
     WHERE name LIKE ? OR category LIKE ? OR description LIKE ? OR JSON_SEARCH(tags, 'one', ?) IS NOT NULL
     ORDER BY calories ASC, id DESC
     LIMIT 50`,
    params
  )
  ctx.body = { success: true, data: { list: rows.map(normalizeFoodRow) } }
})

router.get('/:name', async (ctx) => {
  const name = String(ctx.params.name || '').trim()
  if (!name) {
    ctx.status = 400
    ctx.body = { success: false, message: '\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a' }
    return
  }
  const [rows] = await pool.execute('SELECT * FROM food_knowledge WHERE name = ? LIMIT 1', [name])
  if (rows.length === 0) {
    ctx.status = 404
    ctx.body = { success: false, message: '\u672a\u627e\u5230' }
    return
  }
  ctx.body = { success: true, data: normalizeFoodRow(rows[0]) }
})

module.exports = router
