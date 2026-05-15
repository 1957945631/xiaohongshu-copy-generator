# 小红书爆款文案生成器

一个面向小红书内容创作的本地网页工具。输入产品或服务信息后，应用会调用 OpenAI-compatible 模型，一次生成 3 套可对比、可复制的小红书笔记文案。

> 说明：本仓库保留了原始开源项目 `VoltAgent/awesome-design-md` 的 `design-md/` 设计文档集合，用于 UI 参考和学习。本 README 介绍的是当前追加开发的“小红书爆款文案生成器”应用。

## 功能特点

- 首屏即创作工作台，不做营销长页。
- 输入产品名称、核心卖点、目标人群、使用场景和优惠信息。
- 支持选择文案方向和语气风格。
- 一次生成 3 套小红书笔记方案。
- 每套结果包含标题、封面短句、正文和话题标签。
- 结果分页查看，适合横向比较后复制发布。
- 前端不暴露 API Key，所有模型请求都通过后端代理完成。

## 技术栈

前端：

- React 19
- Vite
- TypeScript
- lucide-react

后端：

- Node.js
- Express
- TypeScript
- Vercel Serverless Function

测试与构建：

- Vitest
- TypeScript Compiler
- Vite Build

## 项目结构

```text
.
├── api/
│   ├── generate.ts          # Vercel 线上 /api/generate 入口
│   └── generate.test.ts
├── server/
│   ├── index.ts             # 本地 Express 开发服务
│   ├── generate.ts          # 文案生成、解析、兜底逻辑
│   └── generate.test.ts
├── src/
│   ├── App.tsx              # 单页应用主界面
│   ├── App.test.tsx
│   ├── main.tsx
│   └── styles.css
├── design-md/               # 原始开源设计文档集合，作为 UI 参考保留
├── vercel.json              # Vercel 构建与函数配置
├── package.json
└── README.md
```

## 快速开始

安装依赖：

```powershell
npm install
```

复制环境变量示例：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`：

```env
AI_BASE_URL=http://example-host:3000/v1
AI_API_KEY=your-api-key
AI_MODEL=your-model-name
PORT=8787
```

启动前端和后端：

```powershell
npm run dev
```

默认访问地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`
- 生成接口：`POST http://localhost:8787/api/generate`

如果 `5173` 被占用，Vite 会自动使用 `5174`、`5175` 等端口。

## 常用命令

```powershell
npm run dev      # 同时启动前端和后端
npm run client   # 只启动前端
npm run server   # 只启动后端
npm test         # 运行测试
npm run build    # 类型检查并构建前端
```

## API 说明

前端调用：

```http
POST /api/generate
```

请求体：

```json
{
  "productName": "夏日连衣裙",
  "sellingPoints": "高腰显瘦、面料透气、通勤约会都能穿",
  "targetAudience": "小个子女生",
  "scenario": "夏日出游、日常通勤",
  "offer": "限时 8 折",
  "direction": "种草推荐",
  "tone": "真诚"
}
```

响应体：

```json
{
  "variants": [
    {
      "label": "情绪种草版",
      "title": "标题",
      "coverText": "封面短句",
      "body": "正文内容",
      "hashtags": ["小红书种草", "穿搭分享"]
    }
  ]
}
```

## AI 配置说明

后端读取 `.env` 或 Vercel 环境变量：

```env
AI_BASE_URL=http://example-host:3000/v1
AI_API_KEY=your-api-key
AI_MODEL=your-model-name
PORT=8787
```

注意事项：

- `AI_BASE_URL` 必须是基础 `/v1` 地址，不要写完整 `/chat/completions`。
- 后端实际请求地址是 `${AI_BASE_URL}/chat/completions`。
- 前端不会读取或暴露 `AI_API_KEY`。
- 不要使用 `VITE_*` 保存密钥。
- 普通 HTTP 中转站需要使用 `http`，不要误写成 `https`。
- `.env` 已被 git 忽略，不要提交真实 API Key。

## 生成策略

核心生成逻辑在 `server/generate.ts`，负责：

- 校验请求字段。
- 构造小红书文案提示词。
- 请求 OpenAI-compatible Chat Completions API。
- 将模型输出规范化为 `{ variants: [...] }`。
- 兼容 Markdown 代码块、JSON 前后说明文字、顶层数组、常见字段别名、标签字符串、content block 和 tool call arguments。
- 首次解析失败时请求模型做严格 JSON 修复。
- 修复仍失败时，根据模型原始文本和用户输入生成 3 套可展示兜底文案。

## Vercel 部署

本项目线上部署采用 Vite 前端 + Vercel Function：

- `vercel.json` 指定 `npm run build` 和输出目录 `dist`。
- `api/generate.ts` 是线上 `/api/generate` 入口。
- `server/index.ts` 仅用于本地开发。
- Vercel 环境变量需要配置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`。
- 修改 Vercel 环境变量后需要重新部署。

部署前建议运行：

```powershell
npm test
npm run build
```

## 本地验证

```powershell
npm test
npm run build
```

真实生成请求会消耗模型额度。排查前可以先用缺字段请求验证接口是否进入校验逻辑，再进行真实模型调用。

## 设计说明

当前 UI 是粉色玻璃工作台风格：

- 桌面端左右双栏：左侧创作表单，右侧 AI 结果。
- 移动端单栏。
- 顶部只保留品牌信息。
- 生成结果分页查看 3 套文案。

`design-md/` 中的内容来自开源设计文档集合，仅作为设计参考资料保留，不是当前应用的产品说明。

## License

本仓库基于原始开源仓库继续开发，原始设计文档集合遵循其对应开源许可。当前追加的小红书文案生成工具代码请以仓库实际许可文件为准。
