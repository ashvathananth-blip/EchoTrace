"use client";

import { useState, type FormEvent } from "react";
import type { Chain } from "@/lib/types";

export interface ResearchSource {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface PredictorProps {
  onChain: (chain: Chain, sources?: ResearchSource[]) => void;
  initialClaim?: string;
}

const EXAMPLE_CLAIM =
  "A study found an association between screen time and sleep duration.";

export default function Predictor({ onChain, initialClaim = "" }: PredictorProps) {
  const [claim, setClaim] = useState(initialClaim);
  const [depth, setDepth] = useState(2);
  const [branches, setBranches] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (claim.trim().length < 12) {
      setError("Write the full claim you want to trace.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim: claim.trim(), depth, branches }),
      });
      const data = (await response.json()) as {
        chain?: Chain;
        research?: {
          sources: ResearchSource[];
          status: string;
      };
  error?: string;
};
      if (!response.ok || !data.chain) {
        throw new Error(data.error ?? "The prediction failed. Try again.");
      }
      onChain(data.chain,  data.research?.sources ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="composer card" onSubmit={submit} aria-busy={busy}>
      <div className="card-head">
        <h2>Original claim</h2>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setClaim(EXAMPLE_CLAIM);
            setError(null);
          }}
        >
          Use example
        </button>
      </div>

      <label className="field">
        <span className="field-label">What was said</span>
        <span className="field-hint">
          Enter one statement you want to investigate. EchoTrace predicts how it could be
          distorted as it spreads.
        </span>
        <textarea
          value={claim}
          rows={3}
          maxLength={500}
          placeholder="A study found that…"
          onChange={(event) => setClaim(event.target.value)}
        />
      </label>

      <div className="predict-settings">
        <label className="predict-setting">
          <span className="field-label">Generations</span>
          <select value={depth} onChange={(event) => setDepth(Number(event.target.value))}>
            <option value={1}>1 · first distortions</option>
            <option value={2}>2 · how they develop</option>
            <option value={3}>3 · long-tail evolution</option>
          </select>
        </label>
        <label className="predict-setting">
          <span className="field-label">Branches</span>
          <select
            value={branches}
            onChange={(event) => setBranches(Number(event.target.value))}
          >
            <option value={2}>2 · focused</option>
            <option value={3}>3 · balanced</option>
            <option value={4}>4 · broad</option>
          </select>
        </label>
      </div>

      <div className="composer-submit">
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {busy ? (
          <div className="composer-status" role="status" aria-live="polite">
            <span className="spinner" aria-hidden />
            <div>
              <strong>Predicting plausible mutations…</strong>
              <p>
                Reading the claim, then forecasting how its meaning could shift across
                generations. This takes a few seconds.
              </p>
            </div>
          </div>
        ) : null}
        <p className="composer-note">
          Predictions are hypothetical. EchoTrace forecasts how a claim could change; it does
          not claim this is how it actually spread.
        </p>
        <button type="submit" className="btn primary analyze" disabled={busy}>
          {busy ? "Predicting…" : "Predict Evolution"}
        </button>
      </div>
    </form>
  );
}
