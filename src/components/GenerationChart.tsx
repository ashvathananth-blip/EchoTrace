"use client";

import { useMemo, useState } from "react";
import { ancestryIds } from "@/lib/graph";
import type { Chain } from "@/lib/types";

/** Counts only records present in this response; generation is not elapsed time. */
export default function GenerationChart({ chain }: { chain: Chain }) {
  const [active, setActive] = useState<number | null>(null);
  const groups = useMemo(() => {
    const counts = new Map<number, number>();
    for (const node of chain.nodes) {
      if (node.unlinked) continue;
      const depth = ancestryIds(node.id, chain.nodes).length - 1;
      counts.set(depth, (counts.get(depth) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a - b);
  }, [chain]);
  const max = Math.max(1, ...groups.map(([, count]) => count));
  return (
    <section className="growth-panel" aria-labelledby="growth-title">
      <div className="panel-heading"><div><p className="eyebrow">03 / GENERATION PROFILE</p><h2 id="growth-title">Growth & acceleration</h2></div><span className="engine-pill">{chain.mode === "predict" ? "Hypothetical counts" : "Submitted counts"}</span></div>
      <p className="chart-description">Statements per {chain.mode === "predict" ? "predicted generation" : "inferred step"}. Counts reflect this graph only.</p>
      <div className="count-chart" role="group" aria-label="Statement counts by generation">
        <div className="chart-axis"><span>{max}</span><span>0</span></div>
        <div className="chart-bars">{groups.map(([depth, count]) => (
          <button type="button" key={depth} className={`chart-column${active === depth ? " selected" : ""}`} onClick={() => setActive(active === depth ? null : depth)} onFocus={() => setActive(depth)} onMouseEnter={() => setActive(depth)} onMouseLeave={() => setActive(null)} aria-label={`${depth === 0 ? "Baseline" : `Generation ${depth}`}: ${count} statements`} aria-pressed={active === depth}>
            <span className="bar-track"><span className="bar-value">{count}</span><span className="count-bar" style={{ height: `${Math.max(4, count / max * 100)}%` }} /></span>
            <span>{depth === 0 ? "Baseline" : `${chain.mode === "predict" ? "Gen" : "Step"} ${depth}`}</span>
          </button>
        ))}</div>
      </div>
      <div className="chart-readout" aria-live="polite">{active !== null ? `${active === 0 ? "Baseline" : `Generation / step ${active}`} · ${groups.find(([depth]) => depth === active)?.[1] ?? 0} statements in this graph` : "Select a column to inspect its count."}</div>
      <div className="measurement-note"><strong>Spread acceleration is unavailable</strong><p>No time-series spread measurements are included in the response. Generation depth is not time; these counts cannot establish reach, velocity or acceleration. Prediction branch settings determine the shape of this profile.</p></div>
    </section>
  );
}
