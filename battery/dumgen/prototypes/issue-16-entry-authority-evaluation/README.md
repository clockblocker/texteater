# Issue 16 opaque Entry-identity evaluation freeze

> **THROWAWAY PROTOTYPE — DO NOT IMPORT INTO PRODUCTION.**

This freeze answers one question: can issue #16 evaluate Entry-identity strategies against a newly versioned, inference-blind corpus without depending on licensed lexical-authority access?

Yes. The bundle freezes the inputs, synthetic catalog, gold decisions, relational assertions, scorer, integrity validator, and SHA-256 manifest needed for that comparison. It deliberately contains no model prompts, model outputs, authority responses, authority identifiers, network adapter, persistence, or production wiring.

## Run

From this directory, run the complete local check as one shell command:

```sh
bun test scorer.test.ts && bun validate.ts
```

The validator fails closed on gold leakage, unknown IDs, catalog/gold drift, missing mandated strata, reused visible-v1 IDs or sentences, broken relations, and hash drift.

## Frozen design

- `blind-input.json` contains 21 new-context cases: 18 German and 3 Russian. It contains no decision, expected answer, gold object, or learner-Meaning fixture ID.
- `catalog.json` contains 20 newly generated opaque Entry IDs. It is a synthetic, corpus-curated evaluation catalog with an explicitly empty `authorityBindings` array; it must not be represented as authority output.
- `gold.json` contains 20 `Existing` and 1 `ProposeNew` decisions, ten relational assertions, and one learner-Meaning-independence assertion.
- `scorer.ts` treats malformed output, fabricated IDs, and descriptor drift as invalid and zero-correct; reports false Existing merges separately; and treats a structured `Abstain` as valid coverage with zero correctness.
- `scorer.test.ts` covers the perfect freeze, fabrication, descriptor drift, abstention, invalid `ProposeNew`, and false merge paths.
- `freeze-manifest.json` records the corpus dimensions and SHA-256 hashes of every frozen input/implementation file plus local policy sources.

The primary strata are polysemy/Meaning independence (2), paradigm homonymy (4), same-spelling POS (2), Russian `коса` homonymy (3), family/subkind boundaries (4), grammar category (2), inflectional same-Entry identity (2), baseline (1), and missing identity (1).

“Hidden” here means newly versioned and withheld from an inference arm while that arm is running. A checked-in corpus is not permanently secret. Evaluation runners must expose only `blind-input.json` and the candidate catalog to candidate-inspection arms, then score with `gold.json` after outputs are frozen. The visible issue-7 corpus remains useful for development, but must not be substituted for this freeze or mixed into prompts.

## Boundary-policy basis

The judgments are corpus fixtures derived from the project boundary policy, not claims about a commercial authority:

- German `Schloss` readings share one Entry; learner-facing Meaning partitioning is independent and is not scored for cardinality.
- German `Bank` and `Mutter` paradigms split where citation spelling is shared but plural paradigms and lexical identity differ.
- Same spelling with different POS (`seit` ADP vs SCONJ) is distinct.
- Russian `коса` braid/scythe/sand-spit identities are distinct.
- Phraseme, lexeme, morpheme, separable verb, and adposition controls preserve family/subkind boundaries.
- Person/inflection changes do not create Entries.
- Clay `Ton` is the already adjudicated no-match control and must be `ProposeNew`; no new lexical judgment was invented for this freeze.

The local hashed policy sources are ADR 0001, the issue-5 evaluation contract, and the issue-7 corpus/scorer. The manifest also records GitHub issues [#5](https://github.com/clockblocker/texteater/issues/5), [#7](https://github.com/clockblocker/texteater/issues/7), [#11](https://github.com/clockblocker/texteater/issues/11), and [#16](https://github.com/clockblocker/texteater/issues/16) as external policy references.

## Deliberate ambiguity

Issue #11 permits one or several learner-facing Meanings for a shared `Schloss` Entry. This freeze therefore does **not** gold an exact Meaning count. It only asserts that two distinct learner-Meaning fixture IDs are absent from blind input and cannot change the shared Entry ID. Choosing a Meaning cardinality would require a separate learner-pedagogy policy decision.

The prototype skill’s logic branch is implemented here as a non-interactive freeze validator and pure scorer because the design question concerns data/scoring integrity rather than a stateful UI. The focused tests are retained because issue #16 explicitly requires scorer/validator evidence.
