import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "German language pack notes.",
	order: 110,
	title: "German",
	body: `
German units use \`language: "de"\`. Validate them with \`parseUnit\`
and import concrete schemas from \`dumling/schema/de/<family>/<kind-name>\`.

## Public Classification Tree

The public German classification tree lives under [/de/](/de/).

Start with:

- [/de/entity/](/de/entity/) for \`Lemma\`, \`Surface\`, and \`Attestation\`
- [/de/entity/lemma/](/de/entity/lemma/) for the four Lemma branches
- [/de/entity/lemma/lexeme/](/de/entity/lemma/lexeme/), [/de/entity/lemma/morpheme/](/de/entity/lemma/morpheme/), and [/de/entity/lemma/phraseme/](/de/entity/lemma/phraseme/) for concrete inventories
- [/de/feature/](/de/feature/) and [/de/feature/attestation/](/de/feature/attestation/) for feature pages
- [/de/classification-instructions/](/de/classification-instructions/) for German-specific classifier instructions

## Supported Lemma Families

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`Collocation\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |

Fused forms such as \`zum\`, \`zur\`, \`beim\`, or \`ins\` are not Lemmas; each piece stands for its own word and its Attestation member carries the orthography \`Fused\`. Fixed multi-member identities are Lexemes: for example \`um zu\` is \`Lexeme/SCONJ\`, \`entweder … oder\` is \`Lexeme/CCONJ\`, and \`einerseits … andererseits\` is \`Lexeme/ADV\`.

## Common Feature Areas

German has richer inflectional coverage than English for nouns and adjectives.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`gender\`, \`hyph\` | \`case\`, \`number\` |
| \`VERB\` | \`hasSepPrefix\`, \`lexicallyReflexive\`, \`verbType\` | \`aspect\`, \`gender\`, \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\`, \`foreign\`, \`numType\`, \`variant\` | \`case\`, \`degree\`, \`gender\`, \`number\` |

German noun \`gender\` supports \`Fem\`, \`Masc\`, and \`Neut\`. German nominal and adjectival \`case\` supports \`Nom\`, \`Acc\`, \`Dat\`, and \`Gen\`.

## Example

\`\`\`ts
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

const seeLemma = {
\tunitKind: "Lemma",
\tlanguage: "de",
\tcanonicalForm: "See",
\tfamily: "Lexeme",
\tkind: "NOUN",
\tcoreFeatures: {
\t\tgender: "Masc",
\t\thyph: null,
\t},
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

const seenSurface = {
\tunitKind: "Surface",
\tlanguage: "de",
\tlemma: seeLemma,
\tnormalizedSurface: "Seen",
\tspelling: "Canonical",
\tinflectionalFeatures: {
\t\tcase: "Nom",
\t\tnumber: "Plur",
\t\tarticle: null,
\t},
\tsurfaceFeatures: null,
} satisfies Dumling.Surface<"de", "Lexeme", "NOUN">;

const seenAttestation = {
\tunitKind: "Attestation",
\tmembers: [{ attested: "Seen", orthography: "Standard" }],
\trealizationCoverage: "Full",
\tarticleEvidence: null,
\tsurface: seenSurface,
} satisfies Dumling.Attestation<"de">;

parseUnit(seenAttestation);
\`\`\`

German multi-member Lexeme example:

\`\`\`ts
const umZuLemma = {
\tunitKind: "Lemma",
\tlanguage: "de",
\tcanonicalForm: "um zu",
\tfamily: "Lexeme",
\tkind: "SCONJ",
\tcoreFeatures: { conjType: null },
} satisfies Dumling.Lemma<"de", "Lexeme", "SCONJ">;

const umZuAttestation = {
\tunitKind: "Attestation",
\tmembers: [
\t	{ attested: "um", orthography: "Standard" },
\t	{ attested: "zu", orthography: "Standard" },
\t],
\trealizationCoverage: "Full",
\tsurface: { unitKind: "Surface", language: "de", lemma: umZuLemma, normalizedSurface: umZuLemma.canonicalForm, spelling: "Canonical", surfaceFeatures: null },
} satisfies Dumling.Attestation<"de">;
\`\`\`

## Schema access

\`\`\`ts
import { lemmaSchema } from "dumling/schema/de/lexeme/noun";

const formSchema = lemmaSchema.shape.canonicalForm;
\`\`\`
`,
});

export default document;
