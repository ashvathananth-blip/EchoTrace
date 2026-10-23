import type {
  Chain,
  Confidence,
  InvestigationEdge,
  Mutation,
  RelationshipType,
  StatementOrigin,
} from "./types";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

interface EncodedMutation {
  k: Mutation["kind"];
  s: number;
  l: string;
  d: string;
  r: string[];
  a: string[];
  dir?: "up" | "down" | "shift" | null;
  n?: string;
}

interface EncodedEdge {
  i: string;
  s: string;
  t: string;
  r: RelationshipType;
  c: Confidence;
  v: string;
  m: EncodedMutation[];
}

interface EncodedNode {
  i: string;
  p: string | null;
  x: string;
  s: Chain["nodes"][number]["source"];
  src?: StatementOrigin;
  m: EncodedMutation[];
}

interface EncodedChain {
  t?: string;
  o?: string;
  v?: string;
  e?: Chain["engine"];
  n?: EncodedNode[];
  g?: EncodedEdge[];
}

function encodeMutation(mutation: Mutation): EncodedMutation {
  return {
    k: mutation.kind,
    s: mutation.severity,
    l: mutation.label,
    d: mutation.explanation,
    r: mutation.evidence.removed,
    a: mutation.evidence.added,
    dir: mutation.direction ?? null,
    n: mutation.evidence.note,
  };
}

function decodeMutation(raw: EncodedMutation): Mutation {
  return {
    kind: raw.k,
    severity: Math.max(0, Math.min(100, Number(raw.s) || 0)),
    label: String(raw.l ?? "Change"),
    explanation: String(raw.d ?? ""),
    direction: raw.dir ?? undefined,
    evidence: {
      removed: Array.isArray(raw.r) ? raw.r.map(String) : [],
      added: Array.isArray(raw.a) ? raw.a.map(String) : [],
      note: raw.n ? String(raw.n) : undefined,
    },
  };
}

function relationship(value: unknown): RelationshipType {
  if (value === "documented" || value === "insufficient") return value;
  return "inferred";
}

function confidence(value: unknown): Confidence {
  if (value === "high" || value === "low") return value;
  return "medium";
}

export function encodeChain(chain: Chain): string {
  const payload = {
    t: chain.title,
    o: chain.original,
    v: chain.verdict,
    e: chain.engine,
    n: chain.nodes.map((node) => ({
      i: node.id,
      p: node.parentId,
      x: node.text,
      s: node.source,
      src: node.origin,
      m: node.mutations.map(encodeMutation),
    })),
    g: (chain.edges ?? []).map((edge) => ({
      i: edge.id,
      s: edge.sourceId,
      t: edge.targetId,
      r: edge.relationship,
      c: edge.confidence,
      v: edge.verificationNote,
      m: edge.mutations.map(encodeMutation),
    })),
  };

  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeChain(payload: string): Chain | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(payload));
    const data = JSON.parse(json) as EncodedChain;
    if (!data || !Array.isArray(data.n) || data.n.length === 0) return null;

    const nodes = data.n
      .filter((node) => typeof node.x === "string" && typeof node.i === "string")
      .map((node) => ({
        id: node.i,
        parentId: node.p ?? null,
        text: node.x,
        source: node.s ?? "curated",
        origin: node.src,
        mutations: (node.m ?? []).map(decodeMutation),
      }));

    if (nodes.length === 0) return null;

    const edges: InvestigationEdge[] = Array.isArray(data.g)
      ? data.g
          .filter(
            (edge) =>
              edge &&
              typeof edge.i === "string" &&
              typeof edge.s === "string" &&
              typeof edge.t === "string",
          )
          .map((edge) => ({
            id: edge.i,
            sourceId: edge.s,
            targetId: edge.t,
            relationship: relationship(edge.r),
            confidence: confidence(edge.c),
            verificationNote: String(edge.v ?? ""),
            mutations: (edge.m ?? []).map(decodeMutation),
          }))
      : nodes
          .filter((node) => node.parentId)
          .map((node, index) => ({
            id: `edge-${index + 1}`,
            sourceId: node.parentId as string,
            targetId: node.id,
            relationship: "inferred" as const,
            confidence: "low" as const,
            verificationNote:
              "Imported without verification data. The relationship is not confirmed by a source.",
            mutations: node.mutations,
          }));

    const ids = new Set(nodes.map((node) => node.id));
    const validEdges = edges.filter(
      (edge) => ids.has(edge.sourceId) && ids.has(edge.targetId),
    );

    return {
      id: "shared",
      title: data.t ?? "Shared investigation",
      original: data.o ?? nodes[0].text,
      nodes,
      edges: validEdges,
      verdict: data.v ?? "",
      engine: data.e ?? "curated",
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(chain: Chain): string {
  const encoded = encodeChain(chain);
  if (typeof window === "undefined") return `#c=${encoded}`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#c=${encoded}`;
}
