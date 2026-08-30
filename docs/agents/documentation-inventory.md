# Repository Documentation Inventory

Snapshot: 2026-08-30. This is an inventory of the working tree, not a claim
that every document is current.

## Boundary

The primary inventory contains authored and generated Markdown that lives in
the repository outside dependencies, local reference clones, and disposable
build directories. Generated families are grouped by glob rather than expanded
into hundreds of hash-named rows.

| Population                                     |     Files | Treatment                                                               |
| ---------------------------------------------- | --------: | ----------------------------------------------------------------------- |
| Non-ignored Markdown, including this inventory |       240 | Source, instructions, decisions, evidence, plans, or committed caches   |
| Ignored Markdown retained in the working tree  |       906 | 903 Dumling Docs generated pages and 3 personal Dumgen learning records |
| **Primary inventory**                          | **1,146** | Current on-disk documentation boundary                                  |
| Dumling Docs `dist/**/*.md`                    |       452 | Excluded publication build copies                                       |
| Dumling Docs `dist/**/*.html`                  |       451 | Excluded publication build copies                                       |
| Dumgen learning HTML                           |         9 | Adjacent personal learning material, recorded below                     |
| Package `LICENSE` files                        |         6 | Legal artifacts, recorded separately from documentation                 |

The inventory also records documentation whose source of truth is executable:
Dumling Docs `*.doc.ts` pages and curated attestations, Dumgen Prompt Sources
and corpora, README generators, and the benchmark generator. It does not treat
ordinary code comments, JSON experiment output, test snapshots, or generated
declaration files as documentation.

Area totals within the primary boundary:

| Area                      |  Markdown |
| ------------------------- | --------: |
| Root, `docs/`, and `img/` |        30 |
| Root `.agents/skills/`    |        44 |
| `app/**`                  |       972 |
| `battery/**`              |       100 |
| **Total**                 | **1,146** |

## How authority and discovery work

There is no single authority ladder for every kind of statement. Use the
appropriate path:

- **Agent execution:** the applicable `AGENTS.md` or `CLAUDE.md` discloses
  process rules. A skill description discloses its `SKILL.md`, which may in turn
  disclose supporting references.
- **Domain language and decisions:** `CONTEXT-MAP.md` routes to relevant
  `CONTEXT.md` files. Accepted system and context ADRs settle decisions. Flag a
  conflict instead of using an older narrative silently.
- **Product intent:** `GOAL.md` and `VISION.md` are human-owned intent. Root
  instructions protect them from agent edits; they are not automatically the
  current architecture.
- **Package operation:** package READMEs and runbooks describe public APIs,
  setup, and procedures. A generated README is a cache of its template and
  snippets.
- **Evidence:** research, audits, prototypes, WIP, logs, and retained runs are
  evidence or history unless a current authority explicitly promotes them.
- **Generated content:** edit the declared template, typed page, Prompt Source,
  corpus, or generator input; verify the derived cache instead of hand-editing
  it.

The main disclosure graph is:

```text
AGENTS.md
├── docs/agents/issue-tracker.md
├── docs/agents/triage-labels.md
├── docs/agents/domain.md
│   └── CONTEXT-MAP.md
│       ├── app/tf-demo/CONTEXT.md
│       └── battery/{dumling,dumrel,dumdict,dumgen,dumtrain}/CONTEXT.md
│           └── applicable system and context ADRs
└── docs/agents/documentation-inventory.md

skill description → SKILL.md → branch-specific reference

template / typed page / Prompt Source → generator → committed or ignored cache
```

## Root and system documentation

| Path or glob                                                 | Count | Role and lifecycle                                            | Discovery                                                       |
| ------------------------------------------------------------ | ----: | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `AGENTS.md`                                                  |     1 | Always-loaded agent router and hard guardrails                | Repository root                                                 |
| `docs/agents/*.md`                                           |     4 | Issue tracker, triage, domain routing, and this inventory     | Direct pointers from `AGENTS.md`                                |
| `README.md`                                                  |     1 | Monorepo overview, setup, package contract, and root commands | Repository entry point                                          |
| `CONTEXT-MAP.md`                                             |     1 | Router for six domain contexts and their relationships        | Disclosed by the domain instructions                            |
| `GOAL.md`                                                    |     1 | Protected human product intent                                | Referenced by `app/tf-demo/VISION.md`                           |
| `docs/adr/*.md`                                              |    19 | System decisions: 17 accepted, 2 superseded                   | Directory convention disclosed by `docs/agents/domain.md`       |
| `docs/high-roi-architecture-refactors.md`                    |     1 | Current-looking implementation specification                  | No inbound repository pointer                                   |
| `docs/benchmarks/dum-operational-entrypoint-rss-baseline.md` |     1 | Generated benchmark contract and report                       | Generator and tests point to it; adjacent JSON retains raw data |
| `img/code/icon-storytelling.md`                              |     1 | Rough icon/animation design brief                             | No inbound repository pointer                                   |

