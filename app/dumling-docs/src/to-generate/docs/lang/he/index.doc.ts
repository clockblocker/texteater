import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "Hebrew language pack notes.",
	order: 120,
	title: "Hebrew",
	body: `
Hebrew is available at \`dumling.he\`, \`getLanguageApi("he")\`, and \`schemasFor.he\`.

## Supported Lemma Families

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\` |

\`Construction\` is part of the shared public ontology even though the Hebrew examples here focus on lexemes, morphemes, and phrasemes. Construction Lemmas are citation-only and currently featureless.

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
import { dumling } from "dumling";

const katavLemma = dumling.he.create.lemma({
\tcanonicalForm: "כתב",
\tfamily: "Lexeme",
\tkind: "VERB",
\tcoreFeatures: {
\t\thebBinyan: "PAAL",
\t\thebExistential: null,
\t},
});

const katavSurface = dumling.he.create.surface.inflection({
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
});

const katavAttestation = dumling.he.convert.surface.toAttestation(katavSurface, {
\tmembers: [{ attested: "כתב", orthography: "Standard" }],
\trealizationCoverage: "Full",
});

dumling.he.parse.attestation(katavAttestation);
\`\`\`

## Schema Access

\`\`\`ts
schemasFor.he.entity.Lemma.Lexeme.VERB();
schemasFor.he.entity.Surface.Inflection.Lexeme.VERB();
schemasFor.he.entity.Attestation.Inflection.Lexeme.VERB();
\`\`\`
`,
});

export default document;
