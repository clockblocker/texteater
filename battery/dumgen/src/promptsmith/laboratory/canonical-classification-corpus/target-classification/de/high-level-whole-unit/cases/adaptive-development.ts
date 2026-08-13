import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { addCaseEvidence, resolved, sentence } from "./builders";
import { evidence, IDS, udPartOfSpeech } from "./sources";

const wederNoch = sentence([
	"Weder",
	"Regen",
	"noch",
	"Wind",
	"hält",
	"uns",
	"auf",
]);
const nichtNurSondernAuch = sentence([
	"Sie",
	"ist",
	"nicht",
	"nur",
	"klug",
	"sondern",
	"auch",
	"fleißig",
]);
const perfectFiller = sentence(["Nora", "hat", "gestern", "gewonnen"]);
const futureFiller = sentence(["Der", "Zug", "wird", "bald", "abfahren"]);
const passiveFiller = sentence([
	"Der",
	"Brief",
	"wurde",
	"sorgfältig",
	"geprüft",
]);
const separableFiller = sentence(["Das", "Licht", "geht", "plötzlich", "aus"]);
const toothIdiom = sentence([
	"Die",
	"Reporterin",
	"fühlte",
	"ihm",
	"gründlich",
	"auf",
	"den",
	"Zahn",
]);
const repeatedVor = sentence([
	"Er",
	"stellt",
	"sich",
	"vor",
	"dem",
	"Publikum",
	"vor",
]);

const WEDER_NOCH_KEY = "target-construction:paired-frame:weder-noch";
const NICHT_NUR_SONDERN_AUCH_KEY =
	"target-construction:paired-frame:nicht-nur-sondern-auch";
const TOOTH_IDIOM_KEY = "target-lexical-unit:jemandem-auf-den-zahn-fuehlen";
const VORSTELLEN_KEY =
	"target-lexical-unit:sich-vorstellen:repeated-preposition";

function keyed<const GoldenCase extends object>(
	goldenCase: GoldenCase,
	contaminationKey: string,
) {
	return { ...goldenCase, contaminationKeys: [contaminationKey] };
}

const cases = {
	"target-de-adaptive-fusion-beim": keyed(
		resolved(
			sentence(["Wir", "warten", "beim", "Seiteneingang"]),
			4,
			[4],
			"Construction",
			"Fusion",
		),
		"target-construction:fusion:beim",
	),
	"target-de-adaptive-fusion-vom": keyed(
		resolved(
			sentence(["Lina", "kommt", "vom", "Wochenmarkt"]),
			4,
			[4],
			"Construction",
			"Fusion",
		),
		"target-construction:fusion:vom",
	),
	"target-de-adaptive-fusion-ins": keyed(
		resolved(
			sentence(["Der", "Hund", "läuft", "ins", "Wohnzimmer"]),
			6,
			[6],
			"Construction",
			"Fusion",
		),
		"target-construction:fusion:ins",
	),
	"target-de-adaptive-fusion-ans": keyed(
		resolved(
			sentence(["Morgen", "fahren", "wir", "ans", "Nordmeer"]),
			6,
			[6],
			"Construction",
			"Fusion",
		),
		"target-construction:fusion:ans",
	),

	"target-de-adaptive-paired-weder-click-weder": keyed(
		resolved(wederNoch, 0, [0, 4], "Construction", "PairedFrame"),
		WEDER_NOCH_KEY,
	),
	"target-de-adaptive-paired-weder-click-noch": keyed(
		resolved(wederNoch, 4, [0, 4], "Construction", "PairedFrame"),
		WEDER_NOCH_KEY,
	),
	"target-de-adaptive-paired-weder-near-regen": keyed(
		resolved(wederNoch, 2, [2], "Lexeme", "NOUN"),
		WEDER_NOCH_KEY,
	),
	"target-de-adaptive-paired-weder-near-wind": keyed(
		resolved(wederNoch, 6, [6], "Lexeme", "NOUN"),
		WEDER_NOCH_KEY,
	),
	"target-de-adaptive-paired-nicht-nur-near-klug": keyed(
		resolved(nichtNurSondernAuch, 8, [8], "Lexeme", "ADJ"),
		NICHT_NUR_SONDERN_AUCH_KEY,
	),
	"target-de-adaptive-paired-nicht-nur-near-fleissig": keyed(
		resolved(nichtNurSondernAuch, 14, [14], "Lexeme", "ADJ"),
		NICHT_NUR_SONDERN_AUCH_KEY,
	),

	"target-de-adaptive-perfect-near-gestern": keyed(
		resolved(perfectFiller, 4, [4], "Lexeme", "ADV"),
		"target-lexical-unit:gewinnen:perfect",
	),
	"target-de-adaptive-future-near-bald": keyed(
		resolved(futureFiller, 6, [6], "Lexeme", "ADV"),
		"target-lexical-unit:abfahren:future",
	),
	"target-de-adaptive-passive-near-sorgfaeltig": keyed(
		resolved(passiveFiller, 6, [6], "Lexeme", "ADV"),
		"target-lexical-unit:pruefen:passive",
	),
	"target-de-adaptive-separable-near-ploetzlich": keyed(
		resolved(separableFiller, 6, [6], "Lexeme", "ADV"),
		"target-lexical-unit:ausgehen",
	),

	"target-de-adaptive-idiom-zahn-click-auf": keyed(
		resolved(toothIdiom, 10, [4, 10, 12, 14], "Phraseme", "Idiom"),
		TOOTH_IDIOM_KEY,
	),
	"target-de-adaptive-idiom-zahn-click-fuehlte": keyed(
		resolved(toothIdiom, 4, [4, 10, 12, 14], "Phraseme", "Idiom"),
		TOOTH_IDIOM_KEY,
	),
	"target-de-adaptive-idiom-zahn-click-den": keyed(
		resolved(toothIdiom, 12, [4, 10, 12, 14], "Phraseme", "Idiom"),
		TOOTH_IDIOM_KEY,
	),
	"target-de-adaptive-idiom-zahn-near-gruendlich": keyed(
		resolved(toothIdiom, 8, [8], "Lexeme", "ADV"),
		TOOTH_IDIOM_KEY,
	),
	"target-de-adaptive-idiom-zahn-click-zahn": keyed(
		resolved(toothIdiom, 14, [4, 10, 12, 14], "Phraseme", "Idiom"),
		TOOTH_IDIOM_KEY,
	),

	"target-de-adaptive-repeated-vor-near-first-vor": keyed(
		resolved(repeatedVor, 6, [6], "Lexeme", "ADP"),
		VORSTELLEN_KEY,
	),
	"target-de-adaptive-repeated-vor-click-stellt": keyed(
		resolved(repeatedVor, 2, [2, 4, 12], "Lexeme", "VERB"),
		VORSTELLEN_KEY,
	),
	"target-de-adaptive-repeated-vor-click-sich": keyed(
		resolved(repeatedVor, 4, [2, 4, 12], "Lexeme", "VERB"),
		VORSTELLEN_KEY,
	),
	"target-de-adaptive-repeated-vor-click-final-vor": keyed(
		resolved(repeatedVor, 12, [2, 4, 12], "Lexeme", "VERB"),
		VORSTELLEN_KEY,
	),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const adaptiveDevelopmentCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: addCaseEvidence(cases, adaptiveEvidence),
	},
);

