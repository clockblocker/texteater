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
];

/**
 * The classes of German identity split an ADR or Rule decides. Each names
 * what may differ, so a split outside it stays Unexplained. This is not a
 * list of approved homographs: a form appears only where a Rule or ADR
 * decides that form's split.
 */
export const germanSplitRulings: readonly SplitRuling[] = [
	// The referent may choose only between cells that differ in who is
	// meant, so gender never splits a pillar cell alone: ihm, seiner, dem and
	// dessen are one cell each, with gender null (ADR 0044).
	{
		split: "Each cell of the personal-pronoun pillar is its own Lemma",
		adrs: ["ADR-0044", "ADR-0032"],
		rules: ["de/core-features-are-identity"],
		both: { kind: ["PRON"], pronType: ["Prs"], poss: [null] },
		varies: [
			{ key: "case" },
			{ key: "gender", onlyWith: "case" },
			{ key: "gender", onlyWith: "number" },
			{ key: "gender", onlyWith: "person" },
			{ key: "number" },
			{ key: "person" },
			// Formal Sie and 3pl sie differ in polite alone (ADR 0044).
			{ key: "polite", values: [null, "Form"] },
			{ key: "polite", onlyWith: "person" },
		],
	},
	{
		split: "Each cell of the der-series pillar is its own Lemma",
		adrs: ["ADR-0044", "ADR-0032"],
		rules: ["de/core-features-are-identity"],
		forms: derSeries,
		both: { kind: ["PRON"] },
		varies: [
			{ key: "case" },
			{ key: "gender", onlyWith: "case" },
			{ key: "gender", onlyWith: "number" },
			{ key: "number" },
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
];

/** The German forms whose split an open grilling decides. */
export const germanOpenSplits: readonly OpenSplit[] = [
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
