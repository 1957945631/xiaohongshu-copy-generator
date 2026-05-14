import { describe, expect, it, vi } from "vitest";
import {
  buildPrompt,
  generateCopy,
  parseModelContent,
  validateGenerateRequest
} from "./generate";

const validRequest = {
  productName: "低糖燕麦拿铁",
  sellingPoints: "低糖、冷萃咖啡、即饮",
  targetAudience: "通勤上班族",
  scenario: "早八赶地铁时快速补能",
  offer: "第二件半价",
  direction: "种草推荐",
  tone: "真诚"
};

describe("validateGenerateRequest", () => {
  it("returns required field errors for missing product information", () => {
    const result = validateGenerateRequest({
      productName: "",
      sellingPoints: "",
      targetAudience: "",
      scenario: "",
      direction: "种草推荐",
      tone: "真诚"
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "产品/服务名称不能为空",
      "核心卖点不能为空",
      "目标人群不能为空",
      "使用场景不能为空"
    ]);
  });

  it("normalizes a valid request", () => {
    const result = validateGenerateRequest(validRequest);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected valid request");
    expect(result.value.productName).toBe("低糖燕麦拿铁");
  });
});

describe("parseModelContent", () => {
  it("parses three generated copy variants from strict JSON", () => {
    const parsed = parseModelContent(
      JSON.stringify({
        variants: [
          {
            label: "情绪种草版",
            title: "早八人真的需要这一杯",
            coverText: "低糖也好喝",
            body: "通勤路上来一瓶，清爽不腻。",
            hashtags: ["低糖咖啡", "上班族早餐"]
          },
          {
            label: "痛点转化版",
            title: "别再空腹硬扛早高峰",
            coverText: "3秒开喝",
            body: "冷萃香气够，燕麦口感顺。",
            hashtags: ["即饮咖啡", "通勤好物"]
          },
          {
            label: "干货测评版",
            title: "我替你测了低糖拿铁",
            coverText: "真实测评",
            body: "甜度低，咖啡味明显。",
            hashtags: ["咖啡测评", "低糖饮品"]
          }
        ]
      })
    );

    expect(parsed.variants).toHaveLength(3);
    expect(parsed.variants[0].hashtags).toEqual(["低糖咖啡", "上班族早餐"]);
  });

  it("rejects non-JSON model output", () => {
    expect(() => parseModelContent("这里是普通文本")).toThrow("模型返回格式无法解析");
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    const parsed = parseModelContent(`\`\`\`json
{
  "variants": [
    {
      "label": "情绪种草版",
      "title": "写笔记前的救星",
      "coverText": "内容运营人必备",
      "body": "打开就有灵感。",
      "hashtags": ["内容运营"]
    },
    {
      "label": "痛点转化版",
      "title": "写笔记没灵感怎么办",
      "coverText": "省时间",
      "body": "先找切入点，再动笔。",
      "hashtags": ["小红书运营"]
    },
    {
      "label": "干货测评版",
      "title": "运营工具真实测评",
      "coverText": "实测好用",
      "body": "轻量、好用、省时间。",
      "hashtags": ["效率工具"]
    }
  ]
}
\`\`\``);

    expect(parsed.variants[0].title).toBe("写笔记前的救星");
  });

  it("parses JSON when the model adds text around the object", () => {
    const parsed = parseModelContent(`好的，下面是 JSON：
{
  "variants": [
    {
      "label": "情绪种草版",
      "title": "写笔记前的救星",
      "coverText": "内容运营人必备",
      "body": "打开就有灵感。",
      "hashtags": ["内容运营"]
    },
    {
      "label": "痛点转化版",
      "title": "写笔记没灵感怎么办",
      "coverText": "省时间",
      "body": "先找切入点，再动笔。",
      "hashtags": ["小红书运营"]
    },
    {
      "label": "干货测评版",
      "title": "运营工具真实测评",
      "coverText": "实测好用",
      "body": "轻量、好用、省时间。",
      "hashtags": ["效率工具"]
    }
  ]
}
以上可直接发布。`);

    expect(parsed.variants[2].label).toBe("干货测评版");
  });

  it("parses a top-level array when the model adds text around it", () => {
    const parsed = parseModelContent(`下面是三套文案：
[
  {
    "label": "情绪种草版",
    "title": "写笔记前的救星",
    "coverText": "内容运营人必备",
    "body": "打开就有灵感。",
    "hashtags": ["内容运营"]
  },
  {
    "label": "痛点转化版",
    "title": "写笔记没灵感怎么办",
    "coverText": "省时间",
    "body": "先找切入点，再动笔。",
    "hashtags": ["小红书运营"]
  },
  {
    "label": "干货测评版",
    "title": "运营工具真实测评",
    "coverText": "实测好用",
    "body": "轻量、好用、省时间。",
    "hashtags": ["效率工具"]
  }
]
以上可直接发布。`);

    expect(parsed.variants[0].label).toBe("情绪种草版");
  });

  it("parses a JSON string that contains the JSON object", () => {
    const parsed = parseModelContent(JSON.stringify(JSON.stringify({
      variants: [
        {
          label: "情绪种草版",
          title: "写笔记前的救星",
          coverText: "内容运营人必备",
          body: "打开就有灵感。",
          hashtags: ["内容运营"]
        },
        {
          label: "痛点转化版",
          title: "写笔记没灵感怎么办",
          coverText: "省时间",
          body: "先找切入点，再动笔。",
          hashtags: ["小红书运营"]
        },
        {
          label: "干货测评版",
          title: "运营工具真实测评",
          coverText: "实测好用",
          body: "轻量、好用、省时间。",
          hashtags: ["效率工具"]
        }
      ]
    })));

    expect(parsed.variants[1].title).toBe("写笔记没灵感怎么办");
  });

  it("normalizes common model field aliases and hashtag strings", () => {
    const parsed = parseModelContent(JSON.stringify({
      results: [
        {
          type: "情绪种草版",
          headline: "写笔记前的救星",
          cover: "内容运营人必备",
          content: "打开就有灵感。",
          tags: "#内容运营 #效率工具"
        },
        {
          type: "痛点转化版",
          headline: "写笔记没灵感怎么办",
          cover: "省时间",
          content: "先找切入点，再动笔。",
          tags: "小红书运营, 运营工具"
        },
        {
          type: "干货测评版",
          headline: "运营工具真实测评",
          cover: "实测好用",
          content: "轻量、好用、省时间。",
          tags: ["效率工具"]
        }
      ]
    }));

    expect(parsed.variants[0]).toEqual({
      label: "情绪种草版",
      title: "写笔记前的救星",
      coverText: "内容运营人必备",
      body: "打开就有灵感。",
      hashtags: ["内容运营", "效率工具"]
    });
  });
});

