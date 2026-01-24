const multer = require('koa-multer')
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/avatars')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：使用dayjs格式化时间 + 随机数 + 原始扩展名
    const ext = path.extname(file.originalname)
    const timestamp = dayjs().format('YYYYMMDDHHmmss')
    const random = Math.random().toString(36).substring(7)
    const filename = `avatar_${timestamp}_${random}${ext}`
    cb(null, filename)
  }
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error('只允许上传图片文件（jpeg, jpg, png, gif, webp）'))
  }
}

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 限制文件大小为2MB
  },
  fileFilter: fileFilter
})

module.exports = upload