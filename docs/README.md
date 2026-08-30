# Repository Documentation

## Policy

> If the artifact must still teach future work after every ticket closes, keep
> it in the repo; if its main purpose is coordinating unfinished work, put it
> in GitHub.

GitHub Issues own destinations, open questions, claims, dependencies, queues,
discussion, and resolution history. A Wayfinder map indexes a multi-session
decision effort; its child tickets hold the decisions. Repository documents
hold the durable rules, procedures, and evidence those closed tickets leave
future work needing.

## Routes

- **Domain work:** Start at [`CONTEXT-MAP.md`](../CONTEXT-MAP.md), then read the
  relevant context and applicable system or context ADRs.
- **System decisions:** Read [`adr/`](./adr/) for cross-context architectural
  decisions.
- **Agent operations:** Read [`agents/`](./agents/) for repository-specific
  issue-tracker, triage, domain, and documentation instructions.
- **Documentation changes:** Read the
  [documentation inventory](./agents/documentation-inventory.md) before adding,
  moving, pruning, or reconciling documentation.
- **Runtime baselines:** Treat [`benchmarks/`](./benchmarks/) as generated
  reports whose generators and tests own freshness.

Context-specific documentation stays beside the app or battery that owns it.
Its package README is the human entry point; its `CONTEXT.md` defines domain
language and boundaries; its local `docs/` index discloses decisions,
references, runbooks, and retained evidence on demand.

## Placement

| Material                                               | Canonical home                                        |
| ------------------------------------------------------ | ----------------------------------------------------- |
| Current rules and contracts                            | Repository or context-local reference document        |
| Repeatable operations                                  | Repository or context-local runbook                   |
| Hard-to-reverse architectural decisions                | System or context-local ADR                           |
| Active plans, queues, reviews, and implementation work | GitHub Issue or PRD                                   |
| Multi-session work whose route is still unclear        | Wayfinder map and decision tickets                    |
| Reusable investigation evidence                        | Research artifact linked from its ticket              |
| Experimental artifact worth retaining                  | Prototype plus the minimum reproduction documentation |
| Generated documentation                                | Declared source plus reproducible generated cache     |

Generated output identifies its editable source. Historical evidence identifies
the current authority that replaced it. Branch indexes route readers without
restating the documents they disclose.
