import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import process from "node:process";
import { generateCopy } from "./generate";

process.loadEnvFile?.();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const jsonErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "请求内容不是有效 JSON，请刷新页面后重试。" });
    return;
  }
  next(error);
};

app.use(jsonErrorHandler);

app.post("/api/generate", async (req, res) => {
  const result = await generateCopy(req.body, process.env, fetch);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.data);
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
