import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "English language pack notes.",
	order: 100,
	title: "English",
	body: `
English units use \`language: "en"\`. Validate them with \`parseUnit\`
and import concrete schemas from \`dumling/schema/en/<family>/<kind-name>\`.

## Supported Lemma Families

English supports the same public Lemma families as the other implemented language packs:

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\` |

\`Construction\` is part of the shared public ontology even though the English examples here focus on lexemes, morphemes, and phrasemes. Construction/Fusion currently has no core or inflectional feature distinctions.

## Common Feature Areas

English feature schemas are intentionally narrower than the abstract ontology.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`abbr\`, \`foreign\`, \`numForm\`, \`numType\`, \`style\` | \`number\` |
| \`VERB\` | \`hasGovPrep\`, \`phrasal\`, \`style\` | \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\`, \`numForm\`, \`numType\`, \`style\` | \`degree\` |

English noun \`number\` supports \`Sing\`, \`Plur\`, and \`Ptan\`. English verb \`tense\` supports \`Past\` and \`Pres\`, and \`verbForm\` supports \`Fin\`, \`Ger\`, \`Inf\`, and \`Part\`.

## Attestation Files

English attestation source files live in \`src/to-generate/attestations/en\`. Each file exports exactly one attested dumling object and generates exactly one Markdown attestation.

Lemma and Surface attestations are generated from files under
\`lemma/\` and \`surface/\`. Occurrence evidence lives under
\`attestation/{sentence}/\`; its bracketed sentence is docs-only review context.

- [run](/en/lemma/sha256-kkB6900_KQWDVnZoQxymIMdBg_TZzPHLJCzUDb8ow2c/)
- [book](/en/lemma/sha256-peGvpmPHvQCiqFBFNZbi36hUDI0f8IJAoerjb926bKI/)
- [books](/en/surface/sha256-8jDh8y4Qj8_7roYVkECdSfRIIvJEb0rnUemOhPMh84U/)
- [ran](/en/surface/sha256-jo34mLdUJMakhkq3JxExLTwq4CxSIJH4Hr86SrcAXuU/)

## Example

\`\`\`ts
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

const runLemma = {
\tunitKind: "Lemma",
\tlanguage: "en",
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
} satisfies Dumling.Lemma<"en", "Lexeme", "VERB">;

const ranSurface = {
\tunitKind: "Surface",
\tlanguage: "en",
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
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

const ranAttestation = {
\tunitKind: "Attestation",
\tsurface: ranSurface,
\tmembers: [{ attested: "ran", orthography: "Standard" }],
\trealizationCoverage: "Full",
} satisfies Dumling.Attestation<"en">;

parseUnit(ranAttestation);
\`\`\`

## Schema access

\`\`\`ts
import { lemmaSchema } from "dumling/schema/en/lexeme/verb";

const formSchema = lemmaSchema.shape.canonicalForm;
\`\`\`
`,
});

export default document;
