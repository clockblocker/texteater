import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import {
	addCaseEvidence,
	resolved,
	type Segment,
	sentence,
	unresolved,
} from "./builders";
import { evidence, IDS, udPartOfSpeech } from "./sources";

const repeated = sentence(["Sie", "steht", "auf", "dem", "Platz", "auf"]);
const overlap = sentence([
	"Er",
	"stellt",
	"eine",
	"Frage",
	"und",
	"stellt",
	"die",
	"Vase",
	"ab",
]);
const partial = sentence(["Er", "brach", "das"], "…");
const typo = sentence(["Er", "stet", "morgen", "auf"]);
const punctuation = sentence(["Ach", "er", "steht", "wirklich", "auf"], "?!");
const diagnosticRepeated = sentence([
	"Sie",
	"kommt",
	"an",
	"der",
	"Haltestelle",
	"an",
]);
const diagnosticPunctuation = sentence(
	["Er", "hört", "trotz", "des", "Lärms", "auf"],
	"?!",
);
const diagnosticOverlap = sentence([
	"Sie",
	"schaltet",
	"das",
	"Licht",
	"an",
	"und",
	"schaltet",
	"es",
	"später",
	"aus",
]);
const demonstrationQuestionSeparable = sentence(
	["Findet", "das", "Treffen", "morgen", "statt"],
	"?",
);
const demonstrationTypoSeparable = sentence(["Er", "mact", "morgen", "mit"]);
const AUFSTEHEN_CONTAMINATION_KEY = "target-lexical-unit:aufstehen";
const STATTFINDEN_CONTAMINATION_KEY = "target-lexical-unit:stattfinden";
const MITMACHEN_TYPO_CONTAMINATION_KEY =
	"target-lexical-unit:mitmachen:finite-typo";
const ANKOMMEN_CONTAMINATION_KEY = "target-lexical-unit:ankommen";
const AUFHOEREN_CONTAMINATION_KEY = "target-lexical-unit:aufhoeren";
const AUSSCHALTEN_CONTAMINATION_KEY = "target-lexical-unit:ausschalten";
const long = sentence([
	"Obwohl",
	"die",
	"überraschend",
	"ausführliche",
	"Einleitung",
	"mit",
	"vielen",
	"freien",
	"Zusätzen",
	"und",
	"mehreren",
	"Nebensätzen",
	"gestern",
	"noch",
	"verwirrend",
	"wirkte",
	"wird",
	"der",
	"entscheidende",
	"Punkt",
	"am",
	"Ende",
	"von",
	"allen",
	"aufmerksamen",
	"Lesern",
	"sofort",
	"verstanden",
]);
const opaque: Segment[] = [
	{ kind: "ResolvableText", text: "Er" },
	{ kind: "Whitespace", text: " " },
	{ kind: "OpaqueText", text: "[???]" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "schläft" },
	{ kind: "Whitespace", text: " " },
	{ kind: "OpaqueText", text: "🜁🜂" },
	{ kind: "Punctuation", text: "." },
];

function aufstehenVariant<const GoldenCase extends object>(
	goldenCase: GoldenCase,
) {
	return {
		...goldenCase,
		contaminationKeys: [AUFSTEHEN_CONTAMINATION_KEY],
	};
}

