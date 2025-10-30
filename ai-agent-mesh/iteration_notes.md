# iteration_notes.md

## Loop 0 (Inception)
- Hypothesis: Agent sprawl creates measurable cost/gov gaps that mesh can reduce.
  - Status: Validated (qualitative). TODO: Add sector benchmarks from pilots.
  - Risk: Market — variability by vendor stack; Tech — integration surfaces.
- Hypothesis: MCP can serve as lingua franca for tool/resource interoperability.
  - Status: Validated (directionally) via MCP ecosystem growth.
  - Risk: Tech — server coverage; Market — adoption pace.
- Hypothesis: Prompt normalization + policy injection improves safety and brand consistency.
  - Status: Validated (theoretical + best practices).
  - Risk: Tech — template drift; Market — change management.

## Loop 1 (Design Refinement)
- Action: Define canonical registry and discovery heuristics.
  - Status: Validated with repo scan + YAML schema.
- Action: Establish policy engine MVP (RBAC, DLP, allowlists).
  - Status: Validated with starter code; extend for org policies.
- Action: Observability schema aligned to OTel.
  - Status: Validated; needs exporter wiring in deployments.

## Risks & Mitigations
- Integration Surface: Many vendors and private tools — mitigate with MCP first, adapters second.
- Compliance Evidence: Ensure immutable audit pipeline — integrate with WORM storage or ledger.
- Sustainability: Carbon metrics accuracy — integrate cloud emissions APIs where available.

## Next Steps
- Pilot with 2–3 teams; populate registry; measure cost/policy baselines.
- Integrate policy engine in one agent’s middleware path.
- Add evals and drift monitors; wire OTel exporter.
