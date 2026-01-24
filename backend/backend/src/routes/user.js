const Router = require('koa-router')
const pool = require('../config/database')
const { generateToken, verifyToken } = require('../utils/jwt')
const { hashPassword, comparePassword } = require('../utils/bcrypt')
const upload = require('../utils/upload')
const path = require('path')
const fs = require('fs')

const router = new Router()

// 用户注册
router.post('/register', async (ctx) => {
  try {
    const { phone, password, nickname } = ctx.request.body

    // 验证参数
    if (!phone || !password) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '手机号和密码不能为空'
      }
      return
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '手机号格式不正确'
      }
      return
    }

    // 验证密码长度
    if (password.length < 6) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '密码长度不能少于6位'
      }
      return
    }

    // 检查手机号是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM user WHERE phone = ?',
      [phone]
    )

    if (existingUsers.length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '该手机号已被注册'
      }
      return
    }

    // 加密密码
    const hashedPassword = await hashPassword(password)

    // 插入用户
    const [result] = await pool.execute(
      'INSERT INTO user (phone, password, nickname) VALUES (?, ?, ?)',
      [phone, hashedPassword, nickname || '食行用户']
    )

    // 生成token
    const token = generateToken({ userId: result.insertId, phone })

    ctx.body = {
      success: true,
      message: '注册成功',
      data: {
        id: result.insertId,
        phone,
        nickname: nickname || '食行用户',
        avatar: '/static/default-avatar.png'
      },
      token
    }
  } catch (error) {
    console.error('注册错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '注册失败，请重试'
    }
  }
})

// 用户登录
router.post('/login', async (ctx) => {
  try {
    const { phone, password } = ctx.request.body

    // 验证参数
    if (!phone || !password) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '手机号和密码不能为空'
      }
      return
    }

    // 查询用户
    const [users] = await pool.execute(
      'SELECT id, phone, password, nickname, avatar FROM user WHERE phone = ?',
      [phone]
    )

    if (users.length === 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    const user = users[0]

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '手机号或密码错误'
      }
      return
    }

    // 生成token
    const token = generateToken({ userId: user.id, phone: user.phone })

    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar
      },
      token
    }
  } catch (error) {
    console.error('登录错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '登录失败，请重试'
    }
  }
})

// 用户退出登录
router.post('/logout', async (ctx) => {
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

    // 先尝试解码token（不验证签名，因为可能已过期）
    const jwt = require('jsonwebtoken')
    let decoded
    try {
      decoded = jwt.decode(token)
    } catch (error) {
      // token格式错误，但依然返回成功（幂等性）
      ctx.body = {
        success: true,
        message: '退出登录成功'
      }
      return
    }

    if (!decoded || !decoded.userId) {
      ctx.body = {
        success: true,
        message: '退出登录成功'
      }
      return
    }

    const userId = decoded.userId

    // 将token加入黑名单
    const { addToBlacklist } = require('../utils/jwt')
    await addToBlacklist(token, userId)

    ctx.body = {
      success: true,
      message: '退出登录成功'
    }
  } catch (error) {
    console.error('退出登录错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '退出登录失败，请重试'
    }
  }
})

// 上传头像
router.post('/upload-avatar', upload.single('avatar'), async (ctx) => {
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

    if (!ctx.req.file) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '请选择要上传的文件'
      }
      return
    }

    const userId = decoded.userId
    const filename = ctx.req.file.filename
    const avatarPath = `/uploads/avatars/${filename}`

    // 查询用户当前头像
    const [users] = await pool.execute(
      'SELECT avatar FROM user WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    // 删除旧头像（如果不是默认头像）
    const oldAvatar = users[0].avatar
    if (oldAvatar && oldAvatar !== '/static/default-avatar.png') {
      const oldPath = path.join(__dirname, '../../', oldAvatar)
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath)
      }
    }

    // 更新数据库
    await pool.execute(
      'UPDATE user SET avatar = ? WHERE id = ?',
      [avatarPath, userId]
    )

    ctx.body = {
      success: true,
      message: '头像上传成功',
      data: {
        avatar: avatarPath
      }
    }
  } catch (error) {
    console.error('上传头像错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '上传失败，请重试'
    }
  }
})

// 更新用户昵称
router.put('/update-nickname', async (ctx) => {
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

    const { nickname } = ctx.request.body
    const userId = decoded.userId

    // 验证昵称
    if (!nickname || nickname.trim() === '') {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '昵称不能为空'
      }
      return
    }

    const trimmedNickname = nickname.trim()

    // 验证昵称长度
    if (trimmedNickname.length > 20) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '昵称长度不能超过20个字符'
      }
      return
    }

    // 更新数据库
    await pool.execute(
      'UPDATE user SET nickname = ? WHERE id = ?',
      [trimmedNickname, userId]
    )

    // 查询更新后的用户信息
    const [users] = await pool.execute(
      'SELECT id, phone, nickname, avatar FROM user WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    ctx.body = {
      success: true,
      message: '昵称修改成功',
      data: {
        id: users[0].id,
        phone: users[0].phone,
        nickname: users[0].nickname,
        avatar: users[0].avatar
      }
    }
  } catch (error) {
    console.error('更新昵称错误:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新昵称失败，请重试'
    }
  }
})
module.exports = router