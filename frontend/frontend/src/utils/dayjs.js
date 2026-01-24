import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn' // 导入中文语言包

// 配置dayjs使用中文
dayjs.locale('zh-cn')

/**
 * 格式化时间为中文格式
 * @param {string|Date} time - 时间字符串或Date对象
 * @param {string} format - 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (time, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!time) return ''
  return dayjs(time).format(format)
}

/**
 * 格式化时间为相对时间（如：刚刚、3分钟前）
 * @param {string|Date} time - 时间字符串或Date对象
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (time) => {
  if (!time) return ''
  return dayjs(time).fromNow()
}

/**
 * 格式化时间为友好显示（今天显示时间，昨天显示昨天，其他显示日期）
 * @param {string|Date} time - 时间字符串或Date对象
 * @returns {string} 友好时间字符串
 */
export const formatFriendlyTime = (time) => {
  if (!time) return ''
  const now = dayjs()
  const target = dayjs(time)
  const diff = now.diff(target, 'day')

  if (diff === 0) {
    // 今天
    return `今天 ${target.format('HH:mm')}`
  } else if (diff === 1) {
    // 昨天
    return `昨天 ${target.format('HH:mm')}`
  } else if (diff < 7) {
    // 一周内
    return target.format('dddd HH:mm')
  } else {
    // 更早
    return target.format('YYYY-MM-DD HH:mm')
  }
}

export default dayjs