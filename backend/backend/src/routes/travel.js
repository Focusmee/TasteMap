const Router = require('koa-router')
const axios = require('axios')
const pool = require('../config/database')
const { verifyToken } = require('../utils/jwt')

const router = new Router()

// 高德地图API配置
const AMAP_KEY = (process.env.AMAP_WEB_KEY || '10fcc3a016894a3a745ba9b4417b5596').trim()
const AMAP_GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo' // 地理编码API
const AMAP_WEATHER_URL = 'https://restapi.amap.com/v3/weather/weatherInfo' // 天气API
const AMAP_REGEOCODE_URL = 'https://restapi.amap.com/v3/geocode/regeo' // 逆地理编码用于坐标转adcode
const AMAP_PLACE_AROUND_URL = 'https://restapi.amap.com/v3/place/around' // 周边搜索API
const AMAP_DIRECTION_BASE = 'https://restapi.amap.com/v5/direction' // 路线规划API基础地址

/**
 * ??????API????adcode
 * @param {string} cityName - ????
 * @returns {string|null} adcode?null
 */
const getCityAdcode = async (cityName) => {
    try {
        const response = await axios.get(AMAP_GEOCODE_URL, {
            params: {
                key: AMAP_KEY,
                address: cityName,
                output: 'JSON'
            },
            timeout: 5000
        })

        if (response.data.status === '1' && response.data.geocodes && response.data.geocodes.length > 0) {
            // ??????????adcode
            const adcode = response.data.geocodes[0].adcode
            return adcode
        }
        return null
    } catch (error) {
        console.error('????API????:', error)
        return null
    }
}

/**
 * ????????????adcode
 * @param {string} location - "lng,lat"
 * @returns {string|null} adcode?null
 */
const getAdcodeByLocation = async (location) => {
    try {
        const response = await axios.get(AMAP_REGEOCODE_URL, {
            params: {
                key: AMAP_KEY,
                location,
                output: 'JSON'
            },
            timeout: 5000
        })

        const addressComponent = response?.data?.regeocode?.addressComponent
        const adcode = addressComponent?.adcode || addressComponent?.citycode || null
        return adcode || null
    } catch (error) {
        console.error('???????????:', error)
        return null
    }
}

router.get('/weather', async (ctx) => {
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

        const { city, location } = ctx.query

        if (!city && !location) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: 'city或location不能为空'
            }
            return
        }

        // 第一步：通过地理编码API获取adcode
        let adcode = city

        // location优先，再根据城市名称获取adcode
        if (location) {
            const [lngStr, latStr] = String(location).split(',')
            const lng = Number(lngStr)
            const lat = Number(latStr)
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
                ctx.status = 400
                ctx.body = {
                    success: false,
                    message: 'location不正确，请使用lng,lat'
                }
                return
            }
            adcode = await getAdcodeByLocation(`${lng},${lat}`)
        } else if (isNaN(city)) {
            // 如果输入的不是纯数字，先转换为adcode
            adcode = await getCityAdcode(city)
            if (!adcode) {
                console.warn(`无法获取城市"${city}"的adcode，尝试使用城市名查询`)
            }
        }
        if (location && !adcode) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '??????????????'
            }
            return
        }



        // 第二步：使用adcode或城市名查询天气
        const weatherParams = {
            key: AMAP_KEY,
            city: adcode || city, // 优先使用adcode，失败则使用城市名
            extensions: 'base' // base: 实时天气, all: 预报天气
        }

        try {
            const response = await axios.get(AMAP_WEATHER_URL, {
                params: weatherParams,
                timeout: 5000
            })

            if (response.data.status === '1' && response.data.lives && response.data.lives.length > 0) {
                const weatherData = response.data.lives[0]

                // 转换天气代码为图标类型
                const weatherCode = weatherData.weather
                let iconType = 'sunny'
                if (weatherCode.includes('雨')) {
                    iconType = 'rainy'
                } else if (weatherCode.includes('云') || weatherCode.includes('阴')) {
                    iconType = 'cloudy'
                } else if (weatherCode.includes('雪')) {
                    iconType = 'snowy'
                } else if (weatherCode.includes('晴')) {
                    iconType = 'sunny'
                }

                // 生成提示信息
                let tip = ''
                if (weatherCode.includes('雨')) {
                    tip = '有降雨，建议带伞'
                } else if (parseInt(weatherData.temperature) > 30) {
                    tip = '气温较高，注意防暑'
                } else if (parseInt(weatherData.temperature) < 10) {
                    tip = '气温较低，注意保暖'
                } else {
                    tip = '天气适宜，适合出行'
                }

                ctx.body = {
                    success: true,
                    data: {
                        temperature: parseInt(weatherData.temperature),
                        weather: weatherData.weather,
                        icon: iconType,
                        tip: tip,
                        windpower: weatherData.windpower,
                        winddir: weatherData.winddirection || weatherData.winddir,
                        humidity: weatherData.humidity,
                        reporttime: weatherData.reporttime,
                        city: weatherData.city,
                        province: weatherData.province
                    }
                }
            } else {
                ctx.status = 400
                ctx.body = {
                    success: false,
                    message: response.data.info || '获取天气信息失败'
                }
            }
        } catch (error) {
            console.error('高德地图天气API调用错误:', error)
            ctx.status = 500
            ctx.body = {
                success: false,
                message: '获取天气信息失败，请重试'
            }
        }
    } catch (error) {
        console.error('获取天气信息错误:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '获取天气信息失败，请重试'
        }
    }
})