describe("buildPrompt", () => {
  it("asks for three Xiaohongshu variants and strict JSON", () => {
    const prompt = buildPrompt(validRequest);

    expect(prompt).toContain("小红书");
    expect(prompt).toContain("严格返回 JSON");
    expect(prompt).toContain("3 套");
    expect(prompt).toContain("低糖燕麦拿铁");
  });
});

describe("generateCopy", () => {
  it("returns a configuration error when AI environment is missing", async () => {
    const result = await generateCopy(validRequest, {}, fetch);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected configuration error");
    expect(result.status).toBe(503);
    expect(result.error).toContain("AI_BASE_URL");
  });

  it("sends an OpenAI-compatible chat completion request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  variants: [
                    {
                      label: "情绪种草版",
                      title: "早八人真的需要这一杯",
                      coverText: "低糖也好喝",
                      body: "通勤路上来一瓶，清爽不腻。",
                      hashtags: ["低糖咖啡"]
                    },
                    {
                      label: "痛点转化版",
                      title: "别再空腹硬扛早高峰",
                      coverText: "3秒开喝",
                      body: "冷萃香气够，燕麦口感顺。",
                      hashtags: ["即饮咖啡"]
                    },
                    {
                      label: "干货测评版",
                      title: "我替你测了低糖拿铁",
                      coverText: "真实测评",
                      body: "甜度低，咖啡味明显。",
                      hashtags: ["咖啡测评"]
                    }
                  ]
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated copy");
    expect(result.data.variants).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret"
        })
      })
    );
  });

  it("parses OpenAI-compatible content block arrays from Claude-style gateways", async () => {
    const content = JSON.stringify({
      variants: [
        {
          label: "情绪种草版",
          title: "早八人真的需要这一杯",
          coverText: "低糖也好喝",
          body: "通勤路上来一瓶，清爽不腻。",
          hashtags: ["低糖咖啡"]
        },
        {
          label: "痛点转化版",
          title: "别再空腹硬扛早高峰",
          coverText: "3秒开喝",
          body: "冷萃香气够，燕麦口感顺。",
          hashtags: ["即饮咖啡"]
        },
        {
          label: "干货测评版",
          title: "我替你测了低糖拿铁",
          coverText: "真实测评",
          body: "甜度低，咖啡味明显。",
          hashtags: ["咖啡测评"]
        }
      ]
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: [
                  { type: "text", text: content }
                ]
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated copy");
    expect(result.data.variants[0].title).toBe("早八人真的需要这一杯");
  });

  it("parses mixed string and text content parts from compatible gateways", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: [
                  "下面是 JSON：",
                  {
                    type: "text",
                    text: JSON.stringify({
                      variants: [
                        {
                          label: "情绪种草版",
                          title: "早八人真的需要这一杯",
                          coverText: "低糖也好喝",
                          body: "通勤路上来一瓶，清爽不腻。",
                          hashtags: ["低糖咖啡"]
                        }
                      ]
                    })
                  }
                ]
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated copy");
    expect(result.data.variants[0].hashtags).toEqual(["低糖咖啡"]);
  });

  it("parses object-shaped text content from compatible gateways", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: {
                  type: "text",
                  text: JSON.stringify({
                    variants: [
                      {
                        label: "情绪种草版",
                        title: "早八人真的需要这一杯",
                        coverText: "低糖也好喝",
                        body: "通勤路上来一瓶，清爽不腻。",
                        hashtags: ["低糖咖啡"]
                      }
                    ]
                  })
                }
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated copy");
    expect(result.data.variants[0].coverText).toBe("低糖也好喝");
  });

  it("repairs non-JSON model output with a second strict JSON request", async () => {
    const repairedContent = JSON.stringify({
      variants: [
        {
          label: "情绪种草版",
          title: "早八人真的需要这一杯",
          coverText: "低糖也好喝",
          body: "通勤路上来一瓶，清爽不腻。",
          hashtags: ["低糖咖啡"]
        },
        {
          label: "痛点转化版",
          title: "别再空腹硬扛早高峰",
          coverText: "3秒开喝",
          body: "冷萃香气够，燕麦口感顺。",
          hashtags: ["即饮咖啡"]
        },
        {
          label: "干货测评版",
          title: "我替你测了低糖拿铁",
          coverText: "真实测评",
          body: "甜度低，咖啡味明显。",
          hashtags: ["咖啡测评"]
        }
      ]
    });
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "情绪种草版：早八人真的需要这一杯\n封面：低糖也好喝\n正文：通勤路上来一瓶，清爽不腻。\n标签：低糖咖啡"
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: repairedContent
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated copy");
    expect(result.data.variants[0].title).toBe("早八人真的需要这一杯");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toContain("请把下面的模型输出修复为严格 JSON");
  });

  it("falls back to three usable variants when model output and repair output are both non-JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "标题：通勤党会喜欢的低糖燕麦拿铁\n封面：低糖也好喝\n正文：冷萃咖啡香气明显，早八路上很方便。\n标签：#低糖咖啡 #通勤早餐"
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "还是没有按 JSON 输出，但保留了低糖咖啡和通勤早餐这些信息。"
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected fallback copy");
    expect(result.data.variants).toHaveLength(3);
    expect(result.data.variants[0].title).toBe("通勤党会喜欢的低糖燕麦拿铁");
    expect(result.data.variants[0].coverText).toBe("低糖也好喝");
    expect(result.data.variants[0].hashtags).toEqual(["低糖咖啡", "通勤早餐"]);
  });

  it("falls back to local variants when the repair request fails after usable model text", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "情绪种草版：早八通勤时，这杯低糖燕麦拿铁确实方便。"
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "rate limited" } }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        )
      );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected fallback copy");
    expect(result.data.variants).toHaveLength(3);
    expect(result.data.variants[1].label).toBe("痛点转化版");
  });

  it("parses JSON from tool call function arguments when content is empty", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
                        variants: [
                          {
                            label: "情绪种草版",
                            title: "早八人真的需要这一杯",
                            coverText: "低糖也好喝",
                            body: "通勤路上来一瓶，清爽不腻。",
                            hashtags: ["低糖咖啡"]
                          }
                        ]
                      })
                    }
                  }
                ]
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateCopy(
      validRequest,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated copy");
    expect(result.data.variants[0].title).toBe("早八人真的需要这一杯");
  });
});