function adaptiveEvidence(caseId: keyof typeof cases & string): string {
	if (caseId.includes("fusion")) {
		return evidence(
			IDS.fusionZu,
			"IDS establishes the fused-preposition category with zum. The same transparent preposition-plus-definite-article analysis applies here; issue #82 maps the single written contraction to Construction/Fusion.",
		);
	}
	if (caseId.includes("paired")) {
		return evidence(
			IDS.pairedFrame,
			caseId.includes("near")
				? "IDS establishes correlated multi-part linkages. Issue #82 includes only the closed-class anchors in Construction/PairedFrame, so the clicked lexical payload remains a singleton Lexeme."
				: "IDS establishes correlated multi-part linkages. Issue #82 maps the closed-class correlating anchors, and no freely supplied payload, to Construction/PairedFrame.",
		);
	}
	if (
		caseId.includes("perfect") ||
		caseId.includes("future") ||
		caseId.includes("passive")
	) {
		return evidence(
			IDS.verbalPeriphrasis,
			"IDS establishes the discontinuous verbal periphrasis. Issue #82 keeps the intervening adverb outside that multi-piece verb and maps the clicked occurrence to a singleton Lexeme/ADV.",
		);
	}
	if (caseId.includes("separable")) {
		return evidence(
			IDS.separableVerb,
			"IDS establishes the detached-prefix verb. Issue #82 keeps the intervening free adverb outside the verb and maps the clicked occurrence to a singleton Lexeme/ADV.",
		);
	}
	if (caseId.includes("idiom")) {
		return evidence(
			IDS.phraseolexeme,
			caseId.includes("near")
				? "IDS establishes the fixed multiword criterion. Issue #82 treats the surrounding idiom as one target but keeps the freely supplied manner adverb outside its membership."
				: "IDS establishes the fixed multiword criterion. Issue #82 includes the idiom's fixed function words with its lexical core while excluding variable arguments and modifiers.",
		);
	}
	if (caseId.includes("near-first")) {
		return evidence(
			udPartOfSpeech("ADP"),
			"The first same-spelled occurrence introduces the following nominal phrase and is a standalone Lexeme/ADP; occurrence indices prevent it from being confused with the later detached verb particle.",
		);
	}
	return evidence(
		IDS.separableVerb,
		"IDS establishes detached-prefix verbs. The final same-spelled occurrence is the particle belonging with the finite stem, while the earlier preposition remains outside the Lexeme/VERB target.",
	);
}