// 获取附近餐厅（美食地图）
router.get('/nearby-restaurants', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const { location, radius = 2000, page = 1, offset = 20, category = '', keyword = '', sort = 'distance' } = ctx.query
        if (!location) {
            ctx.status = 400
            ctx.body = { success: false, message: 'location不能为空' }
            return
        }
        const [lngStr, latStr] = String(location).split(',')
        const lng = Number(lngStr)
        const lat = Number(latStr)
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            ctx.status = 400
            ctx.body = { success: false, message: 'location???????lng,lat' }
            return
        }

        const categoryMap = {
            indoor: { keywords: '室内餐厅 商场 美食城', types: '' },
            light: { keywords: '轻食 沙拉', types: '' },
            drink: { keywords: '饮品 冷饮 奶茶 咖啡', types: '050107|050105' },
            hotpot: { keywords: '火锅 汤锅', types: '' },
            soup: { keywords: '汤 煲 汤品', types: '' },
            chinese: { keywords: '中餐', types: '050101' },
            fastfood: { keywords: '快餐', types: '050103' },
            bbq: { keywords: '烧烤 烤肉', types: '' },
            dessert: { keywords: '甜品 烘焙', types: '050106' }
        }

        const categoryConfig = categoryMap[category] || {}
        const mergedKeywords = [keyword, categoryConfig.keywords].filter(Boolean).join(' ').trim()
        const mergedTypes = [categoryConfig.types, '050000'].filter(Boolean).join('|')

        const normalizedRadius = Math.min(Math.max(Number(radius) || 2000, 0), 50000)
        const params = {
            key: AMAP_KEY,
            location: `${lng.toFixed(6)},${lat.toFixed(6)}`,
            radius: normalizedRadius,
            types: mergedTypes || '050000',
            sortrule: sort === 'weight' ? 'weight' : 'distance',
            page: Number(page) || 1,
            offset: Math.min(Number(offset) || 20, 25),
            extensions: 'all',
            output: 'JSON'
        }
        if (mergedKeywords) {
            params.keywords = mergedKeywords
        }

        const response = await axios.get(AMAP_PLACE_AROUND_URL, {
            params,
            timeout: 8000
        })

        if (response.data.status === '1' && Array.isArray(response.data.pois)) {
            const list = response.data.pois.map((poi) => ({
                id: poi.id,
                name: poi.name,
                address: poi.address || poi.pname || '',
                location: poi.location,
                distance: Number(poi.distance) || 0,
                type: poi.type,
                tel: poi.tel || ''
            }))

            ctx.body = {
                success: true,
                data: {
                    list,
                    count: list.length
                }
            }
            return
        }

        ctx.status = 400
        ctx.body = {
            success: false,
            message: response.data.info || '获取附近餐厅失败'
        }
    } catch (error) {
        const info = error?.response?.data?.info || error?.message || 'Unknown error'
        console.error('Nearby restaurants error:', info)
        ctx.status = 500
        ctx.body = { success: false, message: `Failed to fetch nearby restaurants: ${info}` }
    }
})

