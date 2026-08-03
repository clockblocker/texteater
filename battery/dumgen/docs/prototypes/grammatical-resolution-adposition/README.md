# German Lexeme/ADP Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/adposition` Prompt Source. Its Golden Corpus
contains 27 cases across Citation Surface behavior, position and case-government
Core Features, orthography, normalization, historical status, and Unresolved
boundaries. Seven cases are selected as demonstrations and 17 settled,
explicitly pinned cases form the disjoint held-out evaluation suite. Three
provisional policy cases (circumposition representation, `ExtPos=SCONJ`, and
the canonical governed case of `wegen` in a colloquial-dative attestation) are
intentionally corpus-only pending human review. Resolved demonstration Lemmas
are absent from held-out scoring.

The seven demonstrations each carry a distinct burden:

- contextual `mit` establishes that this non-inflecting route always emits a
  Citation Surface and keeps dative government on the Lemma;
- two-way `auf` prevents copying a local complement case into `governedCase`;
- postpositional `entlang` establishes `AdpType=Post` and accusative government;
- sentence-initial `Wegen` separates normal capitalization from a typo;
- misspelled `one` establishes repair plus `memberOrthographies=Typo`;
- overbroad `mit einem Messer` establishes the complement boundary; and
- context-free `entlang` establishes Unresolved when Core Features cannot be
  chosen defensibly.

The bounded runner makes one serial call per held-out case with the catalog's
current model and token policy, low reasoning effort, no retries, `store:
false`, and a 1,024-token output cap. It preflights 15–25 cases against the
authored Prompt Source's exact input and output schemas before constructing a
provider client; the legacy catalog schemas are not evaluation authority. A
retained run binds the exact ordered case IDs, current Golden Case values,
assembled prompt hash, authored input and output schema hashes, catalog model
and token policy, runner version, response metadata, field-level diagnostics,
and errors. The route-local model schema accepts Structured Outputs' null-only
`surfaceFeatures` bag, and evaluation normalizes it to canonical null semantics.

No provider call is made by imports, tests, evidence validation, or
finalization. A live run is an explicit manual action from `battery/dumgen`:

The root integration registers this Prompt Source with system-prompt codegen and
adds the package command, so run:

```sh
bun run prototype:grammatical-resolution-adposition
```

Draft results are written atomically beneath `runs/<timestamp>/results.json`.
The live command always exits unsuccessfully after retaining the draft so that
human classification remains a required gate. Provider or execution errors
require a fresh run.

## Evidence finalization

For each scored miss, create a JSON sidecar keyed by case ID:

```json
{
  "grammar-de-adp-example": {
    "classification": "prompt-defect",
    "explanation": "The prompt does not state the applicable boundary."
  }
}
```

The classification must be `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`. Finalize without a provider call:

```sh
bun run docs/prototypes/grammatical-resolution-adposition/run.ts finalize \
  docs/prototypes/grammatical-resolution-adposition/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-adposition/runs/<timestamp>/miss-classifications.json
```

Finalization rejects obsolete prompt, catalog, suite, Golden Case, or runner
policy bindings. It recomputes every diagnostic and score, rejects runs with
provider errors, and requires a non-empty classification for every miss.
Evidence qualifies only with at least 15 attempts, an 80% or better exact
contract score, zero execution errors, and zero unclassified misses.
