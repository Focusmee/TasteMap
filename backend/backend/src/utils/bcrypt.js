const bcrypt = require('bcryptjs')

// 加密密码
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

// 验证密码
const comparePassword = async (password, hash) => {
  // 兼容：演示数据可能是明文（不建议生产环境使用）
  if (!hash || typeof hash !== 'string') return false
  if (!hash.startsWith('$2')) {
    return password === hash
  }
  return await bcrypt.compare(password, hash)
}

module.exports = {
  hashPassword,
  comparePassword
}