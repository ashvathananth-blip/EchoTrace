import type { Chain, RewriteInput } from "./types";

export const EXAMPLES: Chain[] = [
  {
    id: "sleep",
    title: "Screen time & sleep",
    original: "A study found an association between screen time and sleep duration.",
    verdict:
      "A correlational finding becomes a cause, then borrows the authority of 'scientists' and gains a clinical adjective.",
    engine: "curated",
    nodes: [
      {
        id: "sleep",
        parentId: null,
        text: "A study found an association between screen time and sleep duration.",
        mutations: [],
        source: "curated",
      },
      {
        id: "sleep-faithful",
        parentId: "sleep",
        text: "A study found that screen time is associated with how long people sleep.",
        source: "curated",
        mutations: [
          {
            kind: "faithful",
            severity: 8,
            direction: "shift",
            label: "Faithful restatement",
            explanation:
              "Same claim, same strength, same hedge. 'Is associated with' keeps the correlational limit of the source, and the study is still named as the thing making the claim.",
            evidence: {
              removed: ["association between"],
              added: ["is associated with"],
            },
          },
        ],
      },
      {
        id: "sleep-m1",
        parentId: "sleep",
        text: "Screen time reduces sleep.",
        source: "curated",
        mutations: [
          {
            kind: "causation",
            severity: 88,
            direction: "shift",
            label: "Correlation → causation",
            explanation:
              "'Association' says only that the two move together. 'Reduces' asserts that one produces the other, and picks a direction. An observational study cannot rule out reverse causation — short sleep drives more scrolling — or a third factor such as age, stress or bedtime routine.",
            evidence: {
              removed: ["found an association between screen time and sleep duration"],
              added: ["reduces sleep"],
            },
          },
          {
            kind: "context",
            severity: 70,
            direction: "shift",
            label: "Evidence trail dropped",
            explanation:
              "The sentence no longer says a study found anything. The finding becomes an unattributed fact, and the reader loses the only cue that this came from one observational study.",
            evidence: {
              removed: ["A study found"],
              added: [],
            },
          },
        ],
      },
      {
        id: "sleep-m2",
        parentId: "sleep-m1",
        text: "Scientists prove phones cause serious sleep problems.",
        source: "curated",
        mutations: [
          {
            kind: "certainty",
            severity: 84,
            direction: "up",
            label: "Certainty inflation",
            explanation:
              "'Reduces' allowed degrees and doubt. 'Prove' declares the question closed. Scientific findings are probabilistic and provisional, and nothing in the source established proof.",
            evidence: {
              removed: ["reduces"],
              added: ["prove"],
            },
          },
          {
            kind: "attribution",
            severity: 74,
            direction: "shift",
            label: "Borrowed authority",
            explanation:
              "The previous step has no attribution at all — it is a bare claim. 'Scientists prove' installs a collective authority that the chain never earned, and it reads like consensus while there is nobody left to check it against.",
            evidence: {
              removed: [],
              added: ["Scientists"],
            },
          },
          {
            kind: "scope",
            severity: 58,
            direction: "shift",
            label: "Scope narrowed",
            explanation:
              "'Screen time' covers phones, laptops, tablets and television. Swapping in 'phones' keeps the study's authority while making a claim the study never isolated.",
            evidence: {
              removed: ["Screen time"],
              added: ["phones"],
            },
          },
          {
            kind: "exaggeration",
            severity: 54,
            direction: "up",
            label: "Severity added",
            explanation:
              "'Serious sleep problems' adds a clinical weight the source never measured. The outcome under study was sleep duration, not insomnia, anxiety or a diagnosed disorder.",
            evidence: {
              removed: ["sleep"],
              added: ["serious sleep problems"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "coffee",
    title: "Coffee & lifespan",
    original:
      "A cohort study found that moderate coffee consumption was associated with slightly lower mortality in adults over 50.",
    verdict:
      "A cautious cohort result becomes a lifestyle instruction, then a medical endorsement.",
    engine: "curated",
    nodes: [
      {
        id: "coffee",
        parentId: null,
        text: "A cohort study found that moderate coffee consumption was associated with slightly lower mortality in adults over 50.",
        mutations: [],
        source: "curated",
      },
      {
        id: "coffee-m1",
        parentId: "coffee",
        text: "Coffee makes you live longer.",
        source: "curated",
        mutations: [
          {
            kind: "causation",
            severity: 86,
            direction: "shift",
            label: "Correlation → causation",
            explanation:
              "A cohort study compares groups that already differ. 'Makes you live longer' claims an individual benefit produced by coffee. Cohort data can show a statistical link; it cannot tell you what happens if you start drinking it.",
            evidence: {
              removed: ["was associated with"],
              added: ["makes you live longer"],
            },
          },
          {
            kind: "context",
            severity: 82,
            direction: "shift",
            label: "Design, dose and population dropped",
            explanation:
              "Three load-bearing details vanish: the study design (observational cohort), the dose ('moderate'), and the population ('adults over 50'). The claim now reads as advice for everyone.",
            evidence: {
              removed: ["A cohort study", "moderate", "in adults over 50"],
              added: [],
            },
          },
          {
            kind: "quantifier",
            severity: 52,
            direction: "up",
            label: "Effect size inflated",
            explanation:
              "'Slightly lower mortality' is a small difference in death rates across a population. 'Live longer' is a promise one person can hold. The size of the effect is no longer checkable.",
            evidence: {
              removed: ["slightly lower mortality"],
              added: ["live longer"],
            },
          },
        ],
      },
      {
        id: "coffee-m2",
        parentId: "coffee-m1",
        text: "Doctors confirm coffee is the key to a long life.",
        source: "curated",
        mutations: [
          {
            kind: "attribution",
            severity: 84,
            direction: "shift",
            label: "Borrowed authority",
            explanation:
              "No doctors appear anywhere in the source. 'Doctors confirm' installs a professional consensus, which converts one observational study into clinical guidance.",
            evidence: {
              removed: [],
              added: ["Doctors confirm"],
            },
          },
          {
            kind: "certainty",
            severity: 76,
            direction: "up",
            label: "Certainty inflation",
            explanation:
              "'Confirms' implies the question was tested and closed. The source reported a modest association and did not confirm anything.",
            evidence: {
              removed: ["makes"],
              added: ["confirm"],
            },
          },
          {
            kind: "exaggeration",
            severity: 64,
            direction: "up",
            label: "Single factor promoted",
            explanation:
              "'The key to a long life' turns one dietary factor into the decisive one, in a domain where no single food determines lifespan.",
            evidence: {
              removed: ["live longer"],
              added: ["the key to a long life"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "chocolate",
    title: "Chocolate & mood",
    original:
      "In a 30-person trial, dark chocolate was associated with modest mood improvements, but the authors warned the effect could be placebo.",
    verdict:
      "A tiny, self-caveated trial becomes a general mood booster, then a treatment for depression.",
    engine: "curated",
    nodes: [
      {
        id: "chocolate",
        parentId: null,
        text: "In a 30-person trial, dark chocolate was associated with modest mood improvements, but the authors warned the effect could be placebo.",
        mutations: [],
        source: "curated",
      },
      {
        id: "chocolate-m1",
        parentId: "chocolate",
        text: "Dark chocolate boosts mood.",
        source: "curated",
        mutations: [
          {
            kind: "context",
            severity: 90,
            direction: "shift",
            label: "Sample and caveat dropped",
            explanation:
              "Two facts vanish: there were 30 participants, and the authors themselves warned the effect could be placebo. Those are exactly the details a reader needs to weigh the claim.",
            evidence: {
              removed: [
                "In a 30-person trial",
                "but the authors warned the effect could be placebo",
              ],
              added: [],
            },
          },
          {
            kind: "causation",
            severity: 80,
            direction: "shift",
            label: "Correlation → causation",
            explanation:
              "'Was associated with modest mood improvements' describes a co-movement in a small sample. 'Boosts mood' states a mechanism and an effect that the trial did not establish.",
            evidence: {
              removed: ["was associated with modest mood improvements"],
              added: ["boosts mood"],
            },
          },
          {
            kind: "exaggeration",
            severity: 42,
            direction: "up",
            label: "Intensity raised",
            explanation:
              "'Modest' is a measured word the authors chose. 'Boosts' removes the modesty while keeping the same evidence behind it.",
            evidence: {
              removed: ["modest"],
              added: ["boosts"],
            },
          },
        ],
      },
      {
        id: "chocolate-m2",
        parentId: "chocolate-m1",
        text: "Chocolate cures depression.",
        source: "curated",
        mutations: [
          {
            kind: "addition",
            severity: 92,
            direction: "shift",
            label: "Clinical claim invented",
            explanation:
              "Depression was never measured. A mood rating in 30 people becomes a cure for a diagnosed condition — a claim that would require a clinical trial with a control arm and a clinician-rated outcome.",
            evidence: {
              removed: [],
              added: ["cures depression"],
            },
          },
          {
            kind: "exaggeration",
            severity: 88,
            direction: "up",
            label: "Effect escalated",
            explanation:
              "'Boosts' becomes 'cures'. Improvement and cure sit at opposite ends of the clinical vocabulary, and only one of them is reversible or partial.",
            evidence: {
              removed: ["boosts mood"],
              added: ["cures"],
            },
          },
          {
            kind: "scope",
            severity: 68,
            direction: "shift",
            label: "Scope broadened",
            explanation:
              "The study used dark chocolate at a specific dose. 'Chocolate' includes milk chocolate, chocolate biscuits, and whatever else is on the shelf.",
            evidence: {
              removed: ["Dark chocolate"],
              added: ["Chocolate"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "streetlights",
    title: "Streetlights & crime",
    original:
      "A city reported a 12% drop in burglaries in neighborhoods that got new streetlights; researchers said the cause is unclear.",
    verdict:
      "An explicitly unexplained 12% local drop becomes a cause, then a total elimination.",
    engine: "curated",
    nodes: [
      {
        id: "streetlights",
        parentId: null,
        text: "A city reported a 12% drop in burglaries in neighborhoods that got new streetlights; researchers said the cause is unclear.",
        mutations: [],
        source: "curated",
      },
      {
        id: "streetlights-m1",
        parentId: "streetlights",
        text: "Streetlights cut crime by 12%.",
        source: "curated",
        mutations: [
          {
            kind: "causation",
            severity: 90,
            direction: "shift",
            label: "Explicit doubt removed",
            explanation:
              "The source ends with 'researchers said the cause is unclear'. The rewrite keeps the number and deletes the doubt, turning an unexplained correlation into a working intervention.",
            evidence: {
              removed: ["researchers said the cause is unclear"],
              added: ["cut"],
            },
          },
          {
            kind: "context",
            severity: 70,
            direction: "shift",
            label: "Setting generalised",
            explanation:
              "One city, a handful of neighborhoods, no comparison group. Those limits disappear, so the finding reads as a general law about lighting and crime.",
            evidence: {
              removed: ["A city reported", "in neighborhoods that got new streetlights"],
              added: [],
            },
          },
          {
            kind: "scope",
            severity: 58,
            direction: "shift",
            label: "Outcome widened",
            explanation:
              "The reported drop was in burglaries. 'Crime' sweeps in assault, fraud, vandalism and shoplifting — categories this data never covered.",
            evidence: {
              removed: ["burglaries"],
              added: ["crime"],
            },
          },
        ],
      },
      {
        id: "streetlights-m2",
        parentId: "streetlights-m1",
        text: "Streetlights eliminate crime.",
        source: "curated",
        mutations: [
          {
            kind: "exaggeration",
            severity: 92,
            direction: "up",
            label: "Effect made total",
            explanation:
              "'Eliminate' allows no remainder. A 12% drop means 88% of burglaries still happened, so the rewrite claims the opposite of what the number showed.",
            evidence: {
              removed: ["cut", "by 12%"],
              added: ["eliminate"],
            },
          },
          {
            kind: "context",
            severity: 58,
            direction: "shift",
            label: "Only number removed",
            explanation:
              "The one quantity in the sentence disappears. With no percentage left, a reader has no way to test how large the effect was, or that it was small.",
            evidence: {
              removed: ["12%"],
              added: [],
            },
          },
        ],
      },
    ],
  },
  {
    id: "ai-jobs",
    title: "AI & jobs",
    original:
      "In a survey of 1,000 managers, 30% said they expect to use AI for some tasks within five years.",
    verdict:
      "Managers' stated intentions become a labour-market forecast, then a present-tense mass layoff.",
    engine: "curated",
    nodes: [
      {
        id: "ai-jobs",
        parentId: null,
        text: "In a survey of 1,000 managers, 30% said they expect to use AI for some tasks within five years.",
        mutations: [],
        source: "curated",
      },
      {
        id: "ai-jobs-m1",
        parentId: "ai-jobs",
        text: "30% of jobs will be replaced by AI.",
        source: "curated",
        mutations: [
          {
            kind: "scope",
            severity: 84,
            direction: "shift",
            label: "Sample becomes population",
            explanation:
              "The 30% refers to surveyed managers, and the subject was 'some tasks'. The rewrite makes 30% refer to all jobs. Two different denominators now wear the same number.",
            evidence: {
              removed: ["In a survey of 1,000 managers"],
              added: ["of jobs"],
            },
          },
          {
            kind: "context",
            severity: 78,
            direction: "shift",
            label: "Method and horizon dropped",
            explanation:
              "A self-reported survey, a one-in-five-years horizon and the word 'some' all disappear. What remains sounds like an audited statistic rather than a set of intentions.",
            evidence: {
              removed: ["of 1,000 managers", "for some tasks", "within five years"],
              added: [],
            },
          },
          {
            kind: "certainty",
            severity: 66,
            direction: "up",
            label: "Expectation becomes prediction",
            explanation:
              "'Said they expect to' reports what managers believe. 'Will' asserts what is going to happen. The rewrite quietly swaps a survey answer for a forecast.",
            evidence: {
              removed: ["said they expect to"],
              added: ["will"],
            },
          },
        ],
      },
      {
        id: "ai-jobs-m2",
        parentId: "ai-jobs-m1",
        text: "AI is already eliminating millions of jobs.",
        source: "curated",
        mutations: [
          {
            kind: "certainty",
            severity: 74,
            direction: "up",
            label: "Future moved to present",
            explanation:
              "'Within five years' becomes 'is already'. An expectation about the future is restated as an observed event that has happened.",
            evidence: {
              removed: ["will be replaced"],
              added: ["is already eliminating"],
            },
          },
          {
            kind: "exaggeration",
            severity: 82,
            direction: "up",
            label: "Invented magnitude",
            explanation:
              "No count of jobs exists in the source. 'Millions' supplies a scale that the survey never measured and cannot support.",
            evidence: {
              removed: [],
              added: ["millions of jobs"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "exercise",
    title: "Exercise & memory",
    original:
      "In a 12-week study of 40 older adults, moderate exercise was associated with better recall on one memory test.",
    verdict:
      "One small memory test becomes a general cognitive benefit, then a dementia prevention claim.",
    engine: "curated",
    nodes: [
      {
        id: "exercise",
        parentId: null,
        text: "In a 12-week study of 40 older adults, moderate exercise was associated with better recall on one memory test.",
        mutations: [],
        source: "curated",
      },
      {
        id: "exercise-m1",
        parentId: "exercise",
        text: "Exercise improves memory.",
        source: "curated",
        mutations: [
          {
            kind: "context",
            severity: 88,
            direction: "shift",
            label: "Almost all qualifiers dropped",
            explanation:
              "Forty participants, twelve weeks, a moderate dose, older adults, and a single test — every limit on the finding is removed in six words. The remaining sentence has nothing left to check.",
            evidence: {
              removed: [
                "In a 12-week study of 40 older adults",
                "moderate",
                "on one memory test",
              ],
              added: [],
            },
          },
          {
            kind: "causation",
            severity: 84,
            direction: "shift",
            label: "Correlation → causation",
            explanation:
              "The study observed an association in one group. 'Improves' asserts that exercise produces the improvement, which the design cannot establish without a control comparison.",
            evidence: {
              removed: ["was associated with"],
              added: ["improves"],
            },
          },
        ],
      },
      {
        id: "exercise-m2",
        parentId: "exercise-m1",
        text: "Exercise prevents Alzheimer's.",
        source: "curated",
        mutations: [
          {
            kind: "addition",
            severity: 92,
            direction: "shift",
            label: "Disease endpoint invented",
            explanation:
              "Alzheimer's was never measured. Better recall on one test is not a reduced incidence of dementia, which requires years of follow-up and clinical diagnosis.",
            evidence: {
              removed: [],
              added: ["prevents Alzheimer's"],
            },
          },
          {
            kind: "exaggeration",
            severity: 78,
            direction: "up",
            label: "Improvement becomes prevention",
            explanation:
              "The rewrite moves from 'improves' to 'prevents'. One claims a better score during the study; the other claims a disease never develops.",
            evidence: {
              removed: ["improves"],
              added: ["prevents"],
            },
          },
        ],
      },
    ],
  },
];

export const DEMO_INPUT: { original: string; rewrites: RewriteInput[] } = {
  original: "A study found an association between screen time and sleep duration.",
  rewrites: [
    {
      id: "demo-r1",
      text: "Screen time reduces sleep.",
      parentId: "root",
    },
    {
      id: "demo-r2",
      text: "Scientists prove phones cause serious sleep problems.",
      parentId: "demo-r1",
    },
  ],
};

export function findExample(id: string): Chain | undefined {
  return EXAMPLES.find((chain) => chain.id === id);
}
