export type GenerateRequest = {
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  scenario: string;
  offer?: string;
  direction: string;
  tone: string;
};

export type CopyVariant = {
  label: string;
  title: string;
  coverText: string;
  body: string;
  hashtags: string[];
};

export type GenerateResponse = {
  variants: CopyVariant[];
};

type Env = {
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
};

type ValidationResult =
  | { ok: true; value: GenerateRequest; errors?: never }
  | { ok: false; errors: string[]; value?: never };

export function validateGenerateRequest(input: unknown): ValidationResult {
  const data = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const value: GenerateRequest = {
    productName: stringValue(data.productName),
    sellingPoints: stringValue(data.sellingPoints),
    targetAudience: stringValue(data.targetAudience),
    scenario: stringValue(data.scenario),
    offer: stringValue(data.offer),
    direction: stringValue(data.direction) || "种草推荐",
    tone: stringValue(data.tone) || "真诚"
  };

  const errors: string[] = [];
  if (!value.productName) errors.push("产品/服务名称不能为空");
  if (!value.sellingPoints) errors.push("核心卖点不能为空");
  if (!value.targetAudience) errors.push("目标人群不能为空");
  if (!value.scenario) errors.push("使用场景不能为空");

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export function buildPrompt(request: GenerateRequest): string {
  return [
    "你是一名资深小红书内容策划，擅长把产品信息写成可直接发布的爆款笔记。",
    "请根据以下信息生成 3 套不同策略的小红书完整文案。",
    "",
    `产品/服务名称：${request.productName}`,
    `核心卖点：${request.sellingPoints}`,
    `目标人群：${request.targetAudience}`,
    `使用场景：${request.scenario}`,
    `价格/优惠：${request.offer || "无"}`,
    `文案方向：${request.direction}`,
    `语气：${request.tone}`,
    "",
    "要求：",
    "1. 3 套文案分别偏向：情绪种草版、痛点转化版、干货测评版。",
    "2. 标题要有小红书感，但不要夸大医疗、收益或无法验证的效果。",
    "3. 正文要自然、具体、有场景，适当使用 Emoji。",
    "4. 话题标签只返回标签文字，不要包含 # 符号。",
    "5. 严格返回 JSON，不要 Markdown，不要解释。",
    "",
    "JSON 结构：",
    "{\"variants\":[{\"label\":\"情绪种草版\",\"title\":\"\",\"coverText\":\"\",\"body\":\"\",\"hashtags\":[\"\"]}]}"
  ].join("\n");
}

export function parseModelContent(content: string): GenerateResponse {
  let parsed: unknown;
  try {
    parsed = parseJsonLikeContent(content);
  } catch {
    throw new Error("模型返回格式无法解析，请重试或调整模型配置。");
  }

  const normalized = normalizeGenerateResponse(parsed);
  if (!normalized) {
    throw new Error("模型返回内容缺少必要字段，请重试。");
  }

  return normalized;
}

export async function generateCopy(
  rawRequest: unknown,
  env: Env,
  fetchImpl: typeof fetch
): Promise<
  | { ok: true; status: 200; data: GenerateResponse }
  | { ok: false; status: number; error: string }
> {
  const validation = validateGenerateRequest(rawRequest);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.errors.join("；") };
  }

  const baseUrl = env.AI_BASE_URL?.replace(/\/+$/, "");
  const apiKey = env.AI_API_KEY;
  const model = env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    return {
      ok: false,
      status: 503,
      error: "缺少 AI_BASE_URL、AI_API_KEY 或 AI_MODEL，请先配置 OpenAI-compatible 模型环境变量。"
    };
  }

  try {
    const content = await requestChatContent(fetchImpl, baseUrl, apiKey, {
      model,
      temperature: 0.78,
      messages: [
        {
          role: "system",
          content: "你只输出用户要求的 JSON。"
        },
        {
          role: "user",
          content: buildPrompt(validation.value)
        }
      ]
    });

    try {
      return { ok: true, status: 200, data: parseModelContent(content) };
    } catch (parseError) {
      if (!(parseError instanceof Error) || !parseError.message.startsWith("模型返回")) {
        throw parseError;
      }

      try {
        const repairedContent = await requestChatContent(fetchImpl, baseUrl, apiKey, {
          model,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: "你是 JSON 修复器。只输出严格 JSON，不要解释。"
            },
            {
              role: "user",
              content: buildRepairPrompt(content)
            }
          ]
        });

        try {
          return { ok: true, status: 200, data: parseModelContent(repairedContent) };
        } catch (repairParseError) {
          if (!(repairParseError instanceof Error) || !repairParseError.message.startsWith("模型返回")) {
            throw repairParseError;
          }
          return { ok: true, status: 200, data: buildFallbackResponse(`${content}\n${repairedContent}`, validation.value) };
        }
      } catch (repairError) {
        if (repairError instanceof Error && repairError.message.startsWith("AI 服务")) {
          return { ok: true, status: 200, data: buildFallbackResponse(content, validation.value) };
        }
        throw repairError;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("模型返回")) {
      return { ok: false, status: 502, error: error.message };
    }
    if (error instanceof Error && error.message.startsWith("AI 服务")) {
      return { ok: false, status: 502, error: error.message };
    }
    return { ok: false, status: 502, error: "生成请求失败，请检查网络或模型服务地址。" };
  }
}

