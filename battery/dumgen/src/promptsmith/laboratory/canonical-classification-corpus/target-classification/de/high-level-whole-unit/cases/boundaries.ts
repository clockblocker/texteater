import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { addCaseEvidence, resolved, sentence } from "./builders";
import { evidence, IDS } from "./sources";

const greeting = sentence(["Guten", "Morgen"], "!");
const demonstrationCollocation = sentence([
	"Der",
	"Ausschuss",
	"trifft",
	"eine",
	"Entscheidung",
]);
const demonstrationSeparable = sentence(["Fritz", "steht", "sofort", "auf"]);
const idiom = sentence(["Sie", "brach", "endlich", "das", "Eis"]);
const literalIce = sentence([
	"Sie",
	"brach",
	"das",
	"Eis",
	"für",
	"die",
	"Getränke",
]);
const governed = sentence(["Mara", "wartet", "auf", "den", "Bus"]);
const adjunct = sentence(["Mara", "läuft", "auf", "der", "Wiese"]);
const inherentReflexive = sentence(["Er", "schämt", "sich"]);
const optionalReflexive = sentence(["Er", "wäscht", "sich"]);
const separable = sentence(["Sie", "steht", "heute", "früh", "auf"]);
const multiMemberVerb = sentence(["Wir", "gehen", "abends", "spazieren"]);
const perfect = sentence(["Sie", "hat", "laut", "gelacht"]);
const future = sentence(["Sie", "wird", "morgen", "lachen"]);
const passive = sentence(["Sie", "wird", "von", "allen", "gelobt"]);
const modal = sentence(["Sie", "muss", "jetzt", "schlafen"]);
const copula = sentence(["Sie", "ist", "sehr", "müde"]);
const collocation = sentence([
	"Der",
	"Ausschuss",
	"trifft",
	"heute",
	"eine",
	"Entscheidung",
]);
const freeObject = sentence(["Der", "Kellner", "bringt", "eine", "Cola"]);
const fixedFunctionWords = sentence([
	"Sie",
	"heult",
	"mit",
	"den",
	"hungrigen",
	"Wölfen",
]);
const DECISION_TREFFEN_CONTAMINATION_KEY =
	"target-lexical-unit:eine-entscheidung-treffen";
const AUFSTEHEN_CONTAMINATION_KEY = "target-lexical-unit:aufstehen";

function contaminated<const GoldenCase extends object>(
	goldenCase: GoldenCase,
	contaminationKey: string,
) {
	return {
		...goldenCase,
		contaminationKeys: [contaminationKey],
	};
}

