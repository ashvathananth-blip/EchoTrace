"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Chain, StatementOrigin } from "@/lib/types";

interface Row {
  id: string;
  text: string;
  source: string;
  sourceOpen: boolean;
}

export interface ComposerSeed {
  claim: string;
  statements: { id: string; text: string; source: string }[];
}

export interface ComposerProps {
  seed: ComposerSeed;
  onChain: (chain: Chain) => void;
}

const MAX_ROWS = 8;

export const EMPTY_INVESTIGATION: ComposerSeed = {
  claim: "",
  statements: [1, 2, 3].map((index) => ({
    id: `blank-${index}`,
    text: "",
    source: "",
  })),
};

export const EXAMPLE_INVESTIGATION: ComposerSeed = {
  claim: "A study found an association between screen time and sleep duration.",
  statements: [
    {
      id: "example-1",
      text: "A study found that screen time is linked to how long teenagers sleep.",
      source: "",
    },
    {
      id: "example-2",
      text: "Screen time reduces sleep duration.",
      source: "",
    },
    {
      id: "example-3",
      text: "Screen time causes serious sleep problems in teenagers.",
      source: "",
    },
    {
      id: "example-4",
      text: "The city opened a new library on Monday.",
      source: "",
    },
  ],
};

function rowsFromSeed(seed: ComposerSeed): Row[] {
  return seed.statements.map((statement) => ({
    id: statement.id,
    text: statement.text,
    source: statement.source,
    sourceOpen: Boolean(statement.source),
  }));
}

function newRow(index: number): Row {
  return {
    id: `row-${Date.now().toString(36)}-${index}`,
    text: "",
    source: "",
    sourceOpen: false,
  };
}

function parseOrigin(value: string): StatementOrigin | undefined {
  const source = value.trim();
  if (!source) return undefined;
  if (/^https?:\/\//i.test(source)) {
    return { label: source.replace(/^https?:\/\//i, "").slice(0, 90), url: source };
  }
  return { label: source };
}

export default function Composer({ seed, onChain }: ComposerProps) {
  const [claim, setClaim] = useState(seed.claim);
  const [rows, setRows] = useState<Row[]>(() => rowsFromSeed(seed));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClaim(seed.claim);
    setRows(rowsFromSeed(seed));
    setError(null);
  }, [seed]);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((current) => [...current, newRow(current.length)]);
  };

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const loadExample = () => {
    setClaim(EXAMPLE_INVESTIGATION.claim);
    setRows(rowsFromSeed(EXAMPLE_INVESTIGATION));
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (claim.trim().length < 12) {
      setError("Write the full claim you want to investigate.");
      return;
    }

    const filled = rows.filter((row) => row.text.trim().length > 0);
    if (filled.length === 0) {
      setError("Add at least one statement to compare with the claim.");
      return;
    }
    if (filled.some((row) => row.text.trim().length < 6)) {
      setError("Every statement needs at least a few words.");
      return;
    }

    const payload = {
      claim: claim.trim(),
      statements: filled.map((row) => ({
        text: row.text.trim(),
        origin: parseOrigin(row.source),
      })),
    };

    setBusy(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { chain?: Chain; error?: string };
      if (!response.ok || !data.chain) {
        throw new Error(data.error ?? "The investigation failed. Try again.");
      }
      onChain(data.chain);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="composer card" onSubmit={submit} aria-busy={busy}>
      <div className="card-head">
        <h2>Claim and statements</h2>
        <button type="button" className="link-btn" onClick={loadExample}>
          Load example
        </button>
      </div>

      <label className="field">
        <span className="field-label">Original claim</span>
        <span className="field-hint">
          Enter the original statement you want to investigate.
        </span>
        <textarea
          value={claim}
          rows={2}
          maxLength={700}
          placeholder="A study found that…"
          onChange={(event) => setClaim(event.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">
          Statements
          <em>
            {rows.length}/{MAX_ROWS}
          </em>
        </span>
        <p className="field-hint">
          Add versions of this statement. You do not need to connect or order them — the AI
          works out their relationships.
        </p>

        <div className="rewrite-list">
          {rows.map((row, index) => (
            <div className="rewrite" key={row.id}>
              <span className="rewrite-index" aria-hidden>
                {index + 1}
              </span>
              <div className="rewrite-main">
                <textarea
                  value={row.text}
                  rows={2}
                  maxLength={700}
                  placeholder="A version of the claim you found…"
                  aria-label={`Statement ${index + 1}`}
                  onChange={(event) => updateRow(row.id, { text: event.target.value })}
                />
                {row.sourceOpen ? (
                  <input
                    className="source-input"
                    value={row.source}
                    maxLength={400}
                    placeholder="Source (optional): outlet, URL or date"
                    aria-label={`Source for statement ${index + 1}`}
                    onChange={(event) => updateRow(row.id, { source: event.target.value })}
                  />
                ) : (
                  <button
                    type="button"
                    className="source-toggle"
                    onClick={() => updateRow(row.id, { sourceOpen: true })}
                  >
                    + Add source
                  </button>
                )}
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => removeRow(row.id)}
                aria-label={`Remove statement ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="add-rewrite"
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS}
        >
          + Add statement
        </button>
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
              <strong>Investigating relationships…</strong>
              <p>
                Comparing meaning, checking for shifts in certainty, causation and context.
                This usually takes a few seconds.
              </p>
            </div>
          </div>
        ) : null}
        <p className="composer-note">
          AI compares the statements and graphs possible changes in meaning. Only the text you
          provide is analysed — no web search, no invented sources.
        </p>
        <button type="submit" className="btn primary analyze" disabled={busy}>
          {busy ? "Investigating…" : "Investigate claim"}
        </button>
      </div>
    </form>
  );
}
