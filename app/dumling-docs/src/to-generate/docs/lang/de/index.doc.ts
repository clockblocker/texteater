import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "German language pack notes.",
	order: 110,
	title: "German",
	body: `
German is available operationally at \`dumling.de\` and \`getLanguageApi("de")\`.
The route-specific Zod tree is the roughly-100-MiB danger-zone
\`dangerouslyHeavySchemasForAbout100MiBRss.de\`.

## Public Classification Tree

The public German classification tree lives under [/de/](/de/).

Start with:

- [/de/entity/](/de/entity/) for \`Lemma\`, \`Surface\`, and \`Attestation\`
- [/de/entity/lemma/](/de/entity/lemma/) for the four Lemma branches
- [/de/entity/lemma/lexeme/](/de/entity/lemma/lexeme/), [/de/entity/lemma/morpheme/](/de/entity/lemma/morpheme/), [/de/entity/lemma/phraseme/](/de/entity/lemma/phraseme/), and [/de/entity/lemma/construction/](/de/entity/lemma/construction/) for concrete inventories
- [/de/feature/](/de/feature/) and [/de/feature/attestation/](/de/feature/attestation/) for feature pages
- [/de/classification-instructions/](/de/classification-instructions/) for German-specific classifier instructions

## Supported Lemma Families

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`Collocation\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\` |

German uses \`Construction/Fusion\` for fused forms such as \`zum\`, \`zur\`, \`beim\`, or \`ins\`. Fixed multi-member identities are Lexemes: for example \`um zu\` is \`Lexeme/SCONJ\`, \`entweder … oder\` is \`Lexeme/CCONJ\`, and \`einerseits … andererseits\` is \`Lexeme/ADV\`.

## Common Feature Areas

German has richer inflectional coverage than English for nouns and adjectives.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`gender\`, \`hyph\` | \`case\`, \`number\` |
| \`VERB\` | \`hasGovPrep\`, \`hasSepPrefix\`, \`lexicallyReflexive\`, \`verbType\` | \`aspect\`, \`gender\`, \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\`, \`foreign\`, \`numType\`, \`variant\` | \`case\`, \`degree\`, \`gender\`, \`number\` |

German noun \`gender\` supports \`Fem\`, \`Masc\`, and \`Neut\`. German nominal and adjectival \`case\` supports \`Nom\`, \`Acc\`, \`Dat\`, and \`Gen\`.

\`Construction/Fusion\` currently carries no additional core or inflectional features.

## Example

\`\`\`ts
import { dumling } from "dumling";

const seeLemma = dumling.de.create.lemma({
\tcanonicalForm: "See",
\tfamily: "Lexeme",
\tkind: "NOUN",
\tcoreFeatures: {
\t\tgender: "Masc",
\t\thyph: null,
\t},
});

const seenSurface = dumling.de.create.surface.inflection({
\tlemma: seeLemma,
\tnormalizedSurface: "Seen",
\tspelling: "Canonical",
\tinflectionalFeatures: {
\t\tcase: "Nom",
\t\tnumber: "Plur",
\t},
\tsurfaceFeatures: null,
});

const seenAttestation = dumling.de.create.attestation({
\tmembers: [{ attested: "Seen", orthography: "Standard" }],
\trealizationCoverage: "Full",
\tsurface: seenSurface,
});

dumling.de.parse.attestation(seenAttestation);
\`\`\`

German fusion example:

\`\`\`ts
const zumLemma = dumling.de.create.lemma({
\tcanonicalForm: "zum",
\tfamily: "Construction",
\tkind: "Fusion",
\tcoreFeatures: {},
});

const zumAttestation = dumling.de.create.attestation({
\tmembers: [{ attested: "zum", orthography: "Standard" }],
\trealizationCoverage: "Full",
\tsurface: dumling.de.convert.lemma.toSurface(zumLemma),
});
\`\`\`

German multi-member Lexeme example:

\`\`\`ts
const umZuLemma = dumling.de.create.lemma({
\tcanonicalForm: "um zu",
\tfamily: "Lexeme",
\tkind: "SCONJ",
\tcoreFeatures: { conjType: null },
});

const umZuAttestation = dumling.de.create.attestation({
\tmembers: [
\t	{ attested: "um", orthography: "Standard" },
\t	{ attested: "zu", orthography: "Standard" },
\t],
\trealizationCoverage: "Full",
\tsurface: dumling.de.convert.lemma.toSurface(umZuLemma),
});
\`\`\`

## Schema Access

\`\`\`ts
dangerouslyHeavySchemasForAbout100MiBRss.de.entity.Lemma.Lexeme.NOUN();
dangerouslyHeavySchemasForAbout100MiBRss.de.entity.Lemma.Lexeme.SCONJ();
dangerouslyHeavySchemasForAbout100MiBRss.de.entity.Lemma.Construction.Fusion();
\`\`\`
`,
});

export default document;
