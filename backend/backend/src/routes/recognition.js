const Router = require('koa-router')
const pool = require('../config/database')
const axios = require('axios')
const FormData = require('form-data')
const multer = require('koa-multer')
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')
const { verifyToken } = require('../utils/jwt')

const router = new Router()
// ============ 上传识别图片配置（存到 uploads/recognition） ============
const recUploadDir = path.join(__dirname, '../../uploads/recognition')
if (!fs.existsSync(recUploadDir)) {
  fs.mkdirSync(recUploadDir, { recursive: true })
}

const recStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, recUploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const timestamp = dayjs().format('YYYYMMDDHHmmss')
    const random = Math.random().toString(36).substring(7)
    cb(null, `rec_${timestamp}_${random}${ext}`)
  }
})

const recFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase())
  const mimeOk = allowed.test(file.mimetype)
  if (extOk && mimeOk) cb(null, true)
  else cb(new Error('只允许上传图片文件（jpeg, jpg, png, gif, webp）'))
}

const uploadRec = multer({
  storage: recStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 识别图给 5MB 更稳
  fileFilter: recFileFilter
})
// =============================================================
// 上传图片并识别（写入 recognition 表）
router.post('/recognize', uploadRec.single('file'), async (ctx) => {
  try {
    // 1) 验证 token
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      ctx.status = 401
      ctx.body = { success: false, message: '未授权，请先登录' }
      return
    }
    const decoded = await verifyToken(token)
    if (!decoded) {
      ctx.status = 401
      ctx.body = { success: false, message: 'Token无效或已过期' }
      return
    }

    // 2) 拿到上传文件
    const file = ctx.req.file
    if (!file) {
      ctx.status = 400
      ctx.body = { success: false, message: '请上传图片文件（字段名 file）' }
      return
    }

    const topk = parseInt(ctx.query.topk || '5') || 5
    const imgUrl = `/uploads/recognition/${file.filename}`

    // 3) 调用模型服务推理
    // 优先兼容你现在的 FastAPI: POST /predict?topk=5  (multipart/form-data, 字段名 file)
    // 同时保留 /predict_base64 作为后备方案。
    const modelBase = process.env.MODEL_BASE || 'http://127.0.0.1:8008'
    const imgBuf = fs.readFileSync(file.path)

    let inferRes
    try {
      const form = new FormData()
      form.append('file', imgBuf, {
        filename: file.originalname || file.filename || 'image.jpg',
        contentType: file.mimetype || 'image/jpeg'
      })
      inferRes = await axios.post(`${modelBase}/predict?topk=${topk}`, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000
      })
    } catch (err) {
      // 如果模型服务没有 /predict，则尝试 /predict_base64
      const status = err?.response?.status
      if (status === 404 || status === 405) {
        const imageBase64 = imgBuf.toString('base64')
        inferRes = await axios.post(`${modelBase}/predict_base64`, {
          image_base64: imageBase64,
          topk
        }, { timeout: 120000 })
      } else {
        throw err
      }
    }

    const inferData = inferRes.data || {}
    let topkArr = inferData.topk || []

    // 兼容：如果模型服务给的是 { topk: [{name, score}], ... }
    // 这里顺手算一个归一化概率 prob（便于前端做进度条展示）
    if (Array.isArray(topkArr) && topkArr.length > 0) {
      try {
        const scores = topkArr.map(x => Number(x.score) || 0)
        const max = Math.max(...scores)
        const exps = scores.map(s => Math.exp(s - max))
        const sum = exps.reduce((a, b) => a + b, 0) || 1
        topkArr = topkArr.map((x, i) => ({
          ...x,
          prob: Number((exps[i] / sum).toFixed(4))
        }))
      } catch (_) {
        // ignore
      }
    }

    const foodName = topkArr?.[0]?.name || inferData.food_name || inferData?.rec_result?.food_name || '未知菜品'

    // 4) 组装 rec_result
    // - 如果模型服务直接返回 rec_result，则优先使用
    // - 否则尽量从 inferData 中拼起来（兼容不同实现）
    const recResult = inferData.rec_result && typeof inferData.rec_result === 'object'
      ? {
        ...inferData.rec_result,
        food_name: inferData.rec_result.food_name || foodName,
        topk: inferData.rec_result.topk || topkArr
      }
      : {
        food_name: foodName,
        ingredients: inferData.ingredients || [],
        allergens: inferData.allergens || [],
        calorie: inferData.calorie || inferData.calories || '0',
        nutrition: inferData.nutrition || null,
        health_tips: inferData.health_tips || inferData.healthAdvice || inferData.tips || [],
        topk: topkArr
      }

    // 5) 写入数据库
    const [ret] = await pool.execute(
      'INSERT INTO recognition (user_id, img_url, rec_result) VALUES (?, ?, ?)',
      [decoded.userId, imgUrl, JSON.stringify(recResult)]
    )

    // 6) 返回给前端（结构和 mock 一致）
    ctx.body = {
      success: true,
      data: {
        id: String(ret.insertId),
        img_url: imgUrl,
        rec_result: recResult
      }
    }
  } catch (error) {
    console.error('识别接口错误:', error)
    ctx.status = 500
    ctx.body = { success: false, message: '识别失败，请重试' }
  }
})

