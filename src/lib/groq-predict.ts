import type { StatementOrigin } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 30_000;

interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
}

interface ExecutedTool {
  type?: string;
  browser_results?: SearchResult[];
  search_results?: { results?: SearchResult[] };
}

interface GroqResponse {
  choices?: { message?: { executed_tools?: ExecutedTool[] } }[];
  error?: { message?: string };
}

function safeOrigin(result: SearchResult): StatementOrigin | null {
  const url = typeof result.url === "string" ? result.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return null;
    return {
      label: typeof result.title === "string" && result.title.trim()
        ? result.title.trim().slice(0, 140)
        : parsed.hostname,
      url: parsed.toString(),
    };
  } catch {
    return null;
  }
}

export async function findClaimSources(claim: string): Promise<StatementOrigin[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_completion_tokens: 1400,
        citation_options: "enabled",
        tool_choice: "required",
        tools: [{ type: "browser_search" }],
        messages: [
          {
            role: "system",
            content:
              "Search for credible sources that directly support or discuss the user's claim. Prefer primary research, official records, and established reporting. Do not invent titles, URLs, authors, dates, or sources.",
          },
          { role: "user", content: `Find sources for this claim: ${claim}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Groq source search failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const result = (await response.json()) as GroqResponse;
    const message = result.choices?.[0]?.message;
    const seen = new Set<string>();
    const sources: StatementOrigin[] = [];

    for (const tool of message?.executed_tools ?? []) {
      const results = [
        ...(tool.search_results?.results ?? []),
        ...(tool.browser_results ?? []),
      ];
      for (const item of results) {
        const source = safeOrigin(item);
        if (!source || seen.has(source.url!)) continue;
        seen.add(source.url!);
        sources.push(source);
        if (sources.length === 6) return sources;
      }
    }

    return sources;
  } finally {
    clearTimeout(timeout);
  }
}
