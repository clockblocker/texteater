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

But the classifier is not building a dependency tree. It is resolving a learner click to the grammatical unit that best explains the text in context.

That is why German dumling can classify:

- [\`zum\`](/de/selection/djEseCx6dW0scyxjLHp1bSxsLGRlLGMsZnVzLHp1bSzinqHvuI8s/) as \`Construction/Fusion\`
- [\`Bahnhof\`](/de/selection/djEseCxCYWhuaG9mLGNvdj1wLHMsYyxudXIgYmFobmhvZiB2ZXJzdGVoZW4sbCxkZSxwLGlkLG51ciBiYWhuaG9mIHZlcnN0ZWhlbizinZMs/) through a discontinuous Surface occurrence of the idiom \`nur Bahnhof verstehen\`
- [\`auf\`](/de/selection/djEseCxhdWYsY292PXAscyxpLHBhc3MgYXVmLG1vPWltfG51PXN8cGU9cDJ8dmY9ZixsLGRlLGwsdixhdWZwYXNzZW4s8J-RgCxoZ3A9fmF1Znxoc3A9fmF1Zg/) in \`Pass [auf] dich auf!\` as part of the verbal payload for \`aufpassen\`

The main question is therefore not "which token label would UD assign in isolation?" but "which dumling payload best explains the learner-facing unit in this sentence?"

## Core Objects

Every attested German answer has three layers:

| Layer | Role |
| --- | --- |
| \`Selection\` | sentence-local evidence for one clicked \`ResolvableText\` Segment |
| \`Surface\` | the normalized grammatical realization resolved in context |
| \`Lemma\` | normalized grammatical identity behind that Surface |

The direction is one-way:

\`SegmentedSentence + clickedSegmentIndex -> Selection -> Surface -> Lemma\`

Each click has its own Selection identity, even when several clicks resolve to
the same Surface. The Selection also records every Segment index participating
in that Surface occurrence.

That is why clicking either \`auf\` in \`Pass auf dich auf!\` creates a distinct
Selection while both Selections can resolve to the same verbal Surface
\`pass auf\` and the same Lemma \`aufpassen\`.

## Lemma Families

German uses the four public dumling Lemma families:

| \`family\` | German \`kind\` values |
| --- | --- |
| \`Lexeme\` | \`ADJ\`, \`ADP\`, \`ADV\`, \`AUX\`, \`CCONJ\`, \`DET\`, \`INTJ\`, \`NOUN\`, \`NUM\`, \`PART\`, \`PRON\`, \`PROPN\`, \`PUNCT\`, \`SCONJ\`, \`SYM\`, \`VERB\`, \`X\` |
| \`Morpheme\` | \`Circumfix\`, \`Clitic\`, \`Duplifix\`, \`Infix\`, \`Interfix\`, \`Prefix\`, \`Root\`, \`Suffix\`, \`Suffixoid\`, \`ToneMarking\`, \`Transfix\` |
| \`Phraseme\` | \`Aphorism\`, \`DiscourseFormula\`, \`Idiom\`, \`Proverb\` |
| \`Construction\` | \`Fusion\`, \`PairedFrame\` |

These families are not interchangeable.

\`Lexeme\` is for ordinary word-level Lemmas.

\`Morpheme\` is for bound pieces such as [\`un-\`](/de/selection/djEseCxVbixjb3Y9cHxzcGw9dixzLGMsdW4tLGwsZGUsbSxwZix1bi0s8J-agCw/).

\`Phraseme\` is for learner-facing fixed expressions whose meaning belongs to the larger unit rather than to one token in isolation.

\`Construction\` is for patterned learner-facing Lemmas such as fused forms like \`zum\` and paired frames such as \`um zu\`.

## Surface Kinds And Click Evidence

Every surface is either \`Citation\` or \`Inflection\`.

\`Citation\` means the stored surface is already in citation or Grundform shape from the learner's perspective.

\`Inflection\` means the stored surface is an inflected form and carries \`inflectionalFeatures\`.

Examples:

- [\`Mutter\`](/de/selection/djEseCxNdXR0ZXIscyxjLG11dHRlcixsLGRlLGwsbixtdXR0ZXIs8J-RqSxnPWY/) is \`Citation\`
- [\`Kindern\`](/de/selection/djEseCxLaW5kZXJuLHMsaSxraW5kZXJuLGNhPWR8bnU9cCxsLGRlLGwsbixraW5kLPCfp5IsZz1u/) is \`Inflection\`
- [\`fünften\`](/de/selection/djEseCxmw7xuZnRlbixzLGksZsO8bmZ0ZW4sY2E9ZHxkZWc9cHxnPW18bnU9cyxsLGRlLGwsaixmw7xuZnRlLDXvuI_ig6MsbnQ9bw/) is \`Inflection\`

The current public model also imposes two important constraints:

- verbal \`Phraseme\` Surfaces may be inflected and may mark
  \`realizationCoverage: "Partial"\`
- \`Construction\` Lemmas are citation-only and currently featureless.

\`Selection\` records sentence-local clicked evidence:

| Field | Meaning |
| --- | --- |
| \`segmentedSentenceId\` | immutable identity of the pre-segmented sentence |
| \`clickedSegmentIndex\` | the local \`ResolvableText\` Segment the learner clicked |
| \`surfaceSegmentIndices\` | every segment participating in the Surface occurrence |
| \`attestedSurface\` | noisy text across those participating segments |
| \`selectedOrthography\` | \`Standard\` or \`Typo\` for the clicked segment |

\`Surface.spelling\` owns canonical versus licensed variant spelling.
\`Surface.realizationCoverage\` owns full versus partial realization.

## Identity, Features, And Where They Live

The classifier should keep the payload split cleanly:

- \`Lemma\` stores grammatical identity: canonical form, family, kind, and core features
- \`Surface\` stores normalized form, spelling, realization coverage, inflection, and Lemma identity
- \`Selection\` stores sentence-local clicked evidence

This split matters in German because many tempting distinctions belong in different places.

\`hasGovPrep\`, \`hasSepPrefix\`, \`lexicallyReflexive\`, and \`verbType\` are Lemma-level facts.

\`case\`, \`number\`, \`gender\`, \`degree\`, \`mood\`, \`tense\`, and \`verbForm\` are surface-level facts when they are actually encoded or recoverable for the attested form.

Learner semantic identity is a Reading—one Lemma plus one emoji description—resolved above Dumling and is not stored in these DTOs.

## High-ROI German Feature Areas

The German pack does not try to encode every imaginable grammatical distinction. The high-value feature areas are the ones that repeatedly help disambiguate learner-facing payloads.

### Nominal Features

German noun-like Lemmas use \`gender\` as a core grammatical feature and commonly use \`case\` and \`number\` as inflectional features.

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

These should not be sprayed onto Lemmas by default. They exist to record real learner-facing distinctions, not to make the payload look complete.

## Scope

This section defines the classifier's terms.

It does not define German dependency syntax, argument structure, or tokenization policy in treebank detail.

It also does not try to settle every German edge case here. Topic-specific rule pages can be added later. The job of this page is simpler: make the classifier's vocabulary unambiguous before any topic rules start using it.
`,
});

export default document;
