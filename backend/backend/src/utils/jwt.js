const jwt = require('jsonwebtoken')
const pool = require('../config/database')

const SECRET = 'your-secret-key-change-in-production' // 生产环境请更换

// 生成token
const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

// 验证token（检查黑名单）
const verifyToken = async (token) => {
  try {
    // 先验证token是否有效
    const decoded = jwt.verify(token, SECRET)

    // 检查token是否在黑名单中
    const [rows] = await pool.execute(
      'SELECT id FROM token_blacklist WHERE token = ?',
      [token]
    )

    if (rows.length > 0) {
      // token在黑名单中，返回null
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}

// 将token加入黑名单
const addToBlacklist = async (token, userId) => {
  try {
    // 解析token获取过期时间
    const decoded = jwt.decode(token)
    if (!decoded || !decoded.exp) {
      return false
    }

    // 将过期时间转换为datetime
    const expireTime = new Date(decoded.exp * 1000)

    // 插入黑名单
    await pool.execute(
      'INSERT INTO token_blacklist (token, user_id, expire_time) VALUES (?, ?, ?)',
      [token, userId, expireTime]
    )

    return true
  } catch (error) {
    console.error('添加token到黑名单错误:', error)
    return false
  }
}

// 清理过期的黑名单记录（定期清理，避免表过大）
const cleanExpiredBlacklist = async () => {
  try {
    await pool.execute(
      'DELETE FROM token_blacklist WHERE expire_time < NOW()'
    )
  } catch (error) {
    console.error('清理过期黑名单错误:', error)
  }
}

module.exports = {
  generateToken,
  verifyToken,
  addToBlacklist,
  cleanExpiredBlacklist
}