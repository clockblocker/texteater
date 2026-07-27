import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "The core dumling DTO model.",
	order: 20,
	title: "Model",
	body: `
The public model is built around three hydrated DTOs:

- \`Lemma\`: the dictionary or lemma-like entry
- \`Surface\`: the normalized full form in context
- \`Selection\`: the exact observed highlight

Selections are always hydrated:

- a \`Selection\` always contains a \`Surface\`
- a \`Surface\` always contains a \`Lemma\`

## Lemma

<!-- DOC_BLOCK:core-lemma -->

A lemma is the canonical lexical object, or a lemma-like fused entry. It is where you put the language, the canonical form, the broad lemma kind, the concrete lemma subtype, inherent features, and a learner-facing meaning hint.

## Surface

<!-- DOC_BLOCK:core-surface -->

A citation surface uses \`surfaceKind: "Citation"\` and normally has the canonical lemma spelling as \`normalizedFullSurface\`.

Marked properties of the resolved surface live in \`surfaceFeatures\`. For example, a historical citation or inflection can carry \`surfaceFeatures: { historicalStatus: "Archaic" }\`.

Construction entries are citation-only today, so \`Construction/Fusion\` and \`Construction/PairedFrame\` only appear under \`Surface<Citation>\` and never under \`Surface<Inflection>\`.

An inflection surface uses \`surfaceKind: "Inflection"\` and adds \`inflectionalFeatures\`:

\`\`\`ts
const ranSurface = dumling.en.create.surface.inflection({
\tlemma: runLemma,
\tnormalizedFullSurface: "ran",
\tinflectionalFeatures: {
\t\ttense: "Past",
\t\tverbForm: "Fin",
\t},
});
\`\`\`

## Selection

<!-- DOC_BLOCK:core-selection -->

A selection records what was observed in text. The normalized surface stays available through \`selection.surface\`, and the lemma entry stays available through \`selection.surface.lemma\`.

Only marked mismatches are stored on the selection itself. \`selectionFeatures\` can record:

- \`orthography: "Typo"\`
- \`coverage: "Partial"\`
- \`spelling: "Variant"\`

When \`selectionFeatures\` is omitted, the selection is implicitly standard, full, and canonically spelled relative to its resolved surface.

## Descriptors

Descriptors are compact structural summaries of DTOs. They are useful when code needs to route by entity kind, language, lemma kind, or surface kind without carrying the whole object through the branch.

\`\`\`ts
const descriptor = dumling.de.describe.as.selection(seeSelection);

descriptor.entityKind; // "Selection"
descriptor.language; // "de"
descriptor.lemmaKind; // "Lexeme"
descriptor.lemmaSubKind; // "NOUN"
descriptor.surfaceKind; // "Citation"
\`\`\`

## IDs

IDs are stable strings produced from hydrated DTOs. Use the language-bound ID helpers when the caller already knows the language:

\`\`\`ts
const id = dumling.de.id.encode(seeSelection);
const decoded = dumling.de.id.decodeAs("Selection", id);
\`\`\`

Use \`inspectId(id)\` from the root entrypoint when you need metadata before full decoding.

## Runtime Validation

Parsing returns an \`ApiResult\` instead of throwing:

\`\`\`ts
const parsed = dumling.de.parse.selection(input);

if (!parsed.success) {
\tconsole.error(parsed.error.code, parsed.error.issues);
}
\`\`\`

The schema entrypoint exposes concrete Zod schemas when a caller needs direct validator access:

\`\`\`ts
schemasFor.de.entity.Selection.Citation.Lexeme.NOUN().parse(value);
\`\`\`
`,
});

export default document;
