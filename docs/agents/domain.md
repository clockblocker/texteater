# Domain Docs

This repository uses a multi-context documentation layout.

## Before exploring

- Read the root `CONTEXT-MAP.md`.
- Follow it to the `CONTEXT.md` files relevant to the work.
- Read applicable system-wide ADRs under `docs/adr/`.
- Read applicable context-specific ADRs under `app/*/docs/adr/` or `battery/*/docs/adr/`.
- If these files do not yet exist, proceed silently. Domain-modeling skills create them when decisions are resolved.

## Layout

- `CONTEXT-MAP.md` indexes repository contexts.
- `docs/adr/` holds system-wide architectural decisions.
- `app/<context>/CONTEXT.md` defines app-specific vocabulary and boundaries.
- `app/<context>/docs/adr/` holds app-specific decisions.
- `battery/<context>/CONTEXT.md` defines battery-specific vocabulary and
  boundaries.
- `battery/<context>/docs/adr/` holds battery-specific decisions.

## Vocabulary

Use terms as defined in the relevant `CONTEXT.md`. Avoid synonyms the glossary explicitly rejects. If a needed concept is missing, reconsider the term or flag the gap for domain modeling.

## ADR conflicts

Explicitly flag outputs that contradict an existing ADR rather than silently overriding them.