`README.md` does not enumerate every current workspace: tf-demo, laboratory,
common-utils, and some support workspaces are discoverable only from the
directory tree or package manifests.

### Agent workflow documents

| Path or glob                                   | Count | Role                                                                    |
| ---------------------------------------------- | ----: | ----------------------------------------------------------------------- |
| `.agents/skills/*/SKILL.md`                    |    22 | Repository-local invocable workflows and routers                        |
| `.agents/skills/**/*.md`, excluding `SKILL.md` |    22 | Disclosed formats, phase rules, review rules, templates, and glossaries |

The setup skill's issue-tracker, domain, and label files are generic templates;
`docs/agents/*` is the repository-specific policy. They intentionally overlap,
but their authority differs. `.agents/skills/teach/GLOSSARY-FORMAT.md` has no
inbound pointer from its skill or elsewhere and is an orphaned disclosed
reference.

## Batteries

| Area                    | Markdown | Inventory                                                                                                                                         |
| ----------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `battery/codec-builder` |        2 | Public README; dated Zod 4 native-codec research                                                                                                  |
| `battery/codegen`       |        1 | Public README                                                                                                                                     |
| `battery/common-utils`  |        1 | Public README                                                                                                                                     |
| `battery/dumdict`       |       12 | Context; generated README and template; one feature request; indexed v1 architecture/specification branch                                        |
| `battery/dumling`       |       10 | Context; generated README and template; two migration research reports; four source transcription fragments and one generated TIGER transcription |
| `battery/dumrel`        |        8 | Context; README; protected Vision; four local ADRs; German semantic-relation judgment contract                                                    |
| `battery/dumgen`        |       60 | Context, generated README source/output, ADRs, indexed persistent rules/research/prototypes, WIP, logs, and learning notes                        |
| `battery/dumtrain`      |        6 | Context; README; architecture, corpus, and result plans; dated claim audit                                                                        |

`battery/codegen`, `common-utils`, `dumdict`, `dumgen`, `dumling`, and `dumrel`
also carry byte-identical MIT `LICENSE` files. Dumrel's generated applicability
snapshot is an executable test oracle, not authored guidance.

### Generated README families

Three package READMEs are controlled caches:

| Output                      | Source                               | Other inputs                    |
| --------------------------- | ------------------------------------ | ------------------------------- |
| `battery/dumdict/README.md` | `generate-readme/README.template.md` | `generate-readme/examples/*.ts` |
| `battery/dumgen/README.md`  | `generate-readme/README.template.md` | `generate-readme/examples/*.ts` |
| `battery/dumling/README.md` | `generate-readme/README.template.md` | `generate-readme/examples/*.ts` |

Each package owns a generator and a `generate:readme` script. Dumgen and
Dumdict mark the Bun command in the generated preamble; Dumling's preamble
still names `npm run generate:readme` even though the repository uses Bun.

### Dumgen detail

| Path or glob                                     | Count | Lifecycle                                                                                |
| ------------------------------------------------ | ----: | ---------------------------------------------------------------------------------------- |
| Core/context/README/Prompt Part/logbook Markdown |     5 | Normative context and authoring reference, generated public guide, historical prompt log |
| `docs/adr/*.md`                                  |     2 | Accepted local decisions                                                                 |
| `docs/persistent/**/*.md`                        |     9 | Index, durable rules, review queues, dated readiness evidence, and protected human intent |
| `docs/german-semantic-relation-*.md`             |     4 | Corpus state, difficult examples, primary-source audit, and a WIP acceptance proposal    |
| `docs/research/*.md`                             |    11 | Index, historical audits, migration maps, frozen corpora, and decision evidence          |
| `docs/wip/*.md`                                  |     1 | Mixed implemented and unresolved decision record                                         |
| Prototype README/report Markdown                 |    13 | Branch index, lab contracts, archived reports, retained-run indexes, and diagnostics      |
| `docs/learning/**/*.md`                          |    15 | Personal learning mission, notes, resources, and 12 records; newest 3 are ignored        |

Adjacent model-facing sources are part of Dumgen's behavioral documentation:

- 32 human-authored production `prompt-source.ts` files;
- 32 derived generated-system-prompt modules;
- 144 human-authored corpus/reference files;
- 8 laboratory experiment/evaluator sources.

`docs/prototypes/` contains 574 evidence files across 35 suites and occupies
about 185 MB. Only 8 suites have a root README; the 159 MB
`target-classification-high-level-contracts` suite has none. Retained JSON,
JSONL, locks, and checkpoints are evidence artifacts outside the primary
Markdown count. Seventeen ignored laboratory session logs are likewise
operational evidence, not documentation authority.

