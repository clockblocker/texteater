## Repository work

- Before writing or refactoring TypeScript, read
  `docs/reference/code-conventions.md`.
- Before driving a browser against an app or writing a UI test, read
  `docs/reference/browser-tooling.md`.
- For GitHub issues, PRDs, labels, or Wayfinder work, read
  `docs/reference/issue-tracker.md`.
- Before exploring or changing domain language or decisions, read
  `docs/reference/domain-documentation.md`.
- Before creating, moving, retaining, or deleting developer documentation,
  read `docs/reference/developer-documentation.md`.

`VISION.md` files are human-owned. Create, edit, move, rename, or delete one
only when the user explicitly names that file and operation.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
