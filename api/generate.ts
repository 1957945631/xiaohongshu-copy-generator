import process from "node:process";
import { generateCopy } from "../server/generate";

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (statusCode: number) => ApiResponse;
  setHeader: (name: string, value: string) => ApiResponse;
  json: (body: unknown) => ApiResponse;
  end: () => ApiResponse;
};

type RuntimeEnv = {
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
};

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
  env: RuntimeEnv = process.env
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = parseRequestBody(req.body);
  if (!body.ok) {
    res.status(400).json({ error: "请求内容不是有效 JSON，请刷新页面后重试。" });
    return;
  }

  const result = await generateCopy(body.value, env, fetch);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(result.status).json(result.data);
}

function parseRequestBody(body: unknown): { ok: true; value: unknown } | { ok: false } {
  if (typeof body !== "string") {
    return { ok: true, value: body };
  }

  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false };
  }
}