const cases = {
	"target-de-core-unresolved-qzxv": {
		...unresolved(sentence(["Er", "sagt", "qzxv"], "?"), 4),
		contaminationKeys: ["target-stimulus:qzxv"],
	},
	"target-de-robust-repeated-click-steht": aufstehenVariant(
		resolved(repeated, 2, [2, 10], "Lexeme", "VERB"),
	),
	"target-de-robust-repeated-click-final-auf": aufstehenVariant(
		resolved(repeated, 10, [2, 10], "Lexeme", "VERB"),
	),
	"target-de-robust-repeated-near-first-auf": aufstehenVariant(
		resolved(repeated, 4, [4], "Lexeme", "ADP"),
	),

	"target-de-robust-overlap-collocation-click-stellt": resolved(
		overlap,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-overlap-collocation-click-eine": resolved(
		overlap,
		4,
		[4],
		"Lexeme",
		"DET",
	),
	"target-de-robust-overlap-collocation-click-frage": resolved(
		overlap,
		6,
		[6],
		"Lexeme",
		"NOUN",
	),
	"target-de-robust-overlap-separable-click-stellt": resolved(
		overlap,
		10,
		[10, 16],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-overlap-separable-click-ab": resolved(
		overlap,
		16,
		[10, 16],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-overlap-near-vase": resolved(
		overlap,
		14,
		[14],
		"Lexeme",
		"NOUN",
	),

	"target-de-robust-partial-click-brach": resolved(
		partial,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-partial-click-das": resolved(
		partial,
		4,
		[4],
		"Lexeme",
		"DET",
	),
	"target-de-robust-typo-click-stet": aufstehenVariant(
		resolved(typo, 2, [2, 6], "Lexeme", "VERB"),
	),
	"target-de-robust-typo-click-auf": aufstehenVariant(
		resolved(typo, 6, [2, 6], "Lexeme", "VERB"),
	),
	"target-de-robust-slang": resolved(
		sentence(["Das", "ist", "sus"]),
		4,
		[4],
		"Lexeme",
		"ADJ",
	),
	"target-de-robust-opaque-surroundings": resolved(
		opaque,
		4,
		[4],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-punctuation-click-steht": aufstehenVariant(
		resolved(punctuation, 4, [4, 8], "Lexeme", "VERB"),
	),
	"target-de-robust-punctuation-click-auf": aufstehenVariant(
		resolved(punctuation, 8, [4, 8], "Lexeme", "VERB"),
	),
	"target-de-diagnostic-repeated-click-kommt": {
		...resolved(diagnosticRepeated, 2, [2, 10], "Lexeme", "VERB"),
		contaminationKeys: [ANKOMMEN_CONTAMINATION_KEY],
	},
	"target-de-diagnostic-repeated-click-final-an": {
		...resolved(diagnosticRepeated, 10, [2, 10], "Lexeme", "VERB"),
		contaminationKeys: [ANKOMMEN_CONTAMINATION_KEY],
	},
	"target-de-diagnostic-repeated-near-first-an": {
		...resolved(diagnosticRepeated, 4, [4], "Lexeme", "ADP"),
		contaminationKeys: [ANKOMMEN_CONTAMINATION_KEY],
	},
	"target-de-diagnostic-punctuation-click-hoert": {
		...resolved(diagnosticPunctuation, 2, [2, 10], "Lexeme", "VERB"),
		contaminationKeys: [AUFHOEREN_CONTAMINATION_KEY],
	},
	"target-de-diagnostic-punctuation-click-auf": {
		...resolved(diagnosticPunctuation, 10, [2, 10], "Lexeme", "VERB"),
		contaminationKeys: [AUFHOEREN_CONTAMINATION_KEY],
	},
	"target-de-diagnostic-overlap-click-second-schaltet": {
		...resolved(diagnosticOverlap, 12, [12, 18], "Lexeme", "VERB"),
		contaminationKeys: [AUSSCHALTEN_CONTAMINATION_KEY],
	},
	"target-de-diagnostic-overlap-click-aus": {
		...resolved(diagnosticOverlap, 18, [12, 18], "Lexeme", "VERB"),
		contaminationKeys: [AUSSCHALTEN_CONTAMINATION_KEY],
	},
	"target-de-demo-question-stattfinden-click-findet": {
		...resolved(
			demonstrationQuestionSeparable,
			0,
			[0, 8],
			"Lexeme",
			"VERB",
		),
		contaminationKeys: [STATTFINDEN_CONTAMINATION_KEY],
	},
	"target-de-demo-question-stattfinden-click-statt": {
		...resolved(
			demonstrationQuestionSeparable,
			8,
			[0, 8],
			"Lexeme",
			"VERB",
		),
		contaminationKeys: [STATTFINDEN_CONTAMINATION_KEY],
	},
	"target-de-demo-typo-mitmachen-click-mact": {
		...resolved(demonstrationTypoSeparable, 2, [2, 6], "Lexeme", "VERB"),
		contaminationKeys: [MITMACHEN_TYPO_CONTAMINATION_KEY],
	},
	"target-de-demo-typo-mitmachen-click-mit": {
		...resolved(demonstrationTypoSeparable, 6, [2, 6], "Lexeme", "VERB"),
		contaminationKeys: [MITMACHEN_TYPO_CONTAMINATION_KEY],
	},
	"target-de-robust-long-click-wird": resolved(
		long,
		32,
		[32, 54],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-long-click-verstanden": resolved(
		long,
		54,
		[32, 54],
		"Lexeme",
		"VERB",
	),
	"target-de-robust-unresolved": unresolved(
		sentence(["Er", "sagt", "xqzvrrt"], "?"),
		4,
	),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const robustnessCases = defineGoldenCaseCollection(import.meta.url, {
	cases: addCaseEvidence(cases, robustnessEvidence),
});

function robustnessEvidence(caseId: string): string {
	if (caseId.includes("demo-typo-mitmachen")) {
		return evidence(
			IDS.separableVerb,
			"The complete sentence makes mact an obvious finite-stem typo for macht. Issue #82 still groups the objectless final particle mit with that stem as one separable Lexeme/VERB.",
		);
	}
	if (caseId.includes("demo-question-stattfinden")) {
		return evidence(
			IDS.separableVerb,
			"IDS establishes the detached-prefix category fact. Issue #82 groups findet and statt as one Lexeme/VERB in the question while excluding the question mark from membership.",
		);
	}
	if (caseId.includes("unresolved")) {
		return evidence(
			udPartOfSpeech("X"),
			"UD reserves X for material that cannot receive a more informative part of speech, while current Dumgen policy ordinarily keeps unintelligible material upstream as OpaqueText. No observable category fact licenses qzxv or xqzvrrt as a particular Family/Kind; under issue #82, the clicked ResolvableText therefore has no defensible route, and Unresolved carries no guessed route or membership.",
		);
	}
	if (caseId.includes("overlap-collocation")) {
		return evidence(
			IDS.questionSupportVerb,
			"IDS explicitly lists eine Frage stellen as a meaning unit. Revised issue #82 high-level policy nevertheless keeps its non-idiomatic members separate: the clicked stellt, eine, or Frage is respectively Lexeme/VERB [2], Lexeme/DET [4], or Lexeme/NOUN [6], independently of the later abstellen occurrence.",
		);
	}
	if (caseId.includes("overlap-separable")) {
		return evidence(
			IDS.separableVerb,
			"IDS establishes the detached-prefix category fact. Issue #82 product policy maps only the second stellt and ab to Lexeme/VERB at exact original indices [10,16], independently of the earlier eine Frage stellen unit.",
		);
	}
	if (caseId.includes("overlap-near")) {
		return evidence(
			IDS.questionSupportVerb,
			"IDS identifies eine Frage stellen as the earlier conventional meaning unit, but revised issue #82 high-level policy keeps its non-idiomatic words separate. Vase likewise remains its own Lexeme/NOUN at exact original index [14], outside the later separable verb.",
		);
	}
	if (
		caseId.includes("repeated") ||
		caseId.includes("overlap-separable") ||
		caseId.includes("diagnostic-overlap") ||
		caseId.includes("typo") ||
		caseId.includes("punctuation")
	) {
		return evidence(
			IDS.separableVerb,
			"The complete sentence identifies the detached prefix and finite stem by occurrence index despite repetition, noise, or punctuation.",
		);
	}
	if (caseId.includes("partial")) {
		return evidence(
			IDS.idiomIce,
			"The IDS idiom study establishes literal and figurative das Eis brechen, but the truncated Er brach das… realizes neither complete expression. Issue #82's conservative partial-occurrence policy maps brach as Lexeme/VERB [2] or das as Lexeme/DET [4] rather than guessing fixed membership.",
		);
	}
	if (caseId.includes("long")) {
		return evidence(
			IDS.verbalPeriphrasis,
			"IDS establishes werden plus a full-verb participle as a passive verbal periphrasis. Issue #82 product policy maps the distant wird and verstanden to one Lexeme/VERB at exact original indices [32,54], excluding all intervening free context.",
		);
	}
	if (caseId.includes("slang")) {
		return evidence(
			udPartOfSpeech("ADJ"),
			"The intelligible slang loan sus is the predicative property word after ist, so Dumling's UD-inspired inventory assigns the informative Lexeme/ADJ route. Current Dumgen product policy does not use residual Lexeme/X for an established, syntactically classifiable loan.",
		);
	}
	return evidence(
		udPartOfSpeech("VERB"),
		"The complete surrounding sentence identifies schläft as Lexeme/VERB without absorbing the neighboring OpaqueText material.",
	);
}
