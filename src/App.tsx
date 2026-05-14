import { ChevronLeft, ChevronRight, Clipboard, LoaderCircle, PenLine, Sparkles, WandSparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type FormState = {
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  scenario: string;
  offer: string;
  direction: string;
  tone: string;
};

type CopyVariant = {
  label: string;
  title: string;
  coverText: string;
  body: string;
  hashtags: string[];
};

const initialForm: FormState = {
  productName: "",
  sellingPoints: "",
  targetAudience: "",
  scenario: "",
  offer: "",
  direction: "种草推荐",
  tone: "真诚"
};

const directions = ["种草推荐", "痛点转化", "测评推荐", "限时活动"];
const tones = ["真诚", "活泼", "专业", "强转化"];
const loadingSteps = ["正在提炼卖点", "正在生成标题", "正在组合标签"];
const previewVariant: CopyVariant = {
  label: "示例预览",
  title: "✨【绝美OOTD】小个子必备！夏日显瘦神裙",
  coverText: "一眼种草的封面短句会出现在这里",
  body: "填写左侧产品信息后，AI 会在这里生成 3 套完整小红书笔记。你可以对比标题、封面短句、正文和标签，再复制最适合发布的一版。",
  hashtags: ["OOTD", "穿搭分享", "爆款文案"]
};

export default function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<CopyVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [emojiLevel, setEmojiLevel] = useState(2);

  const loadingText = useMemo(() => loadingSteps[Math.floor(Date.now() / 1200) % loadingSteps.length], [isLoading]);
  const hasResults = variants.length > 0;
  const activeVariant = variants[activeVariantIndex];

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function validateForm() {
    if (!form.productName.trim() || !form.sellingPoints.trim() || !form.targetAudience.trim() || !form.scenario.trim()) {
      setError("请先填写产品名称、核心卖点、目标人群和使用场景。");
      return false;
    }
    setError("");
    return true;
  }

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setVariants([]);
    setActiveVariantIndex(0);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await readGenerateResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || "生成请求失败，请检查后端服务或稍后重试。");
      }
      if (!payload.variants?.length) {
        throw new Error("AI 没有返回可用文案，请稍后重试或调整模型配置。");
      }
      setVariants(payload.variants);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyVariant(variant: CopyVariant, index: number) {
    const text = [
      variant.title,
      "",
      variant.coverText,
      "",
      variant.body,
      "",
      variant.hashtags.map((tag) => `#${tag}`).join(" ")
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1600);
  }

  return (
    <main className="app-shell">
      <span className="float-shape shape-ribbon" aria-hidden="true" />
      <span className="float-shape shape-cube" aria-hidden="true" />
      <span className="float-shape shape-orbit" aria-hidden="true" />
      <span className="float-shape shape-star" aria-hidden="true" />

      <header className="top-bar">
        <div className="brand-lockup">
          <div className="brand-mark">小红书</div>
          <div>
            <strong>RED EXPLODE</strong>
            <span>小红书文案爆款神器</span>
          </div>
        </div>
      </header>

      <section className="intro-strip" aria-label="小红书文案生成器">
        <div>
          <p className="eyebrow">XHS COPY STUDIO</p>
          <h1>把产品信息变成能发布的小红书笔记</h1>
        </div>
        <p>输入卖点、场景和人群，选择语气与方向，一次生成 3 套可对比、可复制的爆款草稿。</p>
      </section>

      <section className="workspace" id="workspace">
        <section className="glass-card creator-panel" aria-labelledby="creator-title">
          <div className="panel-heading">
            <span className="heading-icon pink"><PenLine size={18} /></span>
            <div>
              <p>START</p>
              <h2 id="creator-title">开始创作爆款</h2>
            </div>
          </div>

          {error ? <div className="error-banner" role="alert">{error}</div> : null}

          <form className="form-grid" onSubmit={generate}>
            <label>
              产品/服务名称
              <input value={form.productName} onChange={(event) => updateField("productName", event.target.value)} placeholder="e.g. 夏日穿搭裙、小个子、显瘦" />
            </label>
            <label>
              核心卖点
              <textarea value={form.sellingPoints} onChange={(event) => updateField("sellingPoints", event.target.value)} placeholder="e.g. 高腰显腿长、面料不闷、通勤约会都能穿" />
            </label>
            <div className="field-row">
              <label>
                目标人群
                <input value={form.targetAudience} onChange={(event) => updateField("targetAudience", event.target.value)} placeholder="e.g. 小个子、梨形身材" />
              </label>
              <label>
                使用场景
                <input value={form.scenario} onChange={(event) => updateField("scenario", event.target.value)} placeholder="e.g. 夏日出游、通勤" />
              </label>
            </div>
            <label>
              价格/优惠
              <input value={form.offer} onChange={(event) => updateField("offer", event.target.value)} placeholder="可选，例如：限时 8 折、第二件半价" />
            </label>

            <div className="choice-block">
              <div className="choice-title">
                <span>文案类型</span>
                <small>{form.direction}</small>
              </div>
              <div className="choice-grid" aria-label="文案方向">
                {directions.map((direction) => (
                  <button className={form.direction === direction ? "selected" : ""} key={direction} type="button" onClick={() => updateField("direction", direction)}>
                    {direction}
                  </button>
                ))}
              </div>
            </div>

            <div className="choice-block">
              <div className="choice-title">
                <span>语气风格</span>
                <small>{form.tone}</small>
              </div>
              <div className="choice-grid tone-grid" aria-label="语气">
                {tones.map((tone) => (
                  <button className={form.tone === tone ? "selected" : ""} key={tone} type="button" onClick={() => updateField("tone", tone)}>
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <label className="slider-field">
              <span>表情符号数量 <strong>{emojiLevel}</strong></span>
              <input aria-label="表情符号数量" type="range" min="0" max="5" value={emojiLevel} onChange={(event) => setEmojiLevel(Number(event.target.value))} />
            </label>

            <button className="primary-button" type="submit" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="spin" size={18} /> : <WandSparkles size={18} />}
              {isLoading ? `${loadingText}...` : "一键生成爆款文案"}
            </button>
          </form>
        </section>

        <section className="glass-card result-panel" id="results" aria-labelledby="results-title">
          <div className="panel-heading">
            <span className="heading-icon navy"><Sparkles size={18} /></span>
            <div>
              <p>AI RESULT</p>
              <h2 id="results-title">AI创作结果</h2>
            </div>
          </div>

          {!hasResults && !isLoading ? <EmptyPreview /> : null}
          {isLoading ? <LoadingPreview loadingText={loadingText} /> : null}
          {hasResults && activeVariant ? (
            <div className="paged-results">
              <div className="pager-bar" aria-label="文案翻页">
                <button
                  className="pager-button"
                  disabled={activeVariantIndex === 0}
                  onClick={() => setActiveVariantIndex((current) => Math.max(0, current - 1))}
                  type="button"
                >
                  <ChevronLeft size={16} />
                  上一套
                </button>
                <span>{activeVariantIndex + 1} / {variants.length}</span>
                <button
                  className="pager-button"
                  disabled={activeVariantIndex === variants.length - 1}
                  onClick={() => setActiveVariantIndex((current) => Math.min(variants.length - 1, current + 1))}
                  type="button"
                >
                  下一套
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="variant-dots" aria-hidden="true">
                {variants.map((variant, index) => (
                  <span className={index === activeVariantIndex ? "active" : ""} key={`${variant.label}-${index}`} />
                ))}
              </div>
                <ResultCard
                copied={copiedIndex === activeVariantIndex}
                index={activeVariantIndex}
                key={`${activeVariant.label}-${activeVariant.title}`}
                onCopy={() => copyVariant(activeVariant, activeVariantIndex)}
                variant={activeVariant}
                />
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function EmptyPreview() {
  return (
    <div className="preview-card empty-preview">
      <div className="preview-label">{previewVariant.label}</div>
      <h3>{previewVariant.title}</h3>
      <div className="cover-text">{previewVariant.coverText}</div>
      <p>{previewVariant.body}</p>
      <div className="tags">
        {previewVariant.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
    </div>
  );
}

function LoadingPreview({ loadingText }: { loadingText: string }) {
  return (
    <div className="preview-card loading-preview" role="status">
      <LoaderCircle className="spin" size={28} />
      <h3>{loadingText}</h3>
      <p>正在把你的产品信息整理成标题、封面短句、正文和话题标签。</p>
    </div>
  );
}

function ResultCard({
  copied,
  index,
  onCopy,
  variant
}: {
  copied: boolean;
  index: number;
  onCopy: () => void;
  variant: CopyVariant;
}) {
  return (
    <article className={`preview-card result-card ${index === 0 ? "featured" : ""}`}>
      <div className="result-topline">
        <div className="preview-label">{variant.label}</div>
        {index === 0 ? <span className="hot-badge">主推</span> : null}
      </div>
      <h3>{variant.title}</h3>
      <div className="cover-text">{variant.coverText}</div>
      <p>{variant.body}</p>
      <div className="tags">
        {variant.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
      <button className="copy-button" type="button" onClick={onCopy}>
        <Clipboard size={16} />
        {copied ? "已复制" : "复制完整笔记"}
      </button>
    </article>
  );
}

async function readGenerateResponse(response: Response): Promise<{ variants?: CopyVariant[]; error?: string }> {
  const text = await response.text();
  if (!text.trim()) {
    return { error: "生成请求失败，请检查后端服务或稍后重试。" };
  }

  try {
    return JSON.parse(text) as { variants?: CopyVariant[]; error?: string };
  } catch {
    return { error: "生成请求失败，请检查后端服务或稍后重试。" };
  }
}
