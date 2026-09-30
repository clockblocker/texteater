# Jev segmentation architecture investigation

The measured canonical-owner prototype should be rejected as the production design. The envelope prototype is a better sparse proposal mechanism, but it misses too many multiword candidates and roughly doubles the token load. Keep the existing candidate pipeline as the quality reference while evaluating a compact proposer followed by exact Jev verification. None of the new prototypes establishes a production winner.

The important output contract is a source-preserving ownership partition: every clickable source part belongs to one unit, including discontinuous units and separate components of a fused word. Each unit carries its members and a prepared language/family/kind or an explicit abstention. Authored identity hints can travel into the click path. Confidence should describe separate source, membership and routing decisions; a confidently selected route does not prove correct grouping.

## What was measured

The frozen development set has 1,207 cases. The new pilot uses 16 cases selected by a deterministic source hash and 16 deliberately selected historical baseline failures, with three repetitions each. The challenge half rewards improvement on known weaknesses; its gain is not a representative quality estimate. The 16-case representative half is also too small for a population claim. No new held-out run was made.

The owner and envelope 32-case pilots were measured with both gold Segments/recovered surfaces and a raw-source path. The later four-case hybrid smoke uses gold input only. Raw input contains only the concatenation of the original source text. The raw adapter receives no gold boundaries, recovered surfaces, units or routes.

The scored denominator contains 105 known gold unit-repetitions in the representative half and 252 in the challenge half. Three additional representative Unresolved gold unit-repetitions are reported separately. Most records annotate only particular units; correct scores on those units do not certify the rest of the sentence.

Grouping means an exact member set at the original source spans and render kinds. Joint accuracy additionally requires exact language/family/kind. Surface recovery is scored separately. Wrong boundaries, missing results and abstentions remain in the overall denominator. Structural partition validity is not semantic correctness.

## Quality comparison

These are the recorded v3 candidate baseline and the corrected owner reference. The envelope variant additionally supplies selected authoritative membership rules and uses a corrected inventory overlay that preserves an open Partial Locution, Saying, Foreign or Unresolved interpretation. The comparison measures the complete pipelines; it is not an ablation proving that envelope geometry alone caused the change.

| Sample | Architecture / input | Grouping | Joint route |
|---|---|---:|---:|
| Representative | Recorded v3 candidates / gold | 88.57% | 81.90% |
| Representative | Canonical owner / gold | 51.43% | 48.57% |
| Representative | Canonical owner / raw source | 51.43% | 48.57% |
| Representative | Envelopes / gold | 82.86% | 78.10% |
| Representative | Envelopes / raw source | 83.81% | 79.05% |
| Challenge | Recorded v3 candidates / gold | 73.81% | 67.86% |
| Challenge | Canonical owner / gold | 27.38% | 24.21% |
| Challenge | Canonical owner / raw source | 27.38% | 24.21% |
| Challenge | Envelopes / gold | 82.14% | 78.17% |
| Challenge | Envelopes / raw source | 80.56% | 76.59% |

The table uses `raw+closed`, which retains the proposed partition and applies the optional closed-class interpretation. The immutable corrected owner reference predates the later Family-preserving inventory guard; that guard applies to the envelope and hybrid runs. Later helper changes do not retroactively correct the owner outputs. Rejection policies do not improve the hover partition; they make some routes Unresolved.

| Envelope policy | Representative gold: joint / answered coverage | Challenge gold: joint / answered coverage |
|---|---:|---:|
| Raw | 78.10% / 99.05% | 78.17% / 98.81% |
| Require both proposed endpoints in the mask | 76.19% / 86.67% | 76.98% / 90.87% |
| Exact-membership support ≥ 0.7 | 16.19% / 19.05% | 10.32% / 12.70% |

“Answered coverage” counts annotated gold units touched by predicted units whose routes are all resolved; it includes wrong groups. At the 0.7 support gate, joint accuracy among answered representative gold units is 85%, but four fifths of the annotated units have no prepared route. This is not an acceptable consistency result. No threshold was tuned to rescue it.