/**
 * 通过地理编码API获取地址的经纬度
 * @param {string} address - 地址名称
 * @returns {object|null} {location: "lng,lat", adcode: "xxx"} 或 null
 */
const getLocationByAddress = async (address) => {
    try {
        const response = await axios.get(AMAP_GEOCODE_URL, {
            params: {
                key: AMAP_KEY,
                address: address,
                output: 'JSON'
            },
            timeout: 5000
        })

        if (response.data.status === '1' && response.data.geocodes && response.data.geocodes.length > 0) {
            const geocode = response.data.geocodes[0]
            return {
                location: geocode.location, // 格式: "lng,lat"
                adcode: geocode.adcode,
                formattedAddress: geocode.formatted_address || geocode.formattedAddress || address
            }
        }
        return null
    } catch (error) {
        console.error('地理编码API调用错误:', error)
        return null
    }
}

router.get('/geocode', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const { address } = ctx.query
        const normalizedAddress = String(address || '').trim()
        if (!normalizedAddress) {
            ctx.status = 400
            ctx.body = { success: false, message: 'address不能为空' }
            return
        }

        const geo = await getLocationByAddress(normalizedAddress)
        if (!geo) {
            ctx.status = 400
            ctx.body = { success: false, message: '无法获取该地址的坐标' }
            return
        }

        ctx.body = {
            success: true,
            data: {
                location: geo.location,
                adcode: geo.adcode,
                address: geo.formattedAddress || normalizedAddress
            }
        }
    } catch (error) {
        console.error('地理编码错误：', error)
        ctx.status = 500
        ctx.body = { success: false, message: '地理编码失败，请重试' }
    }
})

/**
 * 获取路线规划
 * @param {string} type - 路线类型: driving(驾车), walking(步行), bicycling(骑行), electrobike(电动车), transit(公交)
 * @param {string} origin - 起点经纬度 "lng,lat"
 * @param {string} destination - 终点经纬度 "lng,lat"
 * @param {object} options - 其他选项
 */


const getRoute = async (type, origin, destination, options = {}) => {
    try {
        let url = ''
        const params = {
            key: AMAP_KEY,
            origin: origin,
            destination: destination,
            output: 'JSON'
        }

        // 根据类型选择不同的API端点
        switch (type) {
            case 'driving':
                url = `${AMAP_DIRECTION_BASE}/driving`
                params.strategy = options.strategy || '32' // 默认高德推荐
                if (options.show_fields) {
                    params.show_fields = options.show_fields
                }
                break
            case 'walking':
                url = `${AMAP_DIRECTION_BASE}/walking`
                if (options.show_fields) {
                    params.show_fields = options.show_fields
                }
                break
            case 'bicycling':
                url = `${AMAP_DIRECTION_BASE}/bicycling`
                if (options.show_fields) {
                    params.show_fields = options.show_fields
                }
                break
            case 'electrobike':
                url = `${AMAP_DIRECTION_BASE}/electrobike`
                if (options.show_fields) {
                    params.show_fields = options.show_fields
                }
                break
            case 'transit':
                // 公交路线规划使用不同的API
                url = 'https://restapi.amap.com/v3/direction/transit/integrated'
                params.city = options.city || '北京' // 公交需要指定城市
                params.strategy = options.strategy || '0' // 0:最快捷模式, 1:最经济模式, 2:最少换乘, 3:最少步行, 5:不乘地铁
                break
            default:
                throw new Error('不支持的路线类型')
        }

        const response = await axios.get(url, {
            params: params,
            timeout: 10000
        })

        if (response.data.status === '1' || response.data.status === 1) {
            return {
                success: true,
                data: response.data
            }
        } else {
            return {
                success: false,
                message: response.data.info || '路线规划失败'
            }
        }
    } catch (error) {
        console.error('路线规划API调用错误:', error)
        return {
            success: false,
            message: error.message || '路线规划失败'
        }
    }
}

