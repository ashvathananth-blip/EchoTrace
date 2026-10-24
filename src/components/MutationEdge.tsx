"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
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

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: edge?.active ? 2.4 : 1.8,
        opacity: edge?.active ? 1 : edge?.onPath ? 0.95 : 0.72,
      }}
    />
  );
}
