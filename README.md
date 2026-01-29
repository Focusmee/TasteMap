# TasteMap

TasteMap 是一个面向饮食记录与营养分析的全栈应用，提供图片识别、饮食记录、趋势看板、推荐与知识库等功能。前端基于 Vue 3 + Vite，后端基于 Koa，数据存储使用 MySQL。

## 功能概览
- 识别：上传图片 → 识别记录 → 支持修正名称并加入饮食记录
- 数据看板：近 7 天趋势（识别 / 出行 / 热量 / 宏量营养）
- 饮食推荐：结合用户画像与过敏原过滤
- 饮食日历：每日摄入查看、删除记录、7 天趋势汇总
- 知识库：搜索 / 筛选 / 对比菜品营养
- 健康咨询：离线规则助手（可替换为模型/LLM）

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