// 路线规划接口
router.get('/route', async (ctx) => {
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

        const { type, origin, destination, city } = ctx.query

        if (!type || !origin || !destination) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '参数不完整：需要type(路线类型)、origin(起点)、destination(终点)'
            }
            return
        }

        // 验证路线类型
        const validTypes = ['driving', 'walking', 'bicycling', 'electrobike', 'transit']
        if (!validTypes.includes(type)) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: '路线类型无效，支持: driving(驾车), walking(步行), bicycling(骑行), electrobike(电动车), transit(公交)'
            }
            return
        }

        // 如果origin或destination是地址字符串，先转换为经纬度
        let originLocation = origin
        let destinationLocation = destination

        // 判断是否为经纬度格式（包含逗号）
        if (!origin.includes(',')) {
            const originGeo = await getLocationByAddress(origin)
            if (!originGeo) {
                ctx.status = 400
                ctx.body = {
                    success: false,
                    message: `无法获取起点"${origin}"的坐标`
                }
                return
            }
            originLocation = originGeo.location
        }

        if (!destination.includes(',')) {
            const destGeo = await getLocationByAddress(destination)
            if (!destGeo) {
                ctx.status = 400
                ctx.body = {
                    success: false,
                    message: `无法获取终点"${destination}"的坐标`
                }
                return
            }
            destinationLocation = destGeo.location
        }

        // 调用路线规划API
        const routeResult = await getRoute(type, originLocation, destinationLocation, {
            city: city,
            show_fields: 'cost,tmcs,polyline' // 返回费用、路况和路线坐标
        })

        if (routeResult.success) {
            ctx.body = {
                success: true,
                data: routeResult.data
            }
        } else {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: routeResult.message
            }
        }
    } catch (error) {
        console.error('路线规划错误:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '路线规划失败，请重试'
        }
    }
})

// 根据识别记录推荐出行计划
router.post('/recommend-plan', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const { rec_id } = ctx.request.body
        if (!rec_id) {
            ctx.status = 400
            ctx.body = { success: false, message: '识别记录ID不能为空' }
            return
        }

        // 查询识别记录
        const [recRows] = await pool.execute(
            'SELECT * FROM recognition WHERE id = ? AND user_id = ?',
            [rec_id, decoded.userId]
        )

        if (recRows.length === 0) {
            ctx.status = 404
            ctx.body = { success: false, message: '识别记录不存在' }
            return
        }

        const recognition = recRows[0]
        const recResult = typeof recognition.rec_result === 'string'
            ? JSON.parse(recognition.rec_result)
            : recognition.rec_result
        const foodName = recResult.food_name || ''
        const calories = parseInt(recResult.calorie) || 0

        // 从数据库查询推荐规则
        const recommendations = await generateRecommendations(foodName, calories)

        ctx.body = {
            success: true,
            data: {
                rec_id: rec_id,
                food_name: foodName,
                calories: calories,
                recommendations: recommendations
            }
        }
    } catch (error) {
        console.error('推荐出行计划错误:', error)
        ctx.status = 500
        ctx.body = { success: false, message: '推荐失败，请重试' }
    }
})

