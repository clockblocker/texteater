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
| \`Morpheme\` | \`Circumfix\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`Collocation\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |

Fused forms such as \`zum\`, \`zur\`, \`beim\`, or \`ins\` are not Lemmas; each piece stands for its own word and its Attestation member carries the orthography \`Fused\`. In \`Ich bin im Wald\`, ADP \`in\` has the member \`i\`, and the noun \`Wald\` owns the article piece \`m\`: its members are \`[m, Wald]\`. A shortened standalone article such as \`'ne\` is a \`Shorthand\` member of its noun. Fixed multi-member identities are Lexemes: for example \`um zu\` is \`Lexeme/SCONJ\`, \`entweder … oder\` is \`Lexeme/CCONJ\`, and \`einerseits … andererseits\` is \`Lexeme/ADV\`.

## Common Feature Areas

German has richer inflectional coverage than English for nouns and adjectives.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`gender\`, \`hyph\` | \`article\`, \`case\`, \`number\` |
| \`VERB\` | \`hasSepPrefix\`, \`lexicallyReflexive\`, \`verbType\` | \`aspect\`, \`gender\`, \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\`, \`foreign\`, \`numType\`, \`variant\` | \`case\`, \`degree\`, \`gender\`, \`number\` |

German noun \`gender\` supports \`Fem\`, \`Masc\`, and \`Neut\`. German nominal and adjectival \`case\` supports \`Nom\`, \`Acc\`, \`Dat\`, and \`Gen\`.

## Nouns and Their Articles

A German noun owns its article. The article is a member of the noun's
Attestation, even across an adjective (\`das rote Band\`), so clicking it opens
the noun. Every noun Surface marks \`article\` as \`Definite\`, \`Indefinite\` or
\`None\`; a bare noun or one after a possessive or numeral (\`meine Mutter\`,
\`drei Seen\`) is \`None\`. \`normalizedSurface\` is the noun's own letters,
without the article. A host adds the article when it displays the noun, from
the Lemma's gender and the Surface's case, number and article.

\`articleEvidence\` says where the article is attested:

- \`{ kind: "Owned", member }\`: the index of the article member, in \`[Die, Mutter]\` or \`[m, Wald]\`; coverage is Full
- \`{ kind: "Shared", article }\`: an article the noun does not own, such as the shared \`der\` of \`der Aufstieg und Abstieg\`; coverage is Partial
- \`null\`: the noun has no article, and \`article\` is \`None\`

A proper noun owns its article only if it is canonically cited with one
(\`die Schweiz\`, \`der Rhein\`, \`der Struwwelpeter\`). Its Lemma then has the
Core Feature \`article: Definite\`, and the article is an owned member like a
common noun's: \`in die Schweiz\` attests \`[die, Schweiz]\`, \`im Rhein\`
attests \`[m, Rhein]\`, and a host displays \`der Schweiz\` from the gender,
the Surface's case and number, and the Core article. A name cited bare
(\`Berlin\`) has \`article: null\` and no article evidence; an article it takes
in a sentence (\`das alte Berlin\`) is its own \`DET\`.

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
\t\tarticle: "None",
\t\tcase: "Nom",
\t\tnumber: "Plur",
\t},
\tsurfaceFeatures: null,
} satisfies Dumling.Surface<"de", "Lexeme", "NOUN">;

const seenAttestation = {
\tunitKind: "Attestation",
\tmembers: [{ attested: "Seen", orthography: "Standard" }],
\trealizationCoverage: "Full",
\tarticleEvidence: null,
\tvalencyEvidence: [],
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
