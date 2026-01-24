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
  return { min, max, label: `${min}-${max} kcal/100g` }
}

const deriveSuitability = ({ calories, protein, fat, sugar, sodium, tags = [] }) => {
  const suitable = new Set()
  const unsuitable = new Set()

  if (calories != null) {
    if (calories <= 350) suitable.add('减脂')
    if (calories >= 500) unsuitable.add('减脂')
  }

  if (protein != null) {
    if (protein >= 20) suitable.add('增肌')
  }

  if (fat != null) {
    if (fat <= 12) suitable.add('低脂')
    if (fat >= 25) unsuitable.add('低脂')
  }

  if (sugar != null) {
    if (sugar <= 10) suitable.add('控糖')
    if (sugar >= 15) unsuitable.add('控糖')
  }

  if (sodium != null) {
    if (sodium <= 600) suitable.add('低盐')
    if (sodium >= 800) unsuitable.add('低盐')
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') continue
    if (tag.includes('低脂')) suitable.add('低脂')
    if (tag.includes('高蛋白')) suitable.add('增肌')
    if (tag.includes('低糖')) suitable.add('控糖')
    if (tag.includes('高糖')) unsuitable.add('控糖')
    if (tag.includes('高盐')) unsuitable.add('低盐')
    if (tag.includes('高脂')) unsuitable.add('低脂')
  }

  for (const label of suitable) {
    if (unsuitable.has(label)) suitable.delete(label)
  }

  return {
    suitable_for: Array.from(suitable),
    unsuitable_for: Array.from(unsuitable)
  }
}

const normalizeFoodRow = (row) => {
  const rawNutrition = parseJson(row.nutrition, {}) || {}
  const nutrition = rawNutrition && typeof rawNutrition === 'object' && !Array.isArray(rawNutrition)
    ? rawNutrition
    : {}
  const allergens = normalizeStringArray(parseJson(row.allergens, []))
  const tags = normalizeStringArray(parseJson(row.tags, []))
  const protein = pickNumber(nutrition.protein_g ?? nutrition.protein)
  const fat = pickNumber(nutrition.fat_g ?? nutrition.fat)
  const carbs = pickNumber(nutrition.carb_g ?? nutrition.carbs ?? nutrition.carbohydrate_g)
  const sodium = pickNumber(nutrition.sodium_mg ?? nutrition.sodium)
  const sugar = pickNumber(nutrition.sugar_g ?? nutrition.sugar)
  const fiber = pickNumber(nutrition.fiber_g ?? nutrition.fiber)
  const calorieRange = buildCalorieRange(row.calories)
  const suitability = deriveSuitability({
    calories: pickNumber(row.calories),
    protein,
    fat,
    sugar,
    sodium,
    tags
  })

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
    calorie_range: calorieRange.label,
    ...suitability
  }
}

// 知识库分类元信息
router.get('/meta', async (ctx) => {
  const [rows] = await pool.execute(
    'SELECT DISTINCT category FROM food_knowledge WHERE category IS NOT NULL AND category <> "" ORDER BY category ASC'
  )
  ctx.body = { success: true, data: { categories: rows.map(r => r.category) } }
})

// 列表查询
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
    `SELECT id, name, category, calories, nutrition, allergens, tags, image_url, description
     FROM food_knowledge
     ${where}
     ORDER BY calories ASC, id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  )

  ctx.body = { success: true, data: { total: c.total, list: rows.map(normalizeFoodRow) } }
})

// 联想
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
    ctx.body = { success: false, message: '未找到' }
    return
  }
  const row = normalizeFoodRow(rows[0])
  ctx.body = { success: true, data: row }
})

// 对比 2-3 个菜
router.post('/compare', async (ctx) => {
  const ids = ctx.request.body?.ids
  if (!Array.isArray(ids) || ids.length < 2) {
    ctx.status = 400
    ctx.body = { success: false, message: 'ids 需要至少2个' }
    return
  }
  const use = ids.slice(0, 3).map(n => Number(n)).filter(Boolean)
  if (use.length < 2) {
    ctx.status = 400
    ctx.body = { success: false, message: 'ids 需要至少2个有效值' }
    return
  }
  const placeholders = use.map(() => '?').join(',')
  const [rows] = await pool.execute(
    `SELECT id, name, category, calories, nutrition, allergens, tags, image_url
     FROM food_knowledge
     WHERE id IN (${placeholders})`,
    use
  )
  ctx.body = { success: true, data: { list: rows.map(normalizeFoodRow) } }
})

module.exports = router