// 从数据库生成推荐
async function generateRecommendations(foodName, calories) {
    try {
        // 先尝试精确匹配菜品名称
        let [rows] = await pool.execute(
            'SELECT * FROM food_destination_recommendation WHERE food_name = ? LIMIT 1',
            [foodName]
        )

        // 如果精确匹配失败，尝试模糊匹配或使用默认推荐
        if (rows.length === 0) {
            // 尝试通过菜品类别匹配
            const [categoryRows] = await pool.execute(
                'SELECT * FROM food_destination_recommendation WHERE food_category LIKE ? LIMIT 1',
                [`%${foodName}%`]
            )

            if (categoryRows.length > 0) {
                rows = categoryRows
            } else {
                // 使用默认推荐
                [rows] = await pool.execute(
                    'SELECT * FROM food_destination_recommendation WHERE food_name = ? LIMIT 1',
                    ['其他']
                )
            }
        }

        if (rows.length === 0) {
            // 如果还是没有找到，返回默认推荐
            return getDefaultRecommendations(foodName, calories)
        }

        const rule = rows[0]
        // 解析推荐目的地JSON
        const recommendedData = typeof rule.recommended_destinations === 'string'
            ? JSON.parse(rule.recommended_destinations)
            : rule.recommended_destinations

        // 计算预算（根据卡路里和推荐数据）
        const estimatedBudget = calculateBudget(recommendedData.restaurants, calories)
        const estimatedCalories = calories * 2 // 估算总卡路里（包含其他食物）

        return {
            destination: recommendedData.destination,
            reason: recommendedData.reason || '根据菜品特色推荐',
            recommended_attractions: recommendedData.attractions || [],
            recommended_restaurants: recommendedData.restaurants || [],
            estimated_budget: estimatedBudget,
            estimated_calories: estimatedCalories,
            calorie_range: rule.calorie_range || ''
        }
    } catch (error) {
        console.error('查询推荐规则错误:', error)
        // 出错时返回默认推荐
        return getDefaultRecommendations(foodName, calories)
    }
}

// 计算预算
function calculateBudget(restaurants, calories) {
    if (!restaurants || restaurants.length === 0) {
        return Math.floor(Math.random() * 500) + 200
    }

    // 计算平均价格
    const totalPrice = restaurants.reduce((sum, rest) => sum + (rest.avg_price || 80), 0)
    const avgPrice = totalPrice / restaurants.length

    // 根据卡路里调整预算（高卡路里通常价格更高）
    const calorieFactor = calories > 500 ? 1.2 : calories > 300 ? 1.0 : 0.8

    return Math.floor(avgPrice * calorieFactor * 1.5) // 包含其他费用
}

// 默认推荐（当数据库中没有匹配规则时）
function getDefaultRecommendations(foodName, calories) {
    return {
        destination: '当地热门景点',
        reason: '根据您的喜好推荐',
        recommended_attractions: [
            {
                name: '长沙橘子洲',
                address: '湖南省长沙市岳麓区',
                ticket_price: 50,
                open_time: '09:00-18:00'
            },
            {
                name: '湖南大学',
                address: '湖南省长沙市岳麓区',
                ticket_price: 50,
                open_time: '09:00-18:00'
            }
        ],
        recommended_restaurants: [
            {
                name: '湖南湘潭市步步高大碗先生',
                address: '湖南省湘潭市岳塘区',
                recommended_dishes: [foodName, '其他推荐菜品'],
                avg_price: 80
            },
            {
                name: '长沙万家丽商场',
                address: '湖南省长沙市雨花区',
                recommended_dishes: [foodName, '其他推荐菜品'],
                avg_price: 80
            }
        ],
        estimated_budget: Math.floor(Math.random() * 500) + 200,
        estimated_calories: calories * 2,
        calorie_range: ''
    }
}

// 计算预算
function calculateBudget(restaurants, calories) {
    if (!restaurants || restaurants.length === 0) {
        return Math.floor(Math.random() * 500) + 200
    }

    // 计算平均价格
    const totalPrice = restaurants.reduce((sum, rest) => sum + (rest.avg_price || 80), 0)
    const avgPrice = totalPrice / restaurants.length

    // 根据卡路里调整预算（高卡路里通常价格更高）
    const calorieFactor = calories > 500 ? 1.2 : calories > 300 ? 1.0 : 0.8

    return Math.floor(avgPrice * calorieFactor * 1.5) // 包含其他费用
}

