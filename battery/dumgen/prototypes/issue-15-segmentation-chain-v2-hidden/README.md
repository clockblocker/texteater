# Issue #15 hidden Segmentation Chain corpus

Prototype-only frozen evaluator fixture for
[`segmentation-chain-v2-hidden`](https://github.com/clockblocker/texteater/issues/15).
It contains 26 unseen cases: 22 `Accepted`, two `UnsupportedLanguage`, and two
`Unintelligible`. The accepted cases retain every #3 gate across clean German,
punctuation/whitespace boundaries, typo and licensed-variant preservation,
structural reconstruction, abbreviation non-expansion, local `OpaqueText`, and
Hebrew fused-material strata.

`corpus.hidden.ts` and `scoring-fixtures.ts` are evaluator-side modules.
Prompt Sources and example builders must not import them.
`blind-evaluation-input.ts` is the sole runner-facing projection; it exposes
only a tracking ID and exact source, never gold or stratum metadata.

The spelling controls use `Crème` and `Portmonee`, both present in the
[official 2024 German spelling inventory](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf).

Validate the inventory, immutability, exact reconstruction/preservation,
fused-atom shape, v1 non-overlap, Prompt Source non-leakage, scoring fixtures,
and freeze hashes without inference:

```sh
bun test battery/dumgen/prototypes/issue-15-segmentation-chain-v2-hidden
bun battery/dumgen/prototypes/issue-15-segmentation-chain-v2-hidden/validate.ts
```

The authoritative aggregate SHA-256 is
`f7fd4e38fb878b63d24dd4267b919a31fa6e7ed71d5cba3a768b3dfadcd13a4d`.
Any change to a hashed file requires a new corpus version; do not regenerate
this manifest in place after inference.
