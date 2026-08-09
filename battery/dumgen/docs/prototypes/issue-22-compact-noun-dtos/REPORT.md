# Issue #22 compact German noun DTO experiment report

> Archived: the executable experiment sources have been removed. This report
> and its retained run data are historical evidence, not a runnable prototype.

## Verdict

**REVISE; do not adopt the compact DTOs into the default catalog.**

The codecs are strict, bijective for valid values, and kept every successful
model exchange behind the canonical Dumgen boundary. The retained v1 live token
and quality results do not support adoption:

- compact Grammar reduced actual input tokens by only 1.82% and output tokens
  by 23.18%, while matching neither of the two canonical references;
- compact Reading increased actual input tokens by 9.42% and did not reduce
  actual output tokens, although both Reading results matched;
- the default verbose Grammar arm matched one of two references, and both
  verbose Reading results matched.

This four-case, one-pass laboratory comparison is diagnostic evidence, not an
unbiased evaluation corpus or a general model-quality claim.

## Question and boundary

The experiment asked whether deliberately tiny property names and enum codes
could preserve the same German `de / Lexeme / NOUN` Grammatical and Reading
Resolution results with substantially fewer tokens.

The compact runtime was opt-in and was never imported by the default
`PROMPT_CATALOG` or Dumgen public entrypoint. Its executable sources have since
been removed; the report and retained run data preserve the experiment's
historical result.

## Method

- Model: `gpt-5-nano`, resolved by the provider to
  `gpt-5-nano-2025-08-07`.
- Two Grammar cases and two Reading cases, identical across verbose and compact
  arms.
- Eight serial calls, no retries, `store:false`, minimal reasoning, low text
  verbosity.
- Provider-reported token usage includes the system prompt, user input, and
  structured-output schema.
- Canonical comparison uses stable JSON after each arm's runtime projection.
- Raw final run:
  [`runs/2026-08-01T10-43-02-007Z/comparison.json`](./runs/2026-08-01T10-43-02-007Z/comparison.json)
- Deterministic measurements:
  [`runs/deterministic.json`](./runs/deterministic.json)

An earlier retained diagnostic run used SDK auto-parsing, which hid verbose
Grammar usage when a Zod post-generation refinement rejected model output. The
retained v1 final run captures raw structured JSON and provider usage before
canonical validation, so the live tables below use only that run.

After that run, the compact legends were completed and generated directly from
the authoritative field/code maps. No paid calls were repeated for this
contract-only correction. The retained v1 live prompt signature is therefore
the recorded compact prompt size: 1,692 bytes for Grammar and 1,151 bytes for
Reading; that runner predates prompt-hash recording. The last retained v2
deterministic prompt fingerprints were:

- compact Grammar: 2,106 bytes,
  `4c2fde8670250b4ef71129320328f6c9519971c9899f06121f991e394d225ccf`;
- compact Reading: 1,242 bytes,
  `13d94cb8f66f7f9804a4c15a5ae453614c5bedca214c6531d51cca516b76ea07`.

The v1 provider measurements remain historical evidence for the earlier prompt,
not token or quality measurements of the current generated prompt.

## Deterministic size comparison

The deterministic comparison counts UTF-8 bytes over generated system prompts
and stable JSON reference exchanges. Estimated tokens are `ceil(bytes / 4)` and
are included only as a reproducible fallback; provider token counts are
authoritative for the live result.

| Stage | Metric | Verbose | Compact | Delta |
| --- | ---: | ---: | ---: | ---: |
| Grammar | system-prompt bytes, two calls | 3,812 | 4,212 | +10.49% |
| Grammar | serialized-input bytes | 129 | 105 | -18.60% |
| Grammar | serialized-output bytes | 704 | 276 | -60.80% |
| Grammar | estimated input tokens | 986 | 1,080 | +9.53% |
| Grammar | estimated output tokens | 177 | 70 | -60.45% |
| Reading | system-prompt bytes, two calls | 2,552 | 2,550 | -0.08% |
| Reading | serialized-input bytes | 220 | 186 | -15.45% |
| Reading | serialized-output bytes | 89 | 39 | -56.18% |
| Reading | estimated input tokens | 694 | 684 | -1.44% |
| Reading | estimated output tokens | 23 | 10 | -56.52% |

Compact JSON is substantially smaller, but the complete legends offset much of
that reduction: the compact Grammar prompt is larger, while the two Reading
prompts are nearly identical in size. The byte-based token estimate remains
only a fallback because long canonical property names and enum values are often
single tokenizer tokens, while one-character codes still cost tokens and
require a legend.

## Retained v1 live provider token comparison

| Stage | Metric | Verbose | Compact | Delta |
| --- | ---: | ---: | ---: | ---: |
| Grammar | input tokens | 1,759 | 1,727 | -1.82% |
| Grammar | output tokens | 220 | 169 | -23.18% |
| Reading | input tokens | 722 | 790 | +9.42% |
| Reading | output tokens | 79 | 79 | 0.00% |

No call used cached input tokens or reasoning tokens. All eight final calls
returned structured JSON and all compact codecs decoded successfully.

## Canonical result comparison

| Case | Verbose | Compact | Observation |
| --- | --- | --- | --- |
| Grammar: library dative | mismatch | mismatch | Verbose returned canonical form `BiblioTHEK`; compact returned `Citation` instead of contextual `Inflection`. |
| Grammar: bank plural | match | mismatch | Compact again selected `Citation`, losing case and number. |
| Reading: new library | match | match | Both returned `📚`. |
| Reading: reuse tea | match | match | Both reused `☕`. |

The compact Grammar schema is syntactically valid and lossless, but its
`Citation`/`Inflection` branch codes did not preserve useful behavior in this
sample even after an explicit rule and an Inflection example. This is a prompt
and schema-legibility failure, not a codec failure.

## Recommendation  

Keep the experiment isolated. A revision should first test whether a pointed
Inflection-only experimental output or a less abbreviated surface discriminator
restores Grammar quality. Reading should not retain abbreviation merely for byte
size: its live input-token count regressed and its output-token count was flat.

Only reconsider adoption after a revised arm produces canonical-equivalent
Grammar results on the same cases and demonstrates provider-reported token
savings, then survives the broader human-guided noun coverage tracked by issue
#18.