// 保存出行计划
router.post('/save-plan', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const {
            rec_id,
            plan_name,
            destination,
            origin_location,
            destination_location,
            route_type,
            weather_info,
            route_info,
            recommended_restaurants,
            attractions,
            daily_budget,
            total_calories,
            plan_days,
            plan_summary,
            status
        } = ctx.request.body

        if (!destination) {
            ctx.status = 400
            ctx.body = { success: false, message: '目的地不能为空' }
            return
        }

        // 插入出行计划
        const normalizedStatus = ['draft', 'footprint', 'done'].includes(String(status || '').trim())
            ? String(status).trim()
            : 'draft'

        const [result] = await pool.execute(
            `INSERT INTO travel_plan (
          user_id, rec_id, plan_name, destination, origin_location, destination_location,
          route_type, weather_info, route_info, recommended_restaurants, attractions,
          daily_budget, total_calories, plan_days, plan_summary, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                decoded.userId,
                rec_id || null,
                plan_name || '',
                destination,
                origin_location || '',
                destination_location || '',
                route_type || 'driving',
                JSON.stringify(weather_info || {}),
                JSON.stringify(route_info || {}),
                JSON.stringify(recommended_restaurants || []),
                JSON.stringify(attractions || []),
                daily_budget || 0,
                total_calories || 0,
                plan_days || 1,
                plan_summary || '',
                normalizedStatus
            ]
        )

        ctx.body = {
            success: true,
            data: {
                id: result.insertId,
                message: '出行计划保存成功'
            }
        }
    } catch (error) {
        console.error('保存出行计划错误:', error)
        ctx.status = 500
        ctx.body = { success: false, message: '保存失败，请重试' }
    }
})

// 获取用户的出行计划列表
router.get('/plans', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const { page = 1, size = 10, status, keyword = '' } = ctx.query
        const pageNum = parseInt(page)
        const pageSize = parseInt(size)
        const offset = (pageNum - 1) * pageSize

        // 构建查询条件
        let whereClause = 'WHERE tp.user_id = ?'
        const params = [decoded.userId]

        if (status) {
            whereClause += ' AND tp.status = ?'
            params.push(status)
        }

        if (keyword) {
            whereClause += ' AND (tp.destination LIKE ? OR tp.plan_name LIKE ?)'
            const keywordPattern = `%${keyword}%`
            params.push(keywordPattern, keywordPattern)
        }

        // 查询总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM travel_plan tp
            ${whereClause}
        `
        const [countRows] = await pool.execute(countSql, params)
        const total = countRows[0].total

        // 查询列表 - LIMIT 和 OFFSET 不能使用参数绑定，需要直接拼接
        let sql = `
            SELECT tp.*, r.rec_result, r.img_url
            FROM travel_plan tp
            LEFT JOIN recognition r ON tp.rec_id = r.id
            ${whereClause}
            ORDER BY tp.create_time DESC
            LIMIT ${pageSize} OFFSET ${offset}
        `

        const [rows] = await pool.execute(sql, params)

        // 解析JSON字段 - 需要判断类型，因为MySQL可能已经返回对象
        const plans = rows.map(row => {
            // 辅助函数：安全解析JSON
            const safeParse = (value, defaultValue) => {
                if (!value) return defaultValue
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value)
                    } catch (e) {
                        return defaultValue
                    }
                }
                // 如果已经是对象，直接返回
                return value
            }

            return {
                ...row,
                weather_info: safeParse(row.weather_info, {}),
                route_info: safeParse(row.route_info, {}),
                recommended_restaurants: safeParse(row.recommended_restaurants, []),
                attractions: safeParse(row.attractions, []),
                rec_result: row.rec_result ? safeParse(row.rec_result, null) : null
            }
        })

        ctx.body = {
            success: true,
            data: {
                list: plans,
                total: total
            }
        }
    } catch (error) {
        console.error('获取出行计划列表错误:', error)
        ctx.status = 500
        ctx.body = { success: false, message: '获取失败，请重试' }
    }
})

