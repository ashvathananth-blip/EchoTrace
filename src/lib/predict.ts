import { analyzePair } from "./analyze";
import type {
  Chain,
  Engine,
  InvestigationEdge,
  Mutation,
  MutationKind,
  PredictionDraft,
  StatementNode,
} from "./types";

export const PREDICTION_MIN_DEPTH = 1;
export const PREDICTION_MAX_DEPTH = 3;
export const PREDICTION_MIN_BRANCHES = 2;
export const PREDICTION_MAX_BRANCHES = 4;
export const PREDICTION_MAX_NODES = 26;

interface Frame {
  subject: string;
  outcome: string;
  verb: string;
  quantified: string;
  associational: boolean;
}

function tidy(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^(?:that|the|a|an)\s+/i, "")
    .replace(/[.;:,]+$/, "")
    .trim()
    .replace(/^([A-Z])(?=[a-z])/, (letter) => letter.toLowerCase());
}

function trimWords(value: string, max: number): string {
  return value.split(" ").slice(0, max).join(" ");
}

function causalVerb(outcome: string): string {
  if (/duration|sleep|performance|focus|memory|productivity|mood|attention/i.test(outcome)) {
    return "reduces";
  }
  if (/risk|rate|level|anxiety|stress|cost|weight|spread|number/i.test(outcome)) {
    return "increases";
  }
  return "changes";
}

function frameOf(claim: string): Frame | null {
  const text = claim.replace(/\s+/g, " ").trim();
  const association = text.match(
    /between\s+(.+?)\s+and\s+(.+?)[.!?]?$/i,
  );
  if (association) {
    const subject = tidy(trimWords(association[1], 6));
    const outcome = tidy(trimWords(association[2], 8));
    if (subject && outcome) {
      return {
        subject,
        outcome,
        verb: causalVerb(outcome),
        quantified: "",
        associational: true,
      };
    }
  }

  const linked = text.match(
    /(?:^|found that |shows? that |suggests? that )(.+?)\s+(?:is|are)\s+(?:linked|associated|tied|connected)\s+(?:to|with)\s+(.+?)[.!?]?$/i,
  );
  if (linked) {
    const subject = tidy(trimWords(linked[1], 6));
    const outcome = tidy(trimWords(linked[2], 8));
    if (subject && outcome) {
      return {
        subject,
        outcome,
        verb: causalVerb(outcome),
        quantified: "",
        associational: true,
      };
    }
  }

  const share = text.match(
    /(\d+(?:\.\d+)?%?)\s+of\s+(.+?)\s+(?:report|reported|say|said|feel|felt|are|were)\s+(.+?)[.!?]?$/i,
  );
  if (share) {
    const subject = tidy(trimWords(share[2], 6));
    const outcome = tidy(trimWords(share[3], 8));
    if (subject && outcome) {
      return {
        subject,
        outcome,
        verb: "changes",
        quantified: share[1],
        associational: false,
      };
    }
  }

  const causal = text.match(
    /^(.+?)\s+(causes?|leads? to|reduces?|increases?|improves?|harms?|prevents?|boosts?)\s+(.+?)[.!?]?$/i,
  );
  if (causal) {
    const subject = tidy(trimWords(causal[1], 6));
    const outcome = tidy(trimWords(causal[3], 8));
    if (subject && outcome) {
      return {
        subject,
        outcome,
        verb: causal[2].toLowerCase(),
        quantified: "",
        associational: false,
      };
    }
  }

  return null;
}

interface DraftInput {
  id: string;
  parentId: string | null;
  text: string;
  kind: MutationKind;
  label: string;
  explanation: string;
  plausibility: string;
  severity: number;
}

function draft(input: DraftInput): PredictionDraft {
  return {
    id: input.id,
    parentId: input.parentId,
    text: input.text,
    kind: input.kind,
    label: input.label,
    explanation: input.explanation,
    plausibility: input.plausibility,
    severity: input.severity,
  };
}

