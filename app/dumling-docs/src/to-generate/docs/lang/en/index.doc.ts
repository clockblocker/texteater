import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const document = defineGeneratedDocPage({
	description: "English language pack notes.",
	order: 100,
	title: "English",
	examples: [
		specExample("en/yesterday-i-ran-to-the-station"),
		specExample("en/the-books-are-on-the-shelf"),
	],
	body: `
English units use \`language: "en"\`. Validate them with \`parseUnit\`
and import concrete schemas from \`dumling/schema/en/<family>/<kind-name>\`.

## Supported Lemma Families

English supports the same public Lemma families as the other implemented language packs:

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
## Common Feature Areas

English feature schemas are intentionally narrower than the abstract ontology.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`abbr\`, \`foreign\`, \`numForm\`, \`numType\`, \`style\` | \`article\`, \`number\` |
| \`VERB\` | \`phrasal\`, \`style\` | \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\`, \`numForm\`, \`numType\`, \`style\` | \`degree\` |

English noun \`number\` supports \`Sing\`, \`Plur\`, and \`Ptan\`. A noun owns its article: \`the big house\` is the Surface \`house\` with \`article: "Definite"\`, members \`[the, house]\` and \`articleEvidence: { kind: "Owned", member: 0 }\`. A noun without an article marks \`article: "None"\` and has \`articleEvidence: null\`. A proper noun canonically cited with its article (\`the Netherlands\`) has the Core Feature \`article: "Definite"\` and owns \`the\` the same way; one cited bare (\`London\`) has \`article: null\`.

Pieces split off a contracted word are syntactic words with \`Fused\` members: \`'ll\` in \`I'll\` is AUX \`will\`, \`n't\` in \`don't\` is PART \`not\`, and possessive \`'s\` is its own PART Lemma, which attaches to a whole phrase (\`the king of England's hat\`). English verb \`tense\` supports \`Past\` and \`Pres\`, and \`verbForm\` supports \`Fin\`, \`Ger\`, \`Inf\`, and \`Part\`.

## Attested Examples

English examples are Spec Records of the \`dumspec\` package, one sentence per
file under \`records/en/\`. Each target of a record generates one Markdown
attestation; its bracketed sentence marks the target's members. The examples
at the end of this page show \`ran\` and \`books\`.

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
