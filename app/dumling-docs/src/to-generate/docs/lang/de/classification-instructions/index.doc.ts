import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "German classifier terms and domain model.",
	family: "scope",
	order: 110,
	subject: "classification-instructions",
	title: "German Classification Instructions",
	body: `
## Relation To UD

dumling is UD-inspired, not UD-complete.

For German we reuse UD-style POS labels such as \`ADJ\`, \`ADP\`, \`AUX\`, \`DET\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, and \`VERB\`, and we reuse familiar feature names such as \`case\`, \`number\`, \`gender\`, \`degree\`, \`mood\`, \`tense\`, and \`verbForm\`.

But the classifier is not building a dependency tree. It is resolving a learner highlight to the learner-facing unit that actually carries the meaning.

That is why German dumling can classify:

- [\`zum\`](/de/selection/djEseCx6dW0scyxjLHp1bSxsLGRlLGMsZnVzLHp1bSzinqHvuI8s/) as \`Construction/Fusion\`
- [\`Bahnhof\`](/de/selection/djEseCxCYWhuaG9mLGNvdj1wLHMsYyxudXIgYmFobmhvZiB2ZXJzdGVoZW4sbCxkZSxwLGlkLG51ciBiYWhuaG9mIHZlcnN0ZWhlbizinZMs/) as a \`Partial\` selection of the idiom \`nur Bahnhof verstehen\`
- [\`auf\`](/de/selection/djEseCxhdWYsY292PXAscyxpLHBhc3MgYXVmLG1vPWltfG51PXN8cGU9cDJ8dmY9ZixsLGRlLGwsdixhdWZwYXNzZW4s8J-RgCxoZ3A9fmF1Znxoc3A9fmF1Zg/) in \`Pass [auf] dich auf!\` as part of the verbal payload for \`aufpassen\`

The main question is therefore not "which token label would UD assign in isolation?" but "which dumling payload best explains the learner-facing unit in this sentence?"

## Core Objects

Every attested German answer has three layers:

| Layer | Role |
| --- | --- |
| \`Selection\` | the exact text the learner highlighted |
| \`Surface\` | the normalized full learner-facing form that the highlight resolves to in context |
| \`Lemma\` | the canonical lexical item behind that surface |

The direction is one-way:

\`sentence + highlight -> selection -> surface -> lemma\`

\`Selection\` is an ingest-time wrapper, not a reversible token record. Two different highlights may legitimately collapse to the same payload when they point to the same learner-facing unit.

That is why both \`Pass [auf] dich auf!\` and \`Pass auf dich [auf]!\` can resolve to the same verbal surface \`pass auf\` and the same lemma \`aufpassen\`.

## Lemma Families

German uses the four public dumling lemma families:

| \`lemmaKind\` | German \`lemmaSubKind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\`, \`PairedFrame\` |

These families are not interchangeable.

\`Lexeme\` is for ordinary word-level entries.

\`Morpheme\` is for bound pieces such as [\`un-\`](/de/selection/djEseCxVbixjb3Y9cHxzcGw9dixzLGMsdW4tLGwsZGUsbSxwZix1bi0s8J-agCw/).

\`Phraseme\` is for learner-facing fixed expressions whose meaning belongs to the larger unit rather than to one token in isolation.

\`Construction\` is for patterned learner-facing entries such as fused forms like \`zum\` and paired frames such as \`um zu\`.

## Surface Kinds And Selection Features

Every surface is either \`Citation\` or \`Inflection\`.

\`Citation\` means the stored surface is already in citation or Grundform shape from the learner's perspective.

\`Inflection\` means the stored surface is an inflected form and carries \`inflectionalFeatures\`.

Examples:

- [\`Mutter\`](/de/selection/djEseCxNdXR0ZXIscyxjLG11dHRlcixsLGRlLGwsbixtdXR0ZXIs8J-RqSxnPWY/) is \`Citation\`
- [\`Kindern\`](/de/selection/djEseCxLaW5kZXJuLHMsaSxraW5kZXJuLGNhPWR8bnU9cCxsLGRlLGwsbixraW5kLPCfp5IsZz1u/) is \`Inflection\`
- [\`fünften\`](/de/selection/djEseCxmw7xuZnRlbixzLGksZsO8bmZ0ZW4sY2E9ZHxkZWc9cHxnPW18bnU9cyxsLGRlLGwsaixmw7xuZnRlLDXvuI_ig6MsbnQ9bw/) is \`Inflection\`

The current public model also imposes two important constraints:

- \`Phraseme\` surfaces are citation-shaped in practice, so a partial idiom selection points to the citation form of the larger phraseme.
- \`Construction\` entries are citation-only and currently featureless.

\`Selection\` may add a small amount of ingest-side information:

| \`selectionFeatures\` key | Meaning |
| --- | --- |
| \`coverage: "Partial"\` | the learner selected only part of the resolved unit |
| \`spelling: "Variant"\` | the selected spelling differs from the canonical shape in a licensed non-typo way |
| \`orthography: "Typo"\` | the learner selected an actual misspelling |

These flags are sparse. If there is no \`selectionFeatures\` bag, that means full coverage, ordinary orthography, and no marked spelling mismatch.

## Meaning, Features, And Where They Live

The classifier should keep the payload split cleanly:

- \`lemma\` stores the canonical lexical identity, its \`lemmaKind\`, its \`lemmaSubKind\`, its \`inherentFeatures\`, and \`meaningInEmojis\`
- \`surface\` stores the resolved full form and any \`inflectionalFeatures\`
- \`selection\` stores only the highlighted spelling plus any marked ingest-side deviations

This split matters in German because many tempting distinctions belong in different places.

\`hasGovPrep\`, \`hasSepPrefix\`, \`lexicallyReflexive\`, and \`verbType\` are lemma-level facts.

\`case\`, \`number\`, \`gender\`, \`degree\`, \`mood\`, \`tense\`, and \`verbForm\` are surface-level facts when they are actually encoded or recoverable for the attested form.

\`meaningInEmojis\` is lemma-level meaning for the selected unit itself, not for the larger scene around it.

## High-ROI German Feature Areas

The German pack does not try to encode every imaginable grammatical distinction. The high-value feature areas are the ones that repeatedly help disambiguate learner-facing payloads.

### Nominal Features

German noun-like entries use \`gender\` as an inherent lexical feature and commonly use \`case\` and \`number\` as inflectional features.

Agreement categories such as \`ADJ\`, \`DET\`, \`PRON\`, and attributive participles may also carry inflectional \`case\`, \`number\`, and \`gender\`.

Because German morphology is often syncretic, these features should be encoded only when the attested form or the local syntax really licenses them.

### Degree, Polarity, PronType, NumType

\`degree\` is used on German \`ADJ\` and \`ADV\`.

\`polarity\` is used on \`PART\`, especially for items like \`nicht\`.

\`pronType\` and \`numType\` are used where they do real classificatory work, especially for \`DET\`, \`PRON\`, \`ADV\`, \`NUM\`, and ordinal-like \`ADJ\`.

### Verbal Features

German \`VERB\` and \`AUX\` reuse a narrow UD-style verbal core:

- \`mood\`: \`Ind\`, \`Imp\`, \`Sub\`
- \`tense\`: \`Past\`, \`Pres\`
- \`verbForm\`: \`Fin\`, \`Inf\`, \`Part\`
- \`number\`, \`person\`
- participial \`gender\` where supported
- \`aspect: "Perf"\` on perfect participles where needed

The German pack also uses a small set of custom verbal features that matter a lot in classification:

- \`hasGovPrep\`
- \`hasSepPrefix\`
- \`lexicallyReflexive\`
- \`verbType: "Mod"\`

For participles, keep the layer distinction sharp:

- attributive participles with adjectival agreement normally classify as \`ADJ\`
- bare or predicative Partizip-II forms normally classify as \`VERB\`
- fully lexicalized adjectives can still stay \`ADJ\` regardless of historical participial origin

### German-Specific And Layered Features

Some distinctions are German-specific or model-specific rather than plain UD inventory:

- \`governedCase\` on adpositions
- \`discourseFormulaRole\` on discourse formulas
- \`gender[psor]\` and \`number[psor]\` on possessive determiners when the possessor features are actually disambiguated
- \`historicalStatus: "Archaic"\` on surfaces when that status is explicitly modeled

These should not be sprayed onto entries by default. They exist to record real learner-facing distinctions, not to make the payload look complete.

## Scope

This section defines the classifier's terms.

It does not define German dependency syntax, argument structure, or tokenization policy in treebank detail.

It also does not try to settle every German edge case here. Topic-specific rule pages can be added later. The job of this page is simpler: make the classifier's vocabulary unambiguous before any topic rules start using it.
`,
});

export default document;