function generationOne(frame: Frame, claim: string): PredictionDraft[] {
  const { subject, outcome, verb, quantified, associational } = frame;

  const alreadyCausal = !associational && /caus|lead/i.test(verb);
  const causation = draft({
    id: "gen1-causation",
    parentId: "claim",
    text: alreadyCausal
      ? `${subject} is a leading cause of ${outcome}.`
      : `${subject} ${verb} ${outcome}.`,
    kind: "causation",
    label: associational ? "Correlation → causation" : "Mechanism escalated",
    explanation: associational
      ? `The source reports that ${subject} and ${outcome} move together. This version states that ${subject} ${verb} ${outcome}, a direction the original evidence cannot establish.`
      : `The original statement describes a relationship. This version turns it into a one-way mechanism in which ${subject} ${verb} ${outcome}.`,
    plausibility:
      "Causal stories are easier to retell than statistical ones, so audiences routinely convert a link into a cause.",
    severity: 74,
  });

  const certainty = draft({
    id: "gen1-certainty",
    parentId: "claim",
    text: `New research proves ${subject} ${verb} ${outcome}.`,
    kind: "certainty",
    label: "False certainty",
    explanation: `The hedge and the study's limits disappear. "${subject}" is presented as settled science, and no room is left for doubt, replication or disagreement.`,
    plausibility:
      "Certainty travels further online: confident claims feel like news, while provisional findings feel like homework.",
    severity: 68,
  });

  const context = draft({
    id: "gen1-context",
    parentId: "claim",
    text: `The link between ${subject} and ${outcome} is stronger than anyone realised.`,
    kind: "context",
    label: "Missing context",
    explanation: `What was measured, in whom, and how strongly all vanish. The claim becomes a free-floating fact about ${subject} and ${outcome}.`,
    plausibility:
      "Once the sample and caveats are dropped, the finding can be repeated anywhere without the audience noticing what was lost.",
    severity: 52,
  });

  const exaggeration = draft({
    id: "gen1-exaggeration",
    parentId: "claim",
    text: `${subject} is far more dangerous than officials admit.`,
    kind: "exaggeration",
    label: "Exaggeration",
    explanation: `A measured finding becomes a danger warning. Severity is added without any new measurement, and the size of the original effect is never mentioned.`,
    plausibility:
      "Danger language earns attention. A modest effect becomes urgent when it is framed as something being hidden.",
    severity: 66,
  });

  const attribution = draft({
    id: "gen1-attribution",
    parentId: "claim",
    text: `Scientists say ${subject} is responsible for ${outcome}.`,
    kind: "attribution",
    label: "Misleading attribution",
    explanation: `An unspecified study becomes "scientists" as a collective. The claim borrows authority while removing the paper a reader could check.`,
    plausibility:
      "Anonymous expert authority is persuasive and difficult to verify, so it survives sharing far better than a citation.",
    severity: 60,
  });

  const generalisation = draft({
    id: "gen1-generalisation",
    parentId: "claim",
    text: `Everyone is affected by ${subject}, not just the people in the study.`,
    kind: "scope",
    label: "Overgeneralization",
    explanation: quotedScope(subject),
    plausibility:
      "Findings from a narrow group are routinely retold as universal advice, because universality makes a claim feel more useful.",
    severity: 58,
  });

  const emotional = draft({
    id: "gen1-emotional",
    parentId: "claim",
    text: `What ${subject} is really doing to ${outcome} will shock you.`,
    kind: "addition",
    label: "Emotional manipulation",
    explanation: `The statement stops informing and starts provoking. "Will shock you" preloads an emotional reaction before any evidence is considered.`,
    plausibility:
      "Emotional framing increases sharing. The promise of a shocking truth is more clickable than a finding described accurately.",
    severity: 55,
  });

  const fallback = draft({
    id: "gen1-certainty",
    parentId: "claim",
    text: `It is now proven that ${claim.replace(/[.!?]+$/, "").toLowerCase()}.`,
    kind: "certainty",
    label: "False certainty",
    explanation:
      "The claim is restated as proof. Whatever uncertainty existed in the original wording is replaced by a verdict.",
    plausibility:
      "Certainty travels further online: confident claims feel like news, while provisional findings feel like homework.",
    severity: 62,
  });

  if (!subject || !outcome) {
    return [
      fallback,
      draft({
        id: "gen1-exaggeration",
        parentId: "claim",
        text: `The reality is far worse than anyone reported: ${claim.replace(/[.!?]+$/, "").toLowerCase()}.`,
        kind: "exaggeration",
        label: "Sensationalism",
        explanation:
          "A plain statement is repackaged as a hidden threat. The wording implies a larger, deliberately concealed truth.",
        plausibility:
          "Sensational framing promises insider knowledge, which makes an ordinary claim feel urgent and shareable.",
        severity: 58,
      }),
      draft({
        id: "gen1-attribution",
        parentId: "claim",
        text: `Experts confirm that ${claim.replace(/[.!?]+$/, "").toLowerCase()}.`,
        kind: "attribution",
        label: "Misleading attribution",
        explanation:
          "An unnamed group of experts is added as support. No institution, paper or statement is identified.",
        plausibility:
          "Anonymous authority is persuasive and hard to check, so it survives sharing better than a citation.",
        severity: 54,
      }),
    ];
  }

  const pool = [causation, certainty, exaggeration, generalisation, attribution, context, emotional];
  if (quantified) {
    pool.splice(1, 0, quantifiedDrift(frame));
  }
  return pool;
}

