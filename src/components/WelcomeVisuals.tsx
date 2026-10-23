"use client";

interface CardProps {
  x: number;
  y: number;
  width: number;
  height: number;
  eyebrow: string;
  lines: string[];
  color?: string;
  bodySize?: number;
  dim?: boolean;
  dashed?: boolean;
}

function Card({
  x,
  y,
  width,
  height,
  eyebrow,
  lines,
  color = "#22303f",
  bodySize = 12.5,
  dim = false,
  dashed = false,
}: CardProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        fill={dim ? "rgba(10, 15, 22, 0.6)" : "#0c131c"}
        stroke={dashed ? "rgba(120, 140, 160, 0.28)" : "#1f2c3b"}
        strokeDasharray={dashed ? "5 6" : undefined}
      />
      {dashed ? null : (
        <rect x={x} y={y} width={width} height={3} rx={1.5} fill={color} opacity={0.9} />
      )}
      <text
        x={x + 16}
        y={y + 23}
        className="w-svg-label"
        fontSize={8.5}
        letterSpacing={1.4}
        fill={dim ? "#4b5c6e" : "#647a8f"}
      >
        {eyebrow}
      </text>
      {lines.map((line, index) => (
        <text
          key={line}
          x={x + 16}
          y={y + 44 + index * (bodySize + 5)}
          className="w-svg-text"
          fontSize={bodySize}
          fill={dim ? "#5d6f82" : "#dce6f2"}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

interface PillProps {
  x: number;
  y: number;
  label: string;
  color: string;
  width?: number;
}

function Pill({ x, y, label, color, width }: PillProps) {
  const resolved = width ?? Math.round(label.length * 5.4 + 30);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={resolved}
        height={22}
        rx={6}
        fill="rgba(8, 12, 19, 0.94)"
        stroke="rgba(255, 255, 255, 0.07)"
      />
      <circle cx={x + 10} cy={y + 11} r={2.6} fill={color} />
      <text x={x + 18} y={y + 14.5} className="w-svg-text" fontSize={9.5} fill="#a9b9c9">
        {label}
      </text>
    </g>
  );
}

export function HeroExample() {
  return (
    <svg
      viewBox="0 0 620 400"
      className="w-illustration"
      role="img"
      aria-labelledby="hero-example-title"
    >
      <title id="hero-example-title">
        Example graph: an original claim about screen time and sleep becomes a causal claim,
        then a certainty-boosted claim about phones.
      </title>
      <defs>
        <radialGradient id="hero-halo" cx="50%" cy="22%" r="72%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.16)" />
          <stop offset="60%" stopColor="rgba(34, 211, 238, 0)" />
        </radialGradient>
        <filter id="hero-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <marker
          id="hero-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#55687c" />
        </marker>
        <marker
          id="hero-arrow-warm"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#f97316" />
        </marker>
      </defs>

      <rect width="620" height="400" fill="url(#hero-halo)" />
      <ellipse cx="160" cy="76" rx="170" ry="90" fill="rgba(34, 211, 238, 0.12)" filter="url(#hero-soft)" />

      <path
        d="M 168 132 C 168 178 226 208 314 208"
        fill="none"
        stroke="#f97316"
        strokeWidth="1.6"
        strokeDasharray="5 7"
        markerEnd="url(#hero-arrow-warm)"
        className="w-dash"
        opacity="0.85"
      />
      <path
        d="M 460 262 L 460 296"
        fill="none"
        stroke="#f43f5e"
        strokeWidth="1.6"
        markerEnd="url(#hero-arrow)"
        opacity="0.8"
      />

      <Card
        x={14}
        y={18}
        width={286}
        height={112}
        eyebrow="Original claim"
        color="#22d3ee"
        lines={[
          "A study found an association",
          "between screen time and",
          "sleep duration.",
        ]}
      />
      <Card
        x={314}
        y={170}
        width={286}
        height={92}
        eyebrow="Altered version"
        color="#f97316"
        lines={["Screen time reduces sleep."]}
      />
      <Card
        x={314}
        y={298}
        width={286}
        height={84}
        eyebrow="More distorted"
        color="#f43f5e"
        lines={["Scientists prove phones cause", "serious sleep problems."]}
      />

      <Pill x={172} y={142} label="Correlation → causation" color="#f97316" />
      <Pill x={196} y={276} label="Certainty inflated" color="#f43f5e" width={132} />

      <text x={14} y={380} className="w-svg-note" fontSize={9.5} fill="#4f6377">
        Illustrative example — not an analysis of real sources.
      </text>
    </svg>
  );
}

export function HeroExamplePortrait() {
  return (
    <svg
      viewBox="0 0 320 430"
      className="w-illustration"
      role="img"
      aria-labelledby="hero-portrait-title"
    >
      <title id="hero-portrait-title">
        Example graph: an original claim about screen time and sleep becomes a causal claim,
        then a certainty-boosted claim about phones.
      </title>
      <defs>
        <radialGradient id="portrait-halo" cx="50%" cy="10%" r="80%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.14)" />
          <stop offset="70%" stopColor="rgba(34, 211, 238, 0)" />
        </radialGradient>
        <marker
          id="portrait-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#5b6e81" />
        </marker>
      </defs>

      <rect width="320" height="430" fill="url(#portrait-halo)" />

      <path
        d="M 62 104 L 62 148"
        stroke="#f97316"
        strokeWidth="1.6"
        strokeDasharray="5 7"
        markerEnd="url(#portrait-arrow)"
        className="w-dash"
      />
      <path
        d="M 62 234 L 62 280"
        stroke="#f43f5e"
        strokeWidth="1.6"
        markerEnd="url(#portrait-arrow)"
      />

      <Card
        x={8}
        y={8}
        width={304}
        height={96}
        eyebrow="Original claim"
        color="#22d3ee"
        bodySize={12}
        lines={["A study found an association", "between screen time and", "sleep duration."]}
      />
      <Card
        x={8}
        y={148}
        width={304}
        height={86}
        eyebrow="Altered version"
        color="#f97316"
        bodySize={12}
        lines={["Screen time reduces sleep."]}
      />
      <Card
        x={8}
        y={280}
        width={304}
        height={96}
        eyebrow="More distorted"
        color="#f43f5e"
        bodySize={12}
        lines={["Scientists prove phones cause", "serious sleep problems."]}
      />

      <Pill x={76} y={112} label="Correlation → causation" color="#f97316" width={158} />
      <Pill x={76} y={242} label="Certainty inflated" color="#f43f5e" width={132} />

      <text x={8} y={406} className="w-svg-note" fontSize={9.5} fill="#4f6377">
        Illustrative example — not an analysis of real sources.
      </text>
    </svg>
  );
}

export function InputExample() {
  return (
    <div className="w-mock" aria-hidden="true">
      <span className="w-mock-label">Original claim</span>
      <div className="w-mock-field">
        A study found an association between screen time and sleep duration.
      </div>
      <span className="w-mock-label">Prediction settings</span>
      <div className="w-mock-settings">
        <span>3 generations</span>
        <span>3 branches</span>
      </div>
      <div className="w-mock-note">Predictions are hypothetical forecasts.</div>
      <div className="w-mock-button">Predict Evolution</div>
    </div>
  );
}

export function AnalysisExample() {
  return (
    <svg
      viewBox="0 0 420 210"
      className="w-illustration"
      role="img"
      aria-labelledby="analysis-example-title"
    >
      <title id="analysis-example-title">
        Illustration: statements arrive in any order, the AI compares their meaning, and the
        related ones become a branching graph.
      </title>
      <defs>
        <marker
          id="analysis-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#55687c" />
        </marker>
      </defs>

      {[
        { x: 8, y: 30 },
        { x: 26, y: 92 },
        { x: 4, y: 154 },
      ].map((chip) => (
        <g key={chip.y}>
          <rect
            x={chip.x}
            y={chip.y}
            width={124}
            height={38}
            rx={9}
            fill="rgba(12, 19, 28, 0.9)"
            stroke="rgba(110, 130, 148, 0.25)"
            strokeDasharray="4 5"
          />
          <rect x={chip.x + 12} y={chip.y + 12} width={72} height={4} rx={2} fill="#41556a" />
          <rect x={chip.x + 12} y={chip.y + 22} width={48} height={4} rx={2} fill="#2c3d4e" />
        </g>
      ))}

      <g className="w-scan">
        <path
          d="M 168 106 L 208 106"
          stroke="#22d3ee"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          markerEnd="url(#analysis-arrow)"
          opacity="0.85"
        />
        <text x={176} y={98} className="w-svg-label" fontSize={8.5} letterSpacing={1.2} fill="#4f6478">
          AI
        </text>
      </g>

      <path
        d="M 306 58 C 306 78 238 78 238 96"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.4"
        strokeDasharray="4 6"
        markerEnd="url(#analysis-arrow)"
        className="w-dash"
      />
      <path
        d="M 306 58 C 306 78 362 78 362 96"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.4"
        strokeDasharray="4 6"
        markerEnd="url(#analysis-arrow)"
        className="w-dash"
      />

      <g>
        <rect x={248} y={20} width={116} height={38} rx={9} fill="#0d1520" stroke="#26404e" />
        <rect x={248} y={20} width={116} height={2.5} rx={1.2} fill="#22d3ee" />
        <rect x={262} y={36} width={64} height={5} rx={2.5} fill="#8ba0b4" />
        <text x={262} y={50} className="w-svg-label" fontSize={7.5} letterSpacing={1} fill="#4f6478">
          SOURCE CLAIM
        </text>
      </g>

      {[
        { x: 186, y: 96, color: "#facc15", label: "SCOPE SHIFT" },
        { x: 310, y: 96, color: "#f97316", label: "CAUSATION" },
      ].map((node) => (
        <g key={node.x}>
          <rect x={node.x} y={node.y} width={104} height={42} rx={9} fill="#0d1520" stroke="#24313f" />
          <rect x={node.x} y={node.y} width={104} height={2.5} rx={1.2} fill={node.color} />
          <rect x={node.x + 14} y={node.y + 16} width={64} height={5} rx={2.5} fill="#8ba0b4" />
          <text
            x={node.x + 14}
            y={node.y + 33}
            className="w-svg-label"
            fontSize={7.5}
            letterSpacing={1}
            fill="#4f6478"
          >
            {node.label}
          </text>
        </g>
      ))}

      <text x={8} y={204} className="w-svg-note" fontSize={9} fill="#4a5d70">
        One claim. Several plausible futures.
      </text>
    </svg>
  );
}

export function ResultExample() {
  return (
    <svg
      viewBox="0 0 400 236"
      className="w-illustration"
      role="img"
      aria-labelledby="result-example-title"
    >
      <title id="result-example-title">
        Illustration: selecting a connection opens an explanation panel beside the graph.
      </title>
      <defs>
        <marker
          id="result-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#55687c" />
        </marker>
      </defs>

      <path
        d="M 182 92 C 152 106 120 108 94 118"
        fill="none"
        stroke="#33465a"
        strokeWidth="1.4"
        markerEnd="url(#result-arrow)"
      />
      <path
        d="M 218 92 C 248 106 266 108 290 118"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.6"
        markerEnd="url(#result-arrow)"
      />

      <Card
        x={120}
        y={10}
        width={160}
        height={82}
        eyebrow="Source claim"
        color="#22d3ee"
        bodySize={10}
        lines={["A study found an", "association between", "screen time and sleep."]}
      />
      <Card
        x={12}
        y={118}
        width={160}
        height={64}
        eyebrow="Drifted"
        color="#facc15"
        bodySize={10}
        lines={["Screen time is linked", "to shorter sleep in teens."]}
      />
      <g>
        <rect
          x={208}
          y={118}
          width={172}
          height={64}
          rx={12}
          fill="#0e1722"
          stroke="rgba(34, 211, 238, 0.6)"
          strokeWidth={1.3}
        />
        <rect x={208} y={118} width={172} height={3} rx={1.5} fill="#f97316" />
        <text x={222} y={140} className="w-svg-label" fontSize={8} letterSpacing={1.2} fill="#6d8195">
          DISTORTED · SELECTED
        </text>
        <text x={222} y={157} className="w-svg-text" fontSize={10} fill="#dce6f2">
          Screen time reduces sleep.
        </text>
        <text x={222} y={171} className="w-svg-text" fontSize={8} fill="#f97316">
          Correlation → causation
        </text>
      </g>

      <g>
        <rect x={12} y={194} width={176} height={26} rx={7} fill="rgba(12, 19, 28, 0.9)" stroke="#1d2835" />
        <text x={23} y={211} className="w-svg-text" fontSize={8.5} fill="#8fa3b6">
          Click an arrow to read the change
        </text>
      </g>

      <text x={208} y={212} className="w-svg-note" fontSize={8.5} fill="#4a5d70">
        Evidence in the panel
      </text>
    </svg>
  );
}

function Marker({ x, y, index }: { x: number; y: number; index: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9.5} fill="#070b11" stroke="rgba(34, 211, 238, 0.5)" />
      <text
        x={x}
        y={y + 3.4}
        textAnchor="middle"
        className="w-svg-label"
        fontSize={9}
        fill="#67e8f9"
      >
        {index}
      </text>
    </g>
  );
}

export function GraphAnatomy() {
  return (
    <svg
      viewBox="0 0 700 480"
      className="w-illustration w-anatomy"
      role="img"
      aria-labelledby="anatomy-title"
    >
      <title id="anatomy-title">
        Annotated example graph with numbered markers for nodes, arrows, labels, branches,
        evidence and unconnected statements.
      </title>
      <defs>
        <marker
          id="anatomy-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#5b6e81" />
        </marker>
      </defs>

      <path
        d="M 300 116 C 250 160 190 168 128 210"
        fill="none"
        stroke="#5b6e81"
        strokeWidth="1.5"
        markerEnd="url(#anatomy-arrow)"
      />
      <path
        d="M 400 116 C 460 160 520 168 578 210"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.7"
        markerEnd="url(#anatomy-arrow)"
      />
      <path
        d="M 578 306 L 578 358"
        fill="none"
        stroke="#5b6e81"
        strokeWidth="1.5"
        markerEnd="url(#anatomy-arrow)"
      />

      <Card
        x={250}
        y={30}
        width={200}
        height={86}
        eyebrow="Original claim"
        color="#22d3ee"
        bodySize={11}
        lines={["A study found an", "association between", "screen time and sleep."]}
      />
      <Card
        x={20}
        y={210}
        width={200}
        height={96}
        eyebrow="Drifted"
        color="#facc15"
        bodySize={11}
        lines={["Screen time is linked to", "shorter sleep in teens."]}
      />
      <Card
        x={480}
        y={210}
        width={200}
        height={96}
        eyebrow="Distorted"
        color="#f97316"
        bodySize={11}
        lines={["Screen time reduces", "sleep duration."]}
      />
      <Card
        x={480}
        y={358}
        width={200}
        height={96}
        eyebrow="Detached"
        color="#f43f5e"
        bodySize={11}
        lines={["Scientists prove phones", "cause serious sleep", "problems."]}
      />
      <Card
        x={20}
        y={358}
        width={200}
        height={86}
        eyebrow="Not connected"
        bodySize={10.5}
        dim
        dashed
        lines={["The city opened a new", "library on Monday."]}
      />

      <Pill x={150} y={152} label="Scope shift" color="#facc15" width={96} />
      <Pill x={400} y={146} label="Correlation → causation" color="#f97316" width={158} />
      <Pill x={396} y={322} label="Certainty inflated" color="#f43f5e" width={132} />

      <Marker x={250} y={30} index={1} />
      <Marker x={470} y={176} index={2} />
      <Marker x={350} y={168} index={3} />
      <Marker x={604} y={332} index={4} />
      <Marker x={20} y={358} index={5} />
    </svg>
  );
}
