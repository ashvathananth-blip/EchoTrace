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
markerEnd,
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

let strokeDasharray: string | undefined;

if (relationship === "documented") {
strokeDasharray = undefined;
} else if (relationship === "insufficient") {
strokeDasharray = "2 5";
} else if (edge?.prediction && edge.confidence === "high") {
strokeDasharray = undefined;
} else if (edge?.prediction && edge.confidence === "low") {
strokeDasharray = "2 5";
} else {
  strokeDasharray = undefined;
}

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
strokeWidth: edge?.active ? 2.6 : 2,
strokeDasharray,
opacity: edge?.active ? 1 : edge?.onPath ? 0.95 : 0.65,
}}
/>
);
}
