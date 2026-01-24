/**
 * 解析JWT token
 * @param {string} token - JWT token字符串
 * @returns {object|null} 解析后的payload，失败返回null
 */
export const parseToken = (token) => {
    try {
        if (!token) return null

        // JWT格式：header.payload.signature
        const parts = token.split('.')
        if (parts.length !== 3) return null

        // 解析payload（第二部分）
        const payload = parts[1]
        // Base64解码
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

        return decoded
    } catch (error) {
        console.error('解析token失败:', error)
        return null
    }
}

/**
 * 检查token是否过期
 * @param {string} token - JWT token字符串
 * @returns {boolean} true表示过期，false表示未过期
 */
export const isTokenExpired = (token) => {
    try {
        const decoded = parseToken(token)
        if (!decoded || !decoded.exp) {
            return true // 无法解析或没有过期时间，视为过期
        }

        // exp是秒级时间戳，需要转换为毫秒
        const expTime = decoded.exp * 1000
        const currentTime = Date.now()

        // 提前5分钟判断为过期，避免在请求过程中过期
        const bufferTime = 5 * 60 * 1000 // 5分钟

        return currentTime >= (expTime - bufferTime)
    } catch (error) {
        console.error('检查token过期失败:', error)
        return true // 出错视为过期
    }
}

/**
 * 获取token的过期时间
 * @param {string} token - JWT token字符串
 * @returns {Date|null} 过期时间，失败返回null
 */
export const getTokenExpiry = (token) => {
    try {
        const decoded = parseToken(token)
        if (!decoded || !decoded.exp) {
            return null
        }

        return new Date(decoded.exp * 1000)
    } catch (error) {
        console.error('获取token过期时间失败:', error)
        return null
    }
}