function quotedScope(subject: string): string {
  return `A finding about a specific group is extended to everyone. The statement now implies that ${subject} affects the whole population, including people the original evidence never examined.`;
}

function quantifiedDrift(frame: Frame): PredictionDraft {
  return draft({
    id: "gen1-quantifier",
    parentId: "claim",
    text: `${frame.subject} affects most people, not just ${frame.quantified}.`,
    kind: "quantifier",
    label: "Quantifier drift",
    explanation: `The measured share (${frame.quantified}) is inflated into "most people". The size of the finding is no longer something a reader could check.`,
    plausibility:
      "Numbers are memorable but easy to round up. A minority finding becomes a majority claim in retelling.",
    severity: 64,
  });
}

const SECOND_GENERATION: Record<
  MutationKind,
  { text: (f: Frame) => string; kind: MutationKind; label: string; explanation: string }
> = {
  causation: {
    kind: "certainty",
    label: "False certainty",
    text: (f) => `Scientists have now proven that ${f.subject} ${f.verb} ${f.outcome}.`,
    explanation:
      "The causal claim acquires proof and a collective authority. Two unsupported steps are now presented as one settled fact.",
  },
  certainty: {
    kind: "attribution",
    label: "Borrowed authority",
    text: (f) => `Government officials are warning about the dangers of ${f.subject}.`,
    explanation:
      "The certainty is transferred to the authorities. A claim about a study becomes a warning from the government that no reader can trace.",
  },
  exaggeration: {
    kind: "addition",
    label: "Emotional manipulation",
    text: (f) => `They do not want you to know what ${f.subject} is doing to ${f.outcome}.`,
    explanation:
      "The warning becomes a conspiracy. Suspicion of hidden actors replaces the evidence a reader would need to judge the claim.",
  },
  attribution: {
    kind: "scope",
    label: "Overgeneralization",
    text: (f) => `No one is safe: ${f.subject} affects every household.`,
    explanation:
      "Expert authority is used to widen the scope. What was a claim about one group becomes a universal threat, including to people never studied.",
  },
  scope: {
    kind: "exaggeration",
    label: "Sensationalism",
    text: (f) => `A silent threat: ${f.subject} is changing ${f.outcome} for good.`,
    explanation:
      "The widened scope is made permanent and frightening. Irreversible harm is implied that the original finding never measured.",
  },
  context: {
    kind: "certainty",
    label: "False certainty",
    text: (f) => `The evidence is clear: ${f.subject} ${f.verb} ${f.outcome}.`,
    explanation:
      "The context-free link is promoted to clear evidence. Nothing about the study is restored, and the reader is told the question is closed.",
  },
  quantifier: {
    kind: "exaggeration",
    label: "Exaggeration",
    text: (f) => `${f.subject} is fuelling a crisis that affects millions.`,
    explanation:
      "An inflated share becomes a crisis of millions. The number grows again while every source for it disappears.",
  },
  omission: {
    kind: "addition",
    label: "Sensationalism",
    text: (f) => `The ${f.subject} problem nobody is talking about.`,
    explanation:
      "What was omitted is replaced by an insinuation of silence and cover-up. The claim now implies a conspiracy rather than a finding.",
  },
  addition: {
    kind: "attribution",
    label: "Misleading attribution",
    text: (f) => `Authorities have known for years that ${f.subject} is harming ${f.outcome}.`,
    explanation:
      "A new accusation appears: that the harm was known and concealed. Nothing in the original statement supports intent or prior knowledge.",
  },
  faithful: {
    kind: "context",
    label: "Missing context",
    text: (f) => `The link between ${f.subject} and ${f.outcome} is stronger than anyone thought.`,
    explanation:
      "A cautious rewording quietly loses the study and its limits, leaving a stronger claim behind.",
  },
};

