import { STOCKS } from "@/lib/stocks/tokens";

// Uses OpenAI (already configured) to score news sentiment per stock
// Falls back to neutral (0.5) if API unavailable or no key

function clamp(x: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, x));
}

export interface SentimentSignal {
  ticker: string;
  score: number;     // 0-1 (0=very negative, 0.5=neutral, 1=very positive)
  summary?: string;  // brief reason
}

export async function scoreSentiment(): Promise<SentimentSignal[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return STOCKS.map((s) => ({ ticker: s.ticker, score: 0.5 }));
  }

  const results: SentimentSignal[] = [];

  // Batch all stocks into one prompt to save API calls
  const stockList = STOCKS.map((s) => `${s.ticker} (${s.name})`).join(", ");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a financial sentiment analyzer. Given a list of stocks, rate the current market sentiment for each based on your knowledge of recent news, earnings, and market conditions. Return ONLY a JSON array — no other text.`,
          },
          {
            role: "user",
            content: `Rate sentiment for these tokenized US stocks: ${stockList}

Return a JSON array with this exact format:
[
  { "ticker": "NVDA", "score": 0.75, "summary": "Strong AI demand, recent earnings beat" },
  ...
]

score is 0.0 (very negative) to 1.0 (very positive), 0.5 is neutral.
Include all stocks. Be concise in summary (max 10 words).`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as { ticker: string; score: number; summary?: string }[];

    for (const item of parsed) {
      results.push({
        ticker: item.ticker,
        score: clamp(Number(item.score) || 0.5),
        summary: item.summary,
      });
    }

    // Fill in any missing stocks with neutral
    for (const stock of STOCKS) {
      if (!results.find((r) => r.ticker === stock.ticker)) {
        results.push({ ticker: stock.ticker, score: 0.5 });
      }
    }

    return results;
  } catch {
    // Fallback: all neutral
    return STOCKS.map((s) => ({ ticker: s.ticker, score: 0.5 }));
  }
}