## Candidate recall and assignment

Singleton-dominated unit accuracy hides the main limitation. On completed gold-input trials:

| Multiword gold targets | Representative | Challenge |
|---|---:|---:|
| Conditional last endpoint correct | 22 / 27 | 42 / 66 |
| First-member judgment passes 0.5 | 20 / 27 | 64 / 66 |
| Correct first/last envelope retained | 15 / 27 | 40 / 66 |
| Exact mask assigned to that envelope | 11 / 15 available | 26 / 40 available |
| Exact raw mask, including accidental masks inside a different envelope | 13 / 27 | 29 / 66 |

The raw source path has the same multiword counts in this pilot. Two representative and three challenge masks happen to contain the correct members despite an incorrect proposed endpoint; the endpoint gate rejects them. Candidate omission and inconsistent membership assignment are distinct problems, and both need work.

Actual envelope errors include splitting `schwebt … auf Wolke sieben`, leaving the recovered article of `im Sprechen` separate from the noun, joining `eine` to a later `der` while leaving both nouns separate, including the free `Ruhe` in `Darf ich … bitten`, and fragmenting quoted aphorisms into Lexemes. It also routes `usw.` as Lexeme/ADV where the frozen target is Locution/ADV. The owner prototype additionally merges ordinary grammatical phrases such as `er rot wurde … begann` and `eine Million Euro`.

## Consistency, failures and latency

The following variation counts compare complete outputs only. Each sample contains 16 cases with at least two completed attempts. Failures are not counted as a different semantic output.

| Gold-input architecture | Representative: output / membership varies | Challenge: output / membership varies |
|---|---:|---:|
| Recorded v3 candidates | 3 / 0 | 6 / 2 |
| Canonical owner, raw | 7 / 5 | 9 / 7 |
| Canonical owner, support ≥ 0.7 | 11 / 5 | 10 / 7 |
| Envelopes, raw | 6 / 5 | 8 / 6 |
| Envelopes, support ≥ 0.7 | 10 / 5 | 11 / 6 |

Complete-output variation is different from a pass/fail flip. The representative baseline has zero known-unit pass/fail flips, despite three changing outputs. The gated owner has three such flips; the gated envelope has four. A stable pass/fail score can conceal a different wrong output on each run.

The envelope pilot completed 94/96 gold attempts and 96/96 raw-source attempts. Two gold requests failed with socket-closed transport errors; neither was retried. Their paired source attempts separately continued and completed. Equal gold/source requests share a cache; when a gold request failed, the source trial could issue its own missing request. These are dependent paired measurements, not independent replications and not production retries.

| Gold-input architecture | Representative tokens / modeled p50 / p95 | Challenge tokens / modeled p50 / p95 |
|---|---:|---:|
| Recorded v3 candidates | 11,886 / 608 ms / 1,012 ms | 14,426 / 826 ms / 1,002 ms |
| Canonical owner | 12,658 / 570 ms / 905 ms | 15,551 / 581 ms / 973 ms |
| Envelopes | 27,580 / 922 ms / 1,780 ms | 36,670 / 935 ms / 2,921 ms |

Modeled latency sums the sequential stage/chunk latencies, including the recorded latency of cache hits. Observed raw-source wall time is often just cache access and must not be used as an inference latency claim. The historical baseline records its existing retry behavior; the new trials disable SDK and lab retries.

## Source coverage and model scope

The measured raw adapter preserved all source characters. Across completed raw trials, exact rendering boundaries matched in 90/96 attempts. The mismatches were a gold `...` punctuation run versus three dot segments and gold `K.` as one clickable abbreviation versus `K` plus punctuation. An explicit gold `geht → geht` copy was initially counted as a surface mismatch when the raw adapter omitted the redundant field. The effective-surface correction treats `surface ?? text` equally and yields 96/96 annotated recovery matches; originals were retained. This does not certify source plans beyond the pilot.

