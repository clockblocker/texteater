# dumspec

The golden corpus of the [Dumling](https://www.npmjs.com/package/dumling)
spec: Spec Records of attested sentences, the classification Rules they
follow, and the Authored Inventories of closed-class units.

Each record is one JSON file under `records/<language>/`, and its path without
`.json` is its id. It holds the sentence and its Segments, and its targets.
A target states its members' Segments and its route,
`"route": { "family": "Lexeme", "kind": "NOUN" }`, then a full Dumling
Attestation whose Lemma has that route. A target names its Reading as
`reading: { "emojiDescription": "🧵" }`; the loaded target carries the
Dumling Reading built from its Attestation's Lemma. The Reading may hold its
Reading Knowledge as `reading.knowledge`, in dumrel's schema; the loader
checks it with dumrel against the Reading, and the loaded target carries it
as `knowledge`. Point a record's `$schema` at
`schema/spec-record.<language>.json` for completion.

A record is reviewed one Annotation Layer at a time: Segmentation (members,
routes, No Target entries, coverage), Attestation, Reading, then Knowledge.
`"reviewDepth": "Segmentation"` says a person has reviewed the first layer;
a record without one is a Draft. A reviewed layer must pass its checks, and a
layer past the depth may fail or be missing, so a target may hold only its
members and route while its record is reviewed no deeper than Segmentation.

```ts
import { findSpecRecord, loadSpecRecords, rules } from "dumspec";
import type * as Dumspec from "dumspec/types";

const records: readonly Dumspec.SpecRecord[] = loadSpecRecords();
const record = findSpecRecord(records, "de/ich-bin-im-wald");
```

`loadSpecRecords` reads the files with `node:fs`, so call it in build-time
code. It returns every record whose Segmentation and Attestation layers pass,
each target with the Reading and Knowledge that pass.
`loadSpecSegmentations` returns every record whose Segmentation passes, with
each target's members and route only: the gold `segment.inUnits` is scored on.
`isReviewed(record, "Segmentation")` tells whether a person has reviewed a
layer. Both loaders throw a `SpecRecordError` that lists every failing check
of a reviewed layer, and of any record whose file is malformed.

`loadSpecWorklist` lists each record whose Draft layers fail a check against
the current Dumling model or lack a target's Attestation or Reading, with its
failing checks, beside every record whose `legacy` list still holds a case
imported verbatim from Dumgen. A reviewed record, Text Records included,
must cite at least one Rule in `sources.rules`.
A Breakdown Record, under `records/breakdown/<language>/`, holds one
Locution's or Saying's Breakdown: the Lemma, its Canonical Form as the
sentence with Segments, and the Lexeme targets it breaks down into, which
cover every word and never the whole Lemma. `loadBreakdownRecords` loads
them on the same terms, and `schema/breakdown-record.<language>.json`
completes them.
Raw texts for intake are Text Records under `records/text/`, with the schema
`schema/text-record.json`. `bun run worklist` prints the worklist; after a
model change, `bun run demote-broken-reviewed` lowers the Review Depth of
each record the change broke to the deepest layer that still passes.

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
the AUX Readings, the PRON and DET pillar cells and stems, the reflexivity
unit and the pronominal adverbs. `reflexiveDrillDown` gives the reflexivity
unit for a lexically reflexive Lemma; no spelling realizes it. `authoredRealizations` lists every spelling of a DET,
PRON or AUX member, with the cell a stem's spelling marks.
`reviewedDeterminers` and `reviewedPronouns` pair each stem with its
spellings, and `closedVerbForms` lists every form of sein, haben, werden and
the modals.
