# German Phraseme/Idiom Grammatical Resolution prototype

This route-local vertical slice resolves established German multiword Idioms to
the exact Dumling Phraseme/Idiom Lemma and Citation or VERB-backed Inflection
Surface DTO. Its Prompt Source participates in committed system-prompt codegen
and has a package-level prototype command. The generated prompt is registered
in the shared German grammatical-resolution inventory for runtime dispatch.

The corpus contains five minimized prompt demonstrations, 20 disjoint held-out
cases, and six additional corpus-only adversarial or policy boundaries.
Held-out coverage includes Citation; indicative, subjunctive, imperative,
infinitive, and participle Surfaces; sentence-order discontinuity; Full
realization; spelling normalization; selected-head underselection;
overselection; literal readings; and Collocation, Proverb, and DiscourseFormula
boundaries.

The five demonstrations carry distinct burdens: a Full finite Surface, a Full
Partizip-II Surface with an unambiguous member typo, Citation, the
repository-authoritative Partial finite Surface, and a source-backed figurative
Proverb rejected at the route boundary. The literal Gras case and the clearly
idiomatic contextual occurrence whose finite verbal head is unselected remain
corpus-only probes.

Core Features are exactly `{}`. A contextual Inflection must select the
inflecting verbal head, and `normalizedSurface` contains only normalized marked
members in textual order. Citation is reserved for explicitly identified
dictionary/citation entries. The route does not guess component alternants,
ellipsis, or variable argument slots.

## Partial realization tension

The repository explicitly represents `heulte mit` as a Partial Surface of `mit
den Wölfen heulen` in Dumling's internal API test and domain documentation. This
exact family and selection is this slice's only positive Partial evidence. It
does not establish a general “selected head plus one member” rule: `lachte ins`
is a corpus-only Unresolved policy probe, and the corpus-only occurrence whose
finite verbal head is merely present in context is also Unresolved.

The one established exception remains in tension with whole-unit Target
Classification and the Collocation route's Full-only policy. Any broader
Partial semantics require a domain decision before entering demonstrations or
scored evaluation.

## Positive-family provenance

The German sentences in the Golden Corpus are synthesized test stimuli. The
sources below establish the lexical family and category, not the exact invented
sentence. No unsourced positive family is used.

| Positive family | Route use | Direct provenance |
| --- | --- | --- |
| `die Flinte ins Korn werfen` | Full finite and Full Partizip-II plus typo demonstrations | [IDS grammis: Phraseolexem](https://grammis.ids-mannheim.de/terminologie/1175), which lists it as a Verbphraseolexem |
| `Trübsal blasen` | Imperative heldout | [Kwaśniak/Fellbaum, *Muttersprache* 1/2008](https://gfds.de/muttersprache-1-2008/), which explicitly describes it as a German Verb-Nomen idiom; also [IDS Phraseolexem](https://grammis.ids-mannheim.de/terminologie/1175) |
| `mit den Wölfen heulen` | Partial finite demonstration | [Kwaśniak/Fellbaum, *Muttersprache* 1/2008](https://gfds.de/muttersprache-1-2008/), explicitly a Verb-Nomen idiom; additionally repository-authoritative Dumling example |
| `sich ins Fäustchen lachen` | Finite, infinitive, participle, typo, and corpus-only Partial probe | [IDS Phraseolexem](https://grammis.ids-mannheim.de/terminologie/1175), including a corpus attestation; [IDS FVG contrast](https://grammis.ids-mannheim.de/kontrastive-grammatik/3773) |
| `Hand und Fuß haben` | Indicative and subjunctive | [IDS Phraseolexem](https://grammis.ids-mannheim.de/terminologie/1175); [IDS syntactic-semantic status](https://grammis.ids-mannheim.de/systematische-grammatik/801) |
| `frieren wie ein Schneider` | Finite and Citation | [IDS Phraseolexem](https://grammis.ids-mannheim.de/terminologie/1175) |
| `das Bett hüten` | Finite plus literal boundary | [IDS FVG/Phraseolexem boundary](https://grammis.ids-mannheim.de/systematische-grammatik/514) |
| `zwei Fliegen mit einer Klappe schlagen` | Finite and participle | [IDS Wörterbuch zur Verbvalenz](https://grammis.ids-mannheim.de/verbs/view/400867/5), explicitly identified as an idiomatic Wendung |
| `den Löffel abgeben` | Finite and typo normalization | [Gesellschaft für deutsche Sprache](https://gfds.de/woher-kommt-die-redewendung-den-loeffel-abgeben/) |
| `ins Gras beißen` | Citation demonstration; contextual selected-head-negative and literal corpus-only cases | [IDS contrastive grammar](https://grammis.ids-mannheim.de/kontrastive-grammatik/4479), where it occurs as a phraseological unit |
| `Wer anderen eine Grube gräbt, fällt selbst hinein` | Proverb route-boundary demonstration | [OWID article 401865](https://www.owid.de/artikel/401865), which records the complete proverb |

IDS uses `Phraseolexem` more broadly than this product taxonomy and includes
some Funktionsverbgefüge. The prompt therefore applies the product's narrower
boundary: a figurative/global lexical meaning routes to Idiom, while a
restricted but semantically compositional support-verb expression routes to
Collocation.

## Evidence runner

The route runner is bounded to exactly the current 20 held-out cases. Direct
execution makes one serial `gpt-5.6-luna` call per case; the shared Batch runner
can submit the same current-bound cases to `/v1/responses` in one OpenAI Batch.
Both transports use no reasoning, no retries, and `store: false`. Import and
missing-key preflight make no provider call. Draft evidence is bound to hashes
of the exact assembled prompt, input/output schemas, ordered case IDs, and
runner policy. Provider raw output and metadata survive parse errors. Batch
evidence additionally retains the Batch and file IDs, request counts, JSONL
hashes, submission-manifest hash, transport, and truthful null per-request
latency.

Offline finalization rejects provider/execution errors, reparses each retained
`rawOutputText` through the current output schema, exact-compares it with the
retained parsed output, recomputes diagnostics, and requires a classification
for every scored miss. Evidence needs at least 15 cases, an 80% score, no
execution errors, and no unclassified misses.

The qualifying current-bound evidence is the finalized Batch run at
`runs/2026-08-03T16-47-17-938Z/results.json`: 19/20 (95%), zero provider or
execution errors, `gpt-5.6-luna`, reasoning `none`, and Batch transport. The
sole miss is an accepted model limitation: although Gate 2 twice requires an
Unresolved decision when the selected inventory omits its verbal head, the
model resolved `sich ins Fäustchen` and borrowed finite features from the
unselected contextual `lachte`. Earlier retained drafts are diagnostic only;
successive prompt and corpus refinements reduced their broader route-boundary,
spelling, verb-form, and inventory failures to this one stable miss.

A direct run and offline finalization can be invoked from `battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-idiom

bun run docs/prototypes/grammatical-resolution-idiom/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-idiom/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-idiom/runs/<timestamp>/miss-classifications.json
```

For Batch submission, collection, and provenance rules, use the shared
[`grammatical-resolution-batch`](../grammatical-resolution-batch/README.md)
runner.
