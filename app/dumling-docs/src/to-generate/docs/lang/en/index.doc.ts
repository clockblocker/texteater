import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "English language pack notes.",
	order: 100,
	title: "English",
	body: `
English is available at \`dumling.en\`, \`getLanguageApi("en")\`, and \`schemasFor.en\`.

## Supported Lemma Families

English supports the same public lemma families as the other implemented language packs:

| \`lemmaKind\` | \`lemmaSubKind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\`, \`PairedFrame\` |

\`Construction\` is part of the shared public ontology even though the English examples here focus on lexemes, morphemes, and phrasemes. Construction entries are citation-only and currently featureless.

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

Lemma and surface attestations are generated from files under \`lemma/\` and \`surface/\` with base64url ID basenames. Selection fixtures under \`selection/{sentence}/\` use a sentence directory normalized from \`sentenceMarkdown\` without brackets plus a semantic filename that keeps the bracketed selection span, which allows multiple selections for the same sentence. Generated Markdown attestations are written to \`src/generated/entities/en/{entityKind}/\` and published at \`/en/{entityKind}/{base64urlId}/\`.

- [walk](/en/selection/djEscyxjLHdhbGssbCxlbixsLG4sd2Fsayzwn5q2LA/)
- [walk in the park](/en/selection/djEscyxjLHdhbGsgaW4gdGhlIHBhcmssbCxlbixwLGlkLHdhbGsgaW4gdGhlIHBhcmss8J-YjCw/)
- [run](/en/lemma/djEsbCxlbixsLHYscnVuLPCfj4Ms/)
- [book](/en/lemma/djEsbCxlbixsLG4sYm9vayzwn5OaLA/)
- [ran](/en/surface/djEscyxpLHJhbix0ZT1wfHZmPWYsbCxlbixsLHYscnVuLPCfj4Ms/)
- [books](/en/surface/djEscyxpLGJvb2tzLG51PXAsbCxlbixsLG4sYm9vayzwn5OaLA/)

## Example

\`\`\`ts
import { dumling } from "dumling";

const runLemma = dumling.en.create.lemma({
\tcanonicalLemma: "run",
\tlemmaKind: "Lexeme",
\tlemmaSubKind: "VERB",
\tinherentFeatures: {},
\tmeaningInEmojis: "🏃",
});

const ranSurface = dumling.en.create.surface.inflection({
\tlemma: runLemma,
\tnormalizedFullSurface: "ran",
\tinflectionalFeatures: {
\t\ttense: "Past",
\t\tverbForm: "Fin",
\t},
});

const ranSelection = dumling.en.convert.surface.toSelection(ranSurface, {
\tspelledSelection: "ran",
});

dumling.en.parse.selection(ranSelection);
\`\`\`

## Schema Access

\`\`\`ts
schemasFor.en.entity.Lemma.Lexeme.VERB();
schemasFor.en.entity.Surface.Inflection.Lexeme.VERB();
schemasFor.en.entity.Selection.Inflection.Lexeme.VERB();
\`\`\`
`,
});

export default document;
