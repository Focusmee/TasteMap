let amapLoaderPromise = null
const DEFAULT_AMAP_JS_KEY = '62dcda7f84789a38e32f7e6c9f7f82bf'

const buildAmapSrc = (key) => {
    const params = new URLSearchParams({
        v: '2.0',
        key
    })
    return `https://webapi.amap.com/maps?${params.toString()}`
}

export const loadAmapScript = () => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('无法加载高德地图'))
    }
    if (typeof window.AMap !== 'undefined') {
        return Promise.resolve()
    }

    if (amapLoaderPromise) {
        return amapLoaderPromise
    }

    amapLoaderPromise = new Promise((resolve, reject) => {
        const key = import.meta.env.VITE_AMAP_JS_KEY || DEFAULT_AMAP_JS_KEY

        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.src = buildAmapSrc(key)
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('高德地图脚本加载失败'))

        document.head.appendChild(script)
    })

    return amapLoaderPromise
}
