import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "Runtime API namespaces and package entrypoints.",
	order: 30,
	title: "API",
	body: `
\`dumling\` exposes separate entrypoints for workflow operations, public types, and schemas.

## Entrypoints

| Import path | Purpose |
| --- | --- |
| \`dumling\` | Runtime API |
| \`dumling/types\` | Public DTOs, feature helpers, descriptors, API result types, and ID types |
| \`dumling/schema\` | Runtime Zod schema registries |

## Lemma → Surface → Selection

\`\`\`ts
import { dumling } from "dumling";

const runLemma = dumling.en.create.lemma({
\tcanonicalForm: "run",
\tfamily: "Lexeme",
\tkind: "VERB",
\tcoreFeatures: {
\t\tabbr: null,
\t\textPos: null,
\t\thasGovPrep: null,
\t\tphrasal: null,
\t\tstyle: null,
\t},
});

const ranSurface = dumling.en.create.surface.inflection({
\tlemma: runLemma,
\tnormalizedSurface: "ran",
\tspelling: "Canonical",
\trealizationCoverage: "Full",
\tinflectionalFeatures: {
\t\tmood: null,
\t\tnumber: "Sing",
\t\tperson: "1",
\t\ttense: "Past",
\t\tverbForm: "Fin",
\t\tvoice: null,
\t},
\tsurfaceFeatures: null,
});

const ranSelection = dumling.en.create.selection({
\tsegmentedSentenceId:
\t\tdumling.en.create.segmentedSentenceId("sentence:en:i-ran-home"),
\tclickedSegmentIndex: 2,
\tsurfaceSegmentIndices: [2],
\tattestedSurface: "ran",
\tselectedOrthography: "Standard",
\tsurface: ranSurface,
});
\`\`\`

## Operations

- \`create\` constructs branded IDs and strict DTOs.
- \`convert.lemma.toSurface\` makes the canonical full citation Surface.
- \`convert.*.toSelection\` requires sentence-local Selection options.
- \`extract.lemma\` retrieves the Lemma from any hydrated layer.
- \`parse\` safely validates unknown input.
- \`describe\` returns compact structural descriptors.

## Identity IDs

\`\`\`ts
const id = dumling.en.id.encode.asBase64Url(ranSelection);
const decoded = dumling.en.id.decode.asSelectionIdentity(id);

if (decoded.success) {
\tdecoded.data.selectionIdentity.segmentedSentenceId;
\tdecoded.data.selectionIdentity.clickedSegmentIndex;
}
\`\`\`

Decoding returns identity keys, not a fabricated hydrated graph. Use
\`asLemmaIdentity\`, \`asSurfaceIdentity\`, or
\`asSelectionIdentity\` when the expected layer is known.

## Schemas

\`\`\`ts
import { abstractSchemas, getSchemaTreeFor, schemasFor } from "dumling/schema";

schemasFor.de.entity.Lemma.Lexeme.NOUN();
schemasFor.en.entity.Surface.Inflection.Lexeme.VERB();
schemasFor.he.entity.Selection.Inflection.Lexeme.NOUN();
getSchemaTreeFor("de");
void abstractSchemas.entity.Selection;
\`\`\`
`,
});

export default document;
