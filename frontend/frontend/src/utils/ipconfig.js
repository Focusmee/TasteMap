// 后端地址配置
//
// 推荐用 Vite 环境变量管理（复制 .env.example -> .env）
//  - VITE_SERVER_IP
//  - VITE_SERVER_PORT
//  - VITE_USE_HTTPS
//
// 如果没有配置环境变量，默认认为前后端都在本机运行。

const SERVER_IP = import.meta.env.VITE_SERVER_IP || '127.0.0.1'
const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || '3000'
const USE_HTTPS = String(import.meta.env.VITE_USE_HTTPS || 'false') === 'true'

const SERVER_URL = USE_HTTPS
    ? `https://${SERVER_IP}:${SERVER_PORT}`
    : `http://${SERVER_IP}:${SERVER_PORT}`

export const serverConfig = {
    baseURL: import.meta.env.DEV ? '' : SERVER_URL
}
