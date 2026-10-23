"use client";

import { useRef } from "react";
import { RELATIONSHIP_META } from "@/lib/taxonomy";
import Legend from "./Legend";
import {
  AnalysisExample,
  GraphAnatomy,
  HeroExample,
  HeroExamplePortrait,
  InputExample,
  ResultExample,
} from "./WelcomeVisuals";

const READING_GUIDE = [
  {
    title: "Nodes",
    body: "Each card is one statement. The original claim is the baseline; the band above a card shows how far its meaning has moved.",
  },
  {
    title: "Arrows and labels",
    body: "An arrow points from a statement to a predicted next step. The pill names the kind of change: false certainty, missing context, causation, emotional framing and so on.",
  },
  {
    title: "Branches",
    body: "One claim can evolve in several directions at once. A branch is an alternative future, not a sequence, and not proof that one version caused another.",
  },
  {
    title: "Evidence",
    body: "Open an arrow to see the wording that changed, why the distortion is plausible, and what information was lost. Every prediction is labelled hypothetical.",
  },
  {
    title: "Not connected",
    body: "A statement with no defensible relationship stays off to the side. EchoTrace reports that instead of inventing a connection.",
  },
];

export interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  const walkthroughRef = useRef<HTMLElement | null>(null);

  const showWalkthrough = () => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    walkthroughRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    walkthroughRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="welcome">
      <section className="w-hero" aria-labelledby="welcome-title">
        <div className="w-hero-copy">
          <p className="eyebrow">Misinformation evolution tracker</p>
          <h1 id="welcome-title" className="w-title">
            Every Story Changes. Trace How.
          </h1>
          <p className="w-lede">
            Discover how information evolves, where meaning shifts, and how misinformation can
            emerge as stories spread.
          </p>
          <div className="w-hero-actions">
            <button type="button" className="btn primary w-btn-lg" onClick={onStart}>
              Start Investigation
            </button>
            <button type="button" className="btn ghost w-btn-lg" onClick={showWalkthrough}>
              How It Works
            </button>
          </div>
          <p className="w-hero-note">
            One claim is enough. Predictions are hypothetical forecasts, not real sources or
            recorded events.
          </p>
        </div>

        <div className="w-hero-visual">
          <span className="w-example-badge">Example prediction · not a real claim</span>
          <div className="w-hero-landscape">
            <HeroExample />
          </div>
          <div className="w-hero-portrait">
            <HeroExamplePortrait />
          </div>
        </div>
      </section>

      <section
        className="w-steps"
        aria-labelledby="walkthrough-title"
        id="walkthrough"
        ref={walkthroughRef}
        tabIndex={-1}
      >
        <header className="w-section-head">
          <p className="eyebrow">How it works</p>
          <h2 id="walkthrough-title">Three steps from one claim to its possible futures.</h2>
          <p className="w-section-lede">
            You supply the starting statement. EchoTrace predicts how its meaning could shift,
            then shows the reasoning behind every branch.
          </p>
        </header>

        <ol className="w-step-list">
          <li className="w-step">
            <div className="w-step-copy">
              <span className="w-step-num">01</span>
              <h3>Enter a claim</h3>
              <p>
                Enter one statement you want to investigate. EchoTrace analyses its meaning,
                its certainty and its limits, then predicts how it could be distorted.
              </p>
              <p className="w-step-note">
                No additional statements are required. You never build the graph yourself.
              </p>
            </div>
            <div className="w-step-visual">
              <InputExample />
            </div>
          </li>

          <li className="w-step">
            <div className="w-step-copy">
              <span className="w-step-num">02</span>
              <h3>AI predicts the evolution</h3>
              <p>
                EchoTrace generates possible changes in wording, context, certainty and
                emotional framing, then predicts how those changes could develop further —
                branching into multiple generations.
              </p>
              <p className="w-step-note">
                Every generated statement is a hypothetical prediction. It is not a quotation,
                a real source, or a record of how a story actually spread.
              </p>
            </div>
            <div className="w-step-visual">
              <AnalysisExample />
            </div>
          </li>

          <li className="w-step">
            <div className="w-step-copy">
              <span className="w-step-num">03</span>
              <h3>Explore the evolution graph</h3>
              <p>
                Explore the AI-generated branches to understand how the original meaning could
                change across multiple generations. Select any statement or arrow to see exactly
                what shifted and why the distortion is plausible.
              </p>
              <p className="w-step-note">
                Forecasts show what could happen — not what did happen. Treat each branch as a
                scenario to examine, not a proven path.
              </p>
            </div>
            <div className="w-step-visual">
              <ResultExample />
            </div>
          </li>
        </ol>
      </section>

      <section className="w-reading" aria-labelledby="reading-title">
        <header className="w-section-head">
          <p className="eyebrow">Reading the graph</p>
          <h2 id="reading-title">Five marks to read any graph.</h2>
          <p className="w-section-lede">
            Every mark answers one question. The graph is a map of possible transformations,
            not a timeline.
          </p>
        </header>

        <div className="w-anatomy-grid">
          <div className="w-anatomy-visual">
            <span className="w-example-badge">Example graph</span>
            <GraphAnatomy />
          </div>
          <ol className="w-anatomy-list">
            {READING_GUIDE.map((item, index) => (
              <li key={item.title}>
                <span className="w-guide-num" aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="w-relations">
          {(["documented", "inferred", "insufficient"] as const).map((kind) => {
            const meta = RELATIONSHIP_META[kind];
            return (
              <article key={kind} className="w-relation">
                <span className="w-relation-key" style={{ color: meta.color }}>
                  <i />
                  {meta.label}
                </span>
                <p>
                  {kind === "documented"
                    ? "Source evidence shows that one statement led to the other. This applies to the evidence-analysis mode, not to predictions."
                    : kind === "inferred"
                      ? "A plausible transformation found by the model. In prediction mode, every step is inferred: a scenario, not a recorded path."
                      : "A connection is possible, but the material is too thin to defend. Shown as a weak link."}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="w-categories" aria-labelledby="categories-title">
        <header className="w-section-head">
          <p className="eyebrow">Mutation categories</p>
          <h2 id="categories-title">Every change has a name.</h2>
          <p className="w-section-lede">
            EchoTrace classifies each step by the kind of distortion it introduces, so patterns
            are easier to spot across a whole story.
          </p>
        </header>
        <div className="w-legend">
          <Legend />
        </div>
      </section>

      <section className="w-cta" aria-labelledby="cta-title">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h2 id="cta-title">Bring a claim. See what it became.</h2>
          <p>
            Start with one statement and the versions you have. EchoTrace maps the relationships
            and shows the evidence behind each one.
          </p>
        </div>
        <div className="w-cta-actions">
          <button type="button" className="btn primary w-btn-lg" onClick={onStart}>
            Start Investigation
          </button>
          <span>You can return to this page at any time.</span>
        </div>
      </section>

      <p className="w-footnote">
        All illustrations on this page are fixed examples, not analysis results. EchoTrace
        analyses only the statements you provide.
      </p>
    </div>
  );
}
