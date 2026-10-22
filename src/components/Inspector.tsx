"use client";

import { useMemo, useState } from "react";
import { bandFor, driftScore, pathTo } from "@/lib/graph";
import { RELATIONSHIP_META, metaFor } from "@/lib/taxonomy";
import type {
  Chain,
  Mutation,
  RelationshipType,
  StatementNode,
  StatementOrigin,
} from "@/lib/types";
import WordDiff from "./WordDiff";

export type InspectorSelection =
  | { kind: "edge"; id: string }
  | { kind: "node"; id: string }
  | null;

export interface InspectorProps {
  chain: Chain;
  selection: InspectorSelection;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
}

function generationOf(id: string, nodes: StatementNode[]): number {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  let cursor = byId.get(id);
  let generation = 0;

  while (cursor?.parentId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    generation += 1;
    cursor = byId.get(cursor.parentId);
  }

  return generation;
}

const CONFIDENCE_LABEL = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
} as const;

function OriginBlock({ origin }: { origin?: StatementOrigin }) {
  if (!origin) return null;
  const href = origin.url && /^https?:\/\//i.test(origin.url) ? origin.url : null;

  return (
    <p className="origin-block">
      <span className="origin-label">Source</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer noopener">
          {origin.label || href}
        </a>
      ) : (
        <span>{origin.label}</span>
      )}
      {origin.date ? <span className="origin-date">{origin.date}</span> : null}
    </p>
  );
}

