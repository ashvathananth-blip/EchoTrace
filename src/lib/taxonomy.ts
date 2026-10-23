import type { Mutation, MutationKind, RelationshipType } from "./types";

export interface MutationMeta {
  label: string;
  color: string;
  blurb: string;
}

export const MUTATION_META: Record<MutationKind, MutationMeta> = {
  causation: {
    label: "Correlation → causation",
    color: "#f97316",
    blurb:
      "Two things going together is restated as one thing producing the other.",
  },
  certainty: {
    label: "Certainty shift",
    color: "#ef4444",
    blurb:
      "Hedged language ('may', 'suggests') hardens into proof, or hard evidence is softened away.",
  },
  context: {
    label: "Context dropped",
    color: "#a78bfa",
    blurb:
      "Qualifiers disappear: who was studied, how many, for how long, and what the authors warned.",
  },
  exaggeration: {
    label: "Exaggeration",
    color: "#f43f5e",
    blurb:
      "Intensity or severity is added that the source never measured.",
  },
  attribution: {
    label: "Attribution shift",
    color: "#38bdf8",
    blurb:
      "An unnamed study becomes 'scientists', 'doctors', or an institution — borrowed authority.",
  },
  scope: {
    label: "Scope shift",
    color: "#22d3ee",
    blurb:
      "The subject or population changes, so a narrow finding travels somewhere it was never tested.",
  },
  quantifier: {
    label: "Quantifier drift",
    color: "#facc15",
    blurb:
      "Numbers and amounts change: 'slightly', '30%', 'some' become 'all' or 'millions'.",
  },
  omission: {
    label: "Omission",
    color: "#94a3b8",
    blurb:
      "A load-bearing part of the evidence is silently removed.",
  },
  addition: {
    label: "New claim added",
    color: "#e879f9",
    blurb:
      "A conclusion appears that the source never contained — often a clinical or predictive claim.",
  },
  faithful: {
    label: "Faithful restatement",
    color: "#2dd4bf",
    blurb:
      "Reworded without changing strength, scope or evidence. Useful as a control.",
  },
};

export interface RelationshipMeta {
  label: string;
  color: string;
  honest: string;
}

export const RELATIONSHIP_META: Record<RelationshipType, RelationshipMeta> = {
  documented: {
    label: "Documented",
    color: "#2dd4bf",
    honest: "The supplied source notes describe how one statement led to the other.",
  },
  inferred: {
    label: "Inferred",
    color: "#a78bfa",
    honest:
      "Semantic similarity does not prove this is how the claim actually spread. Treat it as a plausible path, not a recorded history.",
  },
  insufficient: {
    label: "Weak link",
    color: "#fbbf24",
    honest:
      "There is a possible relationship here, but the supplied material is too thin to support it.",
  },
};

export const MUTATION_KINDS: MutationKind[] = [
  "causation",
  "certainty",
  "context",
  "exaggeration",
  "attribution",
  "scope",
  "quantifier",
  "omission",
  "addition",
  "faithful",
];

export function isMutationKind(value: unknown): value is MutationKind {
  return (
    typeof value === "string" &&
    (MUTATION_KINDS as string[]).includes(value)
  );
}

export function metaFor(kind: MutationKind): MutationMeta {
  return MUTATION_META[kind];
}

export function dominantMutation(mutations: Mutation[]): Mutation | null {
  let best: Mutation | null = null;
  for (const m of mutations) {
    if (!best || m.severity > best.severity) best = m;
  }
  return best;
}

export function severityTier(severity: number): "low" | "medium" | "high" {
  if (severity >= 70) return "high";
  if (severity >= 40) return "medium";
  return "low";
}