### Other battery lifecycle notes

- Dumdict's seven architecture documents now have a local lifecycle index.
  `UNRESOLVED_TARGET_IDENTITY.md` remains in the branch as explicitly
  superseded history.
- Dumling's two migration reports are historical. Their titles and placement do
  not say that the Selection-to-Attestation migration is complete.
- Dumrel's Context, README, and Vision overlap. The Vision is materially older
  than the Context and accepted system ADRs.
- Dumtrain's README indexes its three plan documents but omits the claim audit
  that records unresolved specification defects.
- The local TIGER Markdown is a generated merge of four transcribed page
  fragments. It is third-party source material, not project domain authority.

## Apps

### Dumling Docs

The primary boundary contains 913 Markdown files:

| Path or glob                         | Count | Role                                                                                                                    |
| ------------------------------------ | ----: | ----------------------------------------------------------------------------------------------------------------------- |
| `README.md`                          |     1 | Source-authority, generation-stage, and lifecycle index                                                                 |
| `src/classification-logbook/**/*.md` |     8 | One substantive German rule/summary cluster, one empty German edge-case file, and four placeholder English/Hebrew files |
| `plans/*.md`                         |     1 | Completed historical route-overhaul plan                                                                                |
| `src/generated/docs/**/*.md`         |   189 | Generated page cache                                                                                                    |
| `src/generated/entities/**/*.md`     |   262 | Generated curated-example cache                                                                                         |
| `public/**/*.md`                     |   452 | Publication cache: 451 content pages plus `nav.md`                                                                      |

The actual source-of-truth content is executable:

- 189 `src/to-generate/docs/**/*.doc.ts` pages;
- 262 `src/to-generate/attestations/**/*.ts` curated examples;
- generation scripts and six ownership manifests under `.codegen/`.

Every `src/generated` page carries a resolvable `generatedFrom` pointer.
Publication and `dist` copies remove that provenance. `public/nav.md` is the
complete published route index. The 189 typed pages include 66 universal stubs;
81 German overlays include 68 metadata-only pages, so much of the tree is
deliberate scaffolding rather than substantive prose.

The local README and root README now disclose source authority and generation
stages. The generated nav indexes public output. The route-overhaul plan is
labelled completed history, and its obsolete `docs-site/**` paths are explicitly
historical. The ignored `dist` copy was rebuilt and matches `public`; the
integrity checker fails when both stages exist and differ.

### tf-demo

| Path or glob                           | Count | Role                                                                                      |
| -------------------------------------- | ----: | ----------------------------------------------------------------------------------------- |
| `AGENTS.md` and `CLAUDE.md`            |     2 | Byte-identical compatibility pointers to generated Convex guidance                        |
| `convex/_generated/ai/guidelines.md`   |     1 | Generated normative Convex API guidance                                                   |
| `.agents/skills/*/SKILL.md`            |    33 | Installed Convex workflows; 32 declare generated provenance                               |
| `.agents/skills/**/references/*.md`    |     4 | Component-authoring references                                                            |
| `README.md`, `CONTEXT.md`, `VISION.md` |     3 | Operations, normative vocabulary, and protected legacy intent                             |
| `docs/adr/*.md`                        |     3 | Accepted app decisions                                                                    |
| Other `docs/**/*.md`                   |    10 | Lifecycle index, operational specs/runbooks, research chronology, WIP design, and a proposed TanStack seam |
| `src/playground/**/README.md`          |     2 | Contributor experiment and current Sheet/Card fixture contracts                           |

The root domain path reaches tf-demo Context and local ADRs. The README points
to the scoped docs index, playground contract, and reset verification. The docs
index now routes current procedures, proposals, and retained research; the
nested sheet-workspace README remains discoverable through the playground
contract.

### Laboratory

`app/laboratory/README.md` is the only document. It is an early-WIP prompt
development runbook that points to Dumgen's ignored session logs. It has no
root or context-map entry.

## Conflict and stale-pointer status

These are inventory findings, not edits to the affected authorities.

1. **Resolved: issue-tracker instructions agree on `gh api`.** The directly
   disclosed workflow now supplies REST commands for issue reads, comments,
   labels, and closure without using the deprecated `gh issue` family.

2. **Resolved: Dumgen's live prompt-chain documents agree.** The generated
   README, Context, persistent runtime contract, and accepted local ADR now
   define one Intake call, deterministic German/Hebrew Source Segmentation,
   and production Prompt Source paths. The persistent branch index is the live
   README pointer.

