# German relation prompt iteration laboratory

This prototype compares bounded revisions of the combined German Knowledge
prompt under the frozen `german-relation-evaluation-v1` gate.

This is the corrected LOGIC prototype for
[texteater#192](https://github.com/clockblocker/texteater/issues/192). It obeys
the frozen experiment comment: every provider request remains one combined
Knowledge call, the model is `gpt-5.6-luna` with reasoning `none`, and six
material prompt revisions are evaluated. No dedicated relation call or
relation-kind batching arm exists.

The six revisions are cumulative:

1. reviewed production baseline;
2. Reading-general null test;
3. exact Synonym versus Near Synonym boundary;
4. established Antonym versus converse Near Antonym boundary;
5. taxonomy versus constitutive-whole boundary;
6. consolidated null-first decision procedure.

Each revision has a distinct retained SHA-256 prompt fingerprint, hypothesis,
usage, cost, latency, operational errors, and per-case miss classifications.
Revisions 1–5 run once over all 50 disclosed development cases. Revision 6 runs
three repetitions over the same cases so the frozen stability gate can be
evaluated without pretending that different prompts are repeated runs. A
revision stops before further repetitions after two retained harmful false
positive observations.

The sealed acceptance selection is excluded from planning and imports only as a
set-membership guard. No acceptance identity or content is materialized.

From `battery/dumgen`, inspect the provider-free plan:

```sh
bun run prototype:german-relation-prompt-iteration-lab preflight
```

The preflight constructs no provider client and writes no artifact. It prints
the exact conservative maximum spend. Paid execution requires that exact value:

```sh
bun run prototype:german-relation-prompt-iteration-lab run \
  --authorize-max-spend-usd=<exact-preflight-ceiling>
```

The cumulative #192 provider cap remains USD 5.00. The runner includes the
retained spend from the superseded topology run, checks the remaining worst-case
ceiling before every call, uses no retries, and checkpoints every attempt under
`runs/<timestamp>/results.json`.

The earlier
[topology result](../german-relation-topology-lab/runs/2026-08-20T08-32-05-075Z/results.json)
is retained as evidence of a rejected experiment design. It cannot support a
#193 candidate or publication decision.
