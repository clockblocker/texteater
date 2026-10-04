import type { OpenSplit, SplitRuling } from "../../worklist/identity-splits.js";

const derSeries = [
	"der",
	"die",
	"das",
	"dem",
	"den",
	"dessen",
	"deren",
	"denen",
];

/**
 * The classes of German identity split an ADR or Rule decides. Each names
 * what may differ, so a split outside it stays Unexplained. This is not a
 * list of approved homographs: a form appears only where a Rule or ADR
 * decides that form's split.
 */
export const germanSplitRulings: readonly SplitRuling[] = [
	// The referent chooses between pillar cells that differ only in gender,
	// number or politeness, and a referent no text settles attests their
	// Syncretism, whose syncretic list keeps it apart from each cell (ADR
	// 0044, ADR 0046).
	{
		split: "Each cell of the personal-pronoun pillar is its own Lemma",
		adrs: ["ADR-0044", "ADR-0032", "ADR-0046"],
		rules: ["de/core-features-are-identity", "de/open-referent"],
		both: { kind: ["PRON"], pronType: ["Prs"], poss: [null] },
		varies: [
			{ key: "case" },
			{ key: "gender" },
			{ key: "number" },
			{ key: "person" },
			// Formal Sie and 3pl sie differ in polite alone (ADR 0044).
			{ key: "polite", values: [null, "Form"] },
			{ key: "polite", onlyWith: "person" },
			{ key: "syncretic" },
		],
	},
	{
		split: "Each cell of the der-series pillar is its own Lemma",
		adrs: ["ADR-0044", "ADR-0032", "ADR-0046"],
		rules: ["de/core-features-are-identity", "de/open-referent"],
		forms: derSeries,
		both: { kind: ["PRON"] },
		varies: [
			{ key: "case" },
			{ key: "gender" },
			{ key: "number" },
			{ key: "syncretic" },
		],
	},
	{
		split: "der-series demonstratives and relatives are separate Lemmas",
		adrs: ["ADR-0044"],
		rules: [],
		forms: derSeries,
		both: { kind: ["PRON"] },
		varies: [{ key: "pronType", values: ["Dem", "Rel"] }],
	},
	{
		split: "wer and was are each one Lemma for Int and one for Rel",
		adrs: ["ADR-0044"],
		rules: ["de/core-features-are-identity"],
		forms: ["wer", "was"],
		both: { kind: ["PRON"] },
		varies: [{ key: "pronType", values: ["Int", "Rel"] }],
	},
	// Duden gives interrogative and relative welcher separate headwords, so
	// they stay two Lemmas; each w-adverb has one and is one Lemma (#766).
	{
		split: "Interrogative and relative welcher are separate DET Lemmas",
		adrs: ["ADR-0032"],
		rules: [],
		forms: ["welcher"],
		both: { kind: ["DET"] },
		varies: [{ key: "pronType", values: ["Int", "Rel"] }],
	},
	{
		split: "A pronoun standing for a noun phrase is PRON, one modifying a noun DET",
		adrs: [],
		rules: ["de/pron-or-det-by-use"],
		both: { kind: ["PRON", "DET"] },
		varies: [{ key: "kind", values: ["PRON", "DET"] }],
	},
	{
		split: "beide after a determiner is ADJ; before a noun without one it is DET",
		adrs: [],
		rules: ["de/pron-or-det-by-use"],
		forms: ["beide"],
		both: { kind: ["ADJ", "DET"] },
		varies: [
			{ key: "kind", values: ["ADJ", "DET"] },
			{ key: "pronType", values: [null, "Tot"], onlyWith: "kind" },
			{ key: "comparable", onlyWith: "kind" },
		],
	},
	{
		split: "A personal pronoun's cell and the possessive of the same spelling are separate Lemmas",
		adrs: ["ADR-0044"],
		rules: ["de/core-features-are-identity"],
		both: { kind: ["PRON", "DET"], pronType: ["Prs"] },
		varies: [
			{ key: "poss", values: [null, "Yes"] },
			{ key: "kind", values: ["PRON", "DET"], onlyWith: "poss" },
			{ key: "case", onlyWith: "poss" },
			{ key: "gender", onlyWith: "poss" },
			{ key: "number", onlyWith: "poss" },
			{ key: "person", onlyWith: "poss" },
			{ key: "polite", onlyWith: "poss" },
		],
	},
	{
		split: "sein, haben, werden and bekommen are AUX only in their grammatical function",
		adrs: ["ADR-0026", "ADR-0022"],
		rules: [
			"de/auxiliary-joins-the-verb-it-serves",
			"de/recipient-passive",
		],
		both: { kind: ["VERB", "AUX"] },
		varies: [{ key: "kind", values: ["VERB", "AUX"] }],
	},
	{
		split: "A separable and an inseparable verb are separate Lemmas",
		adrs: ["ADR-0032"],
		rules: ["de/verb-core-features", "de/core-features-are-identity"],
		forms: ["umfahren", "übersetzen"],
		both: { kind: ["VERB"] },
		varies: [{ key: "hasSepPrefix" }],
	},
	{
		split: "Nouns that differ in gender are separate Lemmas",
		adrs: ["ADR-0032"],
		rules: ["de/core-features-are-identity"],
		forms: ["Band", "Kiefer", "Leiter"],
		both: { kind: ["NOUN"] },
		varies: [{ key: "gender" }],
	},
	{
		split: "A w-adverb asking or naming something in its clause is ADV, SCONJ or CCONJ when it only links",
		adrs: [],
		rules: ["de/relative-w-adverb-fills-a-slot"],
		forms: ["wo", "wie", "wann", "warum"],
		varies: [{ key: "kind", values: ["ADV", "SCONJ", "CCONJ"] }],
	},
	{
		split: "Comparison als is CCONJ before a phrase and SCONJ before a clause",
		adrs: [],
		rules: ["de/comparison-als"],
		forms: ["als"],
		varies: [{ key: "kind", values: ["CCONJ", "SCONJ"] }],
	},
	{
		split: "A one-word routine formula is an INTJ apart from the noun",
		adrs: ["ADR-0039"],
		rules: ["de/routine-formula-is-intj"],
		forms: ["Entschuldigung"],
		varies: [
			{ key: "kind", values: ["NOUN", "INTJ"] },
			{ key: "gender", values: [null, "Fem"] },
		],
	},
	{
		split: "Case splits no Lemma; where it tells words apart, Kind does",
		adrs: ["ADR-0002"],
		rules: [
			"de/canonical-form-is-the-headword",
			"de/substantivized-infinitive-is-a-noun",
		],
		forms: ["Morgen", "Sprechen"],
		both: { kind: ["NOUN", "ADV", "VERB"] },
		varies: [
			{ key: "kind", values: ["NOUN", "ADV", "VERB"] },
			{ key: "gender", onlyWith: "kind" },
		],
	},
	{
		split: "Formal Sie and Ihr- differ from sie, ihr and ihr- by Core, not by case",
		adrs: ["ADR-0002", "ADR-0044"],
		rules: ["de/core-features-are-identity"],
		both: { pronType: ["Prs"] },
		// Formal address is the third person plural with polite Form, so
		// politeness alone may tell it apart (ADR 0044).
		varies: [
			{ key: "person", onlyWith: "polite" },
			{ key: "polite", values: [null, "Form"] },
			{ key: "polite", onlyWith: "person" },
		],
	},
	// German PART is closed: nicht, infinitive zu and the authored modal
	// particles (#734). The same spelling used otherwise is another word.
	{
		split: "A modal particle is PART Mod; the same spelling as a focus, degree, temporal or sentence adverb is ADV, as an adjective ADJ, joining clauses CCONJ and answering INTJ",
		adrs: ["ADR-0021"],
		rules: [
			"de/modal-particle-is-part",
			"de/focus-word-is-adv",
			"de/aber-is-cconj",
			"de/adjective-stays-adj",
			"de/interjection-counts-its-words",
		],
		forms: [
			"aber",
			"auch",
			"bloß",
			"denn",
			"doch",
			"eben",
			"eigentlich",
			"einfach",
			"einmal",
			"etwa",
			"halt",
			"ja",
			"mal",
			"nur",
			"ruhig",
			"schon",
			"vielleicht",
			"wohl",
		],
		both: { kind: ["PART", "ADV", "ADJ", "CCONJ", "INTJ"] },
		varies: [
			{ key: "kind", values: ["PART", "ADV", "ADJ", "CCONJ", "INTJ"] },
			{ key: "partType", values: [null, "Mod", "Res"], onlyWith: "kind" },
			{ key: "comparable", onlyWith: "kind" },
		],
	},
	{
		split: "A sense no attributive form has is ADV apart from the ADJ: degree ganz, früh 'in the morning' and the sentence adverbs",
		adrs: ["ADR-0036"],
		rules: ["de/adjective-stays-adj", "de/degree-word-is-adv"],
		forms: [
			"ganz",
			"früh",
			"voll",
			"recht",
			"offenbar",
			"wahrscheinlich",
			"natürlich",
			"wirklich",
			"eigentlich",
		],
		both: { kind: ["ADV", "ADJ"] },
		varies: [
			{ key: "kind", values: ["ADV", "ADJ"] },
			{ key: "comparable", onlyWith: "kind" },
		],
	},
	{
		split: "zu is ADP as a preposition, PART Inf before an infinitive and ADV as a degree word",
		adrs: [],
		rules: ["de/bare-infinitive-zu", "de/degree-word-is-adv"],
		forms: ["zu"],
		varies: [
			{ key: "kind", values: ["ADP", "PART", "ADV"] },
			{ key: "partType", values: [null, "Inf"], onlyWith: "kind" },
		],
	},
	{
		split: "viel, wenig, mehr and meist are ADJ after a determiner, PRON for a noun phrase, DET before a noun and ADV used adverbially",
		adrs: ["ADR-0042"],
		rules: ["de/quantifier-by-use"],
		forms: ["viel", "wenig", "meist"],
		both: { kind: ["ADJ", "PRON", "DET", "ADV"] },
		varies: [
			{ key: "kind", values: ["ADJ", "PRON", "DET", "ADV"] },
			{ key: "pronType", values: [null, "Ind"], onlyWith: "kind" },
			{ key: "comparable", onlyWith: "kind" },
		],
	},
	// #743 settled mehr 'any longer' after a negation (nicht mehr so drohend,
	// BT-B5) as Duden's Adverb mehr, a word apart from the quantifier.
	{
		split: "Quantifier mehr for a noun phrase is PRON; mehr 'any longer' after a negation is Duden's Adverb mehr",
		adrs: [],
		rules: ["de/quantifier-by-use"],
		forms: ["mehr"],
		both: { kind: ["PRON", "ADV"] },
		varies: [
			{ key: "kind", values: ["PRON", "ADV"] },
			{ key: "pronType", values: [null, "Ind"], onlyWith: "kind" },
		],
	},
];

/** The German forms whose split an open grilling decides. */
export const germanOpenSplits: readonly OpenSplit[] = [];
