# AGENTS.md

## 项目级别说明

本文件位于项目根目录，适用于整个仓库及其子目录。后续 agent 进入本项目时应先阅读本文件。

项目路径：

```powershell
cd "D:\CodexStudy\小红书爆款文案生成"
```

常用运行指令：

```powershell
npm install
npm run dev      # 同时启动前端和后端
npm run client   # 只启动前端
npm run server   # 只启动后端
npm test
npm run build
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`
- 生成接口：`POST http://localhost:8787/api/generate`

如果 `5173` 被占用，Vite 会自动使用 `5174`、`5175` 等端口。调试用户浏览器问题时，优先让前端回到 `5173`。

## 项目概览

本仓库包含：

- `design-md/`：原始 `VoltAgent/awesome-design-md` 设计文档集合。
- 项目根目录：小红书爆款文案生成网页应用。

不要删除、移动或重构 `design-md/`。当前网页应用是追加在原仓库基础上的本地工具。

## 应用目标

应用根据产品/服务信息生成 3 套小红书笔记文案。

核心流程：

1. 填写产品名称、卖点、人群、场景、优惠。
2. 选择文案方向和语气。
3. 生成并分页查看 3 套文案。

每套结果结构：

```ts
{
  label: string;
  title: string;
  coverText: string;
  body: string;
  hashtags: string[];
}
```

## 技术栈与关键文件

前端：

- React 19 + Vite + TypeScript
- `src/App.tsx`
- `src/styles.css`
- `src/main.tsx`
- `src/App.test.tsx`

后端：

- Node.js + Express + TypeScript
- 通过 `tsx watch server/index.ts` 运行
- `server/index.ts`
- `server/generate.ts`
- `server/generate.test.ts`

## 当前 UI 状态

当前 UI 是粉色玻璃工作台单页模式：

- 首屏即生成器，不做营销长页。
- 顶部只保留品牌信息，不需要“首页、模板、发现、价格、我的、头像”导航。
- 桌面为左右双栏：左侧创作表单，右侧 AI 结果。
- 移动端单栏。
- 生成结果分页查看 3 套文案，不要纵向一直堆叠。
- 视觉参考用户提供的粉色玻璃截图；`design-md/` 仅作辅助参考。

## API 约定

前端调用：

```ts
POST /api/generate
```

请求体：

```ts
{
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  scenario: string;
  offer?: string;
  direction: string;
  tone: string;
}
```

不要随意改变请求字段或响应结构；如需改变，必须同步更新前端和测试。

## AI 配置

后端读取 `.env`：

```env
AI_BASE_URL=http://example-host:3000/v1
AI_API_KEY=your-api-key
AI_MODEL=your-model-name
PORT=8787
```

注意：

- `AI_BASE_URL` 必须是基础 `/v1` 地址，不要写完整 `/chat/completions`。
- 后端会请求 `${AI_BASE_URL}/chat/completions`。
- 前端不能读取或暴露 `AI_API_KEY`。
- `.env` 已被 git 忽略，不要打印、提交或复制真实 API Key。
- 普通 HTTP 中转站必须使用 `http`，不要误写成 `https`。

## 后端生成策略

`server/generate.ts` 负责请求模型并把输出规范化为 `{ variants: [...] }`。

当前已兼容：

- Markdown 代码块包裹 JSON。
- JSON 前后带说明文字。
- 双重 JSON 字符串。
- 顶层数组。
- `results`、`copies`、`notes`、`items`、`data` 等别名。
- `headline`、`cover`、`content`、`tags` 等字段别名。
- 标签字符串，例如 `#内容运营 #效率工具`。
- Claude/NewAPI 常见 content block。
- tool call/function call arguments。

重要兜底：

- 首次解析失败时，会请求模型做一次严格 JSON 修复。
- 修复仍失败时，只要第一次模型返回过文本，就基于模型文本和用户输入整理出 3 套可展示文案。
- 不要把普通模型格式问题直接暴露成“模型返回格式无法解析”。

## 验证要求

完成代码修改后至少运行：

```powershell
npm test
npm run build
```

如果 Vitest 在沙箱镜像路径中因为 Windows 绝对路径解析失败，应在真实项目路径下重跑同一命令。

真实生成请求会消耗模型额度。除非用户明确同意，不要随意发起真实模型调用。

## 调试顺序

生成失败时按顺序排查：

1. 前端是否可访问：`http://localhost:5173`。
2. 后端是否可访问：`http://localhost:8787/api/generate`。
3. 修改 `.env` 后是否重启了后端。
4. `AI_BASE_URL` 是否使用正确协议和 `/v1` 基础地址。
5. 上游是否返回 OpenAI-compatible 响应。
6. 后端是否运行了最新 `server/generate.ts`。
7. 测试是否覆盖当前失败形态。

## Git 与本地文件

不要提交：

- `.env`
- 真实 API Key
- `node_modules/`
- `dist/`
- `dev-server*.log`
- `api-server*.log`
- `client-server*.log`

如果工作区已有用户或其他 agent 的修改，不要回滚；只处理当前任务相关文件。
