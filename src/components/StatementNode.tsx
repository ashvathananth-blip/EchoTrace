"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { bandFor } from "@/lib/graph";
import { dominantMutation, metaFor } from "@/lib/taxonomy";
import type { StatementNodeData } from "./graph-types";

export default function StatementNode({ data }: NodeProps) {
  const node = data as unknown as StatementNodeData;
  const band = bandFor(node.drift);
  const dominant = dominantMutation(node.statement.mutations);
  const meta = dominant ? metaFor(dominant.kind) : null;

  const status = node.isClaim
    ? node.prediction
      ? "Original claim"
      : "Source claim"
    : node.unlinked
      ? "Not linked"
      : band.label;

  return (
    <div
      className={[
        "node",
        node.active ? "is-active" : "",
        node.linked ? "is-linked" : "",
        node.onPath ? "is-path" : "is-dim",
        node.unlinked ? "is-unlinked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ borderTopColor: node.unlinked ? "#4b5c70" : band.color }}
    >
      {node.isClaim ? null : <Handle type="target" position={Position.Top} />}

      <div className="node-top">
        <span
          className="node-band"
          style={{ color: node.unlinked ? "#7c8fa3" : band.color }}
        >
          {status}
        </span>
        <span className="node-step">
          {node.isClaim
            ? "Baseline"
            : node.unlinked
              ? "Unlinked"
              : node.prediction
                ? `Gen ${node.depth}`
                : `Step ${node.depth}`}
        </span>
      </div>

      <p className="node-text">{node.statement.text}</p>

      <div className="node-foot">
        {meta ? (
          <span className="node-kind" style={{ color: meta.color }}>
            <span className="node-kind-dot" aria-hidden />
            {meta.label}
            {node.statement.mutations.length > 1 ? (
              <span className="node-kind-muted">
                +{node.statement.mutations.length - 1}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="node-kind-muted">
            {node.isClaim
              ? node.prediction
                ? "Every branch starts here"
                : "Compared with every statement"
              : "No reliable connection found"}
          </span>
        )}
        {node.statement.origin?.label ? (
          <span className="node-origin">{node.statement.origin.label}</span>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
