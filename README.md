# Mutagraph

Most misinformation tools label a sentence true or false. Mutagraph shows the
**route** a sentence took: which hedge became proof, which association became a
cause, which qualifier was dropped, and which exact words did it.

Enter a source statement plus the versions it turned into, and you get a
branching provenance graph where every edge is a named transformation, every
transformation carries a severity, and every claim about "what changed" points
at the words in the diff that changed it.

```text
A study found an association between screen time and sleep duration.
├── A study found that screen time is associated with how long people sleep.   faithful · drift 3
└── Screen time reduces sleep.                                                 drift 55
    └── Scientists prove phones cause serious sleep problems.                  drift 88
```

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

The app works with no configuration: the built-in offline analyser compares
statements word by word and classifies the transformations it finds. Add
`GROQ_API_KEY` to enable web search for claim sources alongside the graph. To let
Anthropic classify and explain statement changes as well, add its key:

```bash
cp .env.example .env.local
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4-5   # optional
# GROQ_API_KEY=gsk_...                # enables claim source search
npm run dev
```

Keys are only read by server-side API routes and are never sent to the browser
or stored client-side. Groq browser search uses `openai/gpt-oss-120b`; source
links come from search results returned by Groq, not model-generated URLs.

Other scripts: `npm run build`, `npm run start`, `npm run typecheck`, and
`npm run selfcheck` (216 assertions over the diff, classifier, layout and
permalink encoding).

## What is on screen

| Area | What it does |
| --- | --- |
| Example rail | Six curated chains, each showing its worst drift score at a glance |
| Composer | Original statement + up to six rewrites; each rewrite picks its parent, so chains branch |
| Canvas | React Flow tree: statement cards, colour-coded mutation edges, drift per node |
| Inspector | Drift band, transformation cards with severity bars and evidence, word diff, provenance trail |
| Play the mutation | Walks the deepest path one transformation at a time |
| Copy permalink | Encodes the whole analysed graph into the URL fragment — no server, no key, identical rendering |

Hovering a transformation card lights up the exact words it is responsible for
in the word diff. Clicking any edge or breadcrumb step re-focuses the inspector.

## The taxonomy

The product's vocabulary, defined once in `src/lib/taxonomy.ts` and shared by
the legend, the graph colours, the offline engine and the model prompt:

| Kind | The move |
| --- | --- |
| `causation` | "Associated with" restated as "causes / reduces / makes" |
| `certainty` | Hedges harden into proof, or hard evidence is softened away |
| `context` | Sample, dose, duration, population or the authors' caveat disappears |
| `exaggeration` | Severity or intensity added that was never measured |
| `attribution` | An unnamed study becomes "scientists", "doctors", an institution |
| `scope` | Subject or population changes (screen time → phones, burglaries → crime) |
| `quantifier` | "Slightly", "30%", "some" become "all" or "millions" |
| `omission` | Load-bearing evidence silently removed |
| `addition` | A conclusion appears that the source never contained |
| `faithful` | Reworded with strength, scope and evidence intact — the control case |

Drift compounds along a path (`1 − Π(1 − severity/240)`), so a small omission
plus a small exaggeration lands further out than either alone. Bands:
faithful < 12 ≤ drifted < 40 ≤ distorted < 70 ≤ detached.

## How the analysis is produced

1. **Word diff** (`src/lib/diff.ts`) — dependency-free LCS over word tokens.
   This is the ground truth for evidence: if a transformation quotes words that
   are not in the diff, the interface cannot highlight them.
2. **Offline classifier** (`src/lib/analyze.ts`) — lexicons for causal verbs,
   hedges, absolutes, authority nouns, qualifier patterns and intensifiers,
   run against the diff. Each detector claims the tokens it explains, so
   detectors do not pile onto the same words. Deterministic and always
   available.
3. **Model pass** (`src/lib/anthropic.ts`) — when a key is present, the same
   pairs are sent to the Messages API with a **forced tool call**, so the reply
   is schema-validated JSON in the app's own taxonomy. Evidence must be
   verbatim substrings of the two statements. If the call fails, returns
   nothing usable, or the key is missing, the route falls back to the offline
   result and says so in the UI.

Curated chains ship with hand-authored transformation records: the demo is
exact, and the interface shows the same data shape the live analyser produces.

## Layout

```
src/
  app/
    layout.tsx            metadata + global CSS + React Flow stylesheet
    page.tsx              renders <Lab/>
    globals.css           the whole visual system (no CSS framework)
    api/analyze/route.ts  validation, rate limit, model call, fallback
  components/
    Lab.tsx               shell: rail, stage, inspector, playback, sharing, about
    Graph.tsx             React Flow canvas, layout, path highlighting
    StatementNode.tsx     statement card node
    MutationEdge.tsx      labelled, colour-coded edge
    Inspector.tsx         drift, transformation cards, provenance
    WordDiff.tsx          inline diff with word highlighting
    Composer.tsx          branching input form
    Legend.tsx            taxonomy reference
  lib/
    types.ts               domain model
    taxonomy.ts            the ten mutations + colours + definitions
    diff.ts                LCS word diff
    analyze.ts             offline engine + chain builder
    anthropic.ts           server-only structured model call
    graph.ts               tree layout, drift, path helpers
    examples.ts            six curated chains
    share.ts               permalink encode/decode
```

## Honest limits

- The example chains are **illustrative, not real papers**. The transformations
  are the recurring patterns; the sentences were written to demonstrate them.
- The offline analyser is lexicon-driven. It finds the named moves reliably in
  short statements and will miss sarcasm, ellipsis, or a rewrite that changes
  meaning with no lexical signal.
- Drift scores are a communication device, not a measurement. They rank how much
  a reader's conclusion moved, not the probability that a claim is false.
- Attribution is described, never asserted: the app will say a rewrite invents
  authority, not that a named institution endorsed anything.
- The rate limit is per server instance and in-memory; put it in a shared store
  before running this publicly at scale.

## If you keep going

- Export a chain as PNG/SVG for publication.
- Compare two branches directly ("what does this version have that this one
  lost?") instead of always measuring against the parent.
- Reverse mode: paste a viral headline, propose the neutral version, and show
  what evidence would be needed to support it.
- Cohort view: run one claim through five outlets and cluster the mutation
  paths that recur.
