"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { ancestryIds, layoutChain } from "@/lib/graph";
import { dominantMutation, metaFor } from "@/lib/taxonomy";
import type { Chain, StatementNode as Statement } from "@/lib/types";
import MutationEdge from "./MutationEdge";
import StatementNode from "./StatementNode";
import type { MutationEdgeData, StatementNodeData } from "./graph-types";

const nodeTypes: NodeTypes = { statement: StatementNode };
const edgeTypes: EdgeTypes = { mutation: MutationEdge };

const NODE_WIDTH = 260;
const NODE_HEIGHT = 136;
const COLUMN_GAP = 84;
const LEVEL_GAP = 88;
const TREE_GAP = 1;

function verticalLayout(chain: Chain): Map<string, { x: number; y: number }> {
  const visible = chain.nodes.filter((node) => !node.unlinked || node.id === chain.nodes[0]?.id);
  const byId = new Map(visible.map((node) => [node.id, node]));
  const children = new Map<string, Statement[]>();

  for (const node of visible) {
    if (!node.parentId || !byId.has(node.parentId)) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }

  const roots = visible.filter((node) => !node.parentId || !byId.has(node.parentId));
  const columns = new Map<string, number>();
  const depths = new Map<string, number>();
  let cursor = 0;

  const place = (node: Statement, depth: number): number => {
    depths.set(node.id, depth);
    const kids = children.get(node.id) ?? [];

    if (kids.length === 0) {
      columns.set(node.id, cursor);
      cursor += 1;
      return cursor - 1;
    }

    const placed = kids.map((kid) => place(kid, depth + 1));
    const center = (Math.min(...placed) + Math.max(...placed)) / 2;
    columns.set(node.id, center);
    return center;
  };

  roots.forEach((root, index) => {
    place(root, 0);
    if (index < roots.length - 1) cursor += TREE_GAP;
  });

  for (const node of visible) {
    if (columns.has(node.id)) continue;
    depths.set(node.id, 0);
    columns.set(node.id, cursor);
    cursor += 1;
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of visible) {
    positions.set(node.id, {
      x: (columns.get(node.id) ?? 0) * (NODE_WIDTH + COLUMN_GAP),
      y: (depths.get(node.id) ?? 0) * (NODE_HEIGHT + LEVEL_GAP),
    });
  }

  return positions;
}

export interface GraphProps {
  chain: Chain;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string) => void;
}

export default function Graph({
  chain,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: GraphProps) {
  const layout = useMemo(() => layoutChain(chain), [chain]);
  const positions = useMemo(() => verticalLayout(chain), [chain]);
  const claimId = chain.nodes[0]?.id ?? "claim";

  const selectedEdge = useMemo(
    () => (chain.edges ?? []).find((edge) => edge.id === selectedEdgeId) ?? null,
    [chain.edges, selectedEdgeId],
  );

  const focusId = selectedNodeId ?? selectedEdge?.targetId ?? null;

  const pathIds = useMemo(
    () => new Set(focusId ? ancestryIds(focusId, chain.nodes) : []),
    [focusId, chain.nodes],
  );

  const hasFocus = Boolean(focusId);

  const linkedIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedEdge) {
      ids.add(selectedEdge.sourceId);
      ids.add(selectedEdge.targetId);
    }
    if (selectedNodeId) ids.add(selectedNodeId);
    return ids;
  }, [selectedEdge, selectedNodeId]);

  const narrow = typeof window !== "undefined" && window.innerWidth <= 720;
  const claimPosition = positions.get(claimId) ?? { x: 0, y: 0 };
  const narrowViewport = {
    x: Math.max(16, (window.innerWidth - 32) / 2 - (claimPosition.x + NODE_WIDTH / 2) * 0.72),
    y: 20,
    zoom: 0.72,
  };

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StatementNodeData>>(
    layout.nodes
      .filter((entry) => !entry.node.unlinked || entry.node.id === claimId)
      .map((entry) => ({
        id: entry.node.id,
        type: "statement",
        position: positions.get(entry.node.id) ?? { x: entry.x, y: entry.y },
        style: { width: NODE_WIDTH },
        draggable: true,
        data: {
          statement: entry.node,
          drift: entry.drift,
          onPath: !hasFocus || pathIds.has(entry.node.id),
          active: entry.node.id === selectedNodeId,
          linked: linkedIds.has(entry.node.id),
          depth: entry.depth,
          isClaim: entry.node.id === claimId,
          unlinked: Boolean(entry.node.unlinked),
          prediction: chain.mode === "predict",
        },
      })),
  );

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onPath: !hasFocus || pathIds.has(node.id),
          active: node.id === selectedNodeId,
          linked: linkedIds.has(node.id),
        },
      })),
    );
  }, [hasFocus, pathIds, selectedNodeId, linkedIds, setNodes]);

  const edges = useMemo<Edge<MutationEdgeData>[]>(
    () =>
      (chain.edges ?? []).map((edge) => {
        const dominant = dominantMutation(edge.mutations);
        const color =
  
          edge.relationship === "documented"
            ? "#10cda2" // Teal: documented
            : edge.relationship === "insufficient"
              ? "#facc15" // Yellow: weak
              : "#a78bfa"; // Purple: inferred
        const label = dominant
          ? `${metaFor(dominant.kind).label}${
              edge.mutations.length > 1 ? ` +${edge.mutations.length - 1}` : ""
            }`
          : "Related claim";

        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          type: "mutation",
          data: {
            color,
            label,
            relationship: edge.relationship,
            confidence: edge.confidence,
            prediction: chain.mode === "predict",
            onPath: !hasFocus || pathIds.has(edge.targetId) || edge.relationship === "documented",
            active: edge.id === selectedEdgeId,
            onSelect: () => onSelectEdge(edge.id),
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 16,
            height: 16,
          },
        };
      }),
    [chain.edges, hasFocus, pathIds, selectedEdgeId, onSelectEdge],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
      onPaneClick={() => onSelectNode(null)}
      elementsSelectable={false}
      nodesConnectable={false}
      minZoom={0.2}
      maxZoom={1.4}
      fitView={!narrow}
      fitViewOptions={{ padding: 0.12, maxZoom: 1.1 }}
      onInit={(instance) => {
        window.requestAnimationFrame(() => instance.fitView({ padding: 0.12, maxZoom: 1.1 }));
      }}
      defaultViewport={narrow ? narrowViewport : undefined}
      className="graph"
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#18304d" />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
}
