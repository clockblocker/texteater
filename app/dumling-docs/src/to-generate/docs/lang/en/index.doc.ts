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
\`lemma/\` and \`surface/\`. Occurrence evidence lives under
\`attestation/{sentence}/\`; its bracketed sentence is docs-only review context.

- [English attestation routes](/en/attestation/)
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

const ranAttestation = dumling.en.convert.surface.toAttestation(ranSurface, {
\tmembers: [{ attested: "ran", orthography: "Standard" }],
\trealizationCoverage: "Full",
});

dumling.en.parse.attestation(ranAttestation);
\`\`\`

## Schema Access

\`\`\`ts
schemasFor.en.entity.Lemma.Lexeme.VERB();
schemasFor.en.entity.Surface.Inflection.Lexeme.VERB();
schemasFor.en.entity.Attestation.Inflection.Lexeme.VERB();
\`\`\`
`,
});

export default document;
