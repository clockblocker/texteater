import type { OpenSplit, SplitRuling } from "./identity-splits.js";

const derSeries = [
	"der",
	"die",
	"das",
	"dem",
	"den",
	"dessen",
	"deren",
	"denen",
	"derer",
];

/**
 * The classes of German identity split an ADR or Rule decides. Each names
 * what may differ, so a split outside it stays Unexplained. This is not a
 * list of approved homographs: a form appears only where a Rule or ADR
 * decides that form's split.
 */
export const germanSplitRulings: readonly SplitRuling[] = [
	{
		split: "Each cell of the personal-pronoun pillar is its own Lemma",
		adrs: ["ADR-0044", "ADR-0032"],
		rules: ["de/core-features-are-identity"],
		both: { kind: ["PRON"], pronType: ["Prs"], poss: [null] },
		varies: [
			{ key: "case" },
			{ key: "gender" },
			{ key: "number" },
			{ key: "person" },
			{ key: "polite", onlyWith: "person" },
		],
	},
	{
		split: "Each cell of the der-series pillar is its own Lemma",
		adrs: ["ADR-0044", "ADR-0032"],
		rules: ["de/core-features-are-identity"],
		forms: derSeries,
		both: { kind: ["PRON"] },
		varies: [{ key: "case" }, { key: "gender" }, { key: "number" }],
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
		split: "Attributive dessen, deren and wessen take extPos DET",
		adrs: ["ADR-0044"],
		rules: ["de/pron-or-det-by-use"],
		forms: ["dessen", "deren", "wessen"],
		both: { kind: ["PRON"] },
		varies: [{ key: "extPos", values: [null, "DET"] }],
	},
	{
		split: "wer and was are each one Lemma for Int and one for Rel",
		adrs: ["ADR-0044"],
		rules: ["de/core-features-are-identity"],
		forms: ["wer", "was"],
		both: { kind: ["PRON"] },
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
			{ key: "polite", onlyWith: "person" },
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
		split: "A w-adverb is Int in a question, Rel when it names something in its clause, SCONJ or CCONJ when it only links",
		adrs: [],
		rules: ["de/relative-w-adverb-fills-a-slot"],
		forms: ["wo", "wie", "wann", "warum"],
		varies: [
			{ key: "kind", values: ["ADV", "SCONJ", "CCONJ"] },
			{ key: "pronType", values: [null, "Int", "Rel"] },
			{ key: "conjType", values: [null, "Comp"] },
		],
	},
	{
		split: "Comparison als is CCONJ before a phrase and SCONJ before a clause",
		adrs: [],
		rules: ["de/comparison-als"],
		forms: ["als"],
		varies: [
			{ key: "kind", values: ["CCONJ", "SCONJ"] },
			{ key: "conjType", values: [null, "Comp"] },
		],
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
];

/** The German forms whose split an open grilling decides. */
export const germanOpenSplits: readonly OpenSplit[] = [
	{
		forms: ["wegen", "entlang", "gegenüber"],
		issue: 733,
		question:
			"Is adpType identity when the adposition stands before or after its noun?",
	},
	{
		forms: [
			"sehr",
			"gar",
			"ja",
			"doch",
			"nur",
			"bloß",
			"eigentlich",
			"denn",
			"aber",
			"ganz",
			"früh",
			"wenig",
			"zu",
		],
		issue: 734,
		question:
			"PART, ADV or INTJ for degree, modal, focus and answer words; must every PART name its type?",
	},
	{
		forms: ["anstatt", "ohne", "sodass", "so dass"],
		issue: 735,
		question:
			"Are the X dass conjunctions Locution SCONJ; does ADP keep extPos SCONJ?",
	},
	{
		forms: ["ihm"],
		issue: 743,
		findings: ["K-A1"],
		question:
			"Referent-decided pronoun cells: does ADR 0044's Masc/Neut split stand?",
	},
	{
		forms: ["viel"],
		issue: 743,
		findings: ["K-A7"],
		question: "viel by use: ADJ after a determiner, adverbial viel",
	},
	{
		forms: ["es"],
		issue: 743,
		findings: ["M-A2", "K-B12"],
		question: "Expletive, object and anticipatory es",
	},
	{
		forms: ["mehr"],
		issue: 743,
		findings: ["M-B5"],
		question: "nicht mehr: ADV mehr, sehr Cmp, or Locution nicht mehr",
	},
];
