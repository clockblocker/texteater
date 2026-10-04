# dumcorpus

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
as `knowledge`. `reading.coverage` says which aspects a person has covered,
per aspect, translation language and relation: `Authored` when the Knowledge
holds it, `ReviewedEmpty` when it has none; an aspect left out is
unreviewed. A target's Knowledge layer passes when its coverage covers each
structural aspect (`structuralAspects`) its route's Knowledge Policy
requests. A Reading the Authored Inventory holds has its Knowledge reviewed
there, so `{}` completes its target. `sharedReadingIssues` is the guard that gives a
Reading shared by several records one Knowledge value and coverage. Point a
record's `$schema` at `schema/spec-record.<language>.json` for completion.

A record is reviewed one Annotation Layer at a time: Segmentation (members,
routes, No Target entries, coverage), Attestation, Reading, then Knowledge.
`"reviewDepth": "Segmentation"` says a person has reviewed the first layer;
a record without one is a Draft. A reviewed layer must pass its checks, and a
layer past the depth may fail or be missing, so a target may hold only its
members and route while its record is reviewed no deeper than Segmentation.

```ts
import { findSpecRecord, loadSpecRecords, rules } from "dumcorpus";
import type * as Dumcorpus from "dumcorpus/types";

const records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords();
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
`checkRecord(id, json)` checks one sentence record's parsed file and never
throws: `errors` fail it, `issues` are its Draft layers' work, each tagged
with its Annotation Layer, beside its `reviewDepth` and `validThrough`. A
tool that edits one record at a time checks it with this, so one broken file
hides no other.

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
generated, each Reading with its reviewed Knowledge. `dumcorpus/inventories`
exports them without reading files or loading Zod, so a short-lived isolate
can import it; the package root re-exports it. Runtime code loads only this
entry: Dumdict, tf-demo's Convex, server and browser code, and Dumgen's
production `src`. The gold loader and the review tooling are for development
and evaluation, and the repository's import policy rejects a runtime import
of any other dumcorpus entry. Type-only imports are free.

```ts
import { authoredMembers, authoredRealizations } from "dumcorpus/inventories";

// hat in hat gekocht spells the AUX Lemma haben.
const haben = authoredRealizations.filter(
	({ spelled, member }) => spelled === "hat" && member.lemma.kind === "AUX",
);
```

`authoredMembers` holds every German Lemma, Reading and Knowledge:
the AUX Readings, the PRON and DET pillar cells and stems, the reflexivity
unit and the pronominal adverbs. It also holds the pronoun Syncretisms that
`bun run generate` derives from the pillar cells (system ADR 0046), and
`syncretismFor` finds the one a classifier's answer names. `reflexiveDrillDown` gives the reflexivity
unit for a lexically reflexive Lemma; no spelling realizes it. `authoredRealizations` lists every spelling of a DET,
PRON or AUX member, with the cell a stem's spelling marks.
`reviewedDeterminers` and `reviewedPronouns` pair each stem with its
spellings, and `closedVerbForms` lists every form of sein, haben, werden and
the modals.

The selectors read the inventories without a model. `authoredReading` and
`authoredFor` find the members of a Reading or a Lemma, and
`selectAuthoredArticle` an article cell's. `closedRoute` tells a Closed Route
(system ADR 0021). `selectGrammaticalAlternatives` steps between a pillar's
Paradigm Cells (system ADR 0019), and `deriveGrammaticalComponent` gives the
article of a name cited with one, or the subject expletive `es`, that a
Surface brings.

`checkIfGrundform` asks whether a Surface realizes its Lemma's Grundform.
A Surface stores no Citation/Inflection discriminator, so the entry assesses
its spelling and grammatical evidence by each language's citation
conventions:

```ts
import { checkIfGrundform } from "dumcorpus/inventories";

const grundform = checkIfGrundform(surface);

// => { success: true, value: true }
```

Known contrary evidence returns `false`. Missing or ambiguous evidence returns
a typed `GrundformAssessmentError`, rather than guessing.