const THIRD_GENERATION = [
  {
    kind: "certainty" as MutationKind,
    label: "False certainty",
    text: (f: Frame) => `The science is settled: ${f.subject} is permanently damaging ${f.outcome}.`,
    explanation:
      "The escalation is declared permanent and proven. Reversal, replication and uncertainty are no longer part of the story.",
  },
  {
    kind: "exaggeration" as MutationKind,
    label: "Sensationalism",
    text: (f: Frame) => `A national emergency: ${f.subject} is out of control.`,
    explanation:
      "The claim becomes an emergency. Scale, urgency and a response are implied while every supporting detail is gone.",
  },
  {
    kind: "attribution" as MutationKind,
    label: "Borrowed authority",
    text: (f: Frame) => `Authorities have known for years that ${f.subject} is harming ${f.outcome}.`,
    explanation:
      "A new accusation of concealment appears. The claim now implies intent, which the original statement never suggested.",
  },
  {
    kind: "scope" as MutationKind,
    label: "Overgeneralization",
    text: () => "Every one of us is at risk, and nobody is exempt.",
    explanation:
      "The scope is stretched to the whole population. No group, dose or condition is left outside the warning.",
  },
  {
    kind: "addition" as MutationKind,
    label: "Emotional manipulation",
    text: (f: Frame) => `They do not want you to know what ${f.subject} is doing to ${f.outcome}.`,
    explanation:
      "The story adopts a conspiracy frame. Suspicion of hidden actors replaces the evidence a reader would need.",
  },
];

