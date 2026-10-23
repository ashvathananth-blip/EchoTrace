export type MutationKind =
  | "faithful"
  | "causation"
  | "certainty"
  | "context"
  | "exaggeration"
  | "attribution"
  | "scope"
  | "quantifier"
  | "omission"
  | "addition";

export type Direction = "up" | "down" | "shift";

export type Engine = "curated" | "heuristic" | "anthropic";

export type RelationshipType = "documented" | "inferred" | "insufficient";

export type Confidence = "high" | "medium" | "low";

export interface Evidence {
  removed: string[];
  added: string[];
  note?: string;
}

export interface Mutation {
  kind: MutationKind;
  severity: number;
  label: string;
  explanation: string;
  direction?: Direction;
  evidence: Evidence;
  plausibility?: string;
  lost?: string[];
}

export interface StatementOrigin {
  label: string;
  url?: string;
  date?: string;
}

export interface StatementNode {
  id: string;
  parentId: string | null;
  text: string;
  mutations: Mutation[];
  source: Engine;
  origin?: StatementOrigin;
  unlinked?: boolean;
}

export interface InvestigationEdgeCandidate {
  sourceId: string;
  targetId: string;
  relationship: RelationshipType;
  confidence: Confidence;
  verificationNote: string;
  mutations: Mutation[];
}

export interface InvestigationEdge extends InvestigationEdgeCandidate {
  id: string;
}

export interface Chain {
  id: string;
  title: string;
  original: string;
  nodes: StatementNode[];
  edges?: InvestigationEdge[];
  verdict: string;
  engine: Engine;
  message?: string;
  mode?: "predict" | "investigate";
}

export interface PredictionRequest {
  claim: string;
  depth?: number;
  branches?: number;
}

export interface PredictionDraft {
  id: string;
  parentId: string | null;
  text: string;
  kind?: MutationKind;
  label?: string;
  explanation?: string;
  plausibility?: string;
  severity?: number;
  removed?: string[];
  added?: string[];
  lost?: string[];
}

export interface RewriteInput {
  id: string;
  text: string;
  parentId: string;
}

export interface InvestigationStatement {
  id: string;
  text: string;
  origin?: StatementOrigin;
}

export interface InvestigationRequest {
  claim: string;
  statements: { text: string; origin?: StatementOrigin }[];
}

export interface AnalysisResponse {
  chain?: Chain;
  error?: string;
}
