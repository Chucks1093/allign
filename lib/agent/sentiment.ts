import { STOCKS } from "@/lib/stocks/tokens";
import { log } from "./logger";

export interface SentimentSignal {
  ticker: string;
  score: number;
  summary?: string;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function threeDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().split("T")[0];
}

async function fetchArticles(ticker: string, apiKey: string): Promise<{ headline: string; summary: string }[]> {
  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${threeDaysAgo()}&to=${today()}&token=${apiKey}`
  );
  if (!res.ok) return [];
  const articles = await res.json() as { headline: string; summary?: string }[];
  return articles.slice(0, 4).map((a) => ({
    headline: a.headline ?? "",
    summary: (a.summary ?? "").slice(0, 300),
  }));
}

export async function scoreSentiment(): Promise<SentimentSignal[]> {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!finnhubKey || !openaiKey) {
    log("[sentiment] missing API keys — returning neutral 0.5 for all");
    return STOCKS.map((s) => ({ ticker: s.ticker, score: 0.5 }));
  }

  // Fetch articles for all stocks in parallel
  const articleResults = await Promise.allSettled(
    STOCKS.map((s) => fetchArticles(s.ticker, finnhubKey))
  );

  const articleMap: Record<string, { headline: string; summary: string }[]> = {};
  STOCKS.forEach((s, i) => {
    const r = articleResults[i];
    articleMap[s.ticker] = r.status === "fulfilled" ? r.value : [];
    log(`[sentiment] ${s.ticker}: ${articleMap[s.ticker].length} articles fetched`);
  });

  // Build prompt with headline + summary for each stock
  const stocksText = STOCKS.map((s) => {
    const articles = articleMap[s.ticker];
    if (!articles.length) return `${s.ticker} (${s.name}):\n- No recent news`;
    const text = articles.map((a) => `- ${a.headline}\n  ${a.summary}`).join("\n");
    return `${s.ticker} (${s.name}):\n${text}`;
  }).join("\n\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a financial sentiment analyst. Score each stock based only on the provided article headlines and summaries. Return ONLY a JSON array, no other text.",
          },
          {
            role: "user",
            content: `Score sentiment for each stock from these recent news articles (headline + summary):\n\n${stocksText}\n\nReturn:\n[\n  { "ticker": "AAPL", "score": 0.75, "summary": "reason in max 8 words" },\n  ...\n]\n\nscore: 0.0 (very negative) to 1.0 (very positive), 0.5 = neutral/no relevant news.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON in GPT response");

    const parsed = JSON.parse(jsonMatch[0]) as { ticker: string; score: number; summary?: string }[];
    const resultMap = new Map(parsed.map((r) => [r.ticker, r]));

    const final = STOCKS.map((s) => {
      const r = resultMap.get(s.ticker);
      const score = Math.min(1, Math.max(0, Number(r?.score ?? 0.5)));
      log(`[sentiment] ${s.ticker}: score=${score.toFixed(3)} — ${r?.summary ?? "no summary"}`);
      return { ticker: s.ticker, score, summary: r?.summary };
    });

    return final;
  } catch (e: any) {
    log("[sentiment] GPT call failed:", e?.message, "— returning neutral 0.5");
    return STOCKS.map((s) => ({ ticker: s.ticker, score: 0.5 }));
  }
}
