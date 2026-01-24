// 模拟数据服务，后续替换为真实API调用

// 模拟识别结果
export const mockRecognition = (imageFile) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          id: "44",
          img_url: URL.createObjectURL(imageFile),
          rec_result: {
            food_name: '宫保鸡丁',
            ingredients: ['鸡肉', '花生', '辣椒', '黄瓜'],
            allergens: ['花生'],
            calorie: '350大卡/份',
          }
        }
      })
    }, 1500) // 模拟1.5秒识别时间
  })
}