function EvidenceRow({ mutation }: { mutation: Mutation }) {
  if (mutation.evidence.removed.length === 0 && mutation.evidence.added.length === 0) {
    return null;
  }

  return (
    <div className="evidence">
      {mutation.evidence.removed.length > 0 ? (
        <div className="evidence-row">
          <span className="evidence-tag evidence-del">removed</span>
          <span className="evidence-text">
            {mutation.evidence.removed.map((phrase) => `“${phrase}”`).join(" · ")}
          </span>
        </div>
      ) : null}
      {mutation.evidence.added.length > 0 ? (
        <div className="evidence-row">
          <span className="evidence-tag evidence-add">added</span>
          <span className="evidence-text">
            {mutation.evidence.added.map((phrase) => `“${phrase}”`).join(" · ")}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ChangeCards({
  mutations,
  activeIndex,
  onActive,
}: {
  mutations: Mutation[];
  activeIndex: number | null;
  onActive: (index: number | null) => void;
}) {
  return (
    <ol className="change-list">
      {mutations.map((mutation, index) => {
        const meta = metaFor(mutation.kind);
        const isActive = activeIndex === index;
        return (
          <li
            key={`${mutation.kind}-${index}`}
            className={`change${isActive ? " is-active" : ""}`}
            style={{ borderLeftColor: meta.color }}
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
          >
            <span className="change-kind" style={{ color: meta.color }}>
              <span className="node-kind-dot" aria-hidden />
              {meta.label}
            </span>
            {mutation.label && mutation.label !== meta.label ? <h3>{mutation.label}</h3> : null}
            <p>{mutation.explanation}</p>
            <EvidenceRow mutation={mutation} />
            {mutation.lost && mutation.lost.length > 0 ? (
              <p className="change-lost">
                <strong>Lost:</strong> {mutation.lost.join(" · ")}
              </p>
            ) : null}
            {mutation.plausibility ? (
              <p className="change-why">
                <strong>Why this is plausible:</strong> {mutation.plausibility}
              </p>
            ) : null}
            <details>
              <summary>Why it matters</summary>
              <p>{meta.blurb}</p>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

function EmptyState() {
  return (
    <div className="analysis-inner">
      <p className="eyebrow">Step 3 · Understand</p>
      <h2 className="empty-title">Select a connection</h2>
      <p className="analysis-note">
        Click an arrow to see how one statement became another, or click a statement to
        read its source and its links.
      </p>
      <ul className="relationship-key">
        {(["documented", "inferred", "insufficient"] as RelationshipType[]).map((kind) => (
          <li key={kind}>
            <span
              className={`key-line key-${kind}`}
              style={{ color: RELATIONSHIP_META[kind].color }}
            />
            <span>
              <strong>{RELATIONSHIP_META[kind].label}</strong>
              {RELATIONSHIP_META[kind].honest}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Inspector({
  chain,
  selection,
  onSelectNode,
  onSelectEdge,
}: InspectorProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const edges = chain.edges ?? [];
  const edge =
    selection?.kind === "edge"
      ? edges.find((candidate) => candidate.id === selection.id) ?? null
      : null;
  const selectedNode =
    selection?.kind === "node"
      ? chain.nodes.find((candidate) => candidate.id === selection.id) ?? null
      : null;

  const mutations = useMemo(
    () => (edge ? [...edge.mutations].sort((a, b) => b.severity - a.severity) : []),
    [edge],
  );

  const textOf = (id: string): string =>
    id === chain.nodes[0]?.id
      ? chain.original
      : chain.nodes.find((candidate) => candidate.id === id)?.text ?? "";

  if (edge) {
    const source = chain.nodes.find((candidate) => candidate.id === edge.sourceId);
    const target = chain.nodes.find((candidate) => candidate.id === edge.targetId);

    if (!source || !target) return <EmptyState />;

    const active = activeIndex !== null ? mutations[activeIndex] ?? null : null;
    const prediction = chain.mode === "predict";
    const relationship = RELATIONSHIP_META[edge.relationship];
    const band = bandFor(driftScore(pathTo(target.id, chain.nodes)));
    const dominant = mutations[0];
    const generation = generationOf(target.id, chain.nodes);

    return (
      <div className="analysis-inner">
        <div className="analysis-head">
          <p className="eyebrow">
            {prediction ? "Step 3 · Explore the prediction" : "Step 3 · Understand"}
          </p>
          <span
            className="band-pill"
            style={
              prediction
                ? { color: "#c4b5fd", borderColor: "#a78bfa" }
                : { color: relationship.color, borderColor: relationship.color }
            }
          >
            {prediction ? "Predicted" : relationship.label}
          </span>
        </div>

        <div className="analysis-title">
          <h2>{dominant ? dominant.label : "How the meaning changed"}</h2>
          <p className="analysis-sub">
            {prediction ? `Generation ${generation} · ` : ""}
            {CONFIDENCE_LABEL[edge.confidence]} · {mutations.length}{" "}
            {mutations.length === 1 ? "change" : "changes"} · {band.label}
          </p>
        </div>

        <WordDiff
          original={source.text}
          mutated={target.text}
          highlight={active ? active.evidence : null}
        />

        {prediction ? (
          <section className="verification verification-inferred">
            <div className="verification-head">
              <span style={{ color: "#c4b5fd" }}>Predicted step</span>
              <span>Generation {generation}</span>
            </div>
            <p>{edge.verificationNote}</p>
            <p className="verification-honest">
              This is a hypothetical forecast, not evidence that the claim actually spread this
              way.
            </p>
          </section>
        ) : (
          <section className={`verification verification-${edge.relationship}`}>
            <div className="verification-head">
              <span style={{ color: relationship.color }}>{relationship.label} link</span>
              <span>{CONFIDENCE_LABEL[edge.confidence]}</span>
            </div>
            <p>{edge.verificationNote || relationship.honest}</p>
            <p className="verification-honest">{relationship.honest}</p>
          </section>
        )}

        {mutations.length > 0 ? (
          <ChangeCards
            mutations={mutations}
            activeIndex={activeIndex}
            onActive={setActiveIndex}
          />
        ) : (
          <p className="analysis-note">
            A relationship was found, but no individual change could be classified.
          </p>
        )}

        {source.origin || target.origin ? (
          <section className="origin-section">
            <p className="section-label">Supplied sources</p>
            <div className="origin-pair">
              <OriginBlock origin={source.origin} />
              <OriginBlock origin={target.origin} />
            </div>
          </section>
        ) : null}

        <button type="button" className="link-back" onClick={() => onSelectNode(target.id)}>
          Open the target statement →
        </button>
      </div>
    );
  }

  if (selectedNode) {
    const incoming = edges.find((candidate) => candidate.targetId === selectedNode.id) ?? null;
    const outgoing = edges.filter((candidate) => candidate.sourceId === selectedNode.id);
    const drift = driftScore(pathTo(selectedNode.id, chain.nodes));
    const band = bandFor(drift);
    const isClaim = chain.nodes[0]?.id === selectedNode.id;

    return (
      <div className="analysis-inner">
        <div className="analysis-head">
          <p className="eyebrow">Step 3 · Understand</p>
          <span
            className="band-pill"
            style={{
              color: selectedNode.unlinked ? "#93a5b8" : band.color,
              borderColor: selectedNode.unlinked ? "#3a4a5c" : band.color,
            }}
          >
            {isClaim ? "Claim" : selectedNode.unlinked ? "Not linked" : band.label}
          </span>
        </div>

        <div className="analysis-title">
          <h2>
            {isClaim
              ? chain.mode === "predict"
                ? "Original claim"
                : "Source claim"
              : selectedNode.unlinked
                ? "Unlinked statement"
                : chain.mode === "predict"
                  ? "Predicted statement"
                  : "Statement"}
          </h2>
          <p className="analysis-sub">
            {isClaim
              ? chain.mode === "predict"
                ? "Every predicted branch starts from this claim."
                : "Every statement is compared with this claim."
              : selectedNode.unlinked
                ? "No defensible relationship to the other statements."
                : `${chain.mode === "predict" ? `Generation ${generationOf(selectedNode.id, chain.nodes)} · ` : ""}${outgoing.length} outgoing`}
          </p>
        </div>

        <p className="statement">{selectedNode.text}</p>
        <OriginBlock origin={selectedNode.origin} />

        {isClaim ? (
          <p className="analysis-note">
            The graph is built by comparing meaning across every supplied statement. Select
            an arrow to see the words that changed and the evidence behind the link.
          </p>
        ) : null}

        {selectedNode.unlinked ? (
          <p className="analysis-note">
            This statement was left off the graph rather than forced into a chain. Add a
            statement that shares its claim, or attach a source, then investigate again.
          </p>
        ) : null}

        {incoming ? (
          <section className="link-section">
            <p className="section-label">Came from</p>
            <button
              type="button"
              className="link-card"
              onClick={() => onSelectEdge(incoming.id)}
            >
              <span>{textOf(incoming.sourceId)}</span>
              <span
                className="link-card-meta"
                style={{ color: RELATIONSHIP_META[incoming.relationship].color }}
              >
                {RELATIONSHIP_META[incoming.relationship].label} ·{" "}
                {incoming.mutations[0]
                  ? metaFor(incoming.mutations[0].kind).label
                  : "Related"}
              </span>
            </button>
          </section>
        ) : null}

        {outgoing.length > 0 ? (
          <section className="link-section">
            <p className="section-label">Leads to</p>
            <div className="link-list">
              {outgoing.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="link-card"
                  onClick={() => onSelectEdge(candidate.id)}
                >
                  <span>{textOf(candidate.targetId)}</span>
                  <span
                    className="link-card-meta"
                    style={{ color: RELATIONSHIP_META[candidate.relationship].color }}
                  >
                    {RELATIONSHIP_META[candidate.relationship].label} ·{" "}
                    {candidate.mutations[0]
                      ? metaFor(candidate.mutations[0].kind).label
                      : "Related"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return <EmptyState />;
}
