import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "English language pack notes.",
	order: 100,
	title: "English",
	body: `
English is available at \`dumling.en\`, \`getLanguageApi("en")\`, and \`schemasFor.en\`.

## Supported Lemma Families

English supports the same public Lemma families as the other implemented language packs:

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\`, \`PairedFrame\` |

\`Construction\` is part of the shared public ontology even though the English examples here focus on lexemes, morphemes, and phrasemes. Construction Lemmas are citation-only and currently featureless.

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
\`lemma/\` and \`surface/\`. Selection fixtures under
\`selection/{sentence}/\` allow multiple clicked \`ResolvableText\` Segments in one sentence.

- [walk](/en/selection/djEscyxjLHdhbGssbCxlbixsLG4sd2Fsayzwn5q2LA/)
- [walk in the park](/en/selection/djEscyxjLHdhbGsgaW4gdGhlIHBhcmssbCxlbixwLGlkLHdhbGsgaW4gdGhlIHBhcmss8J-YjCw/)
- [run](/en/lemma/djIsbCxlbixlbnRyeV9aX1A3OFpmYUdnU0k0TEh0QXA/)
- [book](/en/lemma/djIsbCxlbixlbnRyeV9tZnhsMGp4WnU1MWJ6a3VTa2M/)
- [ran](/en/surface/djIscyxlbixpLHJhbixudT1zfHBlPXAxfHRlPXB8dmY9ZixlbnRyeV9aX1A3OFpmYUdnU0k0TEh0QXA/)
- [books](/en/surface/djIscyxlbixpLGJvb2tzLG51PXAsZW50cnlfbWZ4bDBqeFp1NTFiemt1U2tj/)

## Example

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
\trealizationCoverage: "Full",
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

const ranSelection = dumling.en.convert.surface.toSelection(ranSurface, {
\tsegmentedSentenceId:
\t\tdumling.en.create.segmentedSentenceId("sentence:en:i-ran"),
\tclickedSegmentIndex: 2,
\tsurfaceSegmentIndices: [2],
\tattestedSurface: "ran",
\tselectedOrthography: "Standard",
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
