# Dumtrain documentation claim audit

Date: 2026-08-21

Scope: all Markdown under `battery/dumtrain`. This note checks repository claims
against the current working-tree Dumgen and Dumling contracts and checks external
ML/hardware claims against first-party sources. It does not assess whether the
proposed product should be built.

## Verdict

The core architecture is not nonsense. Sentence-wide encoding, a structured
partition decoder, source-authoritative assembly, and click-time lookup are all
coherent. The documentation also repeatedly and correctly says that the numeric
tables are planning hypotheses rather than benchmarks
([README](../../README.md#L47-L49),
[result expectations](../result-expectations.md#L3-L4)).

There are, however, two material specification gaps and several numbers
presented with more precision than the available evidence supports:

1. the promised total Sentence Analysis intentionally eliminates Dumgen's
   `Unresolved` result, but does not define the new authoritative label for
   inputs that currently receive it;
2. the claimed 64-private-token maximum is not reconciled with Dumgen's larger
   accepted input contract or with a possible character tokenizer;
3. the accuracy gates are underspecified and the `100%` Challenge Suite gate has
   no sample-size or confidence interpretation;
4. latency, throughput, resident-memory, storage, corpus-size, and retraining
   ranges have no prototype, benchmark, measured corpus distribution, or cost
   model behind them; and
5. the proposed 25M--35M German model is plausible as a parameter budget, but its
   pretrained initialization and tokenizer plan are missing.

So: no evidence of fabricated benchmark *results*, because the docs disclaim
that. Several figures are nevertheless guesswork and should be labelled as
budgets or scenarios rather than expected ranges.

## Findings

### High: eliminating `Unresolved` is a policy change whose replacement label is undefined

Dumtrain defines Sentence Analysis as mapping every clickable Segment to exactly
one resolved target and Attestation
([context](../../CONTEXT.md#L53-L56)); the architecture and quality contract repeat
that every `ResolvableText` must map to one target
([architecture](../architecture.md#L67-L70),
[result expectations](../result-expectations.md#L11-L24)). Corpus cases likewise
require a complete target partition and grammatical result for every clickable
Segment ([corpus plan](../corpus-plan.md#L26-L36)).

Current Dumgen deliberately has a different valid outcome. German segmentation
optimistically emits Latin word-like material, including slang and
code-switching, as `ResolvableText`, deferring failed resolution to the click
chain
([Dumgen ADR 0001](../../../dumgen/docs/adr/0001-batch-intake-and-local-source-segmentation.md#L21-L23),
[segmenter](../../../dumgen/src/source-segmentation/de.ts#L30-L38)). Target
Classification's canonical output explicitly includes `Unresolved`
([classification schema](../../../dumgen/src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/schemas.ts#L87-L93)),
its corpus contains intentionally unresolved clickable gibberish
([case evidence](../../../dumgen/src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/cases/robustness.ts#L310-L314)),
and the public runtime returns that state
([implementation](../../../dumgen/src/dumgen/implementation.ts#L250-L262)). The
accepted Attestation ADR also says classification may return `Unresolved`
([ADR 0003](../../../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md#L73-L83)).

This is not a rare model crash; it is an intentional current-domain result.
Eliminating it may be a desirable Dumtrain policy improvement rather than a
defect. The unsupported claim is equivalence: the architecture says it will
produce every grammatical result the current click path could return
([architecture](../architecture.md#L3-L7)), while the new contract deliberately
has no corresponding outcome.

More importantly, the proposed corpus cannot yet authoritatively label such a
sentence under its current case shape, despite asking for unsupported and
damaged seam coverage
([corpus plan](../corpus-plan.md#L93-L110)). The production adapter's whole-analysis
failure can preserve the old LLM fallback, but the docs never say whether one
formerly unresolved Segment becomes `Lexeme/X`, receives another newly reachable
route, invalidates the entire eager analysis, or receives a stored unresolved
state.

**Required decision:** either restrict Sentence Analysis eligibility to sentences
whose every `ResolvableText` has a defensible supported route, or add an explicit
unresolved/unsupported outcome, or explicitly make a fallback route such as
`Lexeme/X` reachable and give annotators a policy for it. Without that decision,
"replace the current per-click calls" is not a complete, labelable policy.

### High: a 64-token maximum does not cover the admitted sentence contract

Inference assumptions set an average of 30--40 private tokens and a maximum of
64 ([result expectations](../result-expectations.md#L72-L80)). But Dumgen accepts
up to 205 Unicode code points and 34 whitespace-delimited words
([Dumgen ADR 0001](../../../dumgen/docs/adr/0001-batch-intake-and-local-source-segmentation.md#L13-L18)),
and it deliberately admits slang and code-switching as clickable text
([Dumgen ADR 0001](../../../dumgen/docs/adr/0001-batch-intake-and-local-source-segmentation.md#L21-L23)).
The architecture permits either a subword **or character** private tokenizer
([architecture](../architecture.md#L27-L30)). A character tokenizer can need up
to roughly the admitted code-point count, and a subword tokenizer can also
exceed 64 on long compounds, typos, identifiers treated as text, or
code-switching.

The model promises a complete whole-sentence result, but there is no rejection,
truncation, sliding-window, or long-input fallback policy. Therefore 64 is at
best a benchmark bucket, not a supported maximum. Either prove that the chosen
tokenizer maps every admitted sentence to at most 64 tokens, lower the upstream
input limit, or define a length-preserving overflow path and benchmark it.

### Medium: the release percentages are not yet testable specifications

The proposed floors give precise values from 99.0% to 100%
([result expectations](../result-expectations.md#L30-L47)), but do not define:

- the denominator for each metric (all cases, only successfully assembled
  sentences, or only accepted targets);
- how a typed whole-sentence analysis failure scores;
- Evaluation Suite size by route and Coverage Cell;
- confidence intervals or minimum statistical power; or
- whether repeated releases use a fresh terminal holdout.

This matters because validity "for accepted results" is conditional and can be
made 100% simply by rejecting invalid assemblies
([result expectations](../result-expectations.md#L26-L28)). The architecture says
invalid predictions count as evaluation failures
([architecture](../architecture.md#L188-L192)), but the metric table does not make
that denominator rule explicit.

Likewise, a `100%` score on a "small" Challenge Suite
([context](../../CONTEXT.md#L38-L41)) is an observed sample result, not evidence of
a zero population error rate. NIST recommends binomial confidence intervals for
proportion claims and notes that small samples or few failures need exact
methods ([NIST proportion confidence intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)).
For illustration, with zero failures in 100 independent cases, the exact
one-sided 95% lower bound on pass probability is only 97.05%; about 598 zero-fail
cases are needed before that lower bound reaches 99.5%.

There is also no sentence-wide **complete grammar** gate. At the planned
10--20 targets per sentence, a 99% exact-target rate would correspond to only
about 90.4% to 81.8% fully correct sentences under a simple independent-error
illustration (`0.99^10` to `0.99^20`). Real errors need not be independent, but
the calculation shows that the target and sentence metrics answer materially
different questions. The partition-only 99.5% sentence metric does not close
that gap.

The fixed-suite policy also needs a terminal-holdout rule. The docs call the
Challenge Suite an Evaluation Suite that never influences model instructions
([context](../../CONTEXT.md#L32-L40)), while also proposing repeated checkpoints,
failure analysis by Coverage Cell, and a fixed Challenge Suite across corpus
versions
([corpus plan](../corpus-plan.md#L55-L57),
[result expectations](../result-expectations.md#L49-L51)). A repeatedly inspected
suite becomes development evidence even if it is not literally used as a
training row. The annotation workflow even says to add recurring disagreements
to both the handbook and Challenge Suite
([corpus plan](../corpus-plan.md#L127-L139)), while the contamination rule says no
Challenge/Evaluation case may influence model instructions
([corpus plan](../corpus-plan.md#L149-L172)). That is workable only if the
handbook contains the general adjudicated rule and not the held-out case/template,
but the separation is not specified. Keep regression/challenge evidence separate
from a fresh, untouched release-estimation suite.

### Medium: performance and adaptation ranges are unsupported, not disproved

The latency/throughput table, character-decoder slowdown, resident-memory
ranges, result-size ranges, and retraining times are not traced to an artifact
or benchmark
([result expectations](../result-expectations.md#L53-L68),
[throughput](../result-expectations.md#L70-L103),
[storage](../result-expectations.md#L105-L118),
[retraining](../result-expectations.md#L127-L145)). The source docs correctly
require benchmarking the exact graph, tokenizer, assembler, hardware, and corpus
before release ([README](../../README.md#L47-L49)). Until then:

- `3--10 ms` CPU latency, `8,000--20,000 sentences/s` on an L4, and the claimed
  `2,000--5,000 sentences/s` autoregressive fallback are scenario inputs, not
  evidence-backed expectations;
- `10--60 minutes` for a feature and `2--12 hours` for a membership-policy change
  omit batch size, trainable parameter count, replay size, epochs, stopping rule,
  and evaluation/export time; and
- treating an L4 and RTX 4090 as one timing class is unsupported: NVIDIA lists
  30.3 FP32 TFLOPS and 300 GB/s memory bandwidth for the L4 versus 82.6 TFLOPS
  and 1,008 GB/s for the RTX 4090
  ([NVIDIA L4](https://www.nvidia.com/en-gb/data-center/l4/),
  [NVIDIA RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/)); and
- "doubling the model workspace ... does not change the product economics" has
  no local cost model at all ([result expectations](../result-expectations.md#L67-L68)).

There is a smaller arithmetic/wording defect in that sentence too. The preceding
GPU model-and-workspace range is 300--800 MB; doubling that range is 600 MB--1.6
GB, not a single 1 GB allowance. A 1 GB allowance may be a reasonable rounded
budget, but it is not "doubling" the documented upper range.

NVIDIA specifies an L4 at 24 GB and 121 dense / 242 sparse FP16 TFLOPS, but peak
hardware throughput does not determine this custom end-to-end graph's request
rate ([NVIDIA L4 specifications](https://www.nvidia.com/en-gb/data-center/l4/)).
The official ONNX Runtime performance tool requires the actual model, execution
provider, and test inputs to measure latency
([ONNX Runtime performance test](https://github.com/microsoft/onnxruntime/blob/main/onnxruntime/test/perftest/README.md)).
Those first-party sources support feasibility and the need to benchmark; they do
not support Dumtrain's exact ranges.

The arithmetic derived from the assumptions is correct: 10M / 500 per second is
5.56 hours, and 1--3 KB times one million is about 1--3 GB. The unsupported part
is the 500/s and 1--3 KB premise, not the multiplication.

### Medium: the pretrained starting point is missing from the size story

A six-layer, hidden-size-384 encoder near this scale is plausible. Microsoft's
first-party MiniLM inventory lists an English 6x384 model at 22M parameters and
an English MiniLMv2 variant at 30M. But it lists the multilingual 6x384 model at
107M, largely because multilingual vocabulary embeddings are expensive
([Microsoft MiniLM model inventory](https://github.com/microsoft/unilm/blob/master/minilm/README.md)).

Dumtrain simultaneously proposes a German-only private tokenizer, a complete
25M--35M model, and no training from scratch
([architecture](../architecture.md#L72-L77),
[retraining expectations](../result-expectations.md#L140-L142)). Those statements
can coexist, but only after naming how the first model is initialized: a
compatible German checkpoint, vocabulary surgery plus continued pretraining,
distillation, or another explicit transfer plan. Fine-tuning "from the previous
release" explains later releases, not release zero.

The artifact-size ranges themselves are conservative and arithmetically sound:
25M--35M raw weights take about 25--35 MB at INT8 and 50--70 MB at FP16 before
format overhead, so the documented 30--50 MB and 60--100 MB envelopes are
plausible.

### Medium: corpus milestones are collection hypotheses, not evidence thresholds

The labels "first credible corpus" at 50,000 sentences and "strong production
corpus" at 250,000--500,000 sentences, plus the per-route and per-feature count
floors, have no task-specific learning curve, annotation-agreement measurement,
power analysis, or error-cost model behind them
([corpus plan](../corpus-plan.md#L42-L57),
[distribution requirements](../corpus-plan.md#L75-L86)). The plan sensibly says
the early corpus should produce a trustworthy learning curve and gates the large
collection on earlier checkpoints
([corpus plan](../corpus-plan.md#L192-L200)); that caveat should govern the table
labels too.

The sentence assumptions also drift between sections. Corpus sizing assumes
roughly 10--20 targets per ordinary sentence and uses 15 for all milestone
arithmetic ([corpus plan](../corpus-plan.md#L42-L53)), while storage sizing assumes
8--15 targets and only 15--25 total Segments
([result expectations](../result-expectations.md#L105-L113)), and inference assumes
30--40 private tokens ([result expectations](../result-expectations.md#L72-L80)).
These may describe different populations, but none is named or measured. One
representative corpus histogram should drive all three estimates.

### Low: "one row" is true only for a narrow kind of label addition

For a plain affine categorical head with hidden size 384, adding one class does
add approximately one 384-weight row plus a bias. The docs generalize that to "a
new label" ([result expectations](../result-expectations.md#L127-L131)). A new
Family/Kind correlated route, a schema-licensed field, a structured constraint,
or a new text-edit operation can require a head, mask, decoder, assembler, and
corpus-contract change. Keep the statement scoped to adding one value to an
existing categorical head.

## Claims supported by repository evidence

The following important statements are supported rather than suspect:

- Source Segmentation is deterministic and separate from the model tokenizer
  ([Dumgen ADR 0001](../../../dumgen/docs/adr/0001-batch-intake-and-local-source-segmentation.md#L5-L11),
  [architecture](../architecture.md#L27-L30)).
- The current public click path does Target Classification followed by
  route-specific Grammatical Resolution, and it caches the resolved target for
  every member click
  ([implementation](../../../dumgen/src/dumgen/implementation.ts#L220-L327)).
- Reading Resolution consumes marked context, a Lemma spelling, and existing
  learner emoji descriptions; Knowledge Generation consumes the selected
  Reading and a request mask
  ([Dumgen types](../../../dumgen/src/types.ts#L73-L90),
  [Dumgen usage](../../../dumgen/README.md#L41-L59)). Keeping those operations
  click-dependent is consistent with the current API.
- Attestation members are ordered occurrence evidence, while Reading remains a
  separate semantic value
  ([ADR 0003](../../../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md#L15-L47)).
- Current policy permits discontinuous fixed members and derives
  `normalizedSurface` as a one-space, source-order projection
  ([ADR 0004](../../../../docs/adr/0004-align-german-high-level-targets-with-fixed-realized-attestation-members.md#L9-L15)).
- A contiguous BIO sequence cannot by itself represent an arbitrary
  discontinuous target. Pointing each member to a canonical earliest member can
  represent such a partition; whether it learns accurately is empirical. A
  primary ACL paper likewise treats discontinuous mentions as requiring an
  expanded BIO variant or a different representation
  ([Wang et al., 2020](https://aclanthology.org/2020.acl-main.520/)).
- Natural-frequency enrichment is justified for at least some named rare POS
  routes. The primary UD German GSD statistics contain only 8 `INTJ` and 101
  `SYM` tokens among 292,756 words
  ([UD German GSD `stats.xml`](https://github.com/UniversalDependencies/UD_German-GSD/blob/master/stats.xml)).
  That evidence does not establish the requested counts for Dumtrain-specific
  Phraseme or membership cells.
- Keeping source siblings and near duplicates in one split is a sound leakage
  precaution. A primary EACL study measured more than a ten-point F1 inflation
  from document overlap in its tested relation-extraction setting
  ([Søgaard et al., 2021](https://aclanthology.org/2021.eacl-main.113/)). The
  magnitude is task-specific, but the direction supports Dumtrain's split rule.

## Recommended wording changes before implementation

1. Resolve the `Unresolved`/unsupported-sentence contract first.
2. Rename all unmeasured numeric ranges to **initial budget**, **capacity
   scenario**, or **benchmark target**, and remove the product-economics sentence.
3. Define metric denominators, failure scoring, suite sizes by Coverage Cell,
   confidence reporting, and a fresh terminal holdout.
4. Name the release-zero pretrained initialization and tokenizer/vocabulary
   migration.
5. Replace fixed corpus adjectives such as "credible" and "production" with
   learning-curve decisions until pilot evidence exists.
