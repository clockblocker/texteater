# Spec Review

Spec Review is where the maintainer reviews the Segmentation layer of German
Spec Records, one batch at a time: which Segments form each target, its route,
and the No Target entries. Hovering a word highlights every member of its
unit; clicking selects it.

```sh
bun run --cwd app/spec-review dev
```

Open <http://127.0.0.1:5186/>. Vite serves the page and proxies `/api` to the
Bun record server on port 3186. `SPEC_REVIEW_PORT` and `SPEC_REVIEW_API_PORT`
move them. `SPEC_REVIEW_BATCH` names the batch file, by default dumcorpus's
`batches/membership-hard.json`, and `SPEC_REVIEW_RECORDS` the directory its
record ids are relative to, by default dumcorpus's `records/`. Point
`SPEC_REVIEW_RECORDS` at a copy to try approvals without touching the gold.

The server checks each record file on its own with dumcorpus's `checkRecord`,
so one half-written file never blanks the list. Approving sets
`"reviewDepth": "Segmentation"`, and taking it back removes a Segmentation
depth and nothing deeper. A save edits that one property in place, formats
the file with dumcorpus's biome configuration, and writes only when the result
parses to the intended record, passes `checkRecord` through Segmentation and
cites only current Rules. A save sends the file hash it was based on; when
another session has changed the file since, the server writes nothing and
answers 409 with the record as it is now.

The batch decides which rows can be approved. A dev row stays a Draft,
because the lab counts reviewed records as held-out. A held-out row with an
`openQuestion` waits until the question is ruled and removed from the batch.

The app reads git status for its badges and never stages, commits or writes
to git.
