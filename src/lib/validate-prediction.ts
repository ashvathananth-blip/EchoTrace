
import type {
  PredictionNode,
  PredictionEdge,
  PredictionResponse
} from "./prediction-types";

const categories = new Set([
  "exaggeration",
  "omission",
  "false-certainty",
  "causation-leap",
  "emotional-framing",
  "overgeneralization"
]);

export function validatePrediction(
  input: unknown,
  claim: string,
  depth: number,
  branches: number
): PredictionResponse {
  if (
    typeof input !== "object" ||
    input === null ||
    !("nodes" in input) ||
    !("edges" in input) ||
    !Array.isArray(input.nodes) ||
    !Array.isArray(input.edges)
  ) {
    throw new Error("Invalid prediction response");
  }
  const nodes = input.nodes as PredictionNode[];
  const edges = input.edges as PredictionEdge[];

  const expectedCount = Array.from(
    { length: depth + 1 },
    (_, generation) => branches ** generation
  ).reduce((total, count) => total + count, 0);

  if (nodes.length !== expectedCount) {
    throw new Error("Unexpected number of prediction nodes");
  }

  if (edges.length !== nodes.length - 1) {
    throw new Error("Unexpected number of prediction edges");
  }

  const nodeMap = new Map<string, PredictionNode>();
  const edgeIds = new Set<string>();

  for (const node of nodes) {
    if (
      typeof node.id !== "string" ||
      !node.id ||
      typeof node.text !== "string" ||
      !node.text.trim() ||
      !Number.isInteger(node.generation) ||
      node.generation < 0 ||
      node.generation > depth
    ) {
      throw new Error("Invalid prediction node");
    }

    if (nodeMap.has(node.id)) {
      throw new Error("Duplicate prediction node ID");
    }

    nodeMap.set(node.id, node);
  }

  const root = nodeMap.get("root");

  if (
    !root ||
    root.text !== claim ||
    root.generation !== 0 ||
    root.parentId !== null
  ) {
    throw new Error("Invalid original claim node");
  }

  const childrenCount = new Map<string, number>();
  const incomingCount = new Map<string, number>();

  for (const edge of edges) {
    if (
      typeof edge.id !== "string" ||
      !edge.id ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string" ||
      typeof edge.category !== "string" ||
      typeof edge.explanation !== "string" ||
      !edge.explanation.trim() ||
      typeof edge.plausibility !== "string" ||
      !edge.plausibility.trim()
    ) {
      throw new Error("Invalid prediction edge");
    }

    if (edgeIds.has(edge.id)) {
      throw new Error("Duplicate prediction edge ID");
    }

    edgeIds.add(edge.id);

    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);

    if (!parent || !child) {
      throw new Error("Edge references an unknown node");
    }

    if (
      child.parentId !== parent.id ||
      child.generation !== parent.generation + 1
    ) {
      throw new Error("Invalid parent-child relationship");
    }

    if (!categories.has(edge.category)) {
      throw new Error("Unknown mutation category");
    }

    childrenCount.set(
      parent.id,
      (childrenCount.get(parent.id) ?? 0) + 1
    );

    incomingCount.set(
      child.id,
      (incomingCount.get(child.id) ?? 0) + 1
    );
  }

  for (const node of nodes) {
    if (node.id === "root") {
      if ((incomingCount.get(node.id) ?? 0) !== 0) {
        throw new Error("Root cannot have an incoming edge");
      }
    } else if (
      typeof node.parentId !== "string" ||
      (incomingCount.get(node.id) ?? 0) !== 1
    ) {
      throw new Error("Prediction node must have one parent");
    }

    const expectedChildren =
      node.generation < depth ? branches : 0;

    if ((childrenCount.get(node.id) ?? 0) !== expectedChildren) {
      throw new Error("Invalid branch count");
    }
  }

  return {
    mode: "prediction",
    nodes,
    edges
  };
}
