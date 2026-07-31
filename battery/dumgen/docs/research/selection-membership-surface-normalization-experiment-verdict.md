# Selection membership and Surface normalization experiment verdict

Date: 2026-07-31  
Issue: [`clockblocker/texteater#6`](https://github.com/clockblocker/texteater/issues/6)  
Corpus: `click-resolution-chain-v1`, Selection/Surface subset  
Status: measured prototype verdict; no production strategy selected

## Verdict

Use canonical Segment indices at the prompt/application boundary. Do not use
bare quoted member text as the canonical prompt-facing representation: all nine
attempts for the three repeated-`auf` click cases failed the exact-text adapter
as ambiguous, exactly as the ticket's stress case predicts.

For the next experiment, keep membership and normalization as separate narrow
contracts:

1. Membership returns ordered, unique `ResolvableText` indices including the
   click, plus clicked-only `selectedOrthography`.
2. Application code validates those indices and constructs
   `attestedSurface`.
3. Normalization operates only on validated members. The guarded
   one-normalized-item-per-member representation is worth retesting as a shape
   constraint, and should reject rather than repair an invalid response.
4. Application code joins normalized member items using the same deterministic
   spacing policy as `attestedSurface`.

This is a direction for another experiment, not a production winner. No arm
passed the fixed `click-resolution-chain-v1` gates. The best full-contract exact
rate was only 44.4%, and every arm failed important relational cases.

Do not add an agent loop for this task on the evidence here. Structural
membership inspection did not supply the missing linguistic judgment: the
agentic arm was less accurate and more expensive than the direct-index
baseline.

## Fixed run

The throwaway runner is under
[`battery/dumgen/prototypes/issue-6-selection-surface`](../../prototypes/issue-6-selection-surface/README.md).
It retained every raw response, canonical adapter result, timing, usage, and
error under its `results/` directory.

- 24 click cases × 3 repetitions × 5 arms = 360 attempts
- model alias: `gpt-5-nano`
- returned snapshot: `gpt-5-nano-2025-08-07`
- reasoning: `low`
- maximum output tokens: 2,048
- concurrency: 4
- deterministic shuffle seed: 6006
- Responses API storage: disabled
- total measured cost: $0.151135
- price snapshot: OpenAI schedule effective 2026-07-31
  ([source](https://developers.openai.com/api/docs/models/gpt-5-nano))

The project model list exposed only `gpt-5-nano`. A real `gpt-5-mini` probe
returned HTTP 403 `model_not_found`; the sanitized evidence is retained in
`results/model-access.json`. This limits the verdict to the available nano
snapshot rather than establishing that the strategies fail on larger models.

## Results

Normalization exactness is also reported conditional on correct membership so
a membership error is not misattributed to the normalizer.

| arm | full exact | membership exact | membership F1 | normalization exact given correct membership | whitespace-token expansions | exact known lemmatizations | invalid | p95 latency | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| one prompt, indices | 40.3% | 52.8% | 77.6% | 92.1% (38) | 0 | 0 | 0.0% | 13,611 ms | $0.025636 |
| one prompt, quoted text | 23.6% | 43.1% | 71.3% | 77.4% (31) | 0 | 0 | 12.5% | 14,743 ms | $0.028017 |
| chained, free normalization | **44.4%** | **58.3%** | 83.1% | **90.5%** (42) | 1 | 3 | 0.0% | 18,183 ms | $0.030050 |
| chained, guarded normalization | **44.4%** | **58.3%** | **83.5%** | 88.1% (42) | **0** | 2 | 2.8% | 21,079 ms | $0.035009 |
| agentic membership inspection | 30.6% | 44.4% | 74.9% | 81.3% (32) | 0 | 1 | 0.0% | 14,485 ms | $0.032423 |

Invalid attempts receive zero for every correctness metric, including pooled
membership precision/F1. The guarded adapter had zero observed
whitespace-token expansions, while free normalization had one, but this narrow
counter does **not** establish general lexical-insertion safety: it cannot
detect all inserted material inside a member item. The exact oracle also found
five known lemmatizations across the chained arms. Two guarded responses failed
the one-item-per-member contract. These normalization failures and the
unimplemented general insertion gate are independently disqualifying.

The retained report also includes all 120 arm/case rows, macro averages over 12
required-case groups, and each in-scope relational assertion for every arm and
repetition. No repetition of any arm passed every in-scope relational
projection. Full-chain Entry, Meaning, Surface-kind, and inflection assertions
are explicitly marked out of scope rather than counted as passes.

## Required distinctions and failure modes

- Direct indices represented repeated tokens without ambiguity. Bare quoted
  text could not: `CR-05@0`, `CR-05@2`, and `CR-05@6` were ambiguous in all
  three repetitions.
- No arm reliably separated the lexical members in `Pass auf dich auf`.
  Models frequently inflated membership with governed `dich` or the other
  `auf`, or returned only the clicked atom.
- The direct-index monolith handled the `gvae` click correctly in all three
  repetitions and the `up` click fully in two of three. The chained arms were
  less stable and produced three total false typo-propagation errors.
- Both chained normalization arms preserved `armour` as Variant in all three
  repetitions. The direct-index, quoted-text, and agentic arms erased the
  variant distinction two, three, and three times respectively.
- Every strategy was unreliable on `heulte mit`: even when membership and
  normalized text were correct, it was generally labeled `Full` instead of
  `Partial`. Coverage relative to a Linguistic Entry remains the clearest weak
  intermediate contract.
- The discontinuous `ge-…-t` case was often inflated to the whole participle by
  including the stem, showing that structural validation alone cannot decide
  morpheme membership.

## Recommended intermediate contracts

```ts
type MembershipCandidate = {
  surfaceSegmentIndices: readonly number[];
  selectedOrthography: "Standard" | "Typo";
};

type ValidatedMembership = MembershipCandidate & {
  attestedSurface: string; // application-constructed
};

type GuardedNormalizationCandidate = {
  members: readonly {
    index: number;
    normalizedText: string; // nonempty, no whitespace
  }[];
  spelling: "Canonical" | "Variant";
  realizationCoverage: "Full" | "Partial";
};
```

The guarded adapter must require exactly one item for every validated member
index, in order; forbid whitespace inside an item; and reject missing, extra,
reordered, or duplicate entries. It must not guess indices, fuzzy-match text,
sort output, or silently repair normalization.

That adapter constrains response shape and whitespace-token count only. It does
not prevent deletion, substitution, lemmatization, or insertion within a
whitespace-free member item, so it must not be described as an insertion-safety
boundary.

`realizationCoverage` should be tested again with a larger accessible model or
with a later stage that has explicit Linguistic Entry evidence. The current
nano results do not justify persisting a coverage decision produced by these
prompts.

## Reproduction and verification

From `battery/dumgen`:

```sh
set -a && source ../../.env.local && set +a
bun run prototype:issue-6
bun run prototype:issue-6:summarize
bun run check
bun run --silent biome check prototypes/issue-6-selection-surface package.json
```

The run manifest freezes prompt hashes, model parameters, price snapshot, and
the returned dated model. `results/summary.md` reports per-case, group,
relational, latency, byte, token, retry, and cost aggregates;
`results/detailed.json` retains the same correctness data structurally. Every
JSONL attempt now retains parsed JSON bytes and zero retries alongside the
original raw response. The prototype is intentionally throwaway and makes no
production code or public API changes.
