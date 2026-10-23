import { diffSummary, normalizeWord, tokenize } from "./diff";
import type {
  Chain,
  Confidence,
  Engine,
  InvestigationEdge,
  InvestigationEdgeCandidate,
  InvestigationStatement,
  Mutation,
  MutationKind,
  RelationshipType,
  RewriteInput,
  StatementNode,
  StatementOrigin,
} from "./types";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this",
  "these", "those", "of", "in", "on", "at", "to", "for", "from", "by", "with",
  "without", "about", "into", "over", "under", "between", "among", "as", "is",
  "are", "was", "were", "be", "been", "being", "it", "its", "they", "them",
  "their", "we", "our", "you", "your", "he", "she", "his", "her", "has",
  "have", "had", "do", "does", "did", "not", "no", "so", "such", "which",
  "who", "whom", "what", "when", "where", "why", "how", "more", "most",
  "very", "just", "also", "can", "could", "may", "might", "will", "would",
  "should", "one", "two", "said", "says", "according", "up", "out", "there",
]);

const CAUSAL_RE =
  /\b(?:caus(?:e|es|ed|ing)|cur(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|improv(?:e|es|ed|ing)|boost(?:s|ed|ing)?|harm(?:s|ed|ing)?|damag(?:e|es|ed|ing)|destroy(?:s|ed|ing)?|eliminat(?:e|es|ed)|prevent(?:s|ed|ing)?|protect(?:s|ed|ing)?|leads?|led|leading|mak(?:e|es|ing)|driv(?:e|es|ing)|trigger(?:s|ed|ing)?|stunt(?:s|ed|ing)?|worsen(?:s|ed)?|lower(?:s|ed)?|raise[sd]?|affect(?:s|ed|ing)?|spark(?:s|ed|ing)?|cut(?:s)?)\b/gi;

const ASSOCIATIONAL_RE =
  /\b(?:associat(?:e|es|ed|ion)|correlat(?:e|es|ed|ion)|linked\s+(?:to|with)|link\s+between|tied\s+to|connection\s+between|relationship\s+between|relat(?:es|ed)\s+to|co-?occur\w*)\b/gi;

const REPORTING_RE =
  /\b(?:found|reported|survey(?:ed)?|study|studies|researchers?\s+said|data\s+show(?:s|ed)?|according\s+to|measured|observed)\b/i;

const HEDGE_RE =
  /\b(?:possibly|probably|likely|suggests?|suggested|suggesting|appears?\s+to|seems?\s+to|tends?\s+to|sometimes|reportedly|apparently|preliminary|modest|marginally|some|in\s+some\s+cases|at\s+most|up\s+to|roughly|estimated|may|might|could)\b/gi;

const ABSOLUTE_RE =
  /\b(?:prove[sd]?|proven|proof|confirm(?:s|ed|ing)?|definitive(?:ly)?|conclusive(?:ly)?|undeniable|undeniably|clearly|obviously|undoubtedly|certainly|always|never|everyone|everybody|nobody|none|no\s+doubt|guarantee(?:s|d)?|establishe[sd]|demonstrat(?:e|es|ed)\s+that|shows?\s+that|known\s+to)\b/gi;

const AUTHORITY_RE =
  /\b(?:scientists?|researchers?|experts?|doctors?|physicians?|studies\s+show|study\s+shows|science\s+says|new\s+research|nutritionists?|psychologists?|professors?|officials?|the\s+cdc|the\s+who|harvard|stanford|oxford|government)\b/gi;

const MILD_INTENSIFIER_RE =
  /\b(?:very|really|hugely|massively|extremely|incredibly|shockingly|alarmingly|wildly)\b/gi;

const SEVERE_INTENSIFIER_RE =
  /\b(?:serious|severe|drastic(?:ally)?|dramatic(?:ally)?|devastating|catastrophic|alarming|crisis|epidemic|pandemic|dangerous|toxic|critical|extreme|chronic|permanent|irreversible|ruin(?:s|ed|ing)?|destroys?|destroying|deadly|fatal|explosive|skyrocket(?:s|ed|ing)?|eliminate[sd]?|eliminating|every|all)\b/gi;

const LIMITED_QUANTIFIER_RE =
  /\b(?:some|many|most|a\s+few|few|several|dozens?|hundreds?|thousands?|millions?|billions?|\d+(?:\.\d+)?%|\d[\d,]*|slight(?:ly)?|modest|small|partly|partially)\b/gi;

const SCALE_RE =
  /\b(?:all|every|everyone|everybody|none|no\s+one|entire|whole|always|never|millions?|billions?|unstoppable|totally)\b/gi;

const QUANTIFIED_EFFECT_RE = /\b\d+(?:\.\d+)?%?\b/g;

interface ContextPattern {
  re: RegExp;
  weight: number;
  what: string;
}

const CONTEXT_PATTERNS: ContextPattern[] = [
  {
    re: /\b(?:a|one|this|the|a\s+single)\s+(?:small\s+|single\s+|recent\s+|preliminary\s+|large\s+)?(?:study|trial|survey|cohort|report|analysis|experiment)\b/gi,
    weight: 58,
    what: "the study it came from",
  },
  {
    re: /\b(?:\d[\d,]*[- ](?:person|participant|patient|people|adult|manager|student)\w*|survey\s+of\s+\d[\d,]*\s+\w+)\b/gi,
    weight: 72,
    what: "the sample size",
  },
  {
    re: /\b(?:in|among)\s+(?:adults|children|teenagers|teens|older\s+adults|young\s+adults|men|women|students|participants|managers|patients)\b/gi,
    weight: 66,
    what: "who was actually studied",
  },
  {
    re: /\b(?:moderate|light|heavy|high|low|occasional|regular|slight(?:ly)?|modest|marginal(?:ly)?)\b/gi,
    weight: 46,
    what: "the size of the effect",
  },
  {
    re: /\b(?:for|over|within|after|during)\s+(?:\d+|two|three|four|six|twelve)\s+(?:weeks?|months?|years?|days?|hours?)\b/gi,
    weight: 52,
    what: "how long it was measured",
  },
  {
    re: /\b(?:but|although|though)\b[^.;]*\b(?:warned|cautioned|noted|caveat\w*|unclear|cannot|can't|does\s+not|may\s+not|could\s+be|placebo|reverse\s+causation|limitation\w*)\b/gi,
    weight: 88,
    what: "the authors' own caveat",
  },
  {
    re: /\b(?:cause\s+is\s+unclear|unclear\s+whether|cannot\s+establish|does\s+not\s+prove|not\s+proof|no\s+evidence\s+of\s+causation)\b/gi,
    weight: 90,
    what: "the explicit warning that causation was unclear",
  },
  {
    re: /\b(?:researchers?|scientists?|officials?)\s+(?:said|noted|warned|cau(?:sed|tioned))\b[^.;]*/gi,
    weight: 76,
    what: "the researcher's qualification",
  },
  {
    re: /\b(?:one|a\s+single|a\s+specific)\s+(?:\w+\s+)?(?:test|task|measure|questionnaire)\b/gi,
    weight: 56,
    what: "how narrow the outcome measure was",
  },
  {
    re: /\b(?:on|for)\s+(?:some|a\s+few)\s+(?:tasks?|people|participants|groups?)\b/gi,
    weight: 50,
    what: "the limited scope of the finding",
  },
];

class ClaimLedger {
  private words = new Set<string>();
  private phrases = new Set<string>();

  take(phrases: string[]): string[] {
    const taken: string[] = [];
    for (const phrase of phrases) {
      const key = phrase.trim().toLowerCase();
      if (!key || this.phrases.has(key)) continue;
      const words = tokenize(key).map(normalizeWord).filter(Boolean);
      if (words.length === 0) continue;
      if (words.every((w) => this.words.has(w))) continue;
      this.phrases.add(key);
      words.forEach((w) => this.words.add(w));
      taken.push(phrase.trim());
    }
    return taken;
  }

  isClaimed(word: string): boolean {
    return this.words.has(normalizeWord(word));
  }
}

function matches(text: string, re: RegExp): string[] {
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  const out: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null = rx.exec(text);
  while (match !== null) {
    const value = match[0].trim();
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
    if (match[0].length === 0) rx.lastIndex += 1;
    match = rx.exec(text);
  }
  return out;
}

function addedOnly(original: string, mutated: string, re: RegExp): string[] {
  const before = new Set(matches(original, re).map((m) => m.toLowerCase()));
  return matches(mutated, re).filter((m) => !before.has(m.toLowerCase()));
}

function contentWords(text: string): string[] {
  return tokenize(text).filter((token) => {
    const norm = normalizeWord(token);
    return norm.length > 2 && !STOPWORDS.has(norm) && !/^\d+$/.test(norm);
  });
}

function quote(words: string[], max = 4): string {
  return words.slice(0, max).join(" ");
}

function verbatimSpans(
  text: string,
  words: string[],
  maxWords = 6,
  maxSpans = 3,
): string[] {
  const tokens = tokenize(text);
  const used = new Set<number>();

  for (const word of words.slice(0, maxWords)) {
    const norm = normalizeWord(word);
    const index = tokens.findIndex(
      (token, position) => !used.has(position) && normalizeWord(token) === norm,
    );
    if (index !== -1) used.add(index);
  }

  const indices = [...used].sort((a, b) => a - b);
  const spans: string[] = [];
  let start = -1;
  let previous = -2;

  for (const index of indices) {
    if (index === previous + 1) {
      previous = index;
      continue;
    }
    if (start >= 0) spans.push(tokens.slice(start, previous + 1).join(" "));
    start = index;
    previous = index;
  }
  if (start >= 0) spans.push(tokens.slice(start, previous + 1).join(" "));

  return spans.slice(0, maxSpans);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function sentenceList(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "a qualifier";
  if (clean.length === 1) return `«${clean[0]}»`;
  if (clean.length === 2) return `«${clean[0]}» and «${clean[1]}»`;
  return `«${clean[0]}», «${clean[1]}» and ${clean.length - 2} more`;
}

export function analyzePair(original: string, mutated: string): Mutation[] {
  const ledger = new ClaimLedger();
  const found: Mutation[] = [];
  const originalLower = original.toLowerCase();
  const mutatedLower = mutated.toLowerCase();

  if (original.trim() === mutated.trim()) {
    return [
      {
        kind: "faithful",
        severity: 0,
        direction: "shift",
        label: "Identical text",
        explanation: "This statement is unchanged.",
        evidence: { removed: [], added: [] },
      },
    ];
  }

  const causal = addedOnly(original, mutated, CAUSAL_RE);
  const assocInSource = matches(original, ASSOCIATIONAL_RE);
  const assocSurvived = assocInSource.some((phrase) =>
    mutatedLower.includes(phrase.toLowerCase()),
  );

  if (causal.length > 0 && assocInSource.length > 0 && !assocSurvived) {
    const strong = /association|correlat/i.test(assocInSource.join(" "));
    const removed = ledger.take(assocInSource);
    const added = ledger.take(causal);
    found.push({
      kind: "causation",
      severity: strong ? 88 : 76,
      direction: "shift",
      label: "Correlation → causation",
      explanation: `The source reports that two things go together. «${quote(causal, 3)}» states that one produces the other — a direction the data cannot establish on its own. Reverse causation and third factors stay on the table.`,
      evidence: { removed, added },
    });
  } else if (
    causal.length > 0 &&
    assocInSource.length === 0 &&
    REPORTING_RE.test(original) &&
    !/caus|reduc|lead|make|drive|trigger|prevent/i.test(originalLower)
  ) {
    const added = ledger.take(causal);
    found.push({
      kind: "causation",
      severity: 72,
      direction: "shift",
      label: "Mechanism asserted",
      explanation: `A reported observation becomes an active mechanism: «${quote(causal, 3)}». Nothing in the source tested that mechanism, so the reader is handed an explanation the evidence never supplied.`,
      evidence: { removed: [], added },
    });
  }

  const hedgesLost = matches(original, HEDGE_RE).filter(
    (h) => !mutatedLower.includes(h.toLowerCase()),
  );
  const absolutesGained = addedOnly(original, mutated, ABSOLUTE_RE);
  const hedgesGained = addedOnly(original, mutated, HEDGE_RE);
  const absolutesLost = matches(original, ABSOLUTE_RE).filter(
    (a) => !mutatedLower.includes(a.toLowerCase()),
  );

  const hardening = hedgesLost.length + absolutesGained.length;
  const softening = hedgesGained.length + absolutesLost.length;

  if (hardening > 0 && hardening >= softening) {
    const removed = ledger.take(hedgesLost);
    const added = ledger.take(absolutesGained);
    found.push({
      kind: "certainty",
      severity: clamp(54 + hardening * 9 + absolutesGained.length * 5, 40, 94),
      direction: "up",
      label: "Certainty inflation",
      explanation: `${
        hedgesLost.length > 0
          ? `The hedge ${sentenceList(removed)} is gone. `
          : ""
      }${
        absolutesGained.length > 0
          ? `«${quote(absolutesGained, 3)}» replaces a degree of confidence with a verdict. `
          : ""
      }What was a tentative finding now reads as settled fact.`,
      evidence: { removed, added },
    });
  } else if (softening > 0) {
    const removed = ledger.take(absolutesLost);
    const added = ledger.take(hedgesGained);
    found.push({
      kind: "certainty",
      severity: clamp(36 + softening * 7, 30, 72),
      direction: "down",
      label: "Certainty lowered",
      explanation: `The claim is pushed below what the source supports: ${
        absolutesLost.length > 0 ? `${sentenceList(removed)} is removed and ` : ""
      }${hedgingPhrase(added)}. Understating evidence distorts just as effectively as overstating it.`,
      evidence: { removed, added },
    });
  }

  const contextHits: { phrase: string; weight: number; what: string }[] = [];
  for (const pattern of CONTEXT_PATTERNS) {
    for (const phrase of matches(original, pattern.re)) {
      if (mutatedLower.includes(phrase.toLowerCase())) continue;
      contextHits.push({ phrase, weight: pattern.weight, what: pattern.what });
    }
  }

  for (const phrase of matches(original, QUANTIFIED_EFFECT_RE)) {
    if (mutatedLower.includes(phrase.toLowerCase())) continue;
    contextHits.push({ phrase, weight: 46, what: "the measured effect size" });
  }

  if (contextHits.length > 0) {
    const strongest = Math.max(...contextHits.map((h) => h.weight));
    const rest = contextHits.reduce((sum, h) => sum + h.weight, 0) - strongest;
    const removed = ledger.take(contextHits.map((h) => h.phrase));
    const whats = Array.from(new Set(contextHits.map((h) => h.what))).slice(0, 2);
    found.push({
      kind: "context",
      severity: clamp(strongest + rest * 0.28, 30, 94),
      direction: "shift",
      label: "Context dropped",
      explanation: `The rewrite drops ${whats.join(" and ")} — ${sentenceList(removed)}. Without it the claim looks broader, better evidenced and safer than the source allows.`,
      evidence: { removed, added: [] },
    });
  }

  const severe = addedOnly(original, mutated, SEVERE_INTENSIFIER_RE);
  const mild = addedOnly(original, mutated, MILD_INTENSIFIER_RE);
  if (severe.length > 0 || mild.length > 0) {
    const added = ledger.take([...severe, ...mild]);
    found.push({
      kind: "exaggeration",
      severity: clamp(42 + severe.length * 15 + mild.length * 8, 38, 95),
      direction: "up",
      label: "Exaggeration",
      explanation: `«${quote(added, 4)}» adds intensity or severity that was never measured. The reader now pictures a bigger, more frightening effect than the data showed.`,
      evidence: { removed: [], added },
    });
  }

  const authorities = addedOnly(original, mutated, AUTHORITY_RE);
  if (authorities.length > 0) {
    const added = ledger.take(authorities);
    const authoritative = /prove|confirm|conclusive|definitiv/i.test(mutatedLower);
    found.push({
      kind: "attribution",
      severity: clamp(64 + (authoritative ? 12 : 0) + (authorities.length - 1) * 4, 50, 92),
      direction: "shift",
      label: "Borrowed authority",
      explanation: `The claim acquires «${quote(authorities, 3)}» — a collective, anonymous source. An unnamed study has become a consensus, and there is no one left for the reader to check.`,
      evidence: { removed: [], added },
    });
  }

  const limitedLost = matches(original, LIMITED_QUANTIFIER_RE).filter(
    (q) => !mutatedLower.includes(q.toLowerCase()),
  );
  const scaleGained = addedOnly(original, mutated, SCALE_RE);
  if (limitedLost.length > 0 && scaleGained.length > 0) {
    const removed = ledger.take(limitedLost);
    const added = ledger.take(scaleGained);
    found.push({
      kind: "quantifier",
      severity: clamp(56 + (limitedLost.length + scaleGained.length) * 4, 45, 88),
      direction: "up",
      label: "Quantifier drift",
      explanation: `A limited amount — ${sentenceList(removed)} — becomes «${quote(scaleGained, 3)}». The size of the effect is no longer something a reader could check.`,
      evidence: { removed, added },
    });
  }

  const originalContent = contentWords(original);
  const mutatedContent = contentWords(mutated);
  const mutatedNorm = new Set(mutatedContent.map(normalizeWord));
  const originalNorm = new Set(originalContent.map(normalizeWord));
  const unclaimedRemoved = originalContent.filter(
    (w) => !mutatedNorm.has(normalizeWord(w)) && !ledger.isClaimed(w),
  );
  const unclaimedAdded = mutatedContent.filter(
    (w) => !originalNorm.has(normalizeWord(w)) && !ledger.isClaimed(w),
  );

  if (unclaimedRemoved.length > 0 && unclaimedAdded.length > 0) {
    const removed = ledger.take(verbatimSpans(original, unclaimedRemoved));
    const added = ledger.take(verbatimSpans(mutated, unclaimedAdded));
    found.push({
      kind: "scope",

      severity: clamp(38 + (unclaimedAdded.length + unclaimedRemoved.length) * 2, 34, 56),
      direction: "shift",
      label: "Subject wording changed",
      explanation: `The subject moves from ${sentenceList(removed)} to ${sentenceList(added)}. If those are not the same thing, the evidence is now travelling with a claim it never tested — worth checking before it is repeated.`,
      evidence: { removed, added },
    });
  }

  const leftoverRemoved = unclaimedRemoved.filter((w) => !ledger.isClaimed(w));
  const leftoverAdded = unclaimedAdded.filter((w) => !ledger.isClaimed(w));

  if (leftoverRemoved.length >= 3) {
    const removed = ledger.take(verbatimSpans(original, leftoverRemoved));
    found.push({
      kind: "omission",
      severity: clamp(34 + leftoverRemoved.length * 6, 30, 86),
      direction: "shift",
      label: "Omission",
      explanation: `Material disappears without a trace — ${sentenceList(removed)}. The rewrite reads as a summary, not as a selection.`,
      evidence: { removed, added: [] },
    });
  }

  if (leftoverAdded.length >= 3) {
    const added = ledger.take(verbatimSpans(mutated, leftoverAdded));
    found.push({
      kind: "addition",
      severity: clamp(40 + leftoverAdded.length * 6, 35, 90),
      direction: "shift",
      label: "New claim added",
      explanation: `Content appears that the parent statement never contained — ${sentenceList(added)}. It arrives without evidence because it has none behind it.`,
      evidence: { removed: [], added },
    });
  }

  if (found.length === 0) {
    const summary = diffSummary(original, mutated);
    const cosmetic = summary.similarity > 0.8;
    return [
      {
        kind: "faithful",
        severity: cosmetic ? 6 : 18,
        direction: "shift",
        label: cosmetic ? "Faithful restatement" : "Neutral rewording",
        explanation: cosmetic
          ? "Reworded, not strengthened: same claim, same hedge, same scope. This is what a careful paraphrase looks like."
          : "The wording moved but nothing about strength, scope or evidence did.",
        evidence: { removed: [], added: [] },
      },
    ];
  }

  return found.sort((a, b) => b.severity - a.severity).slice(0, 5);
}

function hedgingPhrase(added: string[]): string {
  if (added.length === 0) return "confidence is added without new evidence";
  return `«${quote(added, 3)}» makes it sound less certain than the source`;
}

export function describeArc(mutations: Mutation[]): string {
  const labels: string[] = [];
  for (const m of mutations) {
    if (m.kind === "faithful") continue;
    if (!labels.includes(m.label)) labels.push(m.label);
  }
  if (labels.length === 0) return "No material change from the source";
  const shown = labels.slice(0, 4);
  return `${shown.join(" → ")}${labels.length > shown.length ? " → …" : ""}`;
}

function orderRewrites(rewrites: RewriteInput[]): RewriteInput[] {
  const byId = new Map(rewrites.map((r): [string, RewriteInput] => [r.id, r]));
  const placed = new Set<string>(["root"]);
  const ordered: RewriteInput[] = [];
  let pending = [...rewrites];

  while (pending.length > 0) {
    const ready = pending.filter((r) => placed.has(r.parentId) || !byId.has(r.parentId));
    if (ready.length === 0) {

      ordered.push(...pending.map((r) => ({ ...r, parentId: "root" })));
      break;
    }
    for (const rewrite of ready) {
      ordered.push(rewrite);
      placed.add(rewrite.id);
    }
    pending = pending.filter((r) => !placed.has(r.id));
  }

  return ordered;
}

export interface BuildChainParams {
  id: string;
  title: string;
  original: string;
  rewrites: RewriteInput[];
  engine: Engine;
  message?: string;
}

export function buildChain(params: BuildChainParams): Chain {
  const ordered = orderRewrites(params.rewrites.slice(0, 6));
  const rootId = "root";

  const root: StatementNode = {
    id: rootId,
    parentId: null,
    text: params.original,
    mutations: [],
    source: params.engine,
  };

  const nodes: StatementNode[] = [root];

  for (const rewrite of ordered) {
    const parent = nodes.find((n) => n.id === rewrite.parentId) ?? root;
    nodes.push({
      id: rewrite.id,
      parentId: parent.id,
      text: rewrite.text,
      mutations: analyzePair(parent.text, rewrite.text),
      source: params.engine,
    });
  }

  return {
    id: params.id,
    title: params.title,
    original: params.original,
    nodes,
    verdict: describeArc(pathOfDeepest(nodes)),
    engine: params.engine,
    message: params.message,
  };
}

function pathOfDeepest(nodes: StatementNode[]): Mutation[] {
  const byId = new Map(nodes.map((n): [string, StatementNode] => [n.id, n]));
  let best: Mutation[] = [];

  for (const node of nodes) {
    const path: Mutation[] = [];
    let cursor: StatementNode | undefined = node;
    while (cursor && cursor.parentId) {
      path.unshift(...cursor.mutations);
      cursor = byId.get(cursor.parentId);
    }
    const score = path.reduce((sum, m) => sum + m.severity, 0);
    const bestScore = best.reduce((sum, m) => sum + m.severity, 0);
    if (score > bestScore) best = path;
  }

  return best;
}

export const ANALYZER_KINDS = new Set<MutationKind>([
  "causation",
  "certainty",
  "context",
  "exaggeration",
  "attribution",
  "scope",
  "quantifier",
  "omission",
  "addition",
  "faithful",
]);

const GENERIC_TOKENS = new Set([
  "study",
  "studies",
  "research",
  "report",
  "reports",
  "news",
  "people",
  "person",
  "thing",
  "things",
  "new",
  "year",
  "years",
  "week",
  "weeks",
  "month",
  "months",
  "today",
  "world",
  "found",
  "show",
  "shows",
  "said",
  "says",
]);

const TERM_ALIASES: Record<string, string> = {
  smartphones: "phone",
  smartphone: "phone",
  mobile: "phone",
  mobiles: "phone",
  kids: "child",
  kid: "child",
  children: "child",
  teens: "teenager",
  teen: "teenager",
  adolescent: "teenager",
  adolescents: "teenager",
  employees: "worker",
  workers: "worker",
  workforce: "worker",
  firms: "company",
  companies: "company",
  businesses: "company",
  illness: "disease",
  illnesses: "disease",
  sickness: "disease",
  physicians: "doctor",
  medic: "doctor",
};

const ABSOLUTE_TERMS = new Set([
  "prove",
  "proves",
  "proved",
  "proven",
  "proof",
  "confirm",
  "confirms",
  "confirmed",
  "definitive",
  "definitely",
  "conclusive",
  "certainly",
  "always",
  "never",
  "everyone",
  "everybody",
  "nobody",
  "none",
  "all",
  "every",
  "guarantee",
  "guarantees",
  "cause",
  "causes",
  "caused",
  "cure",
  "cures",
  "cured",
  "eliminate",
  "eliminates",
  "eliminating",
  "millions",
  "billions",
  "doubles",
  "triples",
  "skyrockets",
  "destroys",
  "deadly",
  "fatal",
  "completely",
  "totally",
  "unstoppable",
  "already",
  "will",
  "extends",
  "extend",
  "adds",
  "prevents",
  "prevent",
  "reverses",
  "dramatically",
  "shocking",
]);

const HEDGE_TERMS = new Set([
  "may",
  "might",
  "could",
  "suggest",
  "suggests",
  "suggested",
  "associated",
  "association",
  "link",
  "linked",
  "correlation",
  "correlates",
  "some",
  "often",
  "slight",
  "slightly",
  "possibly",
  "probably",
  "likely",
  "appears",
  "seems",
  "preliminary",
  "small",
  "limited",
  "among",
  "according",
  "study",
  "survey",
  "trial",
  "data",
  "reported",
  "estimate",
  "estimates",
  "sometimes",
  "roughly",
]);

function stemToken(token: string): string {
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function topicTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of tokenize(text)) {
    const norm = normalizeWord(raw);
    if (!norm) continue;
    if (/^\d/.test(norm)) {
      tokens.add(norm);
      continue;
    }
    if (norm.length < 3 || STOPWORDS.has(norm)) continue;
    tokens.add(stemToken(TERM_ALIASES[norm] ?? norm));
  }
  return tokens;
}

interface Overlap {
  score: number;
  shared: number;
}

function overlapOf(left: Set<string>, right: Set<string>): Overlap {
  let shared = 0;
  for (const token of left) {
    if (right.has(token) && !GENERIC_TOKENS.has(token)) shared += 1;
  }
  if (shared === 0) return { score: 0, shared: 0 };
  const union = new Set([...left, ...right]).size;
  const smallest = Math.min(left.size, right.size, union);
  const containment = shared / Math.max(1, smallest);
  const jaccard = shared / Math.max(1, union);
  return { score: 0.6 * containment + 0.4 * jaccard, shared };
}

function assertivenessOf(text: string): number {
  let absolute = 0;
  let hedge = 0;
  for (const raw of tokenize(text)) {
    const token = normalizeWord(raw);
    if (ABSOLUTE_TERMS.has(token)) absolute += 1;
    if (HEDGE_TERMS.has(token)) hedge += 1;
  }
  return absolute * 2 - hedge * 1.3;
}

function confidenceFor(score: number): Confidence {
  if (score >= 0.55) return "high";
  if (score >= 0.34) return "medium";
  return "low";
}

export function inferRelationships(nodes: StatementNode[]): InvestigationEdgeCandidate[] {
  const claim = nodes[0];
  if (!claim || nodes.length < 2) return [];

  const claimTokens = topicTokens(claim.text);
  const queue = nodes
    .slice(1)
    .map((node) => {
      const tokens = topicTokens(node.text);
      return {
        node,
        tokens,
        assertiveness: assertivenessOf(node.text),
        size: tokens.size,
      };
    })
    .sort((a, b) => {
      if (a.assertiveness !== b.assertiveness) return a.assertiveness - b.assertiveness;
      if (a.size !== b.size) return b.size - a.size;
      return a.node.text.localeCompare(b.node.text);
    });

  const placed: { node: StatementNode; tokens: Set<string> }[] = [
    { node: claim, tokens: claimTokens },
  ];
  const candidates: InvestigationEdgeCandidate[] = [];

  for (const entry of queue) {
    let best: { parent: StatementNode; score: number; isClaim: boolean } | null = null;

    for (const parent of placed) {
      const match = overlapOf(entry.tokens, parent.tokens);
      const isClaim = parent.node.id === claim.id;
      if (isClaim) {
        if (match.shared < 1 || match.score < 0.16) continue;
      } else if (match.shared < 2 || match.score < 0.3) {
        continue;
      }
      if (!best || match.score > best.score) {
        best = { parent: parent.node, score: match.score, isClaim };
      }
    }

    if (!best) continue;

    if (!best.isClaim) {
      const claimMatch = overlapOf(entry.tokens, claimTokens);
      if (
        claimMatch.shared >= 1 &&
        claimMatch.score >= 0.16 &&
        claimMatch.score >= best.score * 0.75
      ) {
        best = { parent: claim, score: claimMatch.score, isClaim: true };
      }
    }

    const mutations = analyzePair(best.parent.text, entry.node.text);
    const dominant = mutations[0];
    const changed = dominant ? dominant.kind.replace("_", " ") : "meaning";

    candidates.push({
      sourceId: best.parent.id,
      targetId: entry.node.id,
      relationship: "inferred",
      confidence: confidenceFor(best.score),
      verificationNote: `Inferred from shared subject matter and a ${changed} change in wording. No supplied source documents this lineage.`,
      mutations,
    });

    placed.push({ node: entry.node, tokens: entry.tokens });
  }

  return candidates;
}

function hasOrigin(origin?: StatementOrigin): boolean {
  return Boolean(origin && (origin.label || origin.url));
}

function wouldCycle(
  sourceId: string,
  targetId: string,
  accepted: Map<string, InvestigationEdge>,
): boolean {
  const seen = new Set<string>();
  let cursor: string | null = sourceId;
  while (cursor) {
    if (cursor === targetId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = accepted.get(cursor)?.sourceId ?? null;
  }
  return false;
}

const CONFIDENCE_ORDER: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
const RELATIONSHIP_VALUES: RelationshipType[] = ["documented", "inferred", "insufficient"];

function candidateWeight(candidate: InvestigationEdgeCandidate): number {
  const severity = candidate.mutations.reduce(
    (max, mutation) => Math.max(max, mutation.severity),
    0,
  );
  return CONFIDENCE_ORDER[candidate.confidence] * 100 + severity;
}

export interface InvestigationBuildParams {
  id: string;
  claim: string;
  claimSources?: StatementOrigin[];
  statements: InvestigationStatement[];
  candidates: InvestigationEdgeCandidate[];
  engine: Engine;
  message?: string;
  verdict?: string;
}

export function buildInvestigation(params: InvestigationBuildParams): Chain {
  const nodes: StatementNode[] = [
    {
      id: "claim",
      parentId: null,
      text: params.claim,
      mutations: [],
      source: params.engine,
      sources: params.claimSources,
    },
    ...params.statements.map((statement) => ({
      id: statement.id,
      parentId: null,
      text: statement.text,
      mutations: [],
      source: params.engine,
      origin: statement.origin,
    })),
  ];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const accepted = new Map<string, InvestigationEdge>();
  const ordered = [...params.candidates].sort((a, b) => candidateWeight(b) - candidateWeight(a));

  for (const candidate of ordered) {
    const source = byId.get(candidate.sourceId);
    const target = byId.get(candidate.targetId);
    if (!source || !target) continue;
    if (source.id === target.id || target.id === "claim") continue;
    if (accepted.has(target.id)) continue;
    if (wouldCycle(source.id, target.id, accepted)) continue;

    const mutations = candidate.mutations
      .filter((mutation) => mutation.explanation.trim().length > 0)
      .slice(0, 4);
    if (mutations.length === 0) continue;

    let relationship: RelationshipType = RELATIONSHIP_VALUES.includes(candidate.relationship)
      ? candidate.relationship
      : "inferred";
    if (relationship === "documented" && !hasOrigin(target.origin) && !hasOrigin(source.origin)) {
      relationship = "inferred";
    }
    if (relationship === "documented" && candidate.verificationNote.trim().length < 8) {
      relationship = "inferred";
    }

    accepted.set(target.id, {
      id: `edge-${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      relationship,
      confidence: candidate.confidence,
      verificationNote: candidate.verificationNote.trim(),
      mutations,
    });
  }

  const edges = nodes
    .map((node) => accepted.get(node.id))
    .filter((edge): edge is InvestigationEdge => Boolean(edge));

  const linked = new Set<string>();
  for (const edge of edges) {
    linked.add(edge.sourceId);
    linked.add(edge.targetId);
    const target = byId.get(edge.targetId);
    if (!target) continue;
    target.parentId = edge.sourceId;
    target.mutations = edge.mutations;
  }

  for (const node of nodes) {
    node.unlinked = !linked.has(node.id);
    if (node.parentId) node.unlinked = false;
  }

  const title = params.claim.length > 62 ? `${params.claim.slice(0, 59)}…` : params.claim;
  const verdict =
    params.verdict?.trim() ||
    (edges.length === 0
      ? "No reliable relationships were found between these statements."
      : describeArc(pathOfDeepest(nodes)));

  return {
    id: params.id,
    title,
    original: params.claim,
    nodes,
    edges,
    verdict,
    engine: params.engine,
    message: params.message,
  };
}
