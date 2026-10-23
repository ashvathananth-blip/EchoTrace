import { NextResponse } from "next/server";
import { generateGroqPredictions } from "@/lib/groq-predict";
import { researchClaim } from "@/lib/research";
import {
  PREDICTION_MAX_BRANCHES,
  PREDICTION_MAX_DEPTH,
  PREDICTION_MIN_BRANCHES,
  PREDICTION_MIN_DEPTH,
  buildPrediction,
  localPrediction,
} from "@/lib/predict";
import type { Engine, PredictionRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 500;
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

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "Too many predictions in a minute. Take a breath and retry." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  }

  const input = body as Partial<PredictionRequest>;
  const claim =
    typeof input.claim === "string"
      ? input.claim.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT)
      : "";

  if (claim.length < 12) {
    return NextResponse.json(
      { error: "Write a full claim to predict its evolution." },
      { status: 400 },
    );
  }

  const depth = clamp(
    input.depth,
    PREDICTION_MIN_DEPTH,
    PREDICTION_MAX_DEPTH,
    PREDICTION_MAX_DEPTH,
  );
  const branches = clamp(
    input.branches,
    PREDICTION_MIN_BRANCHES,
    PREDICTION_MAX_BRANCHES,
    3,
  );

  const base = {
    id: `prediction-${Date.now().toString(36)}`,
    claim,
  };


  if (process.env.GROQ_API_KEY) {
    try {
      let sources: Awaited<ReturnType<typeof researchClaim>>["sources"] = [];

      if (process.env.TAVILY_API_KEY) {
        try {
          const research = await researchClaim(claim);
          sources = research.sources;
        } catch (error) {
          console.error("Tavily research failed:", error);
        }
      }

      const evidence = sources
        .slice(0, 5)
        .map(
          (source, index) =>
            `[${index + 1}] ${source.title}\nURL: ${source.url}\nExcerpt: ${source.content.slice(0, 1500)}`,
        )
        .join("\n\n");

      const drafts = await generateGroqPredictions(
        claim,
        depth,
        branches,
        evidence,
      );

      const chain = buildPrediction({
        ...base,
        drafts,
        engine: "groq",
        verdict: `Hypothetical evolution predicted by Groq across up to ${depth} generations.`,
      });

      return NextResponse.json({
        chain,
        research: {
          sources,
          status: sources.length > 0 ? "retrieved" : "unavailable",
        },
      });
    } catch (error) {
      console.error("Groq prediction failed:", error);

      return NextResponse.json(
        { error: "Groq prediction failed. No substitute graph was generated." },
        { status: 502 },
      );
    }
  }


  const engine: Engine = "heuristic";
  const drafts = localPrediction(claim, depth, branches);
  const chain = buildPrediction({
    ...base,
    drafts,
    engine,
    message:
      "Local prediction: no model key is configured, so these mutations come from a rule-based simulator, not the AI. Treat them as illustrative.",
    verdict: `Illustrative local forecast across up to ${depth} generations.`,
  });

    return NextResponse.json({
    chain,
    research: {
      sources: [],
      status: "unavailable",
    },
  });
}

