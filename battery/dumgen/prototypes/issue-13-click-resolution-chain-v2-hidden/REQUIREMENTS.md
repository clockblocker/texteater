# `click-resolution-chain-v2-hidden` requirements

This fixture implements the hidden evaluation requested by
[`clockblocker/texteater#13`](https://github.com/clockblocker/texteater/issues/13)
while retaining the fixed Selection/Surface policy and gates from
[#5](https://github.com/clockblocker/texteater/issues/5). The visible
`click-resolution-chain-v1` corpus and measured
[#6](https://github.com/clockblocker/texteater/issues/6) failures are
development context only.

The frozen evaluator must cover:

- repeated identical tokens with a governed adposition distinguished from a
  detached particle;
- clicked and non-clicked typos over the same multi-Segment Surface;
- a discontinuous morpheme whose stem is not a member;
- partial phraseme membership and a non-phraseme control;
- canonical and licensed Variant spelling;
- Citation and Inflection Surfaces;
- Full and Partial realization coverage.

Every click must have exact ordered unique `ResolvableText` membership that
includes the click, deterministic application-constructed `attestedSurface`,
clicked-only orthography, guarded one-item-per-member normalization, spelling,
coverage, Surface kind/features, and an evaluator-side Entry join key. Perfect
results must have zero insertion, lemmatization, typo-propagation, or variant
erasure violations and pass all relational fixtures.

This corpus does not invent the authority evidence missing in #13. The blind
input contains only the immutable sentence and click. Any authority-assisted
arm must retrieve its evidence independently under a separately frozen source
and policy; gold Entry references never cross the inference boundary.
