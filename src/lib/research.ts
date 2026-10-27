
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

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are",
  "was", "were", "of", "to", "in", "on", "at",
  "for", "from", "with", "by", "that", "this",
  "found", "study", "studies", "research", "shows",
]);

function keywords(text: string): string[] {
  return [...new Set(
    (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  )];
}

function relevanceScore(claim: string, source: ResearchSource): number {
  const terms = keywords(claim);
  if (terms.length === 0) return 0;

  const titleWords = new Set(keywords(source.title));
  const contentWords = new Set(keywords(source.content));

  let matched = 0;
  let score = 0;

  for (const term of terms) {
    const inTitle = titleWords.has(term);
    const inContent = contentWords.has(term);

    if (inTitle || inContent) matched++;
    if (inTitle) score += 3;
    if (inContent) score += 1;
  }

  if (matched / terms.length < 0.5) return 0;

  return score + source.score;
}

export async function researchClaim(
  claim: string
): Promise<ResearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const client = tavily({ apiKey });

  const searchQuery = keywords(claim).join(" ") || claim;

  const response = await client.search(searchQuery, {
    searchDepth: "advanced",
    maxResults: 10,
    includeAnswer: false,
  });

  const sources = response.results
  .filter((result) => result.url && result.title)
  .map((result) => ({
    title: result.title,
    url: result.url,
    content: result.content ?? "",
    score: result.score ?? 0,
  }))
  .map((source) => ({
    source,
    relevance: relevanceScore(claim, source),
  }))
  .filter((item) => item.relevance > 0)
  .sort((a, b) => b.relevance - a.relevance)
  .slice(0, 5)
  .map((item) => item.source);
  return {
    query: searchQuery,
    sources,
  };
}
