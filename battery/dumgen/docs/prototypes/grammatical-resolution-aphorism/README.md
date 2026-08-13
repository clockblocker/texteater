# German Phraseme/Aphorism Grammatical Resolution prototype

This route resolves an already classified German Aphorism Analysis Target. The
legacy contract accepted only `markedContext`, reopened route and membership
decisions, and returned a `Resolved | Unresolved` wrapper around a nullable
payload. The current contract accepts exactly `{markedContext,members}` and
returns one total flat codec-derived DTO. Both input projections are
authoritative.

The model owns member orthography and normalization, Phraseme
`realizationCoverage`, Citation spelling/features, and Lemma `canonicalForm`.
The application owns German language, Phraseme family, Aphorism kind, empty
Lemma Core Features, Citation `surfaceKind`, Surface-to-Lemma linkage,
normalized Surface construction, and successful result construction. The leaf
codec restores empty Core Features without exposing them in model output.

`Partial` is deliberately narrow. It applies only to an explicitly shortened
citation whose unrealized tail is shown by an ellipsis and whose full Aphorism
is still recoverable. It never excuses an overt omitted member, attribution,
two-unit selection, or other membership error; those concerns belong upstream.

## Frozen corpus

The 32 route-valid full-sentence cases are frozen as:

- 6 demonstrations covering punctuation, typo repair, licensed historical
  variation, an attribution interrupting a split quotation, genuine Partial,
  and nearby slogan context;
- 16 development cases covering author attribution, repetition, initial casing,
  quotation and terminal punctuation, and nearby Proverb, Idiom, Collocation,
  slogan, and ordinary-assertion contrasts;
- 10 untouched acceptance cases covering unseen lexical families, two Partial
  quotation, current spelling, diacritics, and varied sentence structure.

All stimuli derive their Aphorism wording from Marie von Ebner-Eschenbach's
public-domain 1893 collection *Aphorismen*, via the proofread
[Project Gutenberg transcription, eBook 77889](https://www.gutenberg.org/ebooks/77889).
The corpus uses current orthography except where the historical `muß` case
explicitly tests a licensed `Variant`; surrounding attribution and contrast
sentences are synthetic. Punctuation and quotation marks are context rather
than word-like members. No external sentence is represented as a verbatim
modern attestation without this editorial normalization.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Import and preflight make no provider call.

The authorized protocol used 16 calls for each of three development rounds and
10 calls for one untouched acceptance run: 58 calls total. Retained usage is
130,271 input tokens, of which 118,602 were cached, plus 6,425 output tokens and
zero reasoning tokens. That is conservatively estimated below $1 under the
shared model policy and well below the leaf's $5 authorization; exact currency
cost requires the provider billing export because Responses usage reports only
tokens.

## Retained evidence

All four current-contract runs are finalized, have zero execution errors, and
classify every miss:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 13/16 (81.25%) | `runs/2026-08-13T10-07-10-360Z/results.json` |
| Development 2 | 16/16 (100%) | `runs/2026-08-13T10-08-49-368Z/results.json` |
| Development 3 | 16/16 (100%) | `runs/2026-08-13T10-09-34-917Z/results.json` |
| Untouched acceptance | 8/10 (80%) | `runs/2026-08-13T10-10-30-323Z/results.json` |

Round 1 exposed two prompt defects: `canonicalForm` reinserted contextual
punctuation, and a repaired lowercase initial member was mislabeled Standard.
The prompt was narrowed to mechanical space-joined, punctuation-free
serialization and explicit Typo classification for that source casing error.
Both subsequent development rounds scored 100%, so no further prompt change was
made.

Untouched acceptance met the configured 80% gate. Its two classified model
limitations both concern exact completion of source-attested Partial citations:
one returned a different aphoristic completion and one returned only the quoted
beginning. Both otherwise identified Partial correctly and preserved all
surface fields. The exact miss inventory and disposition is retained beside
every `results.json` as `miss-classifications.json`. Earlier v7/Batch evidence
binds the obsolete contract and is not evidence for this migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-aphorism.test.ts \
  tests/internal/grammatical-resolution-aphorism-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-aphorism/run.ts \
  preflight development 1
```

After explicit authorization, each development round uses `run development
<1|2|3>`, followed by offline `finalize <results.json>
<miss-classifications.json>`. Only after all three finalized rounds may the
orchestrator invoke `preflight acceptance` and `run acceptance`.