// 获取单条出行计划详情
router.get('/plan/:id', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const planId = ctx.params.id

        // 查询出行计划详情，关联识别记录
        const sql = `
            SELECT tp.*, r.rec_result, r.img_url, r.create_time as rec_create_time
            FROM travel_plan tp
            LEFT JOIN recognition r ON tp.rec_id = r.id
            WHERE tp.id = ? AND tp.user_id = ?
        `
        const [rows] = await pool.execute(sql, [planId, decoded.userId])

        if (rows.length === 0) {
            ctx.status = 404
            ctx.body = { success: false, message: '出行计划不存在' }
            return
        }

        const plan = rows[0]

        // 解析JSON字段
        const safeParse = (value, defaultValue) => {
            if (!value) return defaultValue
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value)
                } catch (e) {
                    return defaultValue
                }
            }
            return value
        }

        const planDetail = {
            ...plan,
            weather_info: safeParse(plan.weather_info, {}),
            route_info: safeParse(plan.route_info, {}),
            recommended_restaurants: safeParse(plan.recommended_restaurants, []),
            attractions: safeParse(plan.attractions, []),
            rec_result: plan.rec_result ? safeParse(plan.rec_result, null) : null
        }

        ctx.body = {
            success: true,
            data: planDetail
        }
    } catch (error) {
        console.error('获取出行计划详情错误:', error)
        ctx.status = 500
        ctx.body = { success: false, message: '获取失败，请重试' }
    }
})

// 删除单条出行计划
router.delete('/plan/:id', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        const planId = ctx.params.id

        // 先检查记录是否存在且属于当前用户
        const [checkRows] = await pool.execute(
            'SELECT id FROM travel_plan WHERE id = ? AND user_id = ?',
            [planId, decoded.userId]
        )

        if (checkRows.length === 0) {
            ctx.status = 404
            ctx.body = { success: false, message: '出行计划不存在或无权限删除' }
            return
        }

        // 先删除相关的收藏记录
        await pool.execute(
            'DELETE FROM collection WHERE coll_type = ? AND target_id = ?',
            ['travel', planId]
        )

        // 删除记录
        await pool.execute(
            'DELETE FROM travel_plan WHERE id = ? AND user_id = ?',
            [planId, decoded.userId]
        )

        ctx.body = {
            success: true,
            message: '删除成功'
        }
    } catch (error) {
        console.error('删除出行计划错误:', error)
        ctx.status = 500
        ctx.body = { success: false, message: '删除失败，请重试' }
    }
})

// 清空用户所有出行计划
router.delete('/plans', async (ctx) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            ctx.status = 401
            ctx.body = { success: false, message: '未授权，请先登录' }
            return
        }

        const decoded = await verifyToken(token)
        if (!decoded) {
            ctx.status = 401
            ctx.body = { success: false, message: 'Token无效或已过期' }
            return
        }

        // 先获取该用户所有出行计划的ID
        const [planRows] = await pool.execute(
            'SELECT id FROM travel_plan WHERE user_id = ?',
            [decoded.userId]
        )

        // 如果有出行计划，先删除相关的收藏记录
        if (planRows.length > 0) {
            const planIds = planRows.map(row => row.id)
            // 使用IN子句批量删除收藏记录
            const placeholders = planIds.map(() => '?').join(',')
            await pool.execute(
                `DELETE FROM collection WHERE coll_type = ? AND target_id IN (${placeholders})`,
                ['travel', ...planIds]
            )
        }

        // 删除该用户所有出行计划
        await pool.execute(
            'DELETE FROM travel_plan WHERE user_id = ?',
            [decoded.userId]
        )

        ctx.body = {
            success: true,
            message: '清空成功'
        }
    } catch (error) {
        console.error('清空出行计划错误:', error)
        ctx.status = 500
        ctx.body = { success: false, message: '清空失败，请重试' }
    }
})

module.exports = router