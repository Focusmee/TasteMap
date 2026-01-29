# TasteMap

TasteMap 是一个面向饮食记录与营养分析的全栈应用，提供图片识别、饮食记录、趋势看板、推荐与知识库等功能。前端基于 Vue 3 + Vite，后端基于 Koa，数据存储使用 MySQL。

## 功能概览
- 识别：上传图片 → 识别记录 → 支持修正名称并加入饮食记录
- 数据看板：近 7 天趋势（识别 / 出行 / 热量 / 宏量营养）
- 饮食推荐：结合用户画像与过敏原过滤
- 饮食日历：每日摄入查看、删除记录、7 天趋势汇总
- 知识库：搜索 / 筛选 / 对比菜品营养
- 健康咨询：离线规则助手（可替换为模型/LLM）

## 功能详细说明
### 1) 用户与鉴权
- 手机号注册/登录，校验手机号格式与密码长度
- JWT 登录态校验，接口统一从 `Authorization: Bearer <token>` 读取
- 退出登录支持 token 黑名单（幂等）
- 头像上传与更换（自动清理旧头像），昵称更新（长度校验）

### 2) 个人画像与健康评分
- 画像字段：目标（减脂/增肌/控糖/低盐/均衡）、饮食风格、偏好、过敏原、生活方式、健康状况
- 画像保存时做标准化（目标/过敏原字段兼容）
- 健康评分（0~100）基于目标、过敏与生活方式粗评估
- 画像概览接口：返回近 7 天饮食汇总（热量与三大宏量）+ 画像

### 3) 图片识别与识别记录
- 上传图片（`jpeg/jpg/png/gif/webp`，大小限制 5MB）
- 调用识别服务（优先 `/predict`，失败回退 `/predict_base64`）
- 写入识别记录（原图 URL + 识别结果 JSON）
- 支持搜索记录（关键词匹配菜名/配料）
- 识别记录详情、最近识别菜名联想、人工修正菜名

### 4) 饮食记录（Diet Log）
- 新增记录：支持餐别、份数、备注；若命中知识库菜品，自动补齐热量/营养/过敏原
- 单日列表：按早餐/午餐/晚餐/加餐排序，返回日总热量与宏量营养
- 日历汇总：按日期返回热量、餐次数量与宏量营养趋势
- 7~90 天趋势：热量/蛋白/脂肪/碳水变化
- 单日分析：三大宏量占比 + 简单建议（如油炸频次、热量超标）
- 删除记录：支持按 id 删除

### 5) 饮食推荐
- 今日推荐（规则/画像驱动）：根据目标（减脂/增肌/控糖/低盐）调整排序逻辑
- 过敏原过滤：自动剔除含过敏原菜品
- AI 推荐（可选）：基于画像 + 近 7 天饮食日历调用 Gemini
- AI 不可用时自动回退到本地规则推荐（稳定可用）

### 6) 食物知识库
- 列表/搜索：按关键词、分类、热量区间筛选
- 详情页：包含营养、过敏原、标签、食材、烹饪方式、来源等
- 管理接口：新增/编辑/删除菜品（含营养与标签结构化字段）
- 对比工具：一次对比 2~3 个菜品的热量与营养数据
- 联想搜索：支持名称提示

### 7) 收藏
- 收藏识别记录或出行计划（`coll_type`：rec / travel）
- 取消收藏、收藏状态检查
- 收藏列表：联表返回识别内容或出行计划详情

### 8) 看板（Dashboard）
- 识别统计：今日 / 近 7 天 / 近 30 天次数
- 识别 Top 菜品与过敏原分布
- 识别营养指标趋势（热量 / 蛋白 / 脂肪 / 碳水 / 钠）
- 出行统计：今日 / 近 7 天 / 近 30 天次数
- 出行 Top 目的地与出行方式分布

### 9) 出行与美食地图
- 天气查询：支持城市名或经纬度（高德接口）
- 周边美食搜索：按距离/评分/人气排序，支持分类与关键词
- 地理编码与路线规划：支持不同出行方式（驾车/公交/步行等）
- 生成出行计划：包含路线、推荐餐厅、预算、天数等信息
- 计划管理：保存/列表/详情/删除/批量清空
- POI 美食标记：将地点与菜品建立关联，支持批量查询
- AI 行程建议（可选）：结合天气、路线、画像与历史记录生成建议（Gemini）

### 10) 健康咨询（聊天）
- 会话列表、消息记录
- 规则引擎回复：减脂/控糖/低盐/过敏提醒、知识库对比提示
- 可替换为大模型接入（接口已预留）

## 技术栈
前端：
- Vue 3 + Vite
- Element Plus、Pinia、ECharts、Sass

后端：
- Koa、koa-router、koa-bodyparser、koa-static
- MySQL（mysql2）
- JWT 认证、bcryptjs 密码处理

## 目录结构
```
TasteMap/
  backend/               # 后端（Koa）
    backend/
      src/
        routes/          # 业务路由
  frontend/              # 前端（Vue3 + Vite）
    frontend/
  sql_final.sql          # 数据库初始化与演示数据
  运行指南.md             # 更详细的本地运行说明
```

## 快速开始（Windows + MySQL + pnpm）

### 1) 准备环境
- Node.js 18+（建议 18/20）
- pnpm（`npm i -g pnpm`）
- MySQL 5.7+ / 8.0+

### 2) 导入数据库
```sql
CREATE DATABASE IF NOT EXISTS `smart-softwear` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

```bash
mysql -uroot -p smart-softwear < sql_final.sql
```

演示账号：
- 手机号：`13800000000`
- 密码：`123456`

说明：演示账号密码为明文（便于看图表趋势）。后端已做兼容处理：若数据库里密码不是 bcrypt 格式，会走明文对比；正式环境请通过“注册”生成 bcrypt 密码。

### 3) 启动后端（Koa）
在 `backend/backend` 目录：
```bash
pnpm install
pnpm start
# 或 pnpm dev
```

默认端口：`http://localhost:3000`

如需修改数据库连接：
```bash
set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=你的密码
set DB_NAME=smart-softwear
pnpm start
```

或直接修改 `backend/backend/src/config/database.js`。

### 4) 启动前端（Vite + Vue3）
在 `frontend/frontend` 目录：
```bash
pnpm install
pnpm dev
```

访问：`http://localhost:5173`

可选：通过 `frontend/frontend/.env` 指定后端地址：
```env
VITE_SERVER_IP=127.0.0.1
VITE_SERVER_PORT=3000
VITE_USE_HTTPS=false
```

## 常见问题
- `curl http://localhost:3000` 返回 404 属于正常：后端只提供 `/api/*` 接口。可用以下接口验证：
```bash
curl http://localhost:3000/api/dashboard/summary
```

- 看板没数据：确认 SQL 是否成功导入，且使用演示账号（user_id=1）或已有数据的账号登录。

## 备注
更完整的运行细节可参考 `运行指南.md`。
