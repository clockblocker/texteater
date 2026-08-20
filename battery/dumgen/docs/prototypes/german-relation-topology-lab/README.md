# SUPERSEDED THROWAWAY: German relation topology laboratory

This retained prototype does **not** satisfy the frozen #192 experiment
contract. It repeated static topology variants instead of revising the existing
combined atomic prompt. Its results remain as negative evidence only and must
not support a #193 candidate or publication decision. The corrected experiment
is the
[`german-relation-prompt-iteration-lab`](../german-relation-prompt-iteration-lab/README.md).

Rejected question: which combined/dedicated and all-kind/narrow-group prompt topology
produces conservative, stable, precision-first German relation proposals under
the frozen `german-relation-evaluation-v1` gate?

This is a disposable LOGIC prototype, not a production prompt route. It compares
a two-by-two topology matrix:

- the current combined Knowledge prompt with all requested relation kinds;
- the current combined Knowledge prompt with narrow relation groups;
- a dedicated post-Reading relation prompt with all requested kinds;
- that dedicated prompt with the same narrow groups.

The narrow groups are Synonym/Near Synonym, Antonym/Near Antonym, and
Hypernym/Holonym. The combined arms privately request transcription, definition,
and English translation to preserve combined-call load; those base candidates
are retained but excluded from relation scoring. Every arm is canonicalized
back to the same relation-only development oracle.

The lab runs six repetitions over twelve disclosed development cases. It never
imports or materializes the sealed acceptance reservation. It uses
`gpt-5.6-luna`, reasoning `none`, the exact #191 per-kind thresholds, explicit
30-minute prompt caching, `store: false`, and no retries.

Start the interactive terminal view from `battery/dumgen`:

```sh
bun run prototype:german-relation-topology-lab
```

Run every selection, schema, model, threshold, context-tier, and cost guard
without constructing a provider client or writing an artifact:

```sh
bun run prototype:german-relation-topology-lab preflight
```

Preflight prints the exact conservative maximum spend. Paid execution requires
that exact amount as an explicit argument:

```sh
bun run prototype:german-relation-topology-lab run \
  --authorize-max-spend-usd=<exact-preflight-ceiling>
```

The hard ceiling is USD 5.00. Before every provider call, the runner verifies
that actual accrued spend plus the worst-case ceiling for all remaining calls
still fits. Cost ceilings use the official GPT-5.6 Luna rates verified on
2026-08-20: USD 0.20 per million input tokens, USD 0.02 per million cached input
tokens, and USD 1.20 per million output tokens; cache writes are bounded at
1.25 times ordinary input. The serialized request byte count plus a 2,048-token
allowance bounds input tokens, and the long-context price tier is rejected.
See the [official model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

Paid execution atomically checkpoints every attempt under `runs/<timestamp>/`.
Artifacts retain raw outputs, errors, refusals, latency, token/cache usage,
estimated cost, semantic regressions, per-kind reports, and the final topology
recommendation. No other state is persisted.

The prototype skill normally captures the finished experiment on a throwaway
branch and links it from the issue. That capture is intentionally deferred
because this task forbids commits and GitHub comments.

## Retained rejected result

The authorized run completed 300 calls for USD 0.072167660, with no refusals or
incomplete responses. Eight responses failed the exact dynamic schema and remain
visible as operational errors in the artifact. The repeated-harmful-output stop
rule halted three arms; only the current combined prompt with narrow groups ran
all six iterations.

| Topology | Iterations | Calls | Harmful targets | Schema errors | Gate |
| --- | ---: | ---: | ---: | ---: | --- |
| Current combined, all kinds | 3 | 36 | 3 | 2 | Fail |
| Current combined, narrow groups | 6 | 180 | 0 | 3 | Fail |
| Dedicated, all kinds | 2 | 24 | 2 | 1 | Fail |
| Dedicated, narrow groups | 2 | 60 | 2 | 2 | Fail |

No full topology clears the frozen gate. The current-combined/all-kinds arm's
Antonym slice is the only per-kind pass: precision, recall, null accuracy,
Family/Kind accuracy, and stability were all 1.0, with zero false positives.
Every other per-kind slice failed; the other three arms failed every per-kind
gate. Because the passing slice belongs to an arm stopped for harmful outputs
in other kinds, this experiment does not recommend enabling any production
relation kind. Antonym is the sole candidate for an isolated confirmation run.

The retained report and every raw attempt are in
[`runs/2026-08-20T08-32-05-075Z/results.json`](runs/2026-08-20T08-32-05-075Z/results.json).
