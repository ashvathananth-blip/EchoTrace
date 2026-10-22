export type DiffOpType = "equal" | "insert" | "delete";

export interface DiffOp {
  type: DiffOpType;
  text: string;
}

const NORMALIZE_STRIP = /[^\p{L}\p{N}%]+/gu;

export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(NORMALIZE_STRIP, "");
}

export function tokenize(text: string): string[] {
  return text.match(/\S+/g) ?? [];
}

function push(ops: DiffOp[], type: DiffOpType, token: string): void {
  const last = ops[ops.length - 1];
  if (last && last.type === type) {
    last.text = `${last.text} ${token}`;
    return;
  }
  ops.push({ type, text: token });
}

export function wordDiff(original: string, mutated: string): DiffOp[] {
  const a = tokenize(original);
  const b = tokenize(mutated);
  const n = a.length;
  const m = b.length;
  const an = a.map(normalizeWord);
  const bn = b.map(normalizeWord);

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] =
        an[i] === bn[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (an[i] === bn[j]) {
      push(ops, "equal", a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(ops, "delete", a[i]);
      i += 1;
    } else {
      push(ops, "insert", b[j]);
      j += 1;
    }
  }
  while (i < n) {
    push(ops, "delete", a[i]);
    i += 1;
  }
  while (j < m) {
    push(ops, "insert", b[j]);
    j += 1;
  }

  return ops;
}

export interface DiffSummary {
  ops: DiffOp[];
  added: string[];
  removed: string[];
  addedText: string;
  removedText: string;
  similarity: number;
}

export function diffSummary(original: string, mutated: string): DiffSummary {
  const ops = wordDiff(original, mutated);
  const added: string[] = [];
  const removed: string[] = [];

  for (const op of ops) {
    if (op.type === "insert") added.push(...op.text.split(" "));
    if (op.type === "delete") removed.push(...op.text.split(" "));
  }

  const total = Math.max(tokenize(original).length, tokenize(mutated).length, 1);

  return {
    ops,
    added,
    removed,
    addedText: added.join(" "),
    removedText: removed.join(" "),
    similarity: 1 - (added.length + removed.length) / (2 * total),
  };
}

export function wordSet(text: string): Set<string> {
  return new Set(tokenize(text).map(normalizeWord).filter(Boolean));
}
