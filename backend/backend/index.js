// 读取 .env（如果存在）
require('dotenv').config()

const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const cors = require('koa-cors')
const static = require('koa-static')
const mount = require('koa-mount')
const path = require('path')
const https = require('https')
const fs = require('fs')
const userRoutes = require('./src/routes/user')
const recognitionRoutes = require('./src/routes/recognition')
const travelRoutes = require('./src/routes/travel')
const collectionRoutes = require('./src/routes/collection')
const dashboardRoutes = require('./src/routes/dashboard')
const profileRoutes = require('./src/routes/profile')
const dietRoutes = require('./src/routes/diet')
const knowledgeRoutes = require('./src/routes/knowledge')
const recommendationRoutes = require('./src/routes/recommendation')
const chatRoutes = require('./src/routes/chat')
const { cleanExpiredBlacklist } = require('./src/utils/jwt')

const app = new Koa()
const router = new Router()

// 中间件
app.use(cors())
app.use(bodyParser())

// 使用 koa-mount 挂载静态文件服务
app.use(mount('/uploads', static(path.join(__dirname, 'uploads'))))

// 路由
router.use('/api/user', userRoutes.routes())
router.use('/api/recognition', recognitionRoutes.routes())
router.use('/api/travel', travelRoutes.routes())
router.use('/api/collection', collectionRoutes.routes())
router.use('/api/dashboard', dashboardRoutes.routes())
router.use('/api/profile', profileRoutes.routes())
router.use('/api/diet', dietRoutes.routes())
router.use('/api/knowledge', knowledgeRoutes.routes())
router.use('/api/recommendation', recommendationRoutes.routes())
router.use('/api/chat', chatRoutes.routes())

app.use(router.routes())
app.use(router.allowedMethods())

// 定期清理过期的黑名单记录（每小时执行一次）
setInterval(() => {
  cleanExpiredBlacklist().catch(err => {
    console.error('清理过期黑名单失败:', err)
  })
}, 60 * 60 * 1000) // 1小时

const PORT = process.env.PORT || 3000
const HOST = '0.0.0.0'

// 检查是否启用 HTTPS
const useHTTPS = process.env.HTTPS === 'true' || process.argv.includes('--https')

if (useHTTPS) {
  // 读取证书文件
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem'))
  }

  https.createServer(httpsOptions, app.callback()).listen(PORT, HOST, () => {
    console.log(`服务器运行在 https://localhost:${PORT}`)
    console.log(`静态文件服务: https://localhost:${PORT}/uploads`)
  })
} else {
  app.listen(PORT, HOST, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
    console.log(`静态文件服务: http://localhost:${PORT}/uploads`)
  })
}