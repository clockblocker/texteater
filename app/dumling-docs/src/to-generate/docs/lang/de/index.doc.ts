import { defineGeneratedDocPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "German language pack notes.",
	order: 110,
	title: "German",
	body: `
German is available at \`dumling.de\`, \`getLanguageApi("de")\`, and \`schemasFor.de\`.

## Public Classification Tree

The public German classification tree lives under [/de/](/de/).

Start with:

- [/de/entity/](/de/entity/) for \`Lemma\`, \`Surface\`, and \`Selection\`
- [/de/entity/lemma/](/de/entity/lemma/) for the four lemma branches
- [/de/entity/lemma/lexeme/](/de/entity/lemma/lexeme/), [/de/entity/lemma/morpheme/](/de/entity/lemma/morpheme/), [/de/entity/lemma/phraseme/](/de/entity/lemma/phraseme/), and [/de/entity/lemma/construction/](/de/entity/lemma/construction/) for concrete inventories
- [/de/feature/](/de/feature/) and [/de/feature/selection/](/de/feature/selection/) for feature pages
- [/de/classification-instructions/](/de/classification-instructions/) for German-specific classifier instructions

## Supported Lemma Families

| \`lemmaKind\` | \`lemmaSubKind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\`, \`PairedFrame\` |

German uses \`Construction/Fusion\` for fused forms such as \`zum\`, \`zur\`, \`beim\`, or \`ins\`, and \`Construction/PairedFrame\` for learner-facing paired frames such as \`um zu\`. These are citation-only entries in the current public DTO.

## Common Feature Areas

German has richer inflectional coverage than English for nouns and adjectives.

| Subkind | Inherent examples | Inflectional examples |
| --- | --- | --- |
| \`NOUN\` | \`gender\`, \`hyph\` | \`case\`, \`number\` |
| \`VERB\` | \`hasGovPrep\`, \`hasSepPrefix\`, \`lexicallyReflexive\`, \`verbType\` | \`aspect\`, \`gender\`, \`mood\`, \`number\`, \`person\`, \`tense\`, \`verbForm\`, \`voice\` |
| \`ADJ\` | \`abbr\`, \`foreign\`, \`numType\`, \`variant\` | \`case\`, \`degree\`, \`gender\`, \`number\` |

German noun \`gender\` supports \`Fem\`, \`Masc\`, and \`Neut\`. German nominal and adjectival \`case\` supports \`Nom\`, \`Acc\`, \`Dat\`, and \`Gen\`.

\`Construction/Fusion\` and \`Construction/PairedFrame\` currently carry no additional inherent or inflectional features.

## Example

\`\`\`ts
import { dumling } from "dumling";

const seeLemma = dumling.de.create.lemma({
\tcanonicalLemma: "See",
\tlemmaKind: "Lexeme",
\tlemmaSubKind: "NOUN",
\tinherentFeatures: {
\t\tgender: "Masc",
\t},
\tmeaningInEmojis: "🌊",
});

const seenSurface = dumling.de.create.surface.inflection({
\tlemma: seeLemma,
\tnormalizedFullSurface: "Seen",
\tinflectionalFeatures: {
\t\tcase: "Nom",
\t\tnumber: "Plur",
\t},
});

const seenSelection = dumling.de.create.selection({
\tsurface: seenSurface,
\tspelledSelection: "Seen",
});

dumling.de.id.encode(seenSelection);
\`\`\`

German fusion example:

\`\`\`ts
const zumLemma = dumling.de.create.lemma({
\tcanonicalLemma: "zum",
\tlemmaKind: "Construction",
\tlemmaSubKind: "Fusion",
\tinherentFeatures: {},
\tmeaningInEmojis: "➡️",
});

const zumSelection = dumling.de.convert.lemma.toSelection(zumLemma, {
\tspelledSelection: "zum",
});
\`\`\`

German paired-frame example:

\`\`\`ts
const umZuLemma = dumling.de.create.lemma({
\tcanonicalLemma: "um zu",
\tlemmaKind: "Construction",
\tlemmaSubKind: "PairedFrame",
\tinherentFeatures: {},
\tmeaningInEmojis: "🎯",
});

const umZuSelection = dumling.de.convert.lemma.toSelection(umZuLemma, {
\tselectionFeatures: {
\t\tcoverage: "Partial",
\t},
\tspelledSelection: "zu",
});
\`\`\`

## Schema Access

\`\`\`ts
schemasFor.de.entity.Lemma.Lexeme.NOUN();
schemasFor.de.entity.Lemma.Construction.Fusion();
schemasFor.de.entity.Lemma.Construction.PairedFrame();
schemasFor.de.entity.Surface.Inflection.Lexeme.NOUN();
schemasFor.de.entity.Selection.Inflection.Lexeme.NOUN();
schemasFor.de.entity.Selection.Citation.Construction.Fusion();
schemasFor.de.entity.Selection.Citation.Construction.PairedFrame();
\`\`\`
`,
});

export default document;
