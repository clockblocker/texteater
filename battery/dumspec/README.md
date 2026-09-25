# dumspec

The golden corpus of the [Dumling](https://www.npmjs.com/package/dumling)
spec: Spec Records of attested sentences, and the classification Rules they
follow.

Each record is one JSON file under `records/<language>/`, and its path without
`.json` is its id. It holds the sentence and its Segments, and its targets,
each a full Dumling Attestation with the Segment of every member. Point a
record's `$schema` at `schema/spec-record.<language>.json` for completion.

```ts
import { findSpecRecord, loadSpecRecords, rules } from "dumspec";
import type * as Dumspec from "dumspec/types";

const records: readonly Dumspec.SpecRecord[] = loadSpecRecords();
const record = findSpecRecord(records, "de/ich-bin-im-wald");
```

`loadSpecRecords` reads the files with `node:fs`, so call it in build-time
code. It throws a `SpecRecordError` that lists every failing check.

`rules` holds the classification Rules, each with an id such as
`de/noun-owns-its-article`, a statement, the ADRs it rests on, its routes and
the records that show it. A citation stores the Rule's id with
`ruleStatementHash(statement)`. `checkPromptCitations` fails a prompt
paragraph whose cited Rule was reworded since the paragraph was checked
against it.
