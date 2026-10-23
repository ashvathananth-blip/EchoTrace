
import { tavily } from "@tavily/core";

export type ResearchSource = {
  title: string;
  url: string;
  content: string;
  score: number;
};

export type ResearchResult = {
  query: string;
  sources: ResearchSource[];
};

export async function researchClaim(
  claim: string
): Promise<ResearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const client = tavily({ apiKey });

  const response = await client.search(claim, {
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: false,
  });

  const sources = response.results
    .filter((result) => result.url && result.title)
    .map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content ?? "",
      score: result.score ?? 0,
    }));

  return {
    query: claim,
    sources,
  };
}
