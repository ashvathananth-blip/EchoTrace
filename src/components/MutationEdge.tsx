"use client";

import {
  BaseEdge,
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
      ? "#a78bfa"
      : relationship === "insufficient"
        ? "#facc15"
        : "#10cda2";

  const isDocumented = relationship === "documented";
  const isInsufficient = relationship === "insufficient";
  const isAnimated = !isDocumented && !isInsufficient;

  const strokeDasharray = isInsufficient ? "2 5" : undefined;

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
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: edge?.active ? 2.6 : 2,
          strokeDasharray,
          opacity: edge?.active ? 1 : edge?.onPath ? 0.95 : 0.65,
        }}
      />

      {isAnimated && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="3 7"
          strokeLinecap="round"
          pathLength={100}
          className="echo-trace-animated-edge"
          style={{
            pointerEvents: "none",
            opacity: 0.95,
          }}
        />
      )}

      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>

      <path
        d={path}
        fill="none"
        stroke="none"
        markerEnd={`url(#arrow-${id})`}
      />
    </>
  );
}