# German Construction/PairedFrame Grammatical Resolution prototype

This route resolves an already classified German PairedFrame Analysis Target.
The legacy contract accepted only `markedContext`, reopened route and membership
decisions, and returned a `Resolved | Unresolved` wrapper around a nullable
payload. The current contract accepts exactly `{markedContext,members}` and
returns one total flat codec-derived DTO. Both input projections are
authoritative.

The model owns one orthography classification and normalized string per anchor,
Citation spelling/features, and the Lemma `canonicalForm`. The application owns
German language, Construction family, PairedFrame kind, empty Lemma Core
Features, Citation `surfaceKind`, Surface-to-Lemma linkage, normalized Surface
construction, `Full` realization coverage, and successful result construction.
Construction has no model-owned coverage field and this Dumling route has no
Inflection Surface.

Grammatical Resolution never repairs membership. All supplied members are
already the complete anchors of one classified occurrence in source order.
Comparatives, degree expressions, predicates, infinitives, conjuncts, and other
payload remain unmarked context. Nearby ordinary CCONJ, SCONJ, ADV, ADP, and
PART occurrences do not alter the target, even when their spellings repeat an
anchor.

## Frozen corpus

The 34 synthetic, natural full-sentence cases are frozen as:

- 6 demonstrations covering a discontinuous infinitive frame, three anchors,
  comparative payload exclusion, typo repair, historical spelling Variant, and
  predicate payload around `einerseits … andererseits`;
- 18 development cases covering two- and three-anchor coordinator frames,
  proportional and infinitive frames, repeated `teils` anchors, independent
  lexical alternants, ordinary initial casing, two typo positions, an archaic
  spelling form, repeated `je` anchors, and unmarked CCONJ/SCONJ/ADV or
  same-spelled ADP/PART context;
- 10 untouched acceptance cases covering unseen sentences across the principal
  two- and three-anchor families, repeated spellings, clauses, predicates,
  comparatives, and infinitive discontinuity.

The three selections are explicit and pairwise disjoint. Exact observed
development cases cannot become demonstrations, while a genuinely different
sentence may teach the same grammatical distinction.

Every Canonical Form writes anchor groups in normalized order separated by a
spaced ellipsis, such as `entweder … oder` or `sowohl … als auch`.
`normalizedMembers` instead contains only the realized anchor strings in source
order and no ellipsis. Licensed lexical alternatives create separate empty-Core
Lemmas: `je … desto` differs from `je … umso`; `sowohl … als auch`, `sowohl …
wie`, and `sowohl … wie auch` differ; and `anstatt … zu` differs from `statt …
zu`. They are Canonical Surfaces, not orthographic Variants.

The historical `so … daß` case is the spelling Variant: the attested `daß`
stays Standard and unchanged in `normalizedMembers`, while the current Lemma is
`so … dass`. The Rat für deutsche Rechtschreibung documents current `dass` as
the post-reform spelling after a short vowel in its
[reform overview](https://www.rechtschreibrat.com/service/handreichungen/).
Historical spelling alone does not make the grammatical use archaic. The
separate `je … je` proportional case remains Canonical; current dictionaries
still list this repeated-anchor pattern.

The frame inventory and anchor/payload distinction follow the product's German
High-Level Target Classification corpus and its `einerseits … andererseits`,
`sowohl … als auch`, and `je … desto` cases. The broader patterns are grounded
in the Leibniz Institute for the German Language's grammis descriptions of
[multi-part coordinators](https://grammis.ids-mannheim.de/kontrastive-grammatik/3789),
[proportional connectors](https://grammis.ids-mannheim.de/systematische-grammatik/366),
[correlative `so … dass`](https://grammis.ids-mannheim.de/konnektoren/406996),
and [German infinitive constructions](https://grammis.ids-mannheim.de/terminologie/909).
All corpus sentences are original synthetic examples; no external sentence is
represented as a verbatim attestation.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Import and preflight make no provider call.

The authorized protocol used 18 calls for each of three development rounds and
10 calls for one untouched acceptance run: 64 calls total. Retained usage is
116,857 input tokens, of which 110,390 were cached, plus 3,545 output tokens and
zero reasoning tokens. That is conservatively estimated below $1.25 under the
shared model policy and well below the leaf's $5 authorization; exact currency
cost requires the provider billing export because Responses usage reports only
tokens.

## Retained evidence

All four current-contract runs are finalized, have zero execution errors, and
classify every miss:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 14/18 (77.78%) | `runs/2026-08-13T10-25-11-374Z/results.json` |
| Development 2 | 18/18 (100%) | `runs/2026-08-13T10-26-23-176Z/results.json` |
| Development 3 | 18/18 (100%) | `runs/2026-08-13T10-26-55-560Z/results.json` |
| Untouched acceptance | 10/10 (100%) | `runs/2026-08-13T10-27-33-414Z/results.json` |

Round 1 exposed one repeated prompt defect: ordinary sentence-initial
`Entweder` and `Je` remained capitalized in `normalizedMembers`. It also exposed
one corpus defect: the `je … je` case was incorrectly labeled as an archaic
grammatical use despite current dictionary coverage. The prompt made the
Standard lowercase transformation mechanical, and the oracle was corrected to
null Surface Features. Both subsequent development rounds scored 100%, so the
best observed prompt was frozen without further changes. No exact failed case
became a demonstration.

Untouched acceptance was invoked exactly once behind the shared gate and scored
100%. The exact miss inventory and disposition is retained beside every
`results.json` as `miss-classifications.json`. The earlier v5 Batch evidence
binds the obsolete markedContext-only input, decision wrapper, mixed valid and
invalid suite, copied runner, prompt, schema, and transport; it is not evidence
for this migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-paired-frame.test.ts \
  tests/internal/grammatical-resolution-paired-frame-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-paired-frame/run.ts \
  preflight development 1
```

After explicit authorization, each development round uses `run development
<1|2|3>`, followed by offline `finalize <results.json>
<miss-classifications.json>`. Only after all three finalized rounds may the
orchestrator invoke `preflight acceptance` and `run acceptance`.