async function requestChatContent(
  fetchImpl: typeof fetch,
  baseUrl: string,
  apiKey: string,
  request: {
    model: string;
    temperature: number;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }
): Promise<string> {
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: request.model,
      temperature: request.temperature,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: request.messages
    })
  });

  if (!response.ok) {
    throw new Error("AI 服务请求失败，请检查模型配置或稍后重试。");
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown; function_call?: unknown } }>;
  };
  const message = payload.choices?.[0]?.message;
  const content = extractMessageContent(message?.content) ||
    extractToolArguments(message?.tool_calls) ||
    extractToolArguments(message?.function_call);
  if (!content) {
    throw new Error("AI 服务没有返回可用内容。");
  }
  return content;
}

function buildRepairPrompt(content: string): string {
  return [
    "请把下面的模型输出修复为严格 JSON。",
    "只能输出 JSON，不要 Markdown，不要解释。",
    "目标结构：",
    "{\"variants\":[{\"label\":\"情绪种草版\",\"title\":\"\",\"coverText\":\"\",\"body\":\"\",\"hashtags\":[\"\"]}]}",
    "要求：",
    "1. 尽量保留原文含义。",
    "2. 如果原文不足 3 套，请基于原文补足到 3 套。",
    "3. hashtags 只保留标签文字，不要 #。",
    "",
    "原始输出：",
    content
  ].join("\n");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripCodeFence(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function extractJsonObject(content: string): string {
  const stripped = stripCodeFence(content);
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    const objectStart = stripped.indexOf("{");
    const objectEnd = stripped.lastIndexOf("}");
    const arrayStart = stripped.indexOf("[");
    const arrayEnd = stripped.lastIndexOf("]");
    const candidates = [
      arrayStart >= 0 && arrayEnd > arrayStart ? stripped.slice(arrayStart, arrayEnd + 1) : "",
      objectStart >= 0 && objectEnd > objectStart ? stripped.slice(objectStart, objectEnd + 1) : ""
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // Try the next JSON-looking span.
      }
    }
    return stripped;
  }
}

function parseJsonLikeContent(content: string): unknown {
  let parsed: unknown = JSON.parse(extractJsonObject(content));
  if (typeof parsed === "string") {
    parsed = JSON.parse(extractJsonObject(parsed));
  }
  return parsed;
}

function extractMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (typeof content === "object" && content !== null && !Array.isArray(content)) {
    return textFromContentPart(content);
  }
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map(textFromContentPart)
    .join("\n")
    .trim();
}

function textFromContentPart(part: unknown): string {
  if (typeof part === "string") {
    return part;
  }
  if (typeof part !== "object" || part === null) {
    return "";
  }
  const record = part as Record<string, unknown>;
  if (typeof record.text === "string") {
    return record.text;
  }
  if (typeof record.content === "string") {
    return record.content;
  }
  return "";
}

function extractToolArguments(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(extractToolArguments).filter(Boolean).join("\n").trim();
  }
  if (typeof value !== "object" || value === null) {
    return "";
  }

  const record = value as Record<string, unknown>;
  if (typeof record.arguments === "string") {
    return record.arguments;
  }
  if (typeof record.function === "object" && record.function !== null) {
    const fn = record.function as Record<string, unknown>;
    if (typeof fn.arguments === "string") {
      return fn.arguments;
    }
  }
  return "";
}

function normalizeGenerateResponse(value: unknown): GenerateResponse | null {
  if (isGenerateResponse(value)) {
    return value;
  }

  const rawVariants = findVariantList(value);
  if (!rawVariants || rawVariants.length < 1) {
    return null;
  }

  const variants = rawVariants.slice(0, 3).map(normalizeVariant).filter((variant): variant is CopyVariant => Boolean(variant));
  return variants.length ? { variants } : null;
}

function findVariantList(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const keys = ["variants", "results", "copies", "notes", "items", "data"];
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return null;
}

