# Laya instead of jev — failed experiment (2026-09-22)

**Outcome: rejected. This branch is the record, not a proposal.** Nothing here
is meant to merge, and the machine it was measured on has been cleaned of
Laya. Read it to avoid paying for the same measurement twice.

[Laya](https://github.com/NandhaKishorM/laya) is a local, non-generative
decision model with the same question shape as System One: `choice`, `score`
and `noul` over a state, probabilities out, no generated text. The question
was whether it can replace jev as dumgen's judgment transport.

**It cannot, and the reason is structural rather than a matter of tuning.**
On the 243-case target-classification evaluation corpus, run through the
production `classifyTarget` path with only the judge swapped, jev scores
59.7% exact and Laya scores 0.8%. Laya is also slower, not faster, on these
calls: 8.5x per `classifyTarget` judgment, and 77x on the 178-question
`analyzeSentence` call for a single 10-word sentence.

The transport code (`promptsmith/laya`, `tooling/laya-sidecar.py`) is left on
the branch because it is what any later attempt would have to rebuild, and
because the budget arithmetic in `budgetFor`/`overflowing` is the part that
explains the result. It is not wired into anything on `main`.

## The machine

MacBook Air (M1, 2020), 8 CPU cores, 8 GPU cores, 16 GB unified memory,
macOS 15.7.9. laya 0.3.5, torch 2.14.0, MPS, fp32. Every number below is from
this machine; Laya's own published figures come from an M1 Max, which has 4x
the GPU cores and ~6x the memory bandwidth.

## Why it fails: the state does not fit

Laya builds **one sequence per question** —
`[CLS] instructions [SEP] [MASK] opt0 [MASK] opt1 ... [SEP] state [SEP]` — and
the state gets whatever the options and instructions leave over. The English
checkpoint's window is 512 tokens with a 192-token head budget; the
multilingual one 1024 and 256.

`analysisState` for one 10-word German sentence is **2,188 tokens**: the
sentence is 103 of them and the rest is the realization and fixedness rules
the questions refer to as `` `criteria` ``. Measured with Laya's own tokenizer
and `build_sequence` (`token-budget.py`):

| question | options | per-option budget | instructions | state kept |
| --- | --- | --- | --- | --- |
| `route_0` Family/Kind | 17 | 25 tok → **9** | 48 → 29 | 317 / 2188 = **14.5%** |
| `role_0` member role | 9 | 33 tok → **18** | 39 → 29 | 14.5% |
| `id_0` authored identity | 11 | 75 tok → **15** | 281 → **22** | 14.5% |
| `fix_0` fixedness | 4 | uncapped | 33 | 17.5% |
| `m_0_2` membership | 3 | uncapped | 32 | 20.1% |

The multilingual checkpoint doubles the window and still keeps only 40%.

So the model never reads the rules it is told to answer "under `criteria`"
with, and the 17 route descriptions that carry the entire distinction between
`Lexeme/VERB` and `Lexeme/ADV` are cut to nine tokens each. Nothing is raised:
Laya truncates silently. `promptsmith/laya` mirrors this arithmetic in
`budgetFor`/`overflowing` so a caller can refuse instead.

Two further limits land on these questions specifically: the checkpoint's
temperature for choices with 11+ options is out of range and clamped, so
`route`'s confidence is uncalibrated by the loader's own warning; and past
~126 options the state is squeezed to zero tokens with no error at all.

## Accuracy

243 evaluation cases, the real `classifyTarget` judgment, the repo's
deterministic scorer against authored gold (`target-accuracy.ts`). "Exact"
means the route and the member set both match.

| judge | exact | route only | members only | Unresolved | p50 | wall |
| --- | --- | --- | --- | --- | --- | --- |
| jev-latest | **145 (59.7%)** | 198 (81.5%) | 152 (62.6%) | 10 | 306 ms | 76 s |
| Laya english, state as-is | 2 (0.8%) | 22 (9.1%) | 14 (5.8%) | 149 | 2,605 ms | 695 s |
| Laya english, state trimmed | 0 (0%) | 2 (0.8%) | 11 (4.5%) | 46 | 1,339 ms | 415 s |

Laya's predictions collapse onto two labels: of 243 cases, 149 Unresolved, 76
`Lexeme/VERB`, 16 `Phraseme/Aphorism`, and one each of `Lexeme/DET` and
`Phraseme/Collocation`. That is the shape of a model answering from option
priors rather than from the sentence.

The trimmed row is the fair-chance control: the state rewritten the way the
Laya skill advises — short, front-loaded, no rules blob, the click named in
words (`target-accuracy-trimmed.ts`). It removes the truncation and makes
things **worse** on route, which rules out "it only failed because the state
was cut" and points at the task itself. These are 20-way German morphosyntactic
distinctions over discontinuous units; Laya's own benchmark already reports
45% on 6-way English emotion and 35% on 5-level star ratings.

The jev row is not the shipped pipeline's accuracy — it is one raw judgment
with no repair or assembly guard — but both rows run the identical path, so
the comparison is like for like.

## Latency

English checkpoint, MPS, the real `analysisState`, median of 3 after warmup
(`latency.py`):

| questions in one call | median | per question | MPS memory |
| --- | --- | --- | --- |
| 1 | 357 ms | 357 ms | 2.2 GB |
| 10 | 3,469 ms | 347 ms | 3.3 GB |
| 50 | 17,546 ms | 351 ms | 5.9 GB |
| 89 | 32,266 ms | 363 ms | 9.0 GB |
| 178 | 96,735 ms | 543 ms | 16.3 GB |

**Cost is per question, not per call.** One forward pass, but the batch
dimension *is* the question count, and an 8-core M1 GPU is already saturated
by a single 512-token sequence, so batching buys nothing. This is the
assumption dumgen is built on and the one that breaks: `analyzeSentence` asks
1.5N²+2.5N questions because with jev they ride one request. A 10-word
sentence is 178 questions — **97 seconds and the machine's entire RAM**. jev
answers the same 178 questions in one call in **1,254 ms** (7.05 ms/question,
33,306 input tokens, about a tenth of a cent). Laya is **77x slower** on the
workload the design actually issues, not faster. A 20-word sentence is 656
questions.

Shrinking the state to the sentence alone brings one question to 140 ms and
178 to 45.8 s. The multilingual checkpoint is no faster despite being smaller
(309 ms at 1 question, 371 ms/question at 50) because its window is twice as
long.

## Parallelism, memory, disk

**Concurrent queries: one.** Calling a shared agent from several threads
without a lock aborts the process on a Metal assertion
(`_status < MTLCommandBufferStatusCommitted`), which is why the upstream
server and `laya-sidecar.py` both serialise inference. Separate processes are
stable but pointless: per-call latency scales with worker count and aggregate
throughput stays flat at ~0.29 calls/s (10-question calls).

| workers | p50 per call | aggregate |
| --- | --- | --- |
| 1 process | 3,450 ms | 0.29 calls/s |
| 2 processes | 6,544 / 6,695 ms | 0.30 calls/s |
| 3 processes | 6,883 / 6,984 / 12,139 ms | ~0.29 calls/s |

Memory: 3.2–3.3 GB resident per process (2.2 GB of it MPS) for the English
checkpoint alone; three processes is ~10 GB and the practical ceiling here.
The playground's `server.py` preloads all three checkpoints; that is why
`tooling/laya-sidecar.py` loads one. MPS allocation also scales with questions
per call — 16.3 GB at 178 questions, which on a 16 GB machine is where the
in-library CPU fallback starts to matter.

Load time is 32–58 s per checkpoint, so the sidecar must be long-lived. Weights
are 1.9 GB cached (a 2.3 GB bundle if loaded without `subfolder=`); this
machine had 26 GB free.

## Reproducing

```bash
# sidecar: one checkpoint, loopback only
uv venv --python 3.12 && uv pip install laya
.venv/bin/python tooling/laya-sidecar.py

# accuracy, 243 cases
bun --env-file=.env.local battery/dumgen/prototypes/laya/target-accuracy.ts jev
bun battery/dumgen/prototypes/laya/target-accuracy.ts laya
bun battery/dumgen/prototypes/laya/target-accuracy-trimmed.ts

# token budget, latency, parallelism (need the venv, not the sidecar)
.venv/bin/python battery/dumgen/prototypes/laya/token-budget.py
.venv/bin/python battery/dumgen/prototypes/laya/latency.py
.venv/bin/python battery/dumgen/prototypes/laya/parallelism.py
```

`latency.py` and `token-budget.py` read a dumped request at
`/tmp/layabench/jev-request.json`; regenerate it from `analysisState` and
`lexemeQuestions` for whichever sentence is being measured.

## What would have to change

Laya is not a drop-in for these questions. It could only become one if the
judgments were re-shaped to fit a 512-token window: rules moved out of the
state and into short option descriptions, option lists cut from 17 to a
handful, and the O(N²) membership matrix replaced with something that does not
ask 178 questions about one sentence. That is a different design, not a
transport swap, and it would still need the fine-tuning Laya's own
documentation recommends before trusting it on German.

A cascade is the one shape that survives the numbers: Laya answering the cheap
2–3 option membership questions locally (20.1% state budget, no option
truncation) and escalating everything else. Even that pays 347 ms per question
here, so it only makes sense on hardware where a forward pass is not the
bottleneck.
