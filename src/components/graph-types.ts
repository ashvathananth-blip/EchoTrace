import type { Confidence, RelationshipType, StatementNode } from "@/lib/types";

export type StatementNodeData = {
statement: StatementNode;
drift: number;
onPath: boolean;
active: boolean;
linked: boolean;
depth: number;
isClaim: boolean;
unlinked: boolean;
prediction: boolean;
};

export type MutationEdgeData = {
color: string;
label: string;
relationship: RelationshipType;
confidence?: Confidence;
prediction?: boolean;
active: boolean;
onPath: boolean;
onSelect: () => void;
};
