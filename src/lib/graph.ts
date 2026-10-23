import type { Chain, Mutation, StatementNode } from "./types";

export const NODE_WIDTH = 330;
const COLUMN_GAP = 500;
const ROW_GAP = 240;

export interface GraphNode {
  node: StatementNode;
  x: number;
  y: number;
  depth: number;
  path: Mutation[];
  drift: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  byId: Map<string, GraphNode>;
  rootId: string;
  maxDrift: number;
  width: number;
  height: number;
}

export function driftScore(mutations: Mutation[]): number {
  let retained = 1;
  for (const mutation of mutations) {

    retained *= 1 - Math.min(100, Math.max(0, mutation.severity)) / 240;
  }
  return Math.round((1 - retained) * 100);
}

export interface Band {
  key: "faithful" | "drifted" | "distorted" | "detached";
  label: string;
  color: string;
  description: string;
}

export function bandFor(drift: number): Band {
  if (drift < 12) {
    return {
      key: "faithful",
      label: "Faithful",
      color: "#2dd4bf",
      description: "Carries the source's strength, scope and caveats.",
    };
  }
  if (drift < 40) {
    return {
      key: "drifted",
      label: "Drifted",
      color: "#facc15",
      description: "Small losses of context or strength, still recognisable.",
    };
  }
  if (drift < 70) {
    return {
      key: "distorted",
      label: "Distorted",
      color: "#f97316",
      description: "The claim now asserts more than the evidence can carry.",
    };
  }
  return {
    key: "detached",
    label: "Detached",
    color: "#ef4444",
    description: "Loosely inspired by the source; a different claim.",
  };
}

export function pathTo(nodeId: string, nodes: StatementNode[]): Mutation[] {
  const byId = new Map(nodes.map((n): [string, StatementNode] => [n.id, n]));
  const path: Mutation[] = [];
  let cursor = byId.get(nodeId);
  const seen = new Set<string>();

  while (cursor && cursor.parentId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(...cursor.mutations);
    cursor = byId.get(cursor.parentId);
  }

  return path;
}

export function ancestryIds(nodeId: string, nodes: StatementNode[]): string[] {
  const byId = new Map(nodes.map((n): [string, StatementNode] => [n.id, n]));
  const ids: string[] = [];
  let cursor = byId.get(nodeId);
  const seen = new Set<string>();

  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    ids.unshift(cursor.id);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  return ids;
}

export function deepestNode(chain: Chain): StatementNode {
  let best = chain.nodes[0];
  let bestDrift = -1;
  for (const node of chain.nodes) {
    const drift = driftScore(pathTo(node.id, chain.nodes));
    if (drift > bestDrift) {
      best = node;
      bestDrift = drift;
    }
  }
  return best;
}

export function layoutChain(chain: Chain): GraphLayout {
  const root = chain.nodes.find((n) => !n.parentId) ?? chain.nodes[0];
  const children = new Map<string, StatementNode[]>();

  for (const node of chain.nodes) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }

  const positions = new Map<string, { x: number; y: number }>();
  let row = 0;

  const place = (node: StatementNode, depth: number): void => {
    const kids = children.get(node.id) ?? [];
    if (kids.length === 0) {
      positions.set(node.id, { x: depth * COLUMN_GAP, y: row * ROW_GAP });
      row += 1;
      return;
    }
    for (const kid of kids) place(kid, depth + 1);
    const ys = kids.map((kid) => positions.get(kid.id)?.y ?? 0);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    positions.set(node.id, { x: depth * COLUMN_GAP, y: (min + max) / 2 });
  };

  if (root) place(root, 0);

  const nodes: GraphNode[] = chain.nodes.map((node) => {
    const position = positions.get(node.id) ?? { x: 0, y: 0 };
    const path = pathTo(node.id, chain.nodes);
    return {
      node,
      x: position.x,
      y: position.y,
      depth: ancestryIds(node.id, chain.nodes).length - 1,
      path,
      drift: driftScore(path),
    };
  });

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);

  return {
    nodes,
    byId: new Map(nodes.map((n): [string, GraphNode] => [n.node.id, n])),
    rootId: root ? root.id : (chain.nodes[0]?.id ?? "root"),
    maxDrift: nodes.reduce((max, n) => Math.max(max, n.drift), 0),
    width: (xs.length ? Math.max(...xs) : 0) + NODE_WIDTH,
    height: (ys.length ? Math.max(...ys) : 0) + ROW_GAP,
  };
}
