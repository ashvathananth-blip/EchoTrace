"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Composer, {
  EMPTY_INVESTIGATION,
  type ComposerSeed,
} from "./Composer";
import Inspector, { type InspectorSelection } from "./Inspector";
import Predictor, { type ResearchSource } from "./Predictor";
import Welcome from "./Welcome";
import { buildShareUrl, decodeChain } from "@/lib/share";
import type { Chain, InvestigationEdge } from "@/lib/types";

const Graph = dynamic(() => import("./Graph"), {
  ssr: false,
  loading: () => <div className="canvas-loading">Mapping relationships…</div>,
});

type View = "welcome" | "investigation";




function sourceHost(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.hostname
      : "";
  } catch {
    return "";
  }
}


function engineLabel(chain: Chain): string {
  const prediction = chain.mode === "predict";
  if (chain.engine === "anthropic") return prediction ? "Model prediction" : "Model analysis";
  if (chain.engine === "heuristic") return prediction ? "Local simulation" : "Local analysis";
  return "Curated example";
}

function selectionFor(chain: Chain): InspectorSelection {
  const edges = chain.edges ?? [];
  const confidence = { high: 3, medium: 2, low: 1 };
  let best: InvestigationEdge | null = null;
  let bestScore = -1;

  for (const edge of edges) {
    const severity = edge.mutations.reduce(
      (max, mutation) => Math.max(max, mutation.severity),
      0,
    );
    const score = confidence[edge.confidence] * 100 + severity;
    if (score > bestScore) {
      best = edge;
      bestScore = score;
    }
  }

  if (best) return { kind: "edge", id: best.id };
  const claim = chain.nodes[0];
  return claim ? { kind: "node", id: claim.id } : null;
}