const cases = {
	"target-de-core-guten-morgen-click-guten": {
		...resolved(greeting, 0, [0, 2], "Phraseme", "DiscourseFormula"),
		contaminationKeys: ["target-stimulus:guten-morgen"],
	},
	"target-de-core-guten-morgen-click-morgen": {
		...resolved(greeting, 2, [0, 2], "Phraseme", "DiscourseFormula"),
		contaminationKeys: ["target-stimulus:guten-morgen"],
	},
	"target-de-core-entscheidung-click-entscheidung": {
		...resolved(
			demonstrationCollocation,
			8,
			[4, 6, 8],
			"Phraseme",
			"Collocation",
		),
		contaminationKeys: [DECISION_TREFFEN_CONTAMINATION_KEY],
	},
	"target-de-core-entscheidung-click-trifft": {
		...resolved(
			demonstrationCollocation,
			4,
			[4, 6, 8],
			"Phraseme",
			"Collocation",
		),
		contaminationKeys: [DECISION_TREFFEN_CONTAMINATION_KEY],
	},
	"target-de-core-entscheidung-click-eine": {
		...resolved(
			demonstrationCollocation,
			6,
			[4, 6, 8],
			"Phraseme",
			"Collocation",
		),
		contaminationKeys: [DECISION_TREFFEN_CONTAMINATION_KEY],
	},
	"target-de-core-aufstehen-click-steht": {
		...resolved(demonstrationSeparable, 2, [2, 6], "Lexeme", "VERB"),
		contaminationKeys: [AUFSTEHEN_CONTAMINATION_KEY],
	},
	"target-de-core-aufstehen-click-auf": {
		...resolved(demonstrationSeparable, 6, [2, 6], "Lexeme", "VERB"),
		contaminationKeys: [AUFSTEHEN_CONTAMINATION_KEY],
	},
	"target-de-boundary-idiom-click-brach": resolved(
		idiom,
		2,
		[2, 6, 8],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-idiom-click-das": resolved(
		idiom,
		6,
		[2, 6, 8],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-idiom-click-eis": resolved(
		idiom,
		8,
		[2, 6, 8],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-idiom-near-endlich": resolved(
		idiom,
		4,
		[4],
		"Lexeme",
		"ADV",
	),
	"target-de-boundary-literal-eis-click-brach": resolved(
		literalIce,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-literal-eis-click-eis": resolved(
		literalIce,
		6,
		[6],
		"Lexeme",
		"NOUN",
	),

	"target-de-boundary-governed-click-wartet": resolved(
		governed,
		2,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-governed-click-auf": resolved(
		governed,
		4,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-governed-near-bus": resolved(
		governed,
		8,
		[8],
		"Lexeme",
		"NOUN",
	),
	"target-de-boundary-adjunct-click-laeuft": resolved(
		adjunct,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-adjunct-click-auf": resolved(
		adjunct,
		4,
		[4],
		"Lexeme",
		"ADP",
	),
	"target-de-boundary-adjunct-click-wiese": resolved(
		adjunct,
		8,
		[8],
		"Lexeme",
		"NOUN",
	),

	"target-de-boundary-inherent-reflexive-click-schaemt": resolved(
		inherentReflexive,
		2,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-inherent-reflexive-click-sich": resolved(
		inherentReflexive,
		4,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-optional-reflexive-click-waescht": resolved(
		optionalReflexive,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-optional-reflexive-click-sich": resolved(
		optionalReflexive,
		4,
		[4],
		"Lexeme",
		"PRON",
	),

	"target-de-boundary-separable-click-steht": contaminated(
		resolved(separable, 2, [2, 8], "Lexeme", "VERB"),
		AUFSTEHEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-separable-click-auf": contaminated(
		resolved(separable, 8, [2, 8], "Lexeme", "VERB"),
		AUFSTEHEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-separable-near-heute": contaminated(
		resolved(separable, 4, [4], "Lexeme", "ADV"),
		AUFSTEHEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-multi-verb-click-gehen": resolved(
		multiMemberVerb,
		2,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-multi-verb-click-spazieren": resolved(
		multiMemberVerb,
		6,
		[2, 6],
		"Lexeme",
		"VERB",
	),

	"target-de-boundary-perfect-click-hat": resolved(
		perfect,
		2,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-perfect-click-gelacht": resolved(
		perfect,
		6,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-perfect-near-laut": resolved(
		perfect,
		4,
		[4],
		"Lexeme",
		"ADV",
	),
	"target-de-boundary-future-click-wird": resolved(
		future,
		2,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-future-click-lachen": resolved(
		future,
		6,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-passive-click-wird": resolved(
		passive,
		2,
		[2, 8],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-passive-click-gelobt": resolved(
		passive,
		8,
		[2, 8],
		"Lexeme",
		"VERB",
	),

	"target-de-boundary-modal-click-muss": resolved(
		modal,
		2,
		[2],
		"Lexeme",
		"AUX",
	),
	"target-de-boundary-modal-click-schlafen": resolved(
		modal,
		6,
		[6],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-copula-click-ist": resolved(
		copula,
		2,
		[2],
		"Lexeme",
		"AUX",
	),
	"target-de-boundary-copula-click-muede": resolved(
		copula,
		6,
		[6],
		"Lexeme",
		"ADJ",
	),

	"target-de-boundary-collocation-click-trifft": contaminated(
		resolved(collocation, 4, [4, 8, 10], "Phraseme", "Collocation"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-collocation-click-eine": contaminated(
		resolved(collocation, 8, [4, 8, 10], "Phraseme", "Collocation"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-collocation-click-entscheidung": contaminated(
		resolved(collocation, 10, [4, 8, 10], "Phraseme", "Collocation"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-collocation-near-heute": contaminated(
		resolved(collocation, 6, [6], "Lexeme", "ADV"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-free-object-click-bringt": resolved(
		freeObject,
		4,
		[4],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-free-object-click-cola": resolved(
		freeObject,
		8,
		[8],
		"Lexeme",
		"NOUN",
	),

	"target-de-boundary-fixed-function-click-heult": resolved(
		fixedFunctionWords,
		2,
		[2, 4, 6, 10],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-click-mit": resolved(
		fixedFunctionWords,
		4,
		[2, 4, 6, 10],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-click-den": resolved(
		fixedFunctionWords,
		6,
		[2, 4, 6, 10],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-click-woelfen": resolved(
		fixedFunctionWords,
		10,
		[2, 4, 6, 10],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-near-hungrigen": resolved(
		fixedFunctionWords,
		8,
		[8],
		"Lexeme",
		"ADJ",
	),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: addCaseEvidence(cases, boundaryEvidence),
});

function boundaryEvidence(caseId: string): string {
	if (caseId.includes("guten-morgen")) {
		return evidence(
			IDS.phraseolexeme,
			"IDS establishes the category-level fixed multiword criterion. IDS does not assign Dumgen's route or indices to Guten Morgen; issue #82 product policy treats this conventional greeting as Phraseme/DiscourseFormula and includes both fixed words.",
		);
	}
	if (caseId.includes("idiom") || caseId.includes("literal-eis")) {
		return evidence(
			IDS.idiomIce,
			"This IDS idiom study uses das Eis brechen to contrast literal and figurative readings. Issue #82 product policy selects Phraseme/Idiom only in the figurative occurrence and fixes the realized member indices; the literal control remains independently classified Lexemes.",
		);
	}
	if (caseId.includes("fixed-function")) {
		return evidence(
			IDS.wolvesExpression,
			"This IDS publication records mit den Wölfen heulen as a conventional expression. Its broader paremiological label does not determine Dumgen's occurrence route: issue #82 product policy classifies the inflected predicate here as Phraseme/Idiom, includes its fixed function words, and excludes the inserted adjective.",
		);
	}
	if (caseId.includes("governed") || caseId.includes("adjunct")) {
		return evidence(
			IDS.prepositionalGroup,
			"IDS explicitly uses warten auf as a verb-governed, non-exchangeable preposition and distinguishes freely selected adverbial PPs. Issue #82 product policy maps wartet and auf together at original indices [2,4], keeps Bus at [8], and keeps each clicked member of läuft auf der Wiese separate at [2], [4], or [8].",
		);
	}
	if (caseId.includes("reflexive")) {
		return evidence(
			IDS.reflexivePronoun,
			"IDS treats the pronoun of obligatorily reflexive verbs as lexically required, unlike an ordinary anaphoric object. Issue #82 product policy maps schämt and sich together at original indices [2,4], but keeps the contextual wäscht and sich targets separate at [2] and [4].",
		);
	}
	if (caseId.includes("separable") || caseId.includes("aufstehen")) {
		return evidence(
			IDS.separableVerb,
			"IDS analyzes aufstehen's detached stressed prefix and finite stem as one separable verb occurrence. Issue #82 product policy maps steht and auf to one Lexeme/VERB at original indices [2,8], while heute remains the separate Lexeme/ADV at [4].",
		);
	}
	if (caseId.includes("multi-verb")) {
		return evidence(
			IDS.walkingVerb,
			"The IDS verb-valency dictionary records spazieren gehen as one entry and gives the finite form geht spazieren. Issue #82's other-multi-member-verbs policy maps gehen and spazieren to one Lexeme/VERB at exact original indices [2,6].",
		);
	}
	if (
		caseId.includes("perfect") ||
		caseId.includes("future") ||
		caseId.includes("passive")
	) {
		return evidence(
			IDS.verbalPeriphrasis,
			"IDS analyzes haben/werden plus the relevant infinite full-verb form as perfect, future, or passive verbal periphrasis. Issue #82 product policy maps the realized auxiliary and lexical verb together at [2,6] for perfect/future and [2,8] for passive; the nearby adverb laut remains [4].",
		);
	}
	if (caseId.includes("modal")) {
		return evidence(
			IDS.modalVerb,
			"IDS explicitly lists müssen as a modal expressing necessity or conjecture and says a modal plus infinitive forms a verb complex. Issue #82 product policy nevertheless maps muss separately as Lexeme/AUX [2] and schlafen as Lexeme/VERB [6].",
		);
	}
	if (caseId.includes("copula")) {
		return evidence(
			IDS.copula,
			"IDS says sein is a copular verb that forms a predicate only with a predicative complement. Issue #82 product policy maps ist separately as Lexeme/AUX [2] and müde as Lexeme/ADJ [6].",
		);
	}
	if (caseId.includes("collocation") || caseId.includes("entscheidung")) {
		return evidence(
			IDS.functionVerbGroup,
			"IDS distinguishes a conventional support-verb predicate from an ordinary full verb plus object and notes that borderline cases are gradual. Issue #82 product policy treats this occurrence of eine Entscheidung treffen as Phraseme/Collocation and fixes its three lexical members; IDS does not supply Dumgen indices.",
		);
	}
	if (caseId.includes("free-object")) {
		return evidence(
			IDS.functionVerbGroup,
			"IDS uses eine Cola bringen as its ordinary full-verb-plus-object control. Issue #82 product policy therefore maps bringt as Lexeme/VERB [4] and Cola as the separate Lexeme/NOUN [8], with no guessed Collocation membership.",
		);
	}
	return evidence(
		IDS.walkingVerb,
		"The IDS verb-valency entry records spazieren gehen as one verbal entry. Issue #82 product policy maps gehen and spazieren to one Lexeme/VERB at exact original indices [2,6].",
	);
}
