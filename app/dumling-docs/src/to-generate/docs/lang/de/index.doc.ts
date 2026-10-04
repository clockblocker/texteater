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
- [/de/entity/lemma/](/de/entity/lemma/) for the five Lemma branches
- [/de/entity/lemma/lexeme/](/de/entity/lemma/lexeme/), [/de/entity/lemma/locution/](/de/entity/lemma/locution/), [/de/entity/lemma/saying/](/de/entity/lemma/saying/), [/de/entity/lemma/foreign/](/de/entity/lemma/foreign/), and [/de/entity/lemma/morpheme/](/de/entity/lemma/morpheme/) for concrete inventories
- [/de/feature/](/de/feature/) and [/de/feature/attestation/](/de/feature/attestation/) for feature pages
- [/de/rules/](/de/rules/) for the German classification Rules

## Supported Lemma Families

| \`family\` | \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\` |
| \`Morpheme\` | \`Circumfix\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\` |
| \`Locution\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PRON\`, \`SCONJ\`, \`VERB\` |
| \`Saying\` | \`Saying\` |
| \`Foreign\` | \`Foreign\` |

Fused forms such as \`zum\`, \`zur\`, \`beim\`, or \`ins\` are not Lemmas; each piece stands for its own word and its Attestation member carries the orthography \`Fused\`. In \`Ich bin im Wald\`, ADP \`in\` has the member \`i\`, and the noun \`Wald\` owns the article piece \`m\`: its members are \`[m, Wald]\`. A shortened standalone article such as \`'ne\` is a \`Shorthand\` member of its noun. A multiword Lemma with two or more Heads is a Locution, whose Kind is the part of speech the whole acts as: \`um … zu\` is \`Locution/SCONJ\`, \`entweder … oder\` is \`Locution/CCONJ\`, and \`einerseits … andererseits\` is \`Locution/ADV\`. A Kind may repeat across Families, so \`Lexeme/VERB\` and \`Locution/VERB\` are two routes.

## Common Feature Areas

German has richer inflectional coverage than English for nouns and adjectives.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`gender\` | \`case\`, \`gender\`, \`number\` |
| \`VERB\` | \`hasSepPrefix\`, \`lexicallyReflexive\` | \`aspect\`, \`gender\`, \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`comparable\` | \`case\`, \`degree\`, \`gender\`, \`number\` |

German noun \`gender\` supports \`Fem\`, \`Masc\`, and \`Neut\`. An adjectival noun for a person (\`Angestellte\`, \`Reisende\`) has no Lemma gender, since its gender is the referent's; its singular Surface marks the gender its form shows (\`der Reisende\` and \`ein Verletzter\` are \`Masc\`), and no other noun Surface marks gender. German nominal and adjectival \`case\` supports \`Nom\`, \`Acc\`, \`Dat\`, and \`Gen\`.

## Nouns and Their Articles

The Head of a noun phrase owns its article. The article is a member of the
Head's Attestation, even across an adjective (\`das rote Band\`), so clicking it
opens the Head. The Head is the noun, or the word standing in for an elided
noun: \`Ich nehme den roten\` attests ADJ \`rot\` over \`[den, roten]\`. A noun
Surface has no article feature: \`normalizedSurface\` is the noun's own
letters, and \`Haus\` is the same Surface in \`das Haus\`, \`kein Haus\` and
\`Haus\`. \`kein\`, \`mein\` and \`dieser\` are DETs of their own. A noun's header
shows its article from the Lemma's gender; the article \`dumcorpus\` derives for an
occurrence is the \`der\` or \`ein\` cell its spelling names for the Head's
case, number and gender, and a spelling that names none (\`ein Häuser\`) fails
there.

\`articleEvidence\` says where the article is attested:

- \`{ kind: "Owned", member }\`: the index of the article member, in \`[Die, Mutter]\` or \`[m, Wald]\`; coverage is Full
- \`{ kind: "Shared", article }\`: an article the noun does not own, such as the shared \`der\` of \`der Aufstieg und Abstieg\`; coverage is Partial
- \`null\`: the Head has no article

A proper noun canonically cited with its article (\`die Schweiz\`, \`der
Rhein\`, \`der Struwwelpeter\`) has the Core Feature \`article: Definite\`, and
the article is an owned member like a common noun's: \`in die Schweiz\` attests
\`[die, Schweiz]\`, \`im Rhein\` attests \`[m, Rhein]\`. A name cited bare
(\`Berlin\`) has \`article: null\` and owns the article it takes in a sentence:
\`das alte Berlin\` attests \`[das, Berlin]\`.

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
\t},
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

const seenSurface = {
\tunitKind: "Surface",
\tlanguage: "de",
\tlemma: seeLemma,
\tnormalizedSurface: "Seen",
\tspelling: { kind: "Canonical" },
\tinflectionalFeatures: {
\t\tcase: "Nom",
\t\tgender: null,
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
\tcoreFeatures: {},
} satisfies Dumling.Lemma<"de", "Lexeme", "SCONJ">;

const umZuAttestation = {
\tunitKind: "Attestation",
\tmembers: [
\t	{ attested: "um", orthography: "Standard" },
\t	{ attested: "zu", orthography: "Standard" },
\t],
\trealizationCoverage: "Full",
\tsurface: { unitKind: "Surface", language: "de", lemma: umZuLemma, normalizedSurface: umZuLemma.canonicalForm, spelling: { kind: "Canonical" }, surfaceFeatures: null },
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
