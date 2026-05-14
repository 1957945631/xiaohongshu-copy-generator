import { describe, expect, it, vi } from "vitest";
import handler from "./generate";

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  status: (statusCode: number) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  json: (body: unknown) => MockResponse;
  end: () => MockResponse;
};

function createResponse(): MockResponse {
  const response: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    }
  };
  return response;
}

describe("Vercel generate API", () => {
  it("rejects non-POST requests", async () => {
    const response = createResponse();

    await handler({ method: "GET", body: undefined }, response);

    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe("POST");
    expect(response.body).toEqual({ error: "Method not allowed" });
  });

  it("passes JSON request bodies to the copy generator", async () => {
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
                      body: "冷萃香气足，燕麦口感顺。",
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
    vi.stubGlobal("fetch", fetchMock);
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: {
          productName: "低糖燕麦拿铁",
          sellingPoints: "低糖、冷萃咖啡、即饮",
          targetAudience: "通勤上班族",
          scenario: "早八赶地铁",
          direction: "种草推荐",
          tone: "真诚"
        }
      },
      response,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      }
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      variants: expect.arrayContaining([
        expect.objectContaining({ title: "早八人真的需要这一杯" })
      ])
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret" })
      })
    );
  });

  it("parses stringified JSON bodies from serverless requests", async () => {
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: JSON.stringify({
          productName: "",
          sellingPoints: "",
          targetAudience: "",
          scenario: "",
          direction: "种草推荐",
          tone: "真诚"
        })
      },
      response,
      {
        AI_BASE_URL: "https://api.example.com/v1",
        AI_API_KEY: "secret",
        AI_MODEL: "copy-model"
      }
    );

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: expect.stringContaining("产品/服务名称不能为空")
    });
  });
});
