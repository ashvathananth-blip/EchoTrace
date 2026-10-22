"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { MutationEdgeData } from "./graph-types";

export default function MutationEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    data,
  } = props;

  const edge = data as unknown as MutationEdgeData | undefined;
  const color = edge?.color ?? "#64788c";
  const relationship = edge?.relationship ?? "inferred";

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const dash =
    relationship === "documented" ? undefined : relationship === "insufficient" ? "2 6" : "6 5";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: edge?.active ? 2.4 : 1.5,
          strokeDasharray: dash,
          opacity: edge?.active ? 1 : edge?.onPath ? 0.85 : 0.3,
        }}
      />
      {edge ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className={`edge-label${edge.active ? " is-active" : ""}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            aria-label={`${edge.label}, ${relationship} relationship`}
            onClick={(event) => {
              event.stopPropagation();
              edge.onSelect();
            }}
          >
            <span className="edge-dot" style={{ background: color }} />
            {edge.label}
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
