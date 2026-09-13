import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "Hebrew language pack notes.",
	order: 120,
	title: "Hebrew",
	body: `
Hebrew units use \`language: "he"\`. Validate them with \`parseUnit\`
and import concrete schemas from \`dumling/schema/he/<family>/<kind-name>\`.

## Supported Lemma Families

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\` |

\`Construction\` is part of the shared public ontology even though the Hebrew examples here focus on lexemes, morphemes, and phrasemes. Construction/Fusion currently has no core or inflectional feature distinctions.

## Common Feature Areas

Hebrew schemas include language-specific morphology alongside shared feature names.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`abbr\`, \`gender\` | \`definite\`, \`number\` |
| \`VERB\` | \`hebBinyan\`, \`hebExistential\` | \`definite\`, \`gender\`, \`mood\`, \`number\`, \`person\`, \`polarity\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\` | \`definite\`, \`gender\`, \`number\` |

Hebrew gender values are scoped to \`Fem\` and \`Masc\`. Hebrew noun number supports set-like values for \`Dual\` and \`Plur\`; adjective number supports \`Sing\` and \`Plur\`.

## Example

\`\`\`ts
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

const katavLemma = {
\tunitKind: "Lemma",
\tlanguage: "he",
\tcanonicalForm: "כתב",
\tfamily: "Lexeme",
\tkind: "VERB",
\tcoreFeatures: {
\t\thebBinyan: "PAAL",
\t\thebExistential: null,
\t},
} satisfies Dumling.Lemma<"he", "Lexeme", "VERB">;

const katavSurface = {
\tunitKind: "Surface",
\tlanguage: "he",
\tlemma: katavLemma,
\tnormalizedSurface: "כתב",
\tspelling: "Canonical",
\tinflectionalFeatures: {
\t\tdefinite: null,
\t\tgender: "Masc",
\t\tmood: null,
\t\tnumber: "Sing",
\t\tperson: "3",
\t\tpolarity: null,
\t\ttense: "Past",
\t\tverbForm: null,
\t\tvoice: null,
\t},
\tsurfaceFeatures: null,
} satisfies Dumling.Surface<"he", "Lexeme", "VERB">;

const katavAttestation = {
\tunitKind: "Attestation",
\tsurface: katavSurface,
\tmembers: [{ attested: "כתב", orthography: "Standard" }],
\trealizationCoverage: "Full",
} satisfies Dumling.Attestation<"he">;

parseUnit(katavAttestation);
\`\`\`

## Schema access

\`\`\`ts
import { lemmaSchema } from "dumling/schema/he/lexeme/verb";

const formSchema = lemmaSchema.shape.canonicalForm;
\`\`\`
`,
});

export default document;
