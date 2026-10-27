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

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;  

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

      {!reducedMotion && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray="3 35"
          strokeLinecap="round"
          className="echo-trace-flow-pulse"
          style={{
            pointerEvents: "none",
            opacity: edge?.onPath ? 1 : 0.4,
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