3. **Protected Visions are being used as current pointers despite domain
   drift.** `app/tf-demo/VISION.md` selects a product mode from
   `battery/dumrel/VISION.md`. That Dumrel Vision still describes Lemma-owned
   Knowledge, additive `KnowledgeContribution`, and a canonical
   Reading-to-Reading graph. Current Dumrel Context and accepted ADRs make
   Knowledge exact-Reading-owned, use Contribute/Correct/Retract changes, allow
   homogeneous Lemma or exact-Reading relation targets, and store direct claims
   only. Root `GOAL.md` likewise retains Selection-era terminology superseded by
   the Attestation ADRs. These files require human review because root
   instructions protect them from agent edits.

4. **Resolved: public Dumling documentation agrees with ADR 0008.** Five source
   statements now distinguish Dumling's foundational Reading value ownership
   from dictionary-owned scope, records, and workflows. `src/generated`,
   `public`, and `dist` were regenerated and verified.

5. **Routed as history: tf-demo's WIP navigation vision conflicts with accepted
   local ADR 0003.** Its first screen and the tf-demo docs index now identify it
   as superseded design history; ADR 0003 remains the current authority.

6. **Historical evidence contains stale local code pointers.** At least 27
   relative code links are missing across six Dumgen, Dumling, and tf-demo
   research documents. The Markdown document targets themselves resolve, with
   one additional broken heading anchor from Dumling research into the Dumling
   classification summary. Historical snapshots may retain conclusions, but
   their local evidence paths no longer reproduce directly.

7. **Resolved where lifecycle is evidenced.** Dumgen's logbook is an active
   review queue whose resolved entries are explicitly labelled; research
   indexes record migration chronology; tf-demo's four DnD documents identify
   historical evidence versus the implemented decision; and Dumling Docs'
   route overhaul is labelled completed history. Ambiguous proposals remain
   proposals rather than being reclassified automatically.

## Duplication that is deliberate

- Generated README/template/example triples are controlled caches with tests or
  generation commands.
- Dumling Docs typed/curated sources, `src/generated`, `public`, and `dist` are
  stages of one generation pipeline, not four independent authorities.
- tf-demo `AGENTS.md` and `CLAUDE.md` are compatibility mirrors for different
  agent hosts; they should remain byte-identical.
- Package MIT licenses are deliberate legal copies.
- Dumrel local and system ADRs sometimes cover the same source issue at
  different scopes. Their supersession metadata, not file recency, determines
  the surviving clauses.

## Recommended cleanup order

Each step ends at a checkable boundary.

1. **Repair live pointers — autonomous portion complete.** The issue-tracker
   commands, Dumgen's stale agreed-chain pointer, and editable current docs now
   agree with accepted ADRs and current paths. Protected Vision-to-Vision
   pointers that still present older architecture remain a human-owned
   follow-up.
2. **Correct public source docs — complete.** Update the Dumling typed/logbook
   sources that place Reading outside Dumling, regenerate all three output
   stages, and verify `public` and `dist` match. Complete when no published page
   contradicts ADR 0008 and generation is clean.
3. **Label lifecycle — unambiguous portion complete.** Add explicit
   status/supersession metadata to plans, WIP, research maps, logbooks, and
   protected intent without rewriting their historical evidence. Complete when
   a reader can distinguish current rule, unresolved proposal, completed work,
   and retained history from the first screen of each document. Protected
   intent and ambiguous WIP dispositions remain human-owned.
4. **Add branch indexes — complete.** Index Dumgen
   persistent/research/prototype clusters, Dumdict v1 architecture, tf-demo
   docs, and Dumling Docs authoring sources. Point from an existing package
   README or scoped agent file only when the branch should trigger reading them.
   Complete when every normative or active document has one intentional inbound
   pointer.
5. **Prune or route orphans — retention decisions deferred.** Decide whether
   the High-ROI refactor spec, icon brief, Teach glossary format, empty Dumling
   logbook placeholders, and documentation-only Dumtrain audit remain live.
   Complete when each is pointed to, explicitly historical, or removed.
6. **Automate integrity — non-destructive portion complete.** Check local
   Markdown targets and anchors, generated cache freshness, tf-demo mirror
   equality, and lifecycle metadata in CI. `public` and `dist` currently match;
   the remaining policy boundary is whether the known stale research links and
   broken anchor should be fixed or explicitly exempted as historical. The
   checker reports exactly 27 missing historical targets and one broken anchor
   as advisories; making them fail or exempting them requires the retention
   policy decision this cleanup deliberately does not infer.

## Reproduce the primary count

Run from the repository root. This counts source and ignored generated Markdown
while excluding dependencies and disposable publication/build trees:

```sh
find . \
  \( -path './.git' -o -path './node_modules' -o \
     -path './repos-for-refrence' -o -path '*/node_modules' -o \
     -path '*/dist' -o -path '*/coverage' -o -path '*/.next' -o \
     -path '*/.turbo' \) -prune -o \
  -type f -name '*.md' -print | wc -l
```

Expected result for this snapshot: `1146`.
