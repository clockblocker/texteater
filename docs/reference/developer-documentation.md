# Developer documentation

Keep developer documentation only when future repository work needs knowledge
that code, configuration, tests, command help, or GitHub does not already own.

## Placement

- `CONTEXT-MAP.md` routes between domain contexts.
- A scoped `CONTEXT.md` is a glossary and contains no implementation detail.
- System decisions live in `docs/adr/`; scoped decisions live beside their app
  or battery in `docs/adr/`.
- Current technical rules and contracts live in `docs/reference/`.
- Repeatable procedures with checkable completion conditions live in
  `docs/runbooks/`.
- Package READMEs remain package entry points, outside this internal layout.

Create these paths lazily. Do not add placeholder files, empty categories, or
documentation indexes.

## ADRs

An ADR directory holds accepted decisions only. Each file is
`NNNN-kebab-slug.md`, numbered in its own directory's sequence, and starts
with the frontmatter `status: accepted`. This narrows the installed
`ADR-FORMAT.md` status vocabulary: write no `proposed`, `deprecated` or
`superseded by` ADRs. When a new ADR replaces an old one, state what still
stands in the new ADR, move every reference to it, and delete the old file in
the same change. Never renumber or reuse a number; gaps are expected. Issues
and git history keep how a decision evolved.

## What stays elsewhere

GitHub owns plans, reviews, queues, WIP, logbooks, unresolved questions,
assignment, status, discussion, and resolution history. Code and tests own
mechanically discoverable facts. Produced package, product, benchmark,
publication, and build artifacts remain with their generators.

Delete stale, duplicated, trivial, and no-op prose. Git history is the archive.
Keep research or prototype evidence only when it is expensive to reproduce and
likely to affect another decision.

When a document explains how callers use a deep module, keep the useful part as
concise TSDoc on the exported interface and delete the duplicate Markdown.
Decisions remain in ADRs and procedures remain in runbooks.

## Human-owned files

A root, app, or battery may have one `VISION.md`. Vision is non-authoritative
human intent and may become stale. An agent may create, edit, move, rename, or
delete one only after the user names the file and operation.

Authoritative policies that depend on continuing human judgment may live in
`docs/reference/human-owned/`. Creating or changing that protected area also
requires explicit approval naming the target.
