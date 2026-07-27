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

## Runtime API

The root runtime entrypoint exports:

\`\`\`ts
import {
\tdumling,
\tgetLanguageApi,
\tinspectId,
\tsupportedLanguages,
} from "dumling";
\`\`\`

The language-bound API is the primary workflow surface:

\`\`\`ts
const de = dumling.de;
const en = getLanguageApi("en");
\`\`\`

The implemented language namespaces are:

- \`dumling.de\`
- \`dumling.en\`
- \`dumling.he\`

## create

\`create\` constructors set namespace-implied fields such as \`language\` and \`surfaceKind\`.

\`\`\`ts
const lemma = dumling.en.create.lemma({
\tcanonicalLemma: "run",
\tlemmaKind: "Lexeme",
\tlemmaSubKind: "VERB",
\tinherentFeatures: {},
\tmeaningInEmojis: "🏃",
});

const surface = dumling.en.create.surface.inflection({
\tlemma,
\tnormalizedFullSurface: "ran",
\tinflectionalFeatures: {
\t\ttense: "Past",
\t\tverbForm: "Fin",
\t},
});

const selection = dumling.en.create.selection({
\tsurface,
\tspelledSelection: "ran",
});
\`\`\`

## convert

\`convert\` derives common linked DTOs.

\`\`\`ts
const surface = dumling.de.convert.lemma.toSurface(lemma);

const selection = dumling.de.convert.surface.toSelection(surface, {
\tspelledSelection: "See",
\tselectionFeatures: {
\t\tcoverage: "Partial",
\t},
});
\`\`\`

Defaults for generated selections are:

- \`spelledSelection: surface.normalizedFullSurface\`
- omitted \`selectionFeatures.orthography\` means standard orthography
- omitted \`selectionFeatures.coverage\` means full coverage
- omitted \`selectionFeatures.spelling\` means canonical spelling relation

## extract

\`extract\` retrieves the canonical nested entity from any hydrated value:

\`\`\`ts
const lemmaFromLemma = dumling.de.extract.lemma(lemma);
const lemmaFromSurface = dumling.de.extract.lemma(surface);
const lemmaFromSelection = dumling.de.extract.lemma(selection);
\`\`\`

## parse

\`parse\` validates unknown input against the language runtime schemas.

\`\`\`ts
const result = dumling.he.parse.selection(input);

if (result.success) {
\tresult.data.surface.lemma;
} else {
\tresult.error.code;
\tresult.error.message;
}
\`\`\`

## describe

\`describe.as\` returns descriptors for routing and indexing:

\`\`\`ts
dumling.en.describe.as.lemma(lemma);
dumling.en.describe.as.surface(surface);
dumling.en.describe.as.selection(selection);
\`\`\`

## id

Language-bound ID helpers encode and decode hydrated DTOs:

\`\`\`ts
const id = dumling.en.id.encode(selection);
const decoded = dumling.en.id.decodeAs("Selection", id);
\`\`\`

\`decode\` returns both the entity kind and the decoded data. \`decodeAs\` checks that the ID contains the expected entity kind.

## schemas

The schema entrypoint exports concrete and abstract schema registries:

\`\`\`ts
import { abstractSchemas, getSchemaTreeFor, schemasFor } from "dumling/schema";
\`\`\`

Concrete leaf schema getters return Zod schemas:

\`\`\`ts
schemasFor.de.entity.Lemma.Lexeme.NOUN();
schemasFor.en.entity.Surface.Inflection.Lexeme.VERB();
schemasFor.he.entity.Selection.Inflection.Lexeme.NOUN();
\`\`\`

Use \`getSchemaTreeFor(language)\` when the language is only known at runtime.
`,
});

export default document;
