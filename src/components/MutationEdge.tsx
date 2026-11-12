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
    data,
  } = props;

  const edge = data as unknown as MutationEdgeData | undefined;
  const relationship = edge?.relationship;

  const color =
    relationship === "documented"
      ? "#10cda2"
      : relationship === "insufficient"
        ? "#facc15"
        : "#a78bfa";

  const isInsufficient = relationship === "insufficient";
  const isInferred = relationship === "inferred";

  const strokeDasharray = isInsufficient
    ? "2 5"
    : isInferred
      ? "7 5"
      : undefined;


  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: color,
          strokeWidth: edge?.active ? 2.6 : 2,
          strokeDasharray,
          opacity: edge?.active ? 1 : edge?.onPath ? 0.95 : 0.65,
        }}
      />

      <EdgeLabelRenderer>
        <button type="button" className={`edge-label nodrag nopan${edge?.active ? " active" : ""}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, borderColor: color }} onClick={edge?.onSelect} title={`${edge?.prediction ? "Hypothetical transformation" : relationship}: ${edge?.label}. Select for evidence.`}>
          {edge?.label ?? "Related claim"}<span aria-hidden> ↗</span>
        </button>
      </EdgeLabelRenderer>

    </>
  );
}