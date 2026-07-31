# Issue #14 hidden Meaning Resolution corpus

Prototype-only frozen evaluator fixture for
[`meaning-resolution-v2-hidden`](https://github.com/clockblocker/texteater/issues/14).
Its 18 cases use only Entries unseen in #8: five broad-reuse controls, five
false-merge traps, six multi-candidate cases forming three exact forward/reverse
order pairs, and two zero-inventory cases. Inventory counts are two zero, ten
one, and six multi. Misleading emoji, description, and example fields are all
covered, and each of the seven `DraftNew` cases fixes an exact emoji plus two
ordered description blocks.

`corpus.hidden.ts` and `scoring-fixtures.ts` are evaluator-side modules.
Prompt Sources and example builders must not import them.
`blind-evaluation-input.ts` is the sole runner-facing projection; it strips
gold, group labels, order metadata, requirement tags, and hazard labels.

Validate counts, ownership/Entry scope, exact order controls, immutability, v1
Entry/context non-overlap, Prompt Source non-leakage, exact scoring fixtures,
and freeze hashes without inference:

```sh
bun test battery/dumgen/prototypes/issue-14-meaning-resolution-v2-hidden
bun battery/dumgen/prototypes/issue-14-meaning-resolution-v2-hidden/validate.ts
```

The authoritative aggregate SHA-256 is
`de08840ce08f3aa253d1f8d7ea0da8aca250317496f3c48c2da0838137fdbafe`.
Any change to a hashed file requires a new corpus version; do not regenerate
this manifest in place after inference.
