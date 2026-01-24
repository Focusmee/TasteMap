/**
 * 加载高德地图地理编码插件（用于逆地理编码）
 * @returns {Promise<void>}
 */
const loadGeocoderPlugin = () => {
    return new Promise((resolve, reject) => {
        if (typeof AMap === 'undefined') {
            reject(new Error('高德地图API未加载'))
            return
        }

        if (AMap.Geocoder) {
            resolve()
            return
        }

        AMap.plugin('AMap.Geocoder', () => {
            if (AMap.Geocoder) {
                resolve()
            } else {
                reject(new Error('地理编码插件加载失败'))
            }
        })
    })
}

/**
 * 使用高德地图逆地理编码获取地址
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {Promise<string>} 地址字符串
 */
const getAddressByLocation = async (lng, lat) => {
    try {
        await loadGeocoderPlugin()

        return new Promise((resolve) => {
            const geocoder = new AMap.Geocoder()
            geocoder.getAddress([lng, lat], (status, result) => {
                if (status === 'complete' && result.info === 'OK') {
                    resolve(result.regeocode.formattedAddress)
                } else {
                    resolve('') // 获取地址失败时返回空字符串
                }
            })
        })
    } catch (error) {
        console.warn('逆地理编码失败:', error)
        return ''
    }
}

/**
 * 使用浏览器原生定位API获取用户当前位置
 * @returns {Promise<{lng: number, lat: number, address: string}>}
 */
const getBrowserLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('浏览器不支持定位功能'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lng = position.coords.longitude
                const lat = position.coords.latitude

                // 验证坐标是否合理（中国境内大致范围）
                // 中国经度范围：73°E - 135°E，纬度范围：18°N - 54°N
                if (lng < 73 || lng > 135 || lat < 18 || lat > 54) {
                    console.warn('坐标超出中国范围，可能定位不准确:', lng, lat)
                }

                // 使用高德地图逆地理编码获取地址
                let address = ''
                if (typeof AMap !== 'undefined') {
                    address = await getAddressByLocation(lng, lat)
                }

                resolve({
                    lng: lng,
                    lat: lat,
                    address: address || `${lng}, ${lat}`,
                    accuracy: position.coords.accuracy || 0
                })
            },
            (error) => {
                let errorMsg = '定位失败'
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = '用户拒绝了定位请求'
                        break
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = '定位信息不可用'
                        break
                    case error.TIMEOUT:
                        errorMsg = '定位请求超时'
                        break
                }
                reject(new Error(errorMsg))
            },
            {
                enableHighAccuracy: true, // 使用高精度定位
                timeout: 10000, // 超时时间10秒
                maximumAge: 0 // 不使用缓存
            }
        )
    })
}

/**
 * 加载高德地图定位插件
 * @returns {Promise<void>}
 */
const loadGeolocationPlugin = () => {
    return new Promise((resolve, reject) => {
        if (typeof AMap === 'undefined') {
            reject(new Error('高德地图API未加载'))
            return
        }

        if (AMap.Geolocation) {
            resolve()
            return
        }

        AMap.plugin('AMap.Geolocation', () => {
            if (AMap.Geolocation) {
                resolve()
            } else {
                reject(new Error('定位插件加载失败'))
            }
        })
    })
}

/**
 * 使用高德地图获取用户当前位置（优先使用浏览器原生定位，更准确）
 * @returns {Promise<{lng: number, lat: number, address: string}>}
 */
export const getCurrentLocation = () => {
    return new Promise(async (resolve, reject) => {
        // 优先使用浏览器原生定位（更准确）
        try {
            const location = await getBrowserLocation()

            // 验证坐标合理性
            if (location.lng && location.lat) {
                console.log('定位成功:', location)
                resolve(location)
                return
            }
        } catch (error) {
            console.warn('浏览器定位失败，尝试使用高德定位:', error)
        }

        // 备选方案：使用高德地图定位插件
        try {
            await loadGeolocationPlugin()

            const geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
                convert: true, // 自动偏移坐标，偏移后的坐标为高德坐标
                showButton: false,
                buttonDom: null,
                showMarker: false,
                showCircle: false,
                panToLocation: false,
                zoomToAccuracy: false
            })

            geolocation.getCurrentPosition((status, result) => {
                if (status === 'complete') {
                    const lng = result.position.lng
                    const lat = result.position.lat

                    // 验证坐标合理性
                    if (lng < 73 || lng > 135 || lat < 18 || lat > 54) {
                        console.warn('高德定位坐标异常:', lng, lat)
                        reject(new Error('定位坐标异常，请检查定位权限'))
                        return
                    }

                    resolve({
                        lng: lng,
                        lat: lat,
                        address: result.formattedAddress || '',
                        accuracy: result.accuracy || 0
                    })
                } else {
                    reject(new Error(result.message || '定位失败'))
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * 将经纬度格式化为字符串 "lng,lat"
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {string}
 */
export const formatLocation = (lng, lat) => {
    return `${lng},${lat}`
}