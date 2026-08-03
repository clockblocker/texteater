# German Lexeme/PRON Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/pronoun` Prompt Source. Its Golden Corpus has
36 explicit cases: four minimized demonstrations, 21 disjoint authoritative
held-out cases, and 11 corpus-only cases. The corpus-only set consists of eight
uncertain policy probes and three retained route-boundary controls. Resolved
demonstration Lemmas do not occur in held-out scoring.

The four demonstrations carry distinct burdens:

- the explicit entry label for `man` establishes Citation and a mandatory
  non-null Core `PronType`; and
- contextual `ihm` establishes Inflection, the `er` canonical form, stable
  personal features, and contextual case, gender, number, and reflex fields;
- standalone `jener` demonstrates that an inflecting determiner Lexeme remains
  DET even when it heads a nominal alone; and
- standalone `zwei` demonstrates that a cardinal remains NUM rather than
  becoming PRON.

The Unresolved demonstrations are lemma-disjoint semantic twins of the
corpus-only `dieser` and `eins` controls. Each pair shares an explicit
contamination key so neither control can accidentally re-enter held-out
scoring. The earlier generic `schnell` rejection remains corpus-only.

The prompt prose states the lexical DET/PRON boundary, exact Core Feature
policy, contextual Reflex policy, formal address rules, normalization, and
route/scope rejection rules. It also distinguishes invariant canonical-shape
Citation Surfaces from genuinely encoded Inflection Surfaces and forbids an
all-null Inflection bag. The assembled prompt has an explicit lexical-leakage
guard. Formal `Sie`/`Ihnen` are the one held-out lexical exception because their
required capitalization, `Person=2`, `Polite=Form`, and deliberately null
Number cannot be stated without naming the forms. The combined-value
`der`/`wer`/`was` names occur only in corpus-only exclusions.

The authoritative suite covers personal agreement and case, singular versus
plural `sie`, formal address, first- and third-person reflexive behavior,
non-reflexive contrast, indefinite and negative pronouns, invariant reciprocal
`einander`, the licensed `nix` Citation variant, typo repair, and lexical
boundaries to ADV and NOUN. Demonstrations cover the DET and NUM policy
families. The suite also rejects overbroad, repeated, and unrelated targets.
Exactly one balanced TARGET pair can resolve.

## Corpus-only cases

Three route-boundary controls are deliberately absent from demonstrations and
scoring: `schnell` retains the generic ADJ/ADV rejection, while `dieser` and
`eins` are contamination-linked semantic twins of the demonstrated DET and NUM
families.

The following eight uncertain policy probes are also absent from demonstrations
and scoring:

- `der` requires GSD's combined `PronType=Dem,Rel`, while the current Dumling
  codec accepts only one scalar value;
- `wer` and the relevant `was` identities require combined
  `PronType=Int,Rel`; the latter also carries rare `ExtPos=DET`;
- German UD prose specifies `Polite=Infm` for informal second person, while
  current GSD PRON data attests only `Polite=Form`;
- native PRON `Poss=Yes` is not established by the current inventory;
- GSD's PRON `Foreign=Yes` and `PronType=Tot` examples are foreign
  code-switching rather than stable native German classes; and
- contracted `'s` is attested with lemma `es`, but Variant versus Partial
  realization still needs a domain ruling.

Primary references are the
[German PRON definition](https://universaldependencies.org/de/pos/PRON.html),
[German annotation overview](https://universaldependencies.org/de/),
[German DET/PRON boundary](https://universaldependencies.org/de/pos/DET.html),
[GSD PRON statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-PRON.html),
and [GSD PronType statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-PronType.html).
IDS grammis separately supports the contextual distinction between personal
and reflexive readings and the reciprocal identity of `einander`.

## Exact DTO and evaluation

The model schemas derive directly from Dumling's German Lexeme/PRON Lemma,
Citation Surface, and Inflection Surface schemas. They omit only redundant
`language`, `family`, `kind`, and the Surface's linked Lemma. Every nullable
Core and Inflectional key remains required. The pure evaluator scores decision
coherence, member count and orthography, Surface kind, normalization, spelling,
coverage, Surface and Inflectional Features, canonical form, and Core Features.
It canonicalizes only a null-only Surface Feature bag.

## Bounded evidence runner

Runner v1 makes one serial call for each of the 21 held-out cases using
route-local `gpt-5-nano`, high reasoning, a 16,384-token output budget, zero
retries, and `store: false`. A 25-case cap prevents accidental corpus growth
from expanding a live run. No live call was made while authoring this slice.

Each retained run binds the route, runner version, model policy, assembled
prompt and schema hashes, exact ordered evaluation IDs, and current Golden Case
inputs and ideals. Successful responses retain raw output, response ID,
resolved model, and usage metadata. JSON or exact-schema failures retain that
complete response metadata with the error; transport errors remain error-only.

After shared generated-prompt and package integration, an explicit live run can
invoke the runner from `battery/dumgen`:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-pronoun/run.ts
```

The draft exits unsuccessfully until every scored miss is classified offline
as `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`. Finalize without a provider call:

```sh
bun docs/prototypes/grammatical-resolution-pronoun/run.ts finalize \
  docs/prototypes/grammatical-resolution-pronoun/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-pronoun/runs/<timestamp>/miss-classifications.json
```

Evidence qualifies with at least 15 cases, at least 80% exact-contract score,
zero execution errors, and zero unclassified misses. Finalization rejects stale
policy, prompt, schema, suite, and Golden Case bindings and atomically replaces
the retained result.
