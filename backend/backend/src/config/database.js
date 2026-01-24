const mysql = require('mysql2/promise')

/**
 * 数据库连接池
 *
 * 说明：原项目里把账号密码写死在代码中，这里保留默认值（确保开箱即用），
 * 同时支持通过环境变量覆盖，方便部署到不同机器/服务器。
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '6666667MySQL',
  database: process.env.DB_NAME || 'smart-softwear',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool
