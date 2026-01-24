const Router = require('koa-router')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

// 添加收藏
router.post('/add', async (ctx) => {
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

        const userId = decoded.userId
        const { coll_type, target_id } = ctx.request.body

        // 验证参数
        if (!coll_type || !target_id) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '参数不完整'
            }
            return
        }

        if (coll_type !== 'rec' && coll_type !== 'travel') {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '收藏类型错误'
            }
            return
        }

        // 检查目标记录是否存在
        let targetExists = false
        if (coll_type === 'rec') {
            const [recRows] = await pool.execute(
                'SELECT id FROM recognition WHERE id = ? AND user_id = ?',
                [target_id, userId]
            )
            targetExists = recRows.length > 0
        } else {
            const [travelRows] = await pool.execute(
                'SELECT id FROM travel_plan WHERE id = ? AND user_id = ?',
                [target_id, userId]
            )
            targetExists = travelRows.length > 0
        }

        if (!targetExists) {
            ctx.status = 404
            ctx.body = {
                success: false,
                message: '目标记录不存在'
            }
            return
        }

        // 检查是否已收藏
        const [existing] = await pool.execute(
            'SELECT id FROM collection WHERE user_id = ? AND coll_type = ? AND target_id = ?',
            [userId, coll_type, target_id]
        )

        if (existing.length > 0) {
            ctx.body = {
                success: false,
                message: '已收藏，不能重复收藏'
            }
            return
        }

        // 添加收藏
        const [result] = await pool.execute(
            'INSERT INTO collection (user_id, coll_type, target_id) VALUES (?, ?, ?)',
            [userId, coll_type, target_id]
        )

        ctx.body = {
            success: true,
            data: {
                id: result.insertId,
                message: '收藏成功'
            }
        }
    } catch (error) {
        console.error('添加收藏错误:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '添加收藏失败，请重试'
        }
    }
})

// 取消收藏
router.post('/remove', async (ctx) => {
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

        const userId = decoded.userId
        const { coll_type, target_id } = ctx.request.body

        if (!coll_type || !target_id) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '参数不完整'
            }
            return
        }

        // 删除收藏
        const [result] = await pool.execute(
            'DELETE FROM collection WHERE user_id = ? AND coll_type = ? AND target_id = ?',
            [userId, coll_type, target_id]
        )

        if (result.affectedRows === 0) {
            ctx.body = {
                success: false,
                message: '收藏记录不存在'
            }
            return
        }

        ctx.body = {
            success: true,
            message: '取消收藏成功'
        }
    } catch (error) {
        console.error('取消收藏错误:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '取消收藏失败，请重试'
        }
    }
})

// 检查是否已收藏
router.get('/check', async (ctx) => {
    try {
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

        const userId = decoded.userId
        const { coll_type, target_id } = ctx.query

        if (!coll_type || !target_id) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '参数不完整'
            }
            return
        }

        const [rows] = await pool.execute(
            'SELECT id FROM collection WHERE user_id = ? AND coll_type = ? AND target_id = ?',
            [userId, coll_type, target_id]
        )

        ctx.body = {
            success: true,
            data: {
                isCollected: rows.length > 0
            }
        }
    } catch (error) {
        console.error('检查收藏状态错误:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '检查收藏状态失败，请重试'
        }
    }
})

// 获取收藏列表
router.get('/list', async (ctx) => {
    try {
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

        const userId = decoded.userId
        const { coll_type, page = 1, size = 10 } = ctx.query

        const pageNum = Math.max(1, parseInt(page) || 1)
        const pageSize = Math.max(1, Math.min(100, parseInt(size) || 10))
        const offset = (pageNum - 1) * pageSize

        let whereClause = 'WHERE c.user_id = ?'
        let queryParams = [userId]

        if (coll_type) {
            whereClause += ' AND c.coll_type = ?'
            queryParams.push(coll_type)
        }

        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM collection c ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        // 查询收藏列表，关联识别记录和出行规划
        const sql = `
      SELECT 
        c.id as collection_id,
        c.coll_type,
        c.target_id,
        c.create_time as collect_time,
        r.id as rec_id,
        r.img_url as rec_img_url,
        r.rec_result as rec_result,
        r.create_time as rec_create_time,
        tp.id as travel_id,
        tp.plan_name,
        tp.destination,
        tp.weather_info,
        tp.route_info,
        tp.daily_budget,
        tp.total_calories,
        tp.create_time as travel_create_time
      FROM collection c
      LEFT JOIN recognition r ON c.coll_type = 'rec' AND c.target_id = r.id
      LEFT JOIN travel_plan tp ON c.coll_type = 'travel' AND c.target_id = tp.id
      ${whereClause}
      ORDER BY c.create_time DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

        const [rows] = await pool.execute(sql, queryParams)

        // 处理数据
        const list = rows.map(row => {
            const item = {
                collection_id: row.collection_id,
                coll_type: row.coll_type,
                target_id: row.target_id,
                collect_time: row.collect_time
            }

            if (row.coll_type === 'rec' && row.rec_id) {
                item.recognition = {
                    id: row.rec_id,
                    img_url: row.rec_img_url,
                    rec_result: typeof row.rec_result === 'string'
                        ? JSON.parse(row.rec_result)
                        : row.rec_result,
                    create_time: row.rec_create_time
                }
            } else if (row.coll_type === 'travel' && row.travel_id) {
                item.travel = {
                    id: row.travel_id,
                    plan_name: row.plan_name,
                    destination: row.destination,
                    weather_info: typeof row.weather_info === 'string'
                        ? JSON.parse(row.weather_info)
                        : row.weather_info,
                    route_info: typeof row.route_info === 'string'
                        ? JSON.parse(row.route_info)
                        : row.route_info,
                    daily_budget: row.daily_budget,
                    total_calories: row.total_calories,
                    create_time: row.travel_create_time
                }
            }

            return item
        })

        ctx.body = {
            success: true,
            data: {
                list,
                total,
                page: pageNum,
                size: pageSize
            }
        }
    } catch (error) {
        console.error('获取收藏列表错误:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '获取收藏列表失败，请重试'
        }
    }
})

module.exports = router