After the pilot, a source-plan correction adds an intact contextual alternative to every authored Fusion/clitic/abbreviation expansion, allowing literal, name and Foreign interpretations. It was not live-tested. On the frozen 1,305 development-plus-reviewed cases, the offline candidate-presence audit changes source questions from 58 to 246 and contextual sentences from 57 to 233. Boundary-and-kind candidate presence changes from 1,275 to 1,276. These are oracle candidate-presence counts, not Jev accuracy.

The adapter uses a generic Unicode scan and a compact authored German recovery table, without a language NLP library. Its recovery repertoire is still finite. Unknown source forms should retain intact text with an explicit abstention rather than invent a split. These are German-first experiments: route language is the ambient `de`, including Foreign routes, as ADR 0045 requires. Actual foreign `sourceLang` is a separate identity feature and is not prepared by these prototypes; other ambient languages are deferred.

## Limits of older evidence

The frozen historical v3 baseline reports 81.80% joint / 88.51% grouping on 1,207 development cases ×3 and 87.84% / 92.12% on 98 reviewed cases ×3. The later candidate4 variant improves recorded joint scores, but contains additional proposal heuristics and an unsafe “general maxim” shortcut for Saying; that shortcut contradicts the requirement for actual conventional uptake. Its higher route score is not a reason to adopt it.

Those older experiments start with gold Segments and recovered fused surfaces. They do not measure the complete raw-text hover path. Their candidate generation uses German word lists, regular expressions and bounded windows, including article/head proximity and limited governed-preposition attachments. A generic sparse subset enumerator cannot guarantee coverage of all discontinuous units: without a proposal mechanism or domain inventories, either candidates grow combinatorially or legitimate distant/multiple attachments are omitted.

Some scratch ensemble analyses condition on gold groups that happen to exist in every prompt and therefore do not measure end-to-end accuracy. Three-repeat consensus is an offline diagnostic and cannot become a production retry policy. The audited `/private/tmp/seglab` JSON was read only; pickle files and original scripts that execute/write pickle data were not run.

## Architecture recommendation

Retain an explicit source-parts table and separate unit membership from the rendering partition. Route each complete unit in a single batched Jev step, keep authored DET/PRON identity hints, preserve open non-Lexeme and Unresolved interpretations, and use deterministic contract checks between calls. Role and identity evidence should be forwarded into the click path instead of being re-asked there. Source offsets should remain the anchor for hover and click; later emoji/canonical-form generation should not change that anchor.

The next sparse alternative to evaluate is a compact proposer that supplies a bounded set of exact source member masks, followed by batched Jev membership/route decisions and deterministic disjoint assembly. A small text proposer is a separate optional capability, not a Jev primitive; it can be isolated so the decisive judgments remain Jev-based. If production must use Jev alone, the current candidate approach remains the stronger measured reference, and authored Dumspec inventories are a more principled place for language-specific knowledge than growing scattered regex/window heuristics. The envelope mechanism can remain a challenger, but its measured multiword recall and token cost prevent recommending it as the default.

A production implementation must store source Segments and unit indices atomically. The current identity hints are candidate-group evidence, not an accepted exact catalog identity, and they do not yet cover multi-member article/auxiliary identities. Acceptance of a prepared route needs its own confidence policy; the primary prototypes do not supply a calibrated one. URL, email, path, trailing-apostrophe, initial and ellipsis boundaries still need complete source plans. Long-source option limits and rendered candidate growth currently abstain rather than guarantee complete semantic coverage.

No new production segmentation, click-resolution policy, gold relabeling or external publication was made.

## Separate hybrid smoke

A separately authorized smoke used the first four representative IDs, gold Segments only, three repetitions and at most 12 text calls. Every text response supplied just one partition, so alternative ranking was not exercised. It is not merged into the 32-case comparison and provides no evidence about the revised raw source adapter.

| Four-case smoke | Grouping | Joint route | Cases with membership variation |
|---|---:|---:|---:|
| Existing v3 baseline | 66 / 72 = 91.67% | 62 / 72 = 86.11% | 0 / 4 |
| Text proposer + Jev, raw+closed | 64 / 72 = 88.89% | 63 / 72 = 87.50% | 2 / 4 |