function normalizeVariant(value: unknown): CopyVariant | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = firstString(record, ["label", "type", "style", "version", "name"]) || "小红书文案";
  const title = firstString(record, ["title", "headline", "heading"]);
  const coverText = firstString(record, ["coverText", "cover", "coverTitle", "coverCopy", "hook"]);
  const body = firstString(record, ["body", "content", "text", "note", "copy"]);
  const hashtags = normalizeHashtags(record.hashtags ?? record.tags ?? record.topics);

  if (!title || !coverText || !body || hashtags.length === 0) {
    return null;
  }

  return { label, title, coverText, body, hashtags };
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeHashtags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map(cleanTag)
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\s,，#]+/)
      .map(cleanTag)
      .filter(Boolean);
  }
  return [];
}

function cleanTag(tag: string): string {
  return tag.trim().replace(/^#+/, "");
}

function buildFallbackResponse(content: string, request: GenerateRequest): GenerateResponse {
  const cleanContent = stripCodeFence(content)
    .replace(/\r\n/g, "\n")
    .trim();
  const lines = cleanContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const titleFromModel = firstLineValue(lines, ["标题", "title", "headline"]);
  const coverFromModel = firstLineValue(lines, ["封面", "cover", "coverText", "hook"]);
  const bodyFromModel = cleanContent.length > 20 ? cleanContent : "";
  const tagsFromModel = extractHashtags(cleanContent);
  const hashtags = tagsFromModel.length ? tagsFromModel : fallbackHashtags(request);
  const sellingPoint = truncateText(request.sellingPoints, 26);
  const scenario = truncateText(request.scenario, 30);
  const audience = truncateText(request.targetAudience, 24);

  return {
    variants: [
      {
        label: "情绪种草版",
        title: titleFromModel || `${request.productName}，这次真的想推荐`,
        coverText: coverFromModel || sellingPoint,
        body: bodyFromModel || `最近在${scenario}时，我会优先想到${request.productName}。它最打动我的点是${request.sellingPoints}，对${audience}来说，使用门槛不高，也更容易坚持。${request.offer ? `现在还有${request.offer}，` : ""}如果你也在找一个省心的选择，可以把它放进清单里。`,
        hashtags
      },
      {
        label: "痛点转化版",
        title: `${scenario}总是不顺？可以看看${request.productName}`,
        coverText: "把麻烦变简单",
        body: `如果你是${audience}，大概率遇到过这样的情况：需要在${scenario}里快速做决定，但又不想反复试错。${request.productName}的核心优势是${request.sellingPoints}，更适合想要直接解决问题的人。${request.offer ? `搭配${request.offer}，入手压力也更低。` : "实际选择时，可以先从自己的高频场景开始判断。"} `,
        hashtags
      },
      {
        label: "干货测评版",
        title: `${request.productName}真实体验：这几个点值得看`,
        coverText: "真实测评清单",
        body: `我会从三个维度看${request.productName}：第一，是否匹配${scenario}；第二，卖点是不是足够具体，也就是${request.sellingPoints}；第三，是否适合${audience}长期使用。综合来看，它更像是一个轻量、直接、上手快的选择。${request.offer ? `如果正好赶上${request.offer}，可以优先比较一下。` : ""}`,
        hashtags
      }
    ]
  };
}

function firstLineValue(lines: string[], keys: string[]): string {
  for (const line of lines) {
    const match = line.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (keys.some((candidate) => key.includes(candidate.toLowerCase()))) {
      return truncateText(match[2], 36);
    }
  }
  return "";
}

function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\p{L}\p{N}_\u4e00-\u9fff-]+/gu) || [];
  return [...new Set(matches.map(cleanTag).filter(Boolean))].slice(0, 8);
}

function fallbackHashtags(request: GenerateRequest): string[] {
  return [
    request.productName,
    request.direction,
    request.tone,
    "小红书种草",
    "好物分享"
  ].map(cleanTag).filter(Boolean).slice(0, 5);
}

function truncateText(value: string, maxLength: number): string {
  const text = value.trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (typeof value !== "object" || value === null) return false;
  const variants = (value as { variants?: unknown }).variants;
  return Array.isArray(variants) &&
    variants.length === 3 &&
    variants.every((variant) => {
      const item = variant as Partial<CopyVariant>;
      return typeof item.label === "string" &&
        typeof item.title === "string" &&
        typeof item.coverText === "string" &&
        typeof item.body === "string" &&
        Array.isArray(item.hashtags) &&
        item.hashtags.every((tag) => typeof tag === "string");
    });
}
