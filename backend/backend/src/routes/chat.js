const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

async function auth(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  return await verifyToken(token)
}

function simpleBotReply(text, ctxProfile) {
  const t = String(text || '').toLowerCase()
  const goal = ctxProfile?.goal || '均衡'
  const allergies = (ctxProfile?.allergies || []).join('、')

  if (t.includes('减肥') || t.includes('减脂')) {
    return `如果你在减脂：优先选择低油、清蒸/水煮/凉拌，避免甜饮。你当前目标：${goal}。`
  }
  if (t.includes('过敏') || t.includes('忌口')) {
    return allergies ? `你设置的过敏原/忌口：${allergies}。点单时注意“隐藏成分”，必要时询问店员。` : '你还没设置过敏原/忌口，可以在“个人中心-画像设置”里补充。'
  }
  if (t.includes('控糖') || t.includes('糖')) {
    return `控糖建议：减少含糖饮料和甜品，主食优先全谷物/杂粮，搭配蔬菜与蛋白质减缓血糖波动。`
  }
  if (t.includes('高血压') || t.includes('降压') || t.includes('盐')) {
    return `低盐建议：少盐少酱，避免腌制/加工肉类；选择清淡汤底；多吃蔬果补钾。`
  }
  if (t.includes('对比')) {
    return `你可以在“知识库-对比工具”里一次对比 2-3 个菜品的热量/三大营养素/钠和糖。`
  }
  return `我可以帮你做：
1) 这道菜是否适合你的目标（${goal}）
2) 过敏原提醒
3) 与另一道菜的营养对比
你可以直接问：比如“狮子头适合减脂吗？”`
}

// 会话列表
router.get('/sessions', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const [rows] = await pool.execute(
    'SELECT id, topic, create_time, update_time FROM chat_session WHERE user_id = ? ORDER BY update_time DESC LIMIT 50',
    [decoded.userId]
  )
  ctx.body = { success: true, data: rows }
})

// 新建会话
router.post('/sessions', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const topic = ctx.request.body?.topic || '健康咨询'
  const [ret] = await pool.execute(
    'INSERT INTO chat_session (user_id, topic) VALUES (?, ?)',
    [decoded.userId, topic]
  )
  ctx.body = { success: true, data: { id: ret.insertId, topic } }
})

// 会话消息
router.get('/:sessionId/messages', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const sid = Number(ctx.params.sessionId)
  const [rows] = await pool.execute(
    `SELECT id, role, content, create_time
     FROM chat_message
     WHERE session_id = ? AND user_id = ?
     ORDER BY id ASC`,
    [sid, decoded.userId]
  )
  ctx.body = { success: true, data: rows }
})

// 发送消息（规则引擎示例，可后续接入大模型）
router.post('/:sessionId/send', async (ctx) => {
  const decoded = await auth(ctx)
  if (!decoded) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权' }
    return
  }
  const sid = Number(ctx.params.sessionId)
  const text = String(ctx.request.body?.text || '').trim()
  if (!text) {
    ctx.status = 400
    ctx.body = { success: false, message: 'text 不能为空' }
    return
  }

  const userId = decoded.userId
  const [[p]] = await pool.execute('SELECT profile_json FROM user_profile WHERE user_id = ? LIMIT 1', [userId])
  const profile = p?.profile_json ? (typeof p.profile_json === 'string' ? JSON.parse(p.profile_json) : p.profile_json) : null

  await pool.execute(
    'INSERT INTO chat_message (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
    [sid, userId, 'user', text]
  )

  const reply = simpleBotReply(text, profile)
  const [ret] = await pool.execute(
    'INSERT INTO chat_message (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
    [sid, userId, 'assistant', reply]
  )
  // 更新会话更新时间
  await pool.execute('UPDATE chat_session SET update_time = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [sid, userId])

  ctx.body = { success: true, data: { message_id: ret.insertId, reply } }
})

module.exports = router
