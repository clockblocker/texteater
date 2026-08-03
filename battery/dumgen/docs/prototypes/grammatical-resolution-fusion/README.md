# German Construction/Fusion grammatical-resolution prototype

This route-local slice resolves a Target-Classification result already fixed to
`grammatical-resolution/de/construction/fusion`. Its Prompt Source participates
in shared generated-system-prompt assembly. Runtime catalog registration remains
deferred to issue #54.

## Dumling contract

Inspection of Dumling's German subtree confirms that `Construction/Fusion` has
Lemma and Citation Surface schemas, no Inflection Surface schema, and empty
`coreFeatures` and `inflectionalFeatures` feature objects. The model DTO removes
the fixed `language: de`, `family: Construction`, `kind: Fusion`, and linked
Surface Lemma fields through reversible fixed-field codecs. Resolved output is
therefore one marked orthographic member, a full Citation Surface, and an
empty-Core Lemma.

The shared grammatical-resolution TARGET schema remains the structural
preflight. It validates balanced word-like TARGET members but intentionally
allows multiple marked words so route/scope contradictions such as separately
written `in dem` reach the route evaluator and become `Unresolved`.

This follows the repository's fixed-chain boundary in
`docs/persistent/prompt-chains.md` and the Target Classification instruction in
`src/promptsmith/laboratory/prompt-source/target-classification/de/high-level-whole-unit/prompt-source.ts`:
Construction is selected only when the clicked material itself is a Fusion or
PairedFrame. Lemma identity follows `docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md`.

## Domain boundary

A positive is the single written contraction itself, not the larger PP. Plain
adpositions are `Lexeme/ADP`; separately written preposition + article pairs
are not a Fusion Surface; whole marked idioms, discourse formulas, and paired
frames retain their own routes even when they contain a fused word. The valid
pronoun `ihm` is a typo adversary and must not normalize to `im`.

The general boundary is supported by the IDS grammis discussion of
[articleless forms versus preposition/article fusion](https://grammis.ids-mannheim.de/fragen/35)
and Duden rule D 14, which the individual entries link.

## Direct positive provenance

Each positive form family used by the demonstrations or held-outs has a direct
Duden entry identifying the expansion and the grammatical analysis as
`Präposition + Artikel` (or explicitly `Verschmelzung von Präposition +
Artikel`):

| Fusion | Expansion | Source |
| --- | --- | --- |
| `im` | `in dem` | [Duden: im](https://www.duden.de/rechtschreibung/im) |
| `zum` | `zu dem` | [Duden: zum](https://www.duden.de/rechtschreibung/zum) |
| `zur` | `zu der` | [Duden: zur](https://www.duden.de/rechtschreibung/zur) |
| `am` | `an dem` | [Duden: am](https://www.duden.de/rechtschreibung/am) |
| `beim` | `bei dem` | [Duden: beim](https://www.duden.de/rechtschreibung/beim) |
| `vom` | `von dem` | [Duden: vom](https://www.duden.de/rechtschreibung/vom) |
| `ins` | `in das` | [Duden: ins](https://www.duden.de/rechtschreibung/ins) |
| `ans` | `an das` | [Duden: ans](https://www.duden.de/rechtschreibung/ans) |
| `aufs` | `auf das` | [Duden: aufs](https://www.duden.de/rechtschreibung/aufs) |
| `fürs` | `für das` | [Duden: fürs](https://www.duden.de/rechtschreibung/fuers) |
| `ums` | `um das` | [Duden: ums](https://www.duden.de/rechtschreibung/ums) |
| `durchs` | `durch das` | [Duden: durchs](https://www.duden.de/rechtschreibung/durchs) |
| `übers` | `über das` | [Duden: übers](https://www.duden.de/rechtschreibung/uebers) |

Duden separately marks superlative `am` (for example `am schönsten`) and the
progressive construction (`am Essen sein`) as not decomposable. The corpus
therefore uses the transparently decomposable spatial/temporal `am` family and
does not generalize this prototype to every string spelled `am`.

## Corpus and evidence

The prompt uses four minimized demonstrations: sentence-initial normalization,
a second canonical fusion, one obvious spelling repair, and one uncontracted
route contradiction. The evaluation suite contains exactly 20 disjoint
held-outs: 11 resolved outputs and 9 route, scope, multi-occurrence, and typo
adversaries. A distinct repeated-consonant typo checks repair beyond the prompt
example, nondecomposable superlative `am` checks the polyfunctional spelling
boundary, and the `Zum Wohl!` DiscourseFormula boundary is held out. One
redundant uncontracted `von dem` boundary stays corpus-only.

The pure evaluator checks every projected output field, canonicalizing only the
codec-equivalent `{ "historicalStatus": null }` Surface feature bag to `null`.
The bounded runner retains prompt/schema hashes, ordered case IDs, raw provider output,
provider metadata, attempts, and a recomputed evidence summary. It imports the
shared Dumgen model policy (`gpt-5.6-luna`, reasoning effort `none`), performs no
request during import or preflight, retries zero times, stores no provider data,
and caps evaluation at 25 cases.

Run route-local tests from `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-fusion.test.ts \
  tests/internal/grammatical-resolution-fusion-runner.test.ts
```

Final evidence requires at least 15 attempted held-outs, an 80% score, zero
execution/provider errors, and a classification with a non-empty explanation
for every scored miss. The current finalized evidence is the 20-case
`gpt-5.6-luna` Batch API run at
`runs/2026-08-03T16-00-15-793Z/results.json`. It scores 18/20 (90%), with zero
execution errors and zero unclassified misses, so `evidenceThresholdMet` is
true. The retained record identifies the `openai-batch-v1` transport, Batch and
file IDs, request counts, and content hashes; per-request latency is null
because Batch does not expose it. Both misses are accepted model limitations
in which the model extracted the fused word while ignoring additional marked
material despite the explicit all-and-only-one-member gate.

The route-local direct runner remains available from `battery/dumgen` with:

```sh
bun run prototype:grammatical-resolution-fusion
```

Any new run must classify every miss and finalize the retained draft offline
with the runner's `finalize` mode.
