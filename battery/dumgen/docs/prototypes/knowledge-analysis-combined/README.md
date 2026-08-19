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

The current v2 evidence clears that gate: the three finalized development
rounds scored 8/9, 8/9, and 9/9, then the untouched acceptance suite scored
4/4. All four runs completed without provider errors. See
[`runs/README.md`](runs/README.md) for the exact artifacts and the evaluator's
limits.
