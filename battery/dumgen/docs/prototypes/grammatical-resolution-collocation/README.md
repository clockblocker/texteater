# German Phraseme/Collocation Grammatical Resolution evaluation

This route-local vertical slice evaluates the exact
`grammatical-resolution/de/phraseme/collocation` Prompt Source. Its Golden
Corpus has 28 cases: five necessary demonstrations, 20 authoritative disjoint
held-out cases, and three alternant/member-identity cases.

## Initial policy

The authoritative scope is conventional non-idiomatic German verbal
support-verb and Funktionsverbgefüge Collocations. The lexical choices are
restricted, but the whole remains compositionally related to its nominal
component. Free verb-object combinations, non-compositional Idioms, paired
Constructions, verb-only targets, mixed occurrences, and proposals that mark a
contextual dependent as a lexical member remain outside this route. TARGET tag
syntax and one-token-per-pair validation belong to deterministic input
preflight, not model classification.

The Dumling Collocation codec has an empty Core and reuses German VERB
Inflectional Features. An explicit entry is Citation. A contextual occurrence
is Inflection and takes the support verb's contextual features. Full Surfaces
mark every canonical lexical member present in the sentence. Partial is
representable in the Dumling contract, but this route has no authoritative
positive Partial policy. A present but unmarked canonical member is
underselection and therefore Unresolved. An elliptic occurrence with an absent
support verb is also Unresolved because its Surface cannot borrow inflectional
features from another occurrence. Every Resolved output has at least two
aligned `memberOrthographies` values.

The five demonstrations have separate burdens: `eine Entscheidung treffen`
shows full contextual Inflection and three-member orthography alignment; `eine
Frage stellen` shows Citation; `zur Verfügung stellen` shows a discontinuous
but Full contextual realization with every canonical member marked;
`Anerkennung finden` jointly shows a two-member inventory, typo repair, and
Partizip-II morphology without borrowing tense from its auxiliary; and `ein
Buch lesen` establishes the free-combination boundary. The held-out suite
covers finite present and past, imperative, infinitive, Partizip II, Citation,
typo repair, intervening modifiers, and the Idiom, Construction, verb-only,
mixed-occurrence, marked-dependent, direct underselection, and ellipsis
boundaries. No resolved demonstration Lemma appears in held-out scoring.

Determiner replacement, bare or plural nominal realization, and alternate
support verbs are organized as lexical-member alternants. The route does not
equate them with the canonical `eine Entscheidung treffen` Lemma. The current
verbal feature bundle also cannot record nominal number, so plural identity
must not be inferred from schema availability.

## Lexical provenance

The lexical inventory is grounded in the Leibniz Institute for the German
Language's grammis resources rather than inferred from plausible co-occurrence:

- The [IDS definition of Funktionsverbgefüge](https://grammis.ids-mannheim.de/vggf/2202)
  establishes the verb-plus-NP/PP shape, bleached support verb, and the
  distinction from free uses; it explicitly includes `Zustimmung erteilen` and
  `zum Ende kommen` families.
- [IDS Nominalisierungsverb und Funktionsverb](https://grammis.ids-mannheim.de/systematische-grammatik/514)
  explicitly lists `eine Frage stellen`, `eine Vereinbarung treffen`, `zur
  Kenntnis nehmen`, `Abbitte leisten`, and `Anerkennung finden`, and documents
  restrictions on determiner, attribute, and number variation.
- The IDS [`stellen` valency entry](https://grammis.ids-mannheim.de/verbvalenz/400931)
  explicitly identifies `einen Antrag stellen` and `zur Verfügung stellen` as
  Funktionsverbgefüge.
- [IDS on FVG boundary problems](https://grammis.ids-mannheim.de/systematische-grammatik/1544)
  explicitly gives `Abschied nehmen`, `in Erscheinung treten`, and `zum
  Ausdruck bringen`, and distinguishes FVGs from phraseolexemes.
- The IDS [contrastive FVG inventory](https://grammis.ids-mannheim.de/kontrastive-grammatik/3773)
  explicitly includes `in Anspruch nehmen` and `Einfluss nehmen` in productive
  `nehmen` series.
- `eine Entscheidung treffen` is the repository's established Collocation seed
  in the [Dumling domain model](../../../../dumling/CONTEXT.md).

## Bounded evidence runner

The evidence tooling supports direct Responses calls and OpenAI Batch transport.
Both modes use `gpt-5.6-luna`, no reasoning effort, no retries, `store: false`,
and a 32,768-token output cap, and preflight 15–20 cases before any provider
work. Retained evidence binds the ordered Golden Cases, assembled prompt and
schema hashes, model, reasoning policy, runner version, and transport. Batch
evidence additionally retains the Batch and file IDs, request counts,
submission and JSONL hashes, endpoint, completion window, and provider
timestamps; per-request latency remains null because Batch does not expose it.
Provider output text and complete response metadata survive parse or schema
failures. Imports, tests, checks, and offline finalization make no model calls.
Finalization reparses every successful raw provider output with the current
output schema and requires exact equality with the retained parsed output before
recomputing diagnostics.

An explicit live run from `battery/dumgen` can later use:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-collocation/run.ts
```

The live command writes atomically beneath `runs/<timestamp>/results.json` and
exits unsuccessfully until every scored miss is classified offline. Finalize
with:

```sh
bun run docs/prototypes/grammatical-resolution-collocation/run.ts finalize \
  docs/prototypes/grammatical-resolution-collocation/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-collocation/runs/<timestamp>/miss-classifications.json
```

Finalization rejects stale bindings, recomputes every diagnostic and score,
rejects provider errors, and requires every scored miss classification.
Evidence qualifies only with at least 15 attempts, at least 80% exact accuracy,
zero execution errors, and zero unclassified misses.

## Final evidence

The qualifying remediation run is
[`runs/2026-08-03T16-12-57-637Z/results.json`](runs/2026-08-03T16-12-57-637Z/results.json).
It scored 16/20 (80%) with zero execution errors and four independently
classified model limitations. The run used the `openai-batch-v1` transport with
`gpt-5.6-luna`, reasoning effort `none`, `store: false`, and complete Batch
provenance retained in the result.
