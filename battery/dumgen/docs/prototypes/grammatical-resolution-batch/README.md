# Shared grammatical-resolution Batch runner

This prototype submits one OpenAI Batch for either all five registered evidence
routes or an explicit ordered subset. The default 100-request Batch covers
Aphorism, Collocation, Idiom, Fusion, and PairedFrame. A remediation Batch may
select fewer routes; every selected route contributes its current 20 Golden Cases,
prompt, strict Zod response format, evaluator, and retained-evidence parser.

The transport follows the official [Batch API guide](https://developers.openai.com/api/docs/guides/batch):
the input is one JSONL file uploaded with purpose `batch`; every line has a unique
`custom_id`, `POST /v1/responses`, and the same `gpt-5.6-luna` model; the Batch is
created for `/v1/responses` with the only supported `24h` completion window. Output
order is ignored and results are joined by `custom_id`. Failed requests are read
from the Batch error file.

## Lifecycle

Run commands from `battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-batch submit
bun run prototype:grammatical-resolution-batch submit-routes collocation,idiom
bun run prototype:grammatical-resolution-batch status docs/prototypes/grammatical-resolution-batch/runs/<run>/manifest.json
bun run prototype:grammatical-resolution-batch collect docs/prototypes/grammatical-resolution-batch/runs/<run>/manifest.json
```

`submit` preserves the original all-five-route behavior. `submit-routes` creates
one Batch for the comma-separated route slugs and accepts the same optional run
directory after the list. Slugs must be unique registered routes in canonical
order: `aphorism,collocation,idiom,fusion,paired-frame`. The example above therefore
creates exactly 40 requests. Both submission commands create billable work and require
`OPENAI_API_KEY`. Each creates a new run directory, writes the complete immutable input
and manifest before calling OpenAI, uploads the input, and creates one Batch. The
OpenAI client uses `maxRetries: 0`: a connection failure around Batch creation is
ambiguous, so never rerun `submit` against the same work or create a replacement
until the OpenAI dashboard has been checked. Existing run directories are refused.
No API key is retained.

`status` retrieves the Batch and atomically refreshes its IDs, status, request
counts, validation errors, and timestamps in the manifest. `collect` first refreshes
status and only accepts `completed`; `expired`, `cancelled`, and `failed` Batches do
not produce normal evidence. It downloads each advertised output/error file once,
retains the exact JSONL plus SHA-256 and local path, rejects duplicate, unknown, or
missing IDs and count mismatches, derives the exact selected routes from the signed
manifest, and writes one draft `results.json` under each selected route's existing
`runs/<run>/` directory.

The immutable submission records the exact ordered cases, inputs, ideal outputs,
runner bindings, full serialized request bodies, per-request hashes, input hash, and
a submission-manifest hash. Collection rebuilds that snapshot from current source
and refuses drift. Route results retain Batch/file IDs, input/output/error hashes,
Batch counts and timestamps, and the submission-manifest hash. Per-request latency
is `null`, because Batch output does not expose it; the manifest separately records
the Batch wall-clock duration from creation to completion.

Successful collection leaves route results unfinalized. Review misses and create a
route-specific classifications JSON (`{}` when there are no misses), then use the
existing route finalizer, for example:

```sh
bun run prototype:grammatical-resolution-aphorism finalize \
  docs/prototypes/grammatical-resolution-aphorism/runs/<run>/results.json \
  docs/prototypes/grammatical-resolution-aphorism/runs/<run>/miss-classifications.json
```

Repeat that finalization step for every selected route. A route with a
provider/execution error cannot be finalized; submit a fresh bounded remediation
Batch instead.