export function localPrediction(
  claim: string,
  depth: number,
  branches: number,
): PredictionDraft[] {
  const frame = frameOf(claim);
  const drafts: PredictionDraft[] = [];
  let frontier: PredictionDraft[] = [];

  if (frame && frame.subject && frame.outcome) {
    const firstGeneration = generationOne(frame, claim).slice(0, branches);
    for (const node of firstGeneration) {
      drafts.push(node);
      frontier.push(node);
    }

    for (let level = 2; level <= depth; level += 1) {
      const next: PredictionDraft[] = [];
      for (const parent of frontier) {
        const template = SECOND_GENERATION[parent.kind ?? "certainty"];
        const child =
          level === 2
            ? draft({
                id: `${parent.id}-g${level}`,
                parentId: parent.id,
                text: template.text(frame),
                kind: template.kind,
                label: template.label,
                explanation: template.explanation,
                plausibility:
                  "Each retelling drops the source and adds certainty, so the next version has less to correct and more to assert.",
                severity: Math.min(96, (parent.severity ?? 60) + 9),
              })
            : (() => {
                const template3 = THIRD_GENERATION[frontier.indexOf(parent) % THIRD_GENERATION.length];
                return draft({
                  id: `${parent.id}-g${level}`,
                  parentId: parent.id,
                  text: template3.text(frame),
                  kind: template3.kind,
                  label: template3.label,
                  explanation: template3.explanation,
                  plausibility:
                    "At this distance from the source, only the emotional shape of the claim survives. The mechanism and its limits are unrecoverable.",
                  severity: Math.min(98, (parent.severity ?? 70) + 8),
                });
              })();
        drafts.push(child);
        next.push(child);
      }
      frontier = next;
    }
    return drafts;
  }

  const trimmedClaim = claim.replace(/[.!?]+$/, "");
  const lc = /^[A-Z][a-z]/.test(trimmedClaim)
    ? `${trimmedClaim.charAt(0).toLowerCase()}${trimmedClaim.slice(1)}`
    : trimmedClaim;
  const first = [
    draft({
      id: "gen1-certainty",
      parentId: "claim",
      text: `It is now proven that ${lc}.`,
      kind: "certainty",
      label: "False certainty",
      explanation:
        "The claim is restated as proof. Whatever uncertainty existed in the original wording is replaced by a verdict.",
      plausibility:
        "Certainty travels further online: confident claims feel like news, while provisional findings feel like homework.",
      severity: 62,
    }),
    draft({
      id: "gen1-exaggeration",
      parentId: "claim",
      text: `The reality is far worse than anyone reported: ${lc}.`,
      kind: "exaggeration",
      label: "Sensationalism",
      explanation:
        "A plain statement is repackaged as a hidden threat. The wording implies a larger, deliberately concealed truth.",
      plausibility:
        "Sensational framing promises insider knowledge, which makes an ordinary claim feel urgent and shareable.",
      severity: 58,
    }),
    draft({
      id: "gen1-attribution",
      parentId: "claim",
      text: `Experts confirm that ${lc}.`,
      kind: "attribution",
      label: "Misleading attribution",
      explanation:
        "An unnamed group of experts is added as support. No institution, paper or statement is identified.",
      plausibility:
        "Anonymous authority is persuasive and hard to check, so it survives sharing better than a citation.",
      severity: 54,
    }),
  ].slice(0, branches);

  for (const node of first) {
    drafts.push(node);
    frontier.push(node);
  }

  for (let level = 2; level <= depth; level += 1) {
    const next: PredictionDraft[] = [];
    for (const parent of frontier) {
      const index = frontier.indexOf(parent);
      const escalation =
        level === 2
          ? [
              `Officials are ignoring the fact that ${lc}.`,
              `Researchers say the problem is worse than reported: ${lc}.`,
            ]
          : [
              `The mainstream media will not tell you that ${lc}.`,
              `What they are hiding is simple: ${lc}.`,
            ];
      const child = draft({
        id: `${parent.id}-g${level}`,
        parentId: parent.id,
        text: escalation[index % escalation.length],
        kind: level === 2 ? "context" : "addition",
        label: level === 2 ? "Missing context" : "Emotional manipulation",
        explanation:
          level === 2
            ? "The claim acquires an accusation of silence. What was missing from the original is recast as something being hidden."
            : "The story becomes a cover-up. Suspicion replaces any evidence the reader could check.",
        plausibility:
          "Conspiracy framing is self-sealing: the absence of coverage becomes proof that the story is being suppressed.",
        severity: Math.min(96, (parent.severity ?? 60) + 10),
      });
      drafts.push(child);
      next.push(child);
    }
    frontier = next;
  }

  return drafts;
}

function evidenceFor(parent: string, child: string): { removed: string[]; added: string[] } {
  const analysis = analyzePair(parent, child);
  const withEvidence = analysis.find(
    (mutation) =>
      mutation.evidence.removed.length > 0 || mutation.evidence.added.length > 0,
  );
  if (withEvidence) return withEvidence.evidence;

  const parentLower = parent.toLowerCase();
  const childLower = child.toLowerCase();
  const parentWords = parent
    .split(/\s+/)
    .map((word) => word.replace(/^[^\w%]+|[^\w%]+$/g, ""))
    .filter((word) => word.length > 3 && !childLower.includes(word.toLowerCase()));
  const childWords = child
    .split(/\s+/)
    .map((word) => word.replace(/^[^\w%]+|[^\w%]+$/g, ""))
    .filter((word) => word.length > 3 && !parentLower.includes(word.toLowerCase()));

  return {
    removed: parentWords.slice(0, 3),
    added: childWords.slice(0, 3),
  };
}

