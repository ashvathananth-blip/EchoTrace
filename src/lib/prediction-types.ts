
export type PredictionRequest = {
  claim: string;
  depth: number;
  branches: number;
};

export type PredictionNode = {
  id: string;
  text: string;
  generation: number;
  parentId: string | null;
};

export type PredictionEdge = {
  id: string;
  source: string;
  target: string;
  category: string;
  explanation: string;
  plausibility: string;
};

export type PredictionResponse = {
  mode: "prediction";
  nodes: PredictionNode[];
  edges: PredictionEdge[];
};
