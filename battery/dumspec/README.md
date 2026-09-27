# dumspec

The golden corpus of the [Dumling](https://www.npmjs.com/package/dumling)
spec: Spec Records of attested sentences, the classification Rules they
follow, and the Authored Inventories of closed-class units.

Each record is one JSON file under `records/<language>/`, and its path without
`.json` is its id. It holds the sentence and its Segments, and its targets,
each a full Dumling Attestation with the Segment of every member. A target
names its Reading as `reading: { "emojiDescription": "🧵" }`; the loaded
target carries the Dumling Reading built from its Attestation's Lemma. Point a
record's `$schema` at `schema/spec-record.<language>.json` for completion.

```ts
import { findSpecRecord, loadSpecRecords, rules } from "dumspec";
import type * as Dumspec from "dumspec/types";

const records: readonly Dumspec.SpecRecord[] = loadSpecRecords();
const record = findSpecRecord(records, "de/ich-bin-im-wald");
```

`loadSpecRecords` reads the files with `node:fs`, so call it in build-time
code. It throws a `SpecRecordError` that lists every failing check of a
Reviewed record, and of any record whose file is malformed.

A Draft record may fail the current Dumling model. `loadSpecRecords` leaves
it out, and `loadSpecWorklist` lists it with its failing checks, beside every
record whose `legacy` list still holds a case imported verbatim from Dumgen
and every Draft with a target that names no Reading. A Reviewed target must
name its Reading.
Raw texts for intake are Text Records under `records/text/`, with the schema
`schema/text-record.json`. `bun run worklist` prints the worklist; after a
model change, `bun run demote-broken-reviewed` demotes each Reviewed record
the change broke to Draft.

`rules` holds the classification Rules, each with an id such as
`de/noun-owns-its-article`, a statement, the ADRs it rests on, its routes and
the records that show it. A citation stores the Rule's id with
`ruleStatementHash(statement)`. `checkPromptCitations` fails a prompt
paragraph whose cited Rule was reworded since the paragraph was checked
against it.

The Authored Inventories are the closed-class units authored instead of
generated, each Reading with its reviewed Knowledge. `dumspec/inventories`
exports them without reading files or loading Zod, so a short-lived isolate
can import it; the package root re-exports it.

```ts
import { authoredMembers, authoredRealizations } from "dumspec/inventories";

// hat in hat gekocht spells the AUX Lemma haben.
const haben = authoredRealizations.filter(
	({ spelled, member }) => spelled === "hat" && member.lemma.kind === "AUX",
);
```

`authoredMembers` holds every German Lemma, Reading and Knowledge:
the AUX Readings, the PRON and DET pillar cells and stems, and the
pronominal adverbs. `authoredRealizations` lists every spelling of a DET,
PRON or AUX member, with the cell a stem's spelling marks.
`reviewedDeterminers` and `reviewedPronouns` pair each stem with its
spellings, and `closedVerbForms` lists every form of sein, haben, werden and
the modals.
