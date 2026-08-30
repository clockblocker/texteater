import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "The core dumling DTO model.",
	order: 20,
	title: "Model",
	body: `
The public Dumling model is built around three hydrated DTOs:

- \`Lemma\`: the normalized grammatical identity
- \`Surface\`: the normalized form resolved from the attested text
- \`Attestation\`: click-independent evidence for one observed occurrence

Attestations are always hydrated:

- an \`Attestation\` always contains a \`Surface\`
- a \`Surface\` always contains a \`Lemma\`

## Lemma

<!-- DOC_BLOCK:core-lemma -->

A Lemma owns its \`language\`, \`canonicalForm\`, \`family\`, \`kind\`, and
\`coreFeatures\`. Together these fields are grammatical identity. There is no
separate opaque identity layered above the Lemma.

Grammatically indistinguishable homonyms share one Lemma. Semantic identity is
a Reading—the pair of a Lemma and an emoji description. Dumling owns that
foundational value and its equality and identity operations; dictionary scope,
records, and workflows belong to consumers.

## Surface

<!-- DOC_BLOCK:core-surface -->

A citation surface uses \`surfaceKind: "Citation"\`. Every Surface also owns
\`spelling: "Canonical" | "Variant"\`.

Marked properties of the resolved surface live in \`surfaceFeatures\`. For example, a historical citation or inflection can carry \`surfaceFeatures: { historicalStatus: "Archaic" }\`.

Construction Lemmas are citation-only today, so \`Construction/Fusion\` only appears under \`Surface<Citation>\` and never under \`Surface<Inflection>\`. Multi-member Lexemes follow the surface policy of their whole-unit POS.

An inflection surface uses \`surfaceKind: "Inflection"\` and adds \`inflectionalFeatures\`:

\`\`\`ts
const ranSurface = dumling.en.create.surface.inflection({
\tlemma: runLemma,
\tnormalizedSurface: "ran",
\tspelling: "Canonical",
\tinflectionalFeatures: {
\t\ttense: "Past",
\t\tverbForm: "Fin",
\t},
});
\`\`\`

## Attestation

<!-- DOC_BLOCK:core-attestation -->

An Attestation records a non-empty, source-ordered tuple of exact member strings
and per-member orthography evidence, plus \`Full | Partial\` realization coverage.
It links exactly one Surface. It contains no sentence ID, click, segment index,
marked context, identity, or persistence contract.

## Descriptors

Descriptors are compact structural summaries of DTOs. They are useful when code needs to route by entity kind, language, Lemma family and kind, or Surface kind without carrying the whole object through the branch.

\`\`\`ts
const descriptor = dumling.de.describe.as.attestation(seeAttestation);

descriptor.entityKind; // "Attestation"
descriptor.language; // "de"
descriptor.family; // "Lexeme"
descriptor.kind; // "NOUN"
descriptor.surfaceKind; // "Citation"
\`\`\`

## IDs

IDs are compact identity keys for Lemmas and Surfaces. Attestations deliberately
have no ID codec:

\`\`\`ts
const id = dumling.de.id.encode.asBase64Url(seeAttestation.surface);
const decoded = dumling.de.id.decode.asSurfaceIdentity(id);
\`\`\`

Lemma identity is its complete grammatical tuple: language, canonical form,
family, kind, and core features. Attestation route slugs in this docs site are
opaque docs-local structural hashes, not Dumling identities.

## Runtime Validation

Parsing returns an \`ApiResult\` instead of throwing:

\`\`\`ts
const parsed = dumling.de.parse.attestation(input);

if (!parsed.success) {
\tconsole.error(parsed.error.code, parsed.error.issues);
}
\`\`\`

Route-specific Zod schema access is an expensive schema-authoring escape hatch,
not the application-validation interface:

\`\`\`ts
dangerouslyHeavySchemasForAbout100MiBRss.de.entity.Attestation.Citation.Lexeme.NOUN().parse(value);
\`\`\`
`,
});

export default document;