function seedFromChain(chain: Chain): ComposerSeed {
  return {
    claim: chain.original,
    statements: chain.nodes.slice(1).map((node) => ({
      id: node.id,
      text: node.text,
      source: node.origin?.label ?? node.origin?.url ?? "",
    })),
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Lab() {
  const [view, setView] = useState<View>("welcome");
  const [chain, setChain] = useState<Chain | null>(null);
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [selection, setSelection] = useState<InspectorSelection>(null);
  const [showCompose, setShowCompose] = useState(true);
  const [inputMode, setInputMode] = useState<"predict" | "analyze">("predict");
  const [seed, setSeed] = useState<ComposerSeed>(EMPTY_INVESTIGATION);
  const [toast, setToast] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [graphEpoch, setGraphEpoch] = useState(0);
  const analysisRef = useRef<HTMLElement | null>(null);

  const openInvestigation = useCallback(() => {
    setView("investigation");
    setGraphEpoch((epoch) => epoch + 1);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  const openWalkthrough = useCallback(() => {
    setView("welcome");
    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(() => {
      const target = document.getElementById("walkthrough");
      target?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      target?.focus({ preventScroll: true });
    }, 0);
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#c=")) return;
      const decoded = decodeChain(hash.slice(3));
      if (!decoded) return;
      setChain(decoded);
      setSelection(selectionFor(decoded));
      setSeed(seedFromChain(decoded));
      setShowCompose(false);
      setShared(true);
      setView("investigation");
      setGraphEpoch((epoch) => epoch + 1);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    analysisRef.current?.scrollTo({ top: 0 });
  }, [selection, chain?.id]);

const handleChain = useCallback((next: Chain, sources: ResearchSource[] = []) => {
    const count = next.edges?.length ?? 0;
    setChain(next);
    setResearchSources(sources);
    setSelection(selectionFor(next));
    setSeed(seedFromChain(next));
    setShowCompose(false);
    setShared(false);
    setGraphEpoch((epoch) => epoch + 1);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setToast(
      count === 0
        ? "Investigation complete · no defensible connections"
        : `Investigation complete · ${next.engine === "anthropic" ? "model" : "local analysis"} mapped ${count} ${
            count === 1 ? "connection" : "connections"
          }`,
    );
  }, []);

  const revealAnalysis = useCallback(() => {
    if (typeof window === "undefined" || window.innerWidth > 1020) return;
    analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectNode = useCallback(
    (id: string | null) => {
      setSelection(id ? { kind: "node", id } : null);
      if (id) revealAnalysis();
    },
    [revealAnalysis],
  );

  const selectEdge = useCallback(
    (id: string) => {
      setSelection({ kind: "edge", id });
      revealAnalysis();
    },
    [revealAnalysis],
  );

  const editStatements = () => {
    setShowCompose(true);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const copyLink = async () => {
    if (!chain) return;
    const url = buildShareUrl(chain);
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied — it carries the whole graph");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const unlinked = chain
    ? chain.nodes.filter((node) => node.unlinked && node.id !== chain.nodes[0]?.id)
    : [];

  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header-inner">
          <button
            type="button"
            className="brand"
            onClick={openWalkthrough}
            aria-label="EchoTrace home"
          >
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M4 12h3.2" />
                <path d="M9.6 8.2a5.3 5.3 0 0 0 0 7.6" />
                <path d="M13.4 5.4a9.3 9.3 0 0 1 0 13.2" />
                <path d="M17.2 2.8a13.6 13.6 0 0 1 0 18.4" />
              </svg>
            </span>
            <span className="brand-name">EchoTrace</span>
            <span className="brand-sub">Misinformation tracer</span>
          </button>

          <nav className="site-nav" aria-label="Main">
            <button
              type="button"
              className="nav-btn"
              aria-current={view === "welcome" ? "page" : undefined}
              onClick={openWalkthrough}
            >
              How it works
            </button>
            <button
              type="button"
              className="nav-btn"
              aria-current={view === "investigation" ? "page" : undefined}
              onClick={openInvestigation}
            >
              Investigation
              {chain ? <span className="nav-dot" aria-hidden /> : null}
            </button>
          </nav>
        </div>
      </header>

      <main className="page">
        <div hidden={view !== "welcome"}>
          <Welcome onStart={openInvestigation} />
        </div>

        <div hidden={view !== "investigation"}>
          {chain && !showCompose ? (
            <>
              <section className="workbar" aria-label="Investigation results">
                <div className="workbar-head">
                  <div className="eyebrow-row">
                    <p className="eyebrow">
                      {chain.mode === "predict"
                        ? "Step 2 · Predicted evolution"
                        : "Step 2 · Explore the graph"}
                    </p>
                    {chain.mode === "predict" ? (
                      <span className="engine-pill hypothetical">Prediction</span>
                    ) : null}
                    <span className="engine-pill">{engineLabel(chain)}</span>
                    <span className="engine-pill complete">
                      <span aria-hidden>✓</span> Complete
                    </span>
                    {shared ? <span className="engine-pill accent">Shared</span> : null}
                  </div>
                  <h1>{chain.title}</h1>
                  {chain.verdict ? <p className="verdict">{chain.verdict}</p> : null}
                  {chain.message ? (
                    <p className="notice">{chain.message}</p>
                  ) : null}
                </div>
                <div className="workbar-actions">
                  <button type="button" className="btn ghost" onClick={editStatements}>
                    {chain.mode === "predict" ? "New claim" : "Edit statements"}
                  </button>
                  <button type="button" className="btn" onClick={copyLink}>
                    Copy link
                  </button>
                </div>
              </section>

              {chain.mode === "predict" ? (
                <div className={`prediction-banner${chain.engine === "heuristic" ? " simulated" : ""}`} role="note">
                  <strong>
                    {chain.engine === "heuristic"
                      ? "Simulated hypothetical predictions"
                      : "AI-generated hypothetical predictions"}
                  </strong>
                  <p>
                    These statements were generated to show plausible distortions of your
                    claim. They are not quotations, sources, or a record of how it actually
                    spread.
                  </p>
                </div>
              ) : null}

              <div className="workspace">
                <div className="graph-column">
                  <div className="graph-panel">
                    <Graph
                      key={`${chain.id}-${graphEpoch}-${chain.nodes.map((node) => node.id).join("-")}`}
                      chain={chain}
                      selectedNodeId={selection?.kind === "node" ? selection.id : null}
                      selectedEdgeId={selection?.kind === "edge" ? selection.id : null}
                      onSelectNode={selectNode}
                      onSelectEdge={selectEdge}
                    />
                    <div className="graph-legend" aria-hidden>
                      <span>
                        <i className="key-line key-documented" />
                        Documented
                      </span>
                      <span>
                        <i className="key-line key-inferred" />
                        Inferred
                      </span>
                      <span>
                        <i className="key-line key-insufficient" />
                        Weak
                      </span>
                    </div>
                    <p className="graph-hint">
                      Select a statement or connection to investigate how its meaning changed
                    </p>
                  </div>
                  {unlinked.length > 0 ? (
                    <div className="unlinked-strip">
                      <span>Not connected</span>
                      <ul>
                        {unlinked.map((node) => (
                          <li key={node.id}>
                            <button type="button" onClick={() => selectNode(node.id)}>
                              {node.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>



                <aside className="analysis" ref={analysisRef} aria-label="Analysis">
                  <Inspector
                    key={`${chain.id}-${selection?.kind ?? "none"}-${selection?.id ?? "none"}`}
                    chain={chain}
                    selection={selection}
                    onSelectNode={selectNode}
                    onSelectEdge={selectEdge}
                  />
                </aside>

                <div className="graph-sidebar">
                  <section className="sources-panel" aria-label="Sources for the original claim">
                    <div className="sources-head">
                      <div className="sources-title">
                        <span className="sources-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="10.8" cy="10.8" r="6.5" />
                            <path d="m15.6 15.6 4.2 4.2" />
                          </svg>
                        </span>
                        <div>
                        <p className="sources-eyebrow">Research</p>
                          <h2>Claim sources</h2>
                        </div>
                      </div>
                      <span className="sources-count">
                        {researchSources.length} found
                      </span>
                    </div>
                    <p className="sources-note">
                      References for the original claim—not evidence of how it spread.
                    </p>
                    {researchSources.length > 0 ? (
                      <ul className="sources-list">
                        {researchSources.map((source) => (
                          <li key={source.url}>
                            {source.url && sourceHost(source.url) ? (
                              <a href={source.url} target="_blank" rel="noreferrer noopener">
                                <span className="source-mark" aria-hidden>
                                  ↗
                                </span>
                                <span className="source-copy">
                                  <strong>{source.title}</strong>
                                  <small>{sourceHost(source.url)}</small>
                                </span>
                              </a>
                            ) : (
                              <span className="source-copy">
                                <strong>{source.title}</strong>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sources-empty">
                        No relevant web sources were found for this claim.
                      </p>
                    )}
                  </section>
                </div>

              </div>
                

              
            </>

          ) : (
            <section className="compose" aria-labelledby="compose-title">
              <div className="compose-head">
                <p className="eyebrow">Step 1 · Enter a claim</p>
                <h1 id="compose-title" className="hero-title">
                  {inputMode === "predict"
                    ? "What claim should we trace?"
                    : "What statements did you find?"}
                </h1>
                <p className="hero-lede">
                  {inputMode === "predict"
                    ? "Enter one statement. EchoTrace analyses its meaning and predicts how it could be distorted as it spreads."
                    : "Paste the original statement and the versions you found. EchoTrace works out which relate to which."}
                </p>
              </div>

              <div className="input-mode" role="group" aria-label="Input mode">
                <button
                  type="button"
                  aria-pressed={inputMode === "predict"}
                  onClick={() => setInputMode("predict")}
                >
                  Predict evolution
                </button>
                <button
                  type="button"
                  aria-pressed={inputMode === "analyze"}
                  onClick={() => setInputMode("analyze")}
                >
                  Analyze existing statements
                </button>
              </div>

              {inputMode === "predict" ? (
                <Predictor onChain={handleChain} />
              ) : (
                <Composer key={JSON.stringify(seed)} seed={seed} onChain={handleChain} />
              )}
            </section>
          )}
        </div>
      </main>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
