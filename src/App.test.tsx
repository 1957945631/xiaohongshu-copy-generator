import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const fetchMock = vi.fn<typeof fetch>();

afterEach(() => {
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

function installFetch() {
  vi.stubGlobal("fetch", fetchMock);
}

describe("App", () => {
  it("keeps the top bar focused on branding in single-page mode", () => {
    render(<App />);

    expect(screen.getByText("RED EXPLODE")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "主导航" })).not.toBeInTheDocument();
    expect(screen.queryByText("首页")).not.toBeInTheDocument();
    expect(screen.queryByText("模板")).not.toBeInTheDocument();
    expect(screen.queryByText("发现")).not.toBeInTheDocument();
    expect(screen.queryByText("价格")).not.toBeInTheDocument();
    expect(screen.queryByText("我的")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("用户头像")).not.toBeInTheDocument();
  });

  it("requires product fields before generating copy", async () => {
    installFetch();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "一键生成爆款文案" }));

    expect(screen.getByText("请先填写产品名称、核心卖点、目标人群和使用场景。")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "开始创作爆款" })).toBeInTheDocument();
  });

  it("generates from the single-page workspace and pages through three variants", async () => {
    installFetch();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          variants: [
            {
              label: "情绪种草版",
              title: "早八人真的需要这一杯",
              coverText: "低糖也好喝",
              body: "通勤路上来一瓶，清爽不腻。",
              hashtags: ["低糖咖啡", "通勤早餐"]
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
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });
    render(<App />);

    await user.type(screen.getByLabelText("产品/服务名称"), "低糖燕麦拿铁");
    await user.type(screen.getByLabelText("核心卖点"), "低糖、冷萃、即饮");
    await user.type(screen.getByLabelText("目标人群"), "通勤上班族");
    await user.type(screen.getByLabelText("使用场景"), "早八赶地铁");
    await user.click(screen.getByRole("button", { name: "一键生成爆款文案" }));

    expect(await screen.findByText("情绪种草版")).toBeInTheDocument();

    expect(screen.getByText("早八人真的需要这一杯")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.queryByText("痛点转化版")).not.toBeInTheDocument();
    expect(screen.queryByText("干货测评版")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一套" }));
    expect(screen.getByText("痛点转化版")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.queryByText("情绪种草版")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "上一套" }));
    expect(screen.getByText("情绪种草版")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "复制完整笔记" }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("早八人真的需要这一杯"));
    });
    expect(await screen.findByRole("button", { name: "已复制" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows API configuration errors from the backend", async () => {
    installFetch();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "缺少 AI_BASE_URL、AI_API_KEY 或 AI_MODEL" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    );

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("产品/服务名称"), "低糖燕麦拿铁");
    await user.type(screen.getByLabelText("核心卖点"), "低糖、冷萃、即饮");
    await user.type(screen.getByLabelText("目标人群"), "通勤上班族");
    await user.type(screen.getByLabelText("使用场景"), "早八赶地铁");
    await user.click(screen.getByRole("button", { name: "一键生成爆款文案" }));

    expect(await screen.findByText("缺少 AI_BASE_URL、AI_API_KEY 或 AI_MODEL")).toBeInTheDocument();
  });

  it("shows a friendly error when the backend returns no variants", async () => {
    installFetch();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ variants: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("产品/服务名称"), "低糖燕麦拿铁");
    await user.type(screen.getByLabelText("核心卖点"), "低糖、冷萃、即饮");
    await user.type(screen.getByLabelText("目标人群"), "通勤上班族");
    await user.type(screen.getByLabelText("使用场景"), "早八赶地铁");
    await user.click(screen.getByRole("button", { name: "一键生成爆款文案" }));

    expect(await screen.findByText("AI 没有返回可用文案，请稍后重试或调整模型配置。")).toBeInTheDocument();
  });

  it("shows a friendly error when the backend response is not JSON", async () => {
    installFetch();
    fetchMock.mockResolvedValue(
      new Response("", {
        status: 502,
        headers: { "Content-Type": "text/html" }
      })
    );

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("产品/服务名称"), "低糖燕麦拿铁");
    await user.type(screen.getByLabelText("核心卖点"), "低糖、冷萃、即饮");
    await user.type(screen.getByLabelText("目标人群"), "通勤上班族");
    await user.type(screen.getByLabelText("使用场景"), "早八赶地铁");
    await user.click(screen.getByRole("button", { name: "一键生成爆款文案" }));

    expect(await screen.findByText("生成请求失败，请检查后端服务或稍后重试。")).toBeInTheDocument();
  });
});
