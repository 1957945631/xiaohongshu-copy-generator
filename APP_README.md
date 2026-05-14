# 小红书爆款文案生成器

一个 React + Vite 前端和 Node/Express API 代理组成的小红书文案生成工具。

## 安装

```powershell
npm install
```

## 配置 AI API

复制 `.env.example` 为 `.env`，填入 OpenAI-compatible 服务：

```text
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=your-api-key
AI_MODEL=your-model
PORT=8787
```

前端不会读取 API Key，只会调用本地后端 `/api/generate`。

## 启动

```powershell
npm run dev
```

默认服务：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`

## 验证

```powershell
npm test
npm run build
```
