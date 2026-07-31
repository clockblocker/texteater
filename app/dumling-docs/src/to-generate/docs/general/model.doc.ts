import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "The core dumling DTO model.",
	order: 20,
	title: "Model",
	body: `
The public Dumling model is built around three hydrated DTOs:

- \`Lemma\`: the normalized grammatical identity
- \`Surface\`: the normalized form resolved from the attested text
- \`Selection\`: the sentence-local evidence produced by a click

Selections are always hydrated:

- a \`Selection\` always contains a \`Surface\`
- a \`Surface\` always contains a \`Lemma\`

## Lemma

<!-- DOC_BLOCK:core-lemma -->

A Lemma owns its \`language\`, \`canonicalForm\`, \`family\`, \`kind\`, and
\`coreFeatures\`. Together these fields are grammatical identity. There is no
separate opaque identity layered above the Lemma.

Grammatically indistinguishable homonyms share one Lemma. Semantic identity is
a learner-scoped Reading—the pair of a Lemma and an emoji description—and
belongs outside Dumling.

## Surface

<!-- DOC_BLOCK:core-surface -->

A citation surface uses \`surfaceKind: "Citation"\`. Every Surface also owns
\`spelling: "Canonical" | "Variant"\` and
\`realizationCoverage: "Full" | "Partial"\`.

Marked properties of the resolved surface live in \`surfaceFeatures\`. For example, a historical citation or inflection can carry \`surfaceFeatures: { historicalStatus: "Archaic" }\`.

Construction Lemmas are citation-only today, so \`Construction/Fusion\` and \`Construction/PairedFrame\` only appear under \`Surface<Citation>\` and never under \`Surface<Inflection>\`.

An inflection surface uses \`surfaceKind: "Inflection"\` and adds \`inflectionalFeatures\`:

\`\`\`ts
const ranSurface = dumling.en.create.surface.inflection({
\tlemma: runLemma,
\tnormalizedSurface: "ran",
\tspelling: "Canonical",
\trealizationCoverage: "Full",
\tinflectionalFeatures: {
\t\ttense: "Past",
\t\tverbForm: "Fin",
\t},
});
\`\`\`

## Selection

<!-- DOC_BLOCK:core-selection -->

A Selection records the immutable segmented sentence ID, the clicked \`ResolvableText\`
segment index, every segment index participating in the Surface occurrence,
the noisy attested text across those segments, and the clicked segment's
\`selectedOrthography\`. Variant spelling and partial realization live on the
Surface because they describe the linguistic form, not the click.

## Descriptors

Descriptors are compact structural summaries of DTOs. They are useful when code needs to route by entity kind, language, Lemma family and kind, or Surface kind without carrying the whole object through the branch.

\`\`\`ts
const descriptor = dumling.de.describe.as.selection(seeSelection);

descriptor.entityKind; // "Selection"
descriptor.language; // "de"
descriptor.family; // "Lexeme"
descriptor.kind; // "NOUN"
descriptor.surfaceKind; // "Citation"
\`\`\`

## IDs

IDs are compact identity keys. Decoding intentionally does not hydrate the
whole DTO graph:

\`\`\`ts
const id = dumling.de.id.encode.asBase64Url(seeSelection);
const decoded = dumling.de.id.decode.asSelectionIdentity(id);
\`\`\`

Selection identity is the pair
\`(segmentedSentenceId, clickedSegmentIndex)\`. Lemma identity is its complete
grammatical tuple: language, canonical form, family, kind, and core features.

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
