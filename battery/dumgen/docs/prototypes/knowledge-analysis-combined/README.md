# Combined German Knowledge generation gate

This prototype evaluates one structured model call that may return any sparse
combination of transcription, German definition, English translation, and
semantic-relation Unit Shadows for one exact German Reading. The provider
schema is built per request and exposes exactly the requested nullable leaves.

The canonical corpus keeps four demonstrations separate from nine development
cases and four untouched acceptance cases. Together they cover every semantic
relation kind, multiple Lemma families and kinds, sparse and all-null outputs,
polysemy pairs, NFC normalization, multi-member encounters, and cross-aspect
interference.

From `battery/dumgen`, validate the bound suite without a provider call:

```sh
bun run prototype:knowledge-analysis-combined preflight development 1
```

Run and retain one bounded development round:

```sh
bun run prototype:knowledge-analysis-combined run development 1
```

Every run remains draft evidence until its misses are classified offline and
the result is finalized. Three finalized development rounds bound to the same
prompt and corpus are required before the runner will unlock the untouched
acceptance suite.

The implementation recommendation is to keep one combined call because the
fixed Reading and marked context can govern all requested leaves coherently.
Keep the analysis private: project only non-null base candidates to Reading
Knowledge Changes, and route relation targets to pending Unit Shadows. An empty
request must return the empty update before creating an adapter or exchange.

The current v2 evidence clears that gate:

- [Development round 1](runs/2026-08-19T09-28-29-202Z/results.json): 8/9
- [Development round 2](runs/2026-08-19T09-29-14-019Z/results.json): 8/9
- [Development round 3](runs/2026-08-19T09-29-45-328Z/results.json): 9/9
- [Untouched acceptance](runs/2026-08-19T09-30-11-432Z/results.json): 4/4

All four runs completed without provider errors. The first two rounds missed
only the multi-member `aufgeben` case because byte-exact English evaluation
treated context-inflected `gave up` as different from Reading-level `give up`;
both misses are classified as corpus/evaluator defects. An earlier
[v1 pilot](runs/2026-08-19T09-26-36-395Z/results.json) remains defect evidence,
but it is not part of the recommendation because its exact evaluator rejected
defensible definitions and nullable relations.
