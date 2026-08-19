# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create an issue with `gh issue create`.
- Read an issue with `gh issue view <number> --comments`.
- List issues with `gh issue list`, including bodies, labels, and comments when needed.
- Comment with `gh issue comment <number>`.
- Apply or remove labels with `gh issue edit`.
- Close with `gh issue close <number> --comment "..."`.
- Infer the repository from the current Git remote.

## Authentication diagnostics

Do not conclude that GitHub authentication is stale from `gh auth status` alone:
that command may report an invalid token when the sandbox cannot reach GitHub.

Verify with `gh api user --jq .login`. Treat DNS, connection, or network-access
errors as sandbox/network failures and retry with network approval. Ask for
`gh auth login` only when GitHub itself responds with an authentication failure
such as `401 Bad credentials`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

When a skill says "publish to the issue tracker," create a GitHub issue.

When a skill says "fetch the relevant ticket," run:

`gh issue view <number> --comments`

## Wayfinding operations

- **Map:** a GitHub issue labelled `wayfinder:map`.
- **Child ticket:** a sub-issue of the map, labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- **Fallback:** if sub-issues are unavailable, add the ticket to a task list in the map and put `Part of #<map>` in the ticket body.
- **Blocking:** use GitHub’s native issue dependencies. Fall back to a `Blocked by:` line when dependencies are unavailable.
- **Frontier:** the map’s open, unblocked, unassigned child issues, in map order.
- **Claim:** assign the ticket to the current user before starting work.
- **Resolve:** post the answer as a comment, close the ticket, and append a linked one-line gist to the map’s `Decisions so far`.