The strict 0.7 support gate prepares routes for only 11.11% of the annotated gold units. Observed end-to-end median latency was 1.915 seconds and maximum 3.442 seconds. These 12 successful attempts establish plumbing and bounds, not a quality or consistency win.

The actual text model was `gpt-5.6-luna`: 92,055 input and 576 output tokens. The harness requested the `fast` tier but recorded `priority` and failed to stop on that mismatch; it was discovered after all 12 calls. There is no verified normalization explanation. Original evidence and a transport audit were retained. Text cost is unknown and separate from the Jev cap; these latency and cost observations are not evidence for the requested fast tier. No further inference followed the discovery.

## Reproduction and evidence

New Jev inference uses pinned `jev-1.13.0`, with zero SDK and lab retries and configured concurrency two. Execution is sequential across cases/stages and bounded chunks. The shared Jev cap is $1. Reservations use the documented 65,536-token request maximum before dispatch and retain maximum possible usage after an unbilled failure. Known Jev request-usage cost after the owner and envelope pilots is **$0.251133288**; including the separate hybrid smoke it is **$0.260117928**, plus **$0.005505024** reserved for the two unknown-usage failures. The Jev cap remains intact; unknown text-model cost is separate.

The final focused verification passed **64 tests / 1,424 expectations and the scoped TypeScript check** after dependency state settled. Those tests validate contracts and orchestration; the live measurements above separately evaluate model behavior.

A conservative size probe ran 128 synthetic gold/raw scenarios with zero provider calls. The largest state+question+framing bound was 31,026 against 32,768, and the largest packed request+framing bound was 65,498 against 65,536. Real requests repeat the guard before dispatch; options are never truncated to fit.

Gold is frozen at hash `90c1afa7a4df706d`, with source commit `c7176459d38e42ca0a5ccb4c8d465195d937e083`. Unrelated concurrent repository changes were preserved. Corrected owner and envelope runs contain code snapshots/hashes and complete fresh request payloads, including imported rule policy. A code hash alone does not freeze imported Dumspec data. Cache filenames bind model/state/questions/repetition, while cached files contain answers/usage/latency, not the request state. Cached paired requests reuse the first fresh payload. The initial coverage-limited owner run lacks dirty-source/request-payload capture and is not presented as fully frozen provenance.

- [Comparison table and metric definitions](/private/tmp/segment-in-units-investigation-20260930/pilot-comparison.json)
- [Corrected owner reference](/private/tmp/segment-in-units-investigation-20260930/ownership-2026-09-30T05-16-23.759Z/summary.json)
- [Envelope reference](/private/tmp/segment-in-units-investigation-20260930/envelopes-2026-09-30T05-25-47.499Z/summary.json)
- [Envelope first/last and mask coverage](/private/tmp/segment-in-units-investigation-20260930/envelopes-2026-09-30T05-25-47.499Z-candidate-coverage.json)
- [Actual envelope error examples](/private/tmp/segment-in-units-investigation-20260930/envelope-failure-examples.json)
- [Conservative offline size probe](/private/tmp/segment-in-units-investigation-20260930/envelope-preflight.json)
- [Scratch evidence audit](/private/tmp/segment-in-units-investigation-20260930/seglab-audit.json)
- [Post-pilot source candidate audit](/private/tmp/segment-in-units-investigation-20260930/source-context-candidate-coverage.json)
- [Separate hybrid smoke](/private/tmp/segment-in-units-investigation-20260930/hybrid-smoke-2026-09-30T05-32-32.560Z/summary.json)
- [Hybrid transport audit](/private/tmp/segment-in-units-investigation-20260930/hybrid-smoke-2026-09-30T05-32-32.560Z/transport-audit.json)

Model limits and input pricing were verified against [TypeSafe models](https://docs.typesafe.ai/models); primitive behavior against [TypeSafe primitives](https://docs.typesafe.ai/primitives). Structured outputs constrain representation, not semantic correctness or repeat stability.
