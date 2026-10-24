import { NextResponse } from "next/server";
import { buildInvestigation, inferRelationships } from "@/lib/analyze";
import { investigateStatements } from "@/lib/groq-investigation";
import { researchClaim } from "@/lib/research";
import type {
  Engine,
  InvestigationEdgeCandidate,
  InvestigationRequest,
  InvestigationStatement,
  StatementOrigin,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 700;
const MAX_STATEMENTS = 8;
const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 20;

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: Request): boolean {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }

  entry.count += 1;
  return entry.count > WINDOW_LIMIT;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normaliseOrigin(raw: unknown): StatementOrigin | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const label = cleanText(record.label, 140);
  const rawUrl = cleanText(record.url, 400);
  const date = cleanText(record.date, 40);
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : "";

  if (!label && !url && !date) return undefined;

  return {
    label: label || url,
    ...(url ? { url } : {}),
    ...(date ? { date } : {}),
  };
}

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "Too many investigations in a minute. Take a breath and retry." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a JSON body.");
  }

  if (!body || typeof body !== "object") return badRequest("Expected a JSON object.");
  const input = body as Partial<InvestigationRequest>;
  const claim = cleanText(input.claim, MAX_TEXT);

  if (claim.length < 12) return badRequest("Write a full claim to investigate.");

  if (!Array.isArray(input.statements) || input.statements.length === 0) {
    return badRequest("Add at least one statement to compare with the claim.");
  }
  if (input.statements.length > MAX_STATEMENTS) {
    return badRequest(`At most ${MAX_STATEMENTS} statements can be investigated at once.`);
  }

  const statements: InvestigationStatement[] = [];

  for (const [index, raw] of input.statements.entries()) {
    if (!raw || typeof raw !== "object") {
      return badRequest("Each statement must be an object with text.");
    }
    const record = raw as { text?: unknown; origin?: unknown };
    const text = cleanText(record.text, MAX_TEXT);
    if (text.length < 6) {
      return badRequest(`Statement ${index + 1} is too short to analyse.`);
    }
    statements.push({
      id: `s${index + 1}`,
      text,
      origin: normaliseOrigin(record.origin),
    });
  }

  const base = {
    id: `investigation-${Date.now().toString(36)}`,
    claim,
    statements,
  };

  let candidates: InvestigationEdgeCandidate[];
  let engine: Engine = "heuristic";
  let message: string | undefined;
  let verdict: string | undefined;
  let claimSources: StatementOrigin[] = [];

  try {
    if (process.env.GROQ_API_KEY) {
      const result = await investigateStatements(claim, statements);
      if (!result) {
        return NextResponse.json(
          {
            error:
              "The analysis model is unavailable right now. No graph was generated and nothing was substituted. Try again in a moment.",
          },
          { status: 502 },
        );
      }
      candidates = result.edges;
      engine = "anthropic";
      verdict = result.summary || undefined;
      if (candidates.length === 0) {
        message =
          "The model found no defensible relationship between these statements, so they remain unlinked.";
      }
    } else {
      const provisional = buildInvestigation({ ...base, candidates: [], engine });
      candidates = inferRelationships(provisional.nodes);
      message =
        "Local analysis: no model key is configured. Connections are inferred from wording, not verified against sources.";
      if (candidates.length === 0) {
        message =
          "Local analysis found no defensible relationship between these statements, so they remain unlinked.";
      }
    }
  } catch (error) {
    console.error(
      `[echotrace] investigation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return NextResponse.json(
      { error: "The investigation could not be completed. No graph was generated." },
      { status: 502 },
    );
  }

  if (process.env.GROQ_API_KEY) {
    try {
      if (process.env.TAVILY_API_KEY) {
  try {
    const research = await researchClaim(claim);

    claimSources = research.sources.map((source) => ({
      label: source.title,
      url: source.url,
    }));

    if (claimSources.length === 0) {
      message = [
        message,
        "Web search found no sources to display for this claim.",
      ]
        .filter(Boolean)
        .join(" ");
    }
  } catch (error) {
    console.error(
      `[echotrace] source search failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );

    message = [
      message,
      "Source search is temporarily unavailable.",
    ]
      .filter(Boolean)
      .join(" ");
  }
}
    } catch (error) {
      console.error(
        `[echotrace] source search failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      message = [message, "Source search is temporarily unavailable."]
        .filter(Boolean)
        .join(" ");
    }
  }

  const chain = buildInvestigation({
    ...base,
    claimSources,
    candidates,
    engine,
    message,
    verdict,
  });

  return NextResponse.json({ chain });
}
