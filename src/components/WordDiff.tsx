"use client";

import { useMemo } from "react";
import { normalizeWord, tokenize, wordDiff, type DiffOp } from "@/lib/diff";

export interface WordDiffProps {
  original: string;
  mutated: string;
  highlight?: { removed: string[]; added: string[] } | null;
}

function toWordSet(phrases: string[]): Set<string> {
  return new Set(tokenize(phrases.join(" ")).map(normalizeWord).filter(Boolean));
}

function opWords(op: DiffOp): string[] {
  return tokenize(op.text).map(normalizeWord);
}

export default function WordDiff({ original, mutated, highlight }: WordDiffProps) {
  const ops = useMemo(() => wordDiff(original, mutated), [original, mutated]);

  const lit = useMemo(() => {
    if (!highlight) return null;
    return {
      removed: toWordSet(highlight.removed),
      added: toWordSet(highlight.added),
    };
  }, [highlight]);

  const renderTokens = (side: "before" | "after") =>
    ops.map((op, index) => {
      if (side === "before" && op.type === "insert") return null;
      if (side === "after" && op.type === "delete") return null;

      const bucket =
        op.type === "delete" ? lit?.removed : op.type === "insert" ? lit?.added : undefined;
      const isLit = Boolean(bucket && opWords(op).some((word) => word && bucket.has(word)));

      return (
        <span
          key={`${side}-${op.type}-${index}`}
          className={[
            "diff-token",
            op.type === "delete" ? "diff-delete" : "",
            op.type === "insert" ? "diff-insert" : "",
            isLit ? "is-lit" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {op.text}
          {index < ops.length - 1 ? " " : ""}
        </span>
      );
    });

  return (
    <div className="diff">
      <div className="diff-cols">
        <div className="diff-col">
          <span className="diff-col-label">Before</span>
          <p className="diff-text">{renderTokens("before")}</p>
        </div>
        <div className="diff-col">
          <span className="diff-col-label">After</span>
          <p className="diff-text">{renderTokens("after")}</p>
        </div>
      </div>
      <div className="diff-key">
        <span>
          <i className="swatch swatch-del" />
          removed
        </span>
        <span>
          <i className="swatch swatch-ins" />
          added
        </span>
      </div>
    </div>
  );
}
