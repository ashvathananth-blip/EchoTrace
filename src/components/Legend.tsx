import { MUTATION_KINDS, MUTATION_META } from "@/lib/taxonomy";

export default function Legend() {
  return (
    <ul className="legend">
      {MUTATION_KINDS.map((kind) => {
        const meta = MUTATION_META[kind];
        return (
          <li key={kind} className="legend-item">
            <span className="legend-dot" style={{ background: meta.color }} aria-hidden />
            <div>
              <strong>{meta.label}</strong>
              <p>{meta.blurb}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