function sentenceCase(text: string): string {
  return /^[a-z]/.test(text) ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

function buildMutation(parent: string, child: string, source: PredictionDraft): Mutation {
  const evidence = evidenceFor(parent, child);
  const kind = source.kind ?? "exaggeration";
  return {
    kind,
    severity: Math.max(0, Math.min(100, source.severity ?? 60)),
    label: source.label ?? "Predicted change",
    explanation: source.explanation ?? "The meaning changes at this step.",
    direction: "up",
    evidence: {
      removed: source.removed ?? evidence.removed,
      added: source.added ?? evidence.added,
    },
    plausibility: source.plausibility,
    lost: source.lost,
  };
}

export interface BuildPredictionParams {
  id: string;
  claim: string;
  drafts: PredictionDraft[];
  engine: Engine;
  message?: string;
  verdict?: string;
}

export function buildPrediction(params: BuildPredictionParams): Chain {
  const drafts = params.drafts.slice(0, PREDICTION_MAX_NODES);
  const rootId = "claim";
  const nodes: StatementNode[] = [
    {
      id: rootId,
      parentId: null,
      text: params.claim,
      mutations: [],
      source: params.engine,
    },
  ];
  const accepted = new Map<string, StatementNode>([[rootId, nodes[0]]]);
  const acceptedDrafts = new Map<string, PredictionDraft>();

  for (const draftNode of drafts) {
    if (!draftNode || typeof draftNode.id !== "string") continue;
    const id = draftNode.id.trim();
    if (!id || id === rootId || accepted.has(id)) continue;
    const parentId = draftNode.parentId;
    if (!parentId || !accepted.has(parentId)) continue;
    const text = sentenceCase(String(draftNode.text ?? "").trim());
    if (text.length < 8) continue;

    let cursor: StatementNode | undefined = accepted.get(parentId);
    let generation = 1;
    let cycles = false;
    while (cursor) {
      if (cursor.id === id) {
        cycles = true;
        break;
      }
      if (cursor.parentId) generation += 1;
      cursor = cursor.parentId ? accepted.get(cursor.parentId) : undefined;
    }
    if (cycles || generation > PREDICTION_MAX_DEPTH) continue;

    const node: StatementNode = {
      id,
      parentId,
      text,
      mutations: [],
      source: params.engine,
    };
    accepted.set(id, node);
    acceptedDrafts.set(id, { ...draftNode, text });
    nodes.push(node);
  }

  const edges: InvestigationEdge[] = [];
  for (const node of nodes) {
    if (!node.parentId) continue;
    const parent = accepted.get(node.parentId);
    const source = acceptedDrafts.get(node.id);
    if (!parent || !source) continue;
    const mutation = buildMutation(parent.text, node.text, source);
    node.mutations = [mutation];
    edges.push({
      id: `edge-${node.id}`,
      sourceId: parent.id,
      targetId: node.id,
      relationship:
        node.parentId === rootId
          ? "inferred"
          : "insufficient",
      confidence: node.parentId === rootId ? "high" : "medium",
      verificationNote:
        "AI-generated hypothetical prediction. It describes a plausible change in meaning, not a documented propagation path.",
      mutations: [mutation],
    });
  }

  const linked = new Set<string>();
  for (const edge of edges) {
    linked.add(edge.sourceId);
    linked.add(edge.targetId);
  }
  for (const node of nodes) node.unlinked = !linked.has(node.id);

  const title = params.claim.length > 62 ? `${params.claim.slice(0, 59)}…` : params.claim;
  return {
    id: params.id,
    title,
    original: params.claim,
    nodes,
    edges,
    verdict:
      params.verdict?.trim() ||
      `${edges.length} predicted ${edges.length === 1 ? "step" : "steps"} across ${Math.max(1, ...nodes.map((node) => generationOf(node, accepted)))} ${nodes.length > 2 ? "generations" : "generation"}.`,
    engine: params.engine,
    message: params.message,
    mode: "predict",
  };
}

export function generationOf(
  node: StatementNode,
  byId: Map<string, StatementNode>,
): number {
  let generation = 0;
  let cursor = node;
  const seen = new Set<string>();
  while (cursor.parentId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    generation += 1;
    const parent = byId.get(cursor.parentId);
    if (!parent) break;
    cursor = parent;
  }
  return generation;
}
