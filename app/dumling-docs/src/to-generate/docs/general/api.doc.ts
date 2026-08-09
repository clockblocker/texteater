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

## Lemma → Surface → Attestation

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

const ranAttestation = dumling.en.create.attestation({
\tmembers: [{ attested: "ran", orthography: "Standard" }],
\trealizationCoverage: "Full",
\tsurface: ranSurface,
});
\`\`\`

## Operations

- \`create\` constructs strict DTOs and Lemma/Surface IDs.
- \`convert.lemma.toSurface\` makes the canonical full citation Surface.
- \`convert.*.toAttestation\` requires occurrence members and coverage.
- \`extract.lemma\` retrieves the Lemma from any hydrated layer.
- \`parse\` safely validates unknown input.
- \`describe\` returns compact structural descriptors.

## Identity IDs

\`\`\`ts
const id = dumling.en.id.encode.asBase64Url(ranAttestation.surface);
const decoded = dumling.en.id.decode.asSurfaceIdentity(id);

if (decoded.success) {
\tdecoded.data.surfaceIdentity.normalizedSurface;
}
\`\`\`

Decoding returns identity keys, not a fabricated hydrated graph. Use
\`asLemmaIdentity\` or \`asSurfaceIdentity\` when the expected layer is known.
Attestations are intentionally absent from the ID API.

## Schemas

\`\`\`ts
import { abstractSchemas, getSchemaTreeFor, schemasFor } from "dumling/schema";

schemasFor.de.entity.Lemma.Lexeme.NOUN();
schemasFor.en.entity.Surface.Inflection.Lexeme.VERB();
schemasFor.he.entity.Attestation.Inflection.Lexeme.NOUN();
getSchemaTreeFor("de");
void abstractSchemas.entity.Attestation;
\`\`\`
`,
});

export default document;
