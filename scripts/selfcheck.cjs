const assert = require("node:assert/strict");
const { EXAMPLES } = require("../.selfcheck/examples.js");
const { analyzePair, buildChain } = require("../.selfcheck/analyze.js");
const {
  layoutChain,
  driftScore,
  pathTo,
  bandFor,
  deepestNode,
} = require("../.selfcheck/graph.js");
const { encodeChain, decodeChain } = require("../.selfcheck/share.js");

let checks = 0;
let failures = 0;

function ok(name, condition, detail) {
  checks += 1;
  if (condition) {
    console.log(`ok    ${name}`);
    return;
  }
  failures += 1;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function evidenceIsVerbatim(label, mutation, parentText, rewriteText) {
  for (const phrase of mutation.evidence.removed) {
    ok(
      `${label}: removed quote exists in the parent`,
      parentText.toLowerCase().includes(phrase.toLowerCase()),
      `"${phrase}" not in "${parentText}"`,
    );
  }
  for (const phrase of mutation.evidence.added) {
    ok(
      `${label}: added quote exists in the rewrite`,
      rewriteText.toLowerCase().includes(phrase.toLowerCase()),
      `"${phrase}" not in "${rewriteText}"`,
    );
  }
}

const byId = (chain, id) => chain.nodes.find((node) => node.id === id);
const kindsOf = (node) => node.mutations.map((mutation) => mutation.kind);

for (const chain of EXAMPLES) {
  ok(`${chain.id}: has a root`, Boolean(chain.nodes[0]) && chain.nodes[0].parentId === null);
  ok(`${chain.id}: verdict is written`, chain.verdict.length > 20);

  for (const node of chain.nodes) {
    if (!node.parentId) continue;
    const parent = byId(chain, node.parentId);
    ok(`${chain.id}/${node.id}: parent exists`, Boolean(parent));
    ok(`${chain.id}/${node.id}: has transformations`, node.mutations.length > 0);

    for (const mutation of node.mutations) {
      evidenceIsVerbatim(`${chain.id}/${node.id}#${mutation.kind}`, mutation, parent.text, node.text);
      ok(
        `${chain.id}/${node.id}#${mutation.kind}: severity 0-100`,
        mutation.severity >= 0 && mutation.severity <= 100,
      );
      ok(
        `${chain.id}/${node.id}#${mutation.kind}: explanation is substantive`,
        mutation.explanation.length > 40,
      );
    }
  }
}

const sleep = EXAMPLES[0];
const m1 = byId(sleep, "sleep-m1");
const m2 = byId(sleep, "sleep-m2");
const faithful = byId(sleep, "sleep-faithful");

ok("hero chain has four nodes", sleep.nodes.length === 4);
ok(
  "hero root is the sentence from the brief",
  sleep.nodes[0].text === "A study found an association between screen time and sleep duration.",
);
ok("mutation 1 is correlation -> causation", kindsOf(m1).includes("causation"));
ok("mutation 1 drops the evidence trail", kindsOf(m1).includes("context"));
ok("mutation 2 inflates certainty", kindsOf(m2).includes("certainty"));
ok("mutation 2 borrows authority", kindsOf(m2).includes("attribution"));
ok("faithful branch carries a faithful record", kindsOf(faithful).includes("faithful"));

const driftFaithful = driftScore(pathTo("sleep-faithful", sleep.nodes));
const driftM1 = driftScore(pathTo("sleep-m1", sleep.nodes));
const driftM2 = driftScore(pathTo("sleep-m2", sleep.nodes));

ok("faithful branch stays faithful", bandFor(driftFaithful).key === "faithful", `drift ${driftFaithful}`);
ok(
  "first mutation is distorted, not detached",
  bandFor(driftM1).key === "distorted",
  `drift ${driftM1} -> ${bandFor(driftM1).label}`,
);
ok("drift increases along the chain", driftFaithful < driftM1 && driftM1 < driftM2);
ok("deepest node is the final mutation", deepestNode(sleep).id === "sleep-m2");
console.log(
  `      drift: faithful=${driftFaithful} m1=${driftM1} (${bandFor(driftM1).label}) m2=${driftM2} (${bandFor(driftM2).label})`,
);

const layout = layoutChain(sleep);
const at = (id) => layout.byId.get(id);
ok("root sits in the first column", at("sleep").x === 0);
ok("the two branches share a column", at("sleep-faithful").x === at("sleep-m1").x);
ok("the second step moves right", at("sleep-m2").x > at("sleep-m1").x);
ok("branches do not overlap vertically", at("sleep-faithful").y !== at("sleep-m1").y);
ok("layout width covers the last column", layout.width >= at("sleep-m2").x + 300);

const heroSource = "A study found an association between screen time and sleep duration.";
const heroStep1 = "Screen time reduces sleep.";
const heroStep2 = "Scientists prove phones cause serious sleep problems.";

const offline1 = analyzePair(heroSource, heroStep1);
const offline2 = analyzePair(heroStep1, heroStep2);

ok("offline finds causation on step 1", kindsOf({ mutations: offline1 }).includes("causation"));
ok("offline finds dropped context on step 1", kindsOf({ mutations: offline1 }).includes("context"));
ok("offline detects borrowed authority", kindsOf({ mutations: offline2 }).includes("attribution"), kindsOf({ mutations: offline2 }).join(","));
ok("offline detects certainty inflation", kindsOf({ mutations: offline2 }).includes("certainty"));
ok("offline detects exaggeration", kindsOf({ mutations: offline2 }).includes("exaggeration"));
ok("offline caps transformations at five", offline1.length <= 5 && offline2.length <= 5);

for (const mutation of offline1) {
  evidenceIsVerbatim(`offline/step1#${mutation.kind}`, mutation, heroSource, heroStep1);
}
for (const mutation of offline2) {
  evidenceIsVerbatim(`offline/step2#${mutation.kind}`, mutation, heroStep1, heroStep2);
}

const chain = buildChain({
  id: "test",
  title: "Test chain",
  original: heroSource,
  rewrites: [
    { id: "r1", text: heroStep1, parentId: "root" },
    { id: "r2", text: heroStep2, parentId: "r1" },
    { id: "r3", text: "How long people sleep may be linked to screen time.", parentId: "root" },
    { id: "r4", text: "Phones are bad.", parentId: "missing" },
  ],
  engine: "heuristic",
});

ok("buildChain keeps every rewrite", chain.nodes.length === 5);
ok("a dangling parent attaches to the root", byId(chain, "r4").parentId === "root");
ok("a verdict is generated", chain.verdict.length > 10, chain.verdict);
ok("every rewrite gains transformations", chain.nodes.slice(1).every((node) => node.mutations.length > 0));
ok("layout survives the branch", layoutChain(chain).nodes.length === 5);

const edgeCases = [
  ["", ""],
  ["same", "same"],
  ["A study found a link.", "A study found a link."],
  ["One two three.", "Three two one."],
  ["Data show a trend.", "DATA SHOW A TREND!"],
  ["A study found an association.", "x"],
];

for (const [before, after] of edgeCases) {
  let survived = true;
  let result = [];
  try {
    result = analyzePair(before, after);
  } catch (error) {
    survived = false;
    console.error(error.message);
  }
  ok(`analyzePair survives ${JSON.stringify(before)} -> ${JSON.stringify(after)}`, survived && result.length > 0);
}

sleep.nodes[0].sources = [
  { label: "Example research", url: "https://example.org/research" },
];
const url = encodeChain(sleep);
const decoded = decodeChain(url);
const countMutations = (c) => c.nodes.reduce((total, node) => total + node.mutations.length, 0);

ok("permalink decodes", decoded !== null);
ok("permalink keeps every node", decoded.nodes.length === sleep.nodes.length);
ok("permalink keeps every mutation", countMutations(decoded) === countMutations(sleep));
ok("permalink keeps evidence quotes", decoded.nodes[2].mutations[0].evidence.removed.length > 0);
ok("permalink keeps severities", decoded.nodes[3].mutations[0].severity === 84);
ok("permalink keeps claim sources", decoded.nodes[0].sources[0].url === "https://example.org/research");
ok("permalink rejects garbage", decodeChain("not-a-chain") === null);
console.log(`      permalink: ${url.length} chars for ${sleep.nodes.length} nodes`);

const heuristicUrl = encodeChain(chain);
ok("permalink handles heuristic chains", decodeChain(heuristicUrl).nodes.length === chain.nodes.length);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} failing checks`);
  process.exit(1);
}
