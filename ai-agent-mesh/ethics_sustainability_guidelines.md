# Ethics, Observability, and Sustainability Guidelines

## Ethics & Trust
- Privacy by design: minimize data, redact PII by default, honor data residency.
- Transparency: capture provenance and chain-of-custody for prompts, tools, outputs.
- Safety: align with OWASP LLM Top 10; implement prompt injection defenses and safe output handling.
- Accountability: maintain immutable audit logs and human-in-the-loop for sensitive workflows.

## Observability Standards
- Logs: structured JSON; include session_id, user_id (pseudonymized), agent_id, model, route, verdicts.
- Metrics: tokens_in/out, cost, latency_ms, cache_hit, policy_denials, redactions_applied.
- Traces: end-to-end spans for prompt → tool → model → output; OTel semantic conventions.
- Drift/Evals: periodic eval suites, regression thresholds, alerting on degradation.

## Explainability & Bias Checks
- Capture rationales when supported; log evaluator scores and feature attributions.
- Maintain test sets for sensitive use cases; monitor for disparate impact.

## Sustainability
- Carbon telemetry: estimate gCO2e per inference (model- and region-specific). TODO: calibrate with provider emissions data.
- Efficiency: encourage caching, reuse of embeddings, shared context federation to reduce recomputation.
- Reporting: aggregate carbon per agent/model; surface in dashboards and reviews.

## Security Controls
- Zero-Trust RBAC for tools/resources; principle of least privilege.
- Secrets from a managed vault; rotate keys; deny env secret exfiltration.
- Encryption in transit (TLS) and at rest; verifiable backups.
