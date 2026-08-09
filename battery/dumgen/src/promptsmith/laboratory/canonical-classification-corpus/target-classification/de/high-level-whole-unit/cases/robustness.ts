import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import {
	addCaseEvidence,
	resolved,
	type Segment,
	sentence,
	unresolved,
} from "./builders";
import { evidence, IDS } from "./sources";

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
const AUFSTEHEN_CONTAMINATION_KEY = "target-lexical-unit:aufstehen";
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
		[2, 4, 6],
		"Phraseme",
		"Collocation",
	),
	"target-de-robust-overlap-collocation-click-eine": resolved(
		overlap,
		4,
		[2, 4, 6],
		"Phraseme",
		"Collocation",
	),
	"target-de-robust-overlap-collocation-click-frage": resolved(
		overlap,
		6,
		[2, 4, 6],
		"Phraseme",
		"Collocation",
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
		"X",
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
	if (caseId.includes("unresolved")) {
		return evidence(
			IDS.wordClasses,
			"IDS supplies the German word-class inventory but no observable category fact licenses qzxv or xqzvrrt as a particular Family/Kind. Under issue #82, the clicked ResolvableText therefore has no defensible route, and Unresolved carries no guessed route or membership.",
		);
	}
	if (caseId.includes("overlap-collocation")) {
		return evidence(
			IDS.questionSupportVerb,
			"IDS explicitly lists eine Frage stellen as a meaning unit. Issue #82 product policy maps the first stellt, eine, and Frage to Phraseme/Collocation at exact original indices [2,4,6], independently of the later abstellen occurrence.",
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
			"IDS identifies eine Frage stellen as the earlier meaning unit; it does not make Vase part of either verbal unit. Issue #82 product policy maps the clicked Vase alone to Lexeme/NOUN at exact original index [14].",
		);
	}
	if (
		caseId.includes("repeated") ||
		caseId.includes("overlap-separable") ||
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
	return evidence(
		IDS.wordClasses,
		"The complete surrounding sentence keeps the clicked occurrence classifiable without absorbing opaque, slang, or unrelated material.",
	);
}