// 获取用户的识别记录列表
router.get('/list', async (ctx) => {
  try {
    // 验证token
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '未授权，请先登录'
      }
      return
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: 'Token无效或已过期'
      }
      return
    }

    const userId = decoded.userId
    const { page = 1, size = 10, keyword = '' } = ctx.query

    // 转换为整数并验证
    const pageNum = Math.max(1, parseInt(page) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(size) || 10)) // 限制最大100条
    const offset = (pageNum - 1) * pageSize

    // 构建查询条件
    let whereClause = 'WHERE user_id = ?'
    let queryParams = [userId]

    // 如果有关键词，添加搜索条件
    if (keyword) {
      // 兼容：food_name / name 字段
      whereClause += ` AND (
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.food_name')),
          JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.name'))
        ) LIKE ?
        OR JSON_SEARCH(rec_result, 'one', ?, NULL, '$.ingredients[*]') IS NOT NULL
      )`
      queryParams.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 查询总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM recognition ${whereClause}`,
      queryParams
    )
    const total = countResult[0].total

    // 查询列表数据 - LIMIT 和 OFFSET 必须直接拼接，不能使用参数绑定
    const [rows] = await pool.execute(
      `SELECT 
        id,
        user_id,
        img_url,
        rec_result,
        create_time
      FROM recognition 
      ${whereClause}
      ORDER BY create_time DESC
      LIMIT ${pageSize} OFFSET ${offset}`,
      queryParams
    )

    // 处理数据，确保rec_result是对象
    const list = rows.map(row => ({
      ...row,
      rec_result: typeof row.rec_result === 'string' 
        ? JSON.parse(row.rec_result) 
        : row.rec_result
    }))

    ctx.body = {
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        size: pageSize
      }
    }
  } catch (error) {
    console.error('获取识别记录错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取识别记录失败，请重试'
    }
  }
})

// 获取单条识别记录详情
router.get('/:id', async (ctx) => {
  try {
    // 验证token
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '未授权，请先登录'
      }
      return
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: 'Token无效或已过期'
      }
      return
    }

    const userId = decoded.userId
    const recordId = ctx.params.id

    // 查询记录
    const [rows] = await pool.execute(
      `SELECT 
        id,
        user_id,
        img_url,
        rec_result,
        create_time
      FROM recognition 
      WHERE id = ? AND user_id = ?`,
      [recordId, userId]
    )

    if (rows.length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '记录不存在'
      }
      return
    }

    const record = rows[0]
    // 处理rec_result
    record.rec_result = typeof record.rec_result === 'string' 
      ? JSON.parse(record.rec_result) 
      : record.rec_result

    ctx.body = {
      success: true,
      data: record
    }
  } catch (error) {
    console.error('获取识别记录详情错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取识别记录详情失败，请重试'
    }
  }
})

// 搜索联想：返回最近识别过的菜名（用于输入联想）
router.get('/suggest', async (ctx) => {
  try {
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      ctx.status = 401
      ctx.body = { success: false, message: '未授权，请先登录' }
      return
    }
    const decoded = await verifyToken(token)
    if (!decoded) {
      ctx.status = 401
      ctx.body = { success: false, message: 'Token无效或已过期' }
      return
    }

    const userId = decoded.userId
    const { q = '' } = ctx.query

    const like = `%${q}%`
    const [rows] = await pool.execute(
      `SELECT DISTINCT
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.food_name')),
            JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.name'))
          ) AS name
        FROM recognition
        WHERE user_id = ?
          AND COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.food_name')),
            JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.name'))
          ) IS NOT NULL
          AND ( ? = '' OR COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.food_name')),
            JSON_UNQUOTE(JSON_EXTRACT(rec_result, '$.name'))
          ) LIKE ? )
        ORDER BY MAX(create_time) DESC
        LIMIT 10`,
      [userId, q, like]
    )

    ctx.body = { success: true, data: rows.map(r => r.name).filter(Boolean) }
  } catch (e) {
    console.error('recognition suggest error:', e)
    ctx.status = 500
    ctx.body = { success: false, message: '获取联想失败' }
  }
})

// 人工修正：修改某条识别记录的菜名（写回 rec_result.food_name）
router.post('/:id/correct', async (ctx) => {
  try {
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      ctx.status = 401
      ctx.body = { success: false, message: '未授权，请先登录' }
      return
    }
    const decoded = await verifyToken(token)
    if (!decoded) {
      ctx.status = 401
      ctx.body = { success: false, message: 'Token无效或已过期' }
      return
    }

    const userId = decoded.userId
    const id = Number(ctx.params.id)
    const { food_name } = ctx.request.body || {}
    if (!id || !food_name) {
      ctx.status = 400
      ctx.body = { success: false, message: '参数错误：需要 id 和 food_name' }
      return
    }

    const [ret] = await pool.execute(
      `UPDATE recognition
       SET rec_result = JSON_SET(rec_result, '$.food_name', ?)
       WHERE id = ? AND user_id = ?`,
      [food_name, id, userId]
    )

    if (ret.affectedRows === 0) {
      ctx.status = 404
      ctx.body = { success: false, message: '记录不存在或无权限' }
      return
    }

    ctx.body = { success: true, message: '已修正' }
  } catch (e) {
    console.error('recognition correct error:', e)
    ctx.status = 500
    ctx.body = { success: false, message: '修正失败' }
  }
})

module.exports = router