import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { addCaseEvidence, resolved, sentence, sentences } from "./builders";
import { evidence, IDS } from "./sources";

const greeting = sentence(["Guten", "Morgen"], "!");
const demonstrationDecisionSupportVerb = sentence([
	"Der",
	"Ausschuss",
	"trifft",
	"eine",
	"Entscheidung",
]);
const demonstrationSeparable = sentence(["Fritz", "steht", "sofort", "auf"]);
const idiom = sentences([
	["Im", "Workshop", "schwieg", "jeder"],
	["Mit", "einem", "Witz", "brach", "sie", "endlich", "das", "Eis"],
]);
const literalIce = sentences([
	["Vor", "ihr", "lag", "ein", "großer", "Eisblock"],
	[
		"Mit",
		"einem",
		"Hammer",
		"brach",
		"sie",
		"das",
		"Eis",
		"für",
		"die",
		"Getränke",
	],
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
const supportVerbCombination = sentence([
	"Der",
	"Ausschuss",
	"trifft",
	"heute",
	"eine",
	"Entscheidung",
]);
const freeObject = sentence(["Der", "Kellner", "bringt", "eine", "Cola"]);
const fixedFunctionWords = sentences([
	["Aus", "Opportunismus", "folgt", "sie", "immer", "der", "Mehrheit"],
	["Sie", "heult", "mit", "den", "hungrigen", "Wölfen"],
]);
const diagnosticOptionalReflexive = sentence([
	"Er",
	"rasiert",
	"sich",
	"morgens",
]);
const diagnosticCopula = sentence(["Der", "Himmel", "bleibt", "heute", "grau"]);
const diagnosticIdiomModifier = sentences([
	["Der", "Streit", "eskalierte", "bereits"],
	[
		"Mit",
		"seiner",
		"Provokation",
		"goss",
		"er",
		"zusätzliches",
		"Öl",
		"ins",
		"Feuer",
	],
]);
const demonstrationIdiom = sentence([
	"Nach",
	"der",
	"Zwischenfrage",
	"verlor",
	"sie",
	"völlig",
	"den",
	"Faden",
]);
const demonstrationLiteral = sentence([
	"Beim",
	"Nähen",
	"verlor",
	"sie",
	"den",
	"roten",
	"Faden",
]);
const demonstrationLiteralHandtuch = sentence([
	"Vor",
	"dem",
	"Waschen",
	"warf",
	"er",
	"das",
	"Handtuch",
	"in",
	"die",
	"Maschine",
]);
const demonstrationLiteralGrass = sentences([
	["Das", "Kaninchen", "fraß", "auf", "der", "Wiese"],
	["Dabei", "biss", "es", "ins", "Gras"],
]);
const demonstrationGoverned = sentence([
	"Sie",
	"rechnet",
	"mit",
	"starkem",
	"Regen",
]);
const demonstrationAdjunct = sentence([
	"Sie",
	"rechnet",
	"mit",
	"dem",
	"Taschenrechner",
]);
const demonstrationInherentReflexive = sentence([
	"Ich",
	"beeile",
	"mich",
	"heute",
]);
const demonstrationOptionalReflexive = sentence([
	"Du",
	"kämmst",
	"dich",
	"morgens",
]);
const demonstrationPerfect = sentence(["Ich", "habe", "gestern", "gearbeitet"]);
const demonstrationModal = sentence(["Lea", "kann", "heute", "arbeiten"]);
const demonstrationPassive = sentence([
	"Die",
	"Briefe",
	"werden",
	"morgen",
	"verschickt",
]);
const demonstrationKnowledgeSupportVerb = sentence([
	"Sie",
	"nahm",
	"den",
	"Antrag",
	"gründlich",
	"zur",
	"Kenntnis",
]);
const demonstrationRepeatedParticle = sentence([
	"Mila",
	"fängt",
	"an",
	"der",
	"Kreuzung",
	"endlich",
	"an",
]);
const demonstrationInternalIdiomModifier = sentences([
	["Alle", "wollten", "den", "geheimen", "Plan", "wissen"],
	[
		"Schließlich",
		"ließ",
		"er",
		"die",
		"verdammte",
		"Katze",
		"aus",
		"dem",
		"Sack",
	],
]);
const demonstrationKragenIdiom = sentences([
	["Er", "ertrug", "zwei", "Lügen", "schweigend"],
	[
		"Nach",
		"der",
		"dritten",
		"platzte",
		"ihm",
		"der",
		"sprichwörtliche",
		"Kragen",
	],
]);
const DECISION_TREFFEN_CONTAMINATION_KEY =
	"target-lexical-unit:eine-entscheidung-treffen";
const AUFSTEHEN_CONTAMINATION_KEY = "target-lexical-unit:aufstehen";
const KATZE_AUS_DEM_SACK_CONTAMINATION_KEY =
	"target-lexical-unit:die-katze-aus-dem-sack-lassen";
const INS_GRAS_BEISSEN_CONTAMINATION_KEY =
	"target-lexical-unit:ins-gras-beissen";
const OEL_INS_FEUER_GIESSEN_CONTAMINATION_KEY =
	"target-lexical-unit:oel-ins-feuer-giessen";
const KRAGEN_PLATZEN_CONTAMINATION_KEY =
	"target-lexical-unit:jemandem-der-kragen-platzen";

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
		...resolved(demonstrationDecisionSupportVerb, 8, [8], "Lexeme", "NOUN"),
		contaminationKeys: [DECISION_TREFFEN_CONTAMINATION_KEY],
	},
	"target-de-core-entscheidung-click-trifft": {
		...resolved(demonstrationDecisionSupportVerb, 4, [4], "Lexeme", "VERB"),
		contaminationKeys: [DECISION_TREFFEN_CONTAMINATION_KEY],
	},
	"target-de-core-entscheidung-click-eine": {
		...resolved(demonstrationDecisionSupportVerb, 6, [6], "Lexeme", "DET"),
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
		15,
		[15, 21, 23],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-idiom-click-das": resolved(
		idiom,
		21,
		[15, 21, 23],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-idiom-click-eis": resolved(
		idiom,
		23,
		[15, 21, 23],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-idiom-near-endlich": resolved(
		idiom,
		19,
		[19],
		"Lexeme",
		"ADV",
	),
	"target-de-boundary-literal-eis-click-brach": resolved(
		literalIce,
		19,
		[19],
		"Lexeme",
		"VERB",
	),
	"target-de-boundary-literal-eis-click-eis": resolved(
		literalIce,
		25,
		[25],
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
	"target-de-diagnostic-optional-reflexive-click-rasiert": resolved(
		diagnosticOptionalReflexive,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-diagnostic-optional-reflexive-click-sich": resolved(
		diagnosticOptionalReflexive,
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
	"target-de-diagnostic-copula-click-bleibt": resolved(
		diagnosticCopula,
		4,
		[4],
		"Lexeme",
		"AUX",
	),

	"target-de-boundary-collocation-click-trifft": contaminated(
		resolved(supportVerbCombination, 4, [4], "Lexeme", "VERB"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-collocation-click-eine": contaminated(
		resolved(supportVerbCombination, 8, [8], "Lexeme", "DET"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-collocation-click-entscheidung": contaminated(
		resolved(supportVerbCombination, 10, [10], "Lexeme", "NOUN"),
		DECISION_TREFFEN_CONTAMINATION_KEY,
	),
	"target-de-boundary-collocation-near-heute": contaminated(
		resolved(supportVerbCombination, 6, [6], "Lexeme", "ADV"),
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
		17,
		[17, 19, 21, 25],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-click-mit": resolved(
		fixedFunctionWords,
		19,
		[17, 19, 21, 25],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-click-den": resolved(
		fixedFunctionWords,
		21,
		[17, 19, 21, 25],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-click-woelfen": resolved(
		fixedFunctionWords,
		25,
		[17, 19, 21, 25],
		"Phraseme",
		"Idiom",
	),
	"target-de-boundary-fixed-function-near-hungrigen": resolved(
		fixedFunctionWords,
		23,
		[23],
		"Lexeme",
		"ADJ",
	),
	"target-de-diagnostic-idiom-oel-click-goss": contaminated(
		resolved(
			diagnosticIdiomModifier,
			15,
			[15, 21, 23, 25],
			"Phraseme",
			"Idiom",
		),
		OEL_INS_FEUER_GIESSEN_CONTAMINATION_KEY,
	),
	"target-de-diagnostic-idiom-oel-click-oel": contaminated(
		resolved(
			diagnosticIdiomModifier,
			21,
			[15, 21, 23, 25],
			"Phraseme",
			"Idiom",
		),
		OEL_INS_FEUER_GIESSEN_CONTAMINATION_KEY,
	),
	"target-de-diagnostic-idiom-oel-click-ins": contaminated(
		resolved(
			diagnosticIdiomModifier,
			23,
			[15, 21, 23, 25],
			"Phraseme",
			"Idiom",
		),
		OEL_INS_FEUER_GIESSEN_CONTAMINATION_KEY,
	),
	"target-de-diagnostic-idiom-oel-click-feuer": contaminated(
		resolved(
			diagnosticIdiomModifier,
			25,
			[15, 21, 23, 25],
			"Phraseme",
			"Idiom",
		),
		OEL_INS_FEUER_GIESSEN_CONTAMINATION_KEY,
	),
	"target-de-diagnostic-idiom-oel-near-zusaetzliches": contaminated(
		resolved(diagnosticIdiomModifier, 19, [19], "Lexeme", "ADJ"),
		OEL_INS_FEUER_GIESSEN_CONTAMINATION_KEY,
	),

	"target-de-demo-idiom-faden-click-verlor": resolved(
		demonstrationIdiom,
		6,
		[6, 12, 14],
		"Phraseme",
		"Idiom",
	),
	"target-de-demo-idiom-faden-click-den": resolved(
		demonstrationIdiom,
		12,
		[6, 12, 14],
		"Phraseme",
		"Idiom",
	),
	"target-de-demo-idiom-faden-click-faden": resolved(
		demonstrationIdiom,
		14,
		[6, 12, 14],
		"Phraseme",
		"Idiom",
	),
	"target-de-demo-idiom-faden-click-voellig": resolved(
		demonstrationIdiom,
		10,
		[10],
		"Lexeme",
		"ADV",
	),
	"target-de-demo-literal-faden-click-faden": resolved(
		demonstrationLiteral,
		12,
		[12],
		"Lexeme",
		"NOUN",
	),
	"target-de-demo-literal-handtuch-click-warf": resolved(
		demonstrationLiteralHandtuch,
		6,
		[6],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-literal-gras-click-biss": contaminated(
		resolved(demonstrationLiteralGrass, 15, [15], "Lexeme", "VERB"),
		INS_GRAS_BEISSEN_CONTAMINATION_KEY,
	),
	"target-de-demo-literal-gras-click-gras": contaminated(
		resolved(demonstrationLiteralGrass, 21, [21], "Lexeme", "NOUN"),
		INS_GRAS_BEISSEN_CONTAMINATION_KEY,
	),
	"target-de-demo-governed-rechnen-click-rechnet": resolved(
		demonstrationGoverned,
		2,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-governed-rechnen-click-mit": resolved(
		demonstrationGoverned,
		4,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-governed-rechnen-click-regen": resolved(
		demonstrationGoverned,
		8,
		[8],
		"Lexeme",
		"NOUN",
	),
	"target-de-demo-adjunct-rechnen-click-mit": resolved(
		demonstrationAdjunct,
		4,
		[4],
		"Lexeme",
		"ADP",
	),
	"target-de-demo-inherent-reflexive-click-beeile": resolved(
		demonstrationInherentReflexive,
		2,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-inherent-reflexive-click-mich": resolved(
		demonstrationInherentReflexive,
		4,
		[2, 4],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-optional-reflexive-click-dich": resolved(
		demonstrationOptionalReflexive,
		4,
		[4],
		"Lexeme",
		"PRON",
	),
	"target-de-demo-optional-reflexive-click-kaemmst": resolved(
		demonstrationOptionalReflexive,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-perfect-arbeiten-click-habe": resolved(
		demonstrationPerfect,
		2,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-perfect-arbeiten-click-gearbeitet": resolved(
		demonstrationPerfect,
		6,
		[2, 6],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-perfect-arbeiten-click-gestern": resolved(
		demonstrationPerfect,
		4,
		[4],
		"Lexeme",
		"ADV",
	),
	"target-de-demo-modal-arbeiten-click-kann": resolved(
		demonstrationModal,
		2,
		[2],
		"Lexeme",
		"AUX",
	),
	"target-de-demo-modal-arbeiten-click-arbeiten": resolved(
		demonstrationModal,
		6,
		[6],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-passive-briefe-click-werden": resolved(
		demonstrationPassive,
		4,
		[4, 8],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-passive-briefe-click-verschickt": resolved(
		demonstrationPassive,
		8,
		[4, 8],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-collocation-kenntnis-click-nahm": resolved(
		demonstrationKnowledgeSupportVerb,
		2,
		[2],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-collocation-kenntnis-click-zur": resolved(
		demonstrationKnowledgeSupportVerb,
		10,
		[10],
		"Construction",
		"Fusion",
	),
	"target-de-demo-collocation-kenntnis-click-kenntnis": resolved(
		demonstrationKnowledgeSupportVerb,
		12,
		[12],
		"Lexeme",
		"NOUN",
	),
	"target-de-demo-repeated-anfangen-click-faengt": resolved(
		demonstrationRepeatedParticle,
		2,
		[2, 12],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-repeated-anfangen-click-final-an": resolved(
		demonstrationRepeatedParticle,
		12,
		[2, 12],
		"Lexeme",
		"VERB",
	),
	"target-de-demo-repeated-anfangen-click-first-an": resolved(
		demonstrationRepeatedParticle,
		4,
		[4],
		"Lexeme",
		"ADP",
	),
	"target-de-demo-idiom-katze-click-liess": contaminated(
		resolved(
			demonstrationInternalIdiomModifier,
			15,
			[15, 19, 23, 25, 27, 29],
			"Phraseme",
			"Idiom",
		),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-katze-click-die": contaminated(
		resolved(
			demonstrationInternalIdiomModifier,
			19,
			[15, 19, 23, 25, 27, 29],
			"Phraseme",
			"Idiom",
		),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-katze-click-verdammte": contaminated(
		resolved(demonstrationInternalIdiomModifier, 21, [21], "Lexeme", "ADJ"),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-katze-click-katze": contaminated(
		resolved(
			demonstrationInternalIdiomModifier,
			23,
			[15, 19, 23, 25, 27, 29],
			"Phraseme",
			"Idiom",
		),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-katze-click-aus": contaminated(
		resolved(
			demonstrationInternalIdiomModifier,
			25,
			[15, 19, 23, 25, 27, 29],
			"Phraseme",
			"Idiom",
		),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-katze-click-dem": contaminated(
		resolved(
			demonstrationInternalIdiomModifier,
			27,
			[15, 19, 23, 25, 27, 29],
			"Phraseme",
			"Idiom",
		),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-katze-click-sack": contaminated(
		resolved(
			demonstrationInternalIdiomModifier,
			29,
			[15, 19, 23, 25, 27, 29],
			"Phraseme",
			"Idiom",
		),
		KATZE_AUS_DEM_SACK_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-kragen-click-platzte": contaminated(
		resolved(
			demonstrationKragenIdiom,
			17,
			[17, 21, 25],
			"Phraseme",
			"Idiom",
		),
		KRAGEN_PLATZEN_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-kragen-click-der": contaminated(
		resolved(
			demonstrationKragenIdiom,
			21,
			[17, 21, 25],
			"Phraseme",
			"Idiom",
		),
		KRAGEN_PLATZEN_CONTAMINATION_KEY,
	),
	"target-de-demo-idiom-kragen-click-kragen": contaminated(
		resolved(
			demonstrationKragenIdiom,
			25,
			[17, 21, 25],
			"Phraseme",
			"Idiom",
		),
		KRAGEN_PLATZEN_CONTAMINATION_KEY,
	),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: addCaseEvidence(cases, boundaryEvidence),
});

function boundaryEvidence(caseId: string): string {
	if (caseId.includes("diagnostic-idiom-oel")) {
		return evidence(
			IDS.phraseolexeme,
			"The escalation context makes Öl ins Feuer gießen figurative. Issue #82 includes goss, Öl, ins, and Feuer as fixed Idiom members while keeping the freely inserted adjective zusätzliches separate.",
		);
	}
	if (caseId.includes("target-de-demo-idiom-kragen")) {
		return evidence(
			IDS.phraseolexeme,
			"The anger context makes der Kragen platzen figurative. Issue #82 includes platzte, der, and Kragen as fixed Idiom members while excluding the dative argument ihm and inserted modifier sprichwörtliche.",
		);
	}
	if (caseId.includes("diagnostic-optional-reflexive")) {
		return evidence(
			IDS.reflexivePronoun,
			"rasieren is usable without a reflexive pronoun, so issue #82 keeps rasiert as Lexeme/VERB and the contextual object sich as a separate Lexeme/PRON.",
		);
	}
	if (caseId.includes("diagnostic-copula")) {
		return evidence(
			IDS.copula,
			"IDS classifies bleiben with a predicative complement as a copula. Issue #82 keeps the clicked copula bleibt as standalone Lexeme/AUX rather than grouping it with grau.",
		);
	}
	if (caseId.includes("demo-literal-gras")) {
		return evidence(
			IDS.phraseolexeme,
			"The feeding scene makes biss ins Gras a physical, compositional occurrence rather than the familiar death idiom. Issue #82 therefore selects only the clicked verb or noun Lexeme.",
		);
	}
	if (caseId === "target-de-demo-idiom-katze-click-verdammte") {
		return evidence(
			IDS.phraseolexeme,
			"The first sentence makes the following idiom's figurative reading explicit. Issue #82 keeps the freely inserted adjective verdammte outside die Katze aus dem Sack lassen and selects only the clicked Lexeme/ADJ.",
		);
	}
	if (caseId.includes("demo-idiom-katze")) {
		return evidence(
			IDS.phraseolexeme,
			"The first sentence makes the following idiom's figurative reading explicit. Issue #82 includes the realized fixed members ließ, die, Katze, aus, dem, and Sack while excluding the freely inserted adjective verdammte.",
		);
	}
	if (caseId === "target-de-demo-idiom-faden-click-voellig") {
		return evidence(
			IDS.phraseolexeme,
			"IDS establishes the fixed multiword criterion and occurrence sensitivity. Issue #82 keeps the freely inserted adverb völlig outside the neighboring idiom and selects only the clicked Lexeme/ADV.",
		);
	}
	if (caseId.includes("demo-idiom-faden")) {
		return evidence(
			IDS.phraseolexeme,
			"IDS establishes the fixed multiword criterion. In the supplied context, issue #82 treats den Faden verlieren as a figurative Phraseme/Idiom and includes the fixed verb, determiner, and noun.",
		);
	}
	if (caseId.includes("demo-literal-faden")) {
		return evidence(
			IDS.phraseolexeme,
			"The sewing context makes Faden a literal free noun rather than the figurative fixed expression; issue #82 therefore selects only the clicked Lexeme/NOUN.",
		);
	}
	if (caseId.includes("demo-literal-handtuch")) {
		return evidence(
			IDS.phraseolexeme,
			"IDS establishes that fixed multiword status belongs to the contextual whole rather than to a familiar word sequence alone. The washing context makes warf das Handtuch literal; issue #82 therefore selects only the clicked Lexeme/VERB.",
		);
	}
	if (
		caseId.includes("demo-governed-rechnen") ||
		caseId.includes("demo-adjunct-rechnen")
	) {
		return evidence(
			IDS.prepositionalGroup,
			"IDS distinguishes verb-governed prepositions from freely selected adverbial PPs. Issue #82 groups rechnet mit for lexical government but keeps instrumental mit dem Taschenrechner separate.",
		);
	}
	if (
		caseId.includes("demo-inherent-reflexive") ||
		caseId.includes("demo-optional-reflexive")
	) {
		return evidence(
			IDS.reflexivePronoun,
			"IDS distinguishes the lexically required pronoun of an inherently reflexive verb from an ordinary anaphoric object. Issue #82 groups beeile mich but keeps the contextual pronoun in kämmst dich separate.",
		);
	}
	if (
		caseId.includes("demo-perfect-arbeiten") ||
		caseId.includes("demo-passive-brief")
	) {
		return evidence(
			IDS.verbalPeriphrasis,
			"IDS analyzes haben/werden plus the infinite full-verb form as a perfect or passive verbal periphrasis. Issue #82 groups only the realized auxiliary and lexical verb, excluding intervening free context.",
		);
	}
	if (caseId.includes("demo-collocation-kenntnis")) {
		return evidence(
			IDS.functionVerbGroup,
			"IDS lists zur Kenntnis nehmen as a conventional support-verb expression. Revised issue #82 high-level policy does not treat conventionality alone as fixedness: nahm and Kenntnis remain separate Lexemes, while the clicked fused segment zur independently routes as Construction/Fusion.",
		);
	}
	if (caseId.includes("demo-repeated-anfangen")) {
		return evidence(
			IDS.separableVerb,
			"IDS analyzes detached stressed particles with their finite stem as one separable verb. Issue #82 uses source position to group fängt with only the final particle an, while the earlier identical an remains a standalone Lexeme/ADP.",
		);
	}
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
			"IDS distinguishes a conventional support-verb predicate from an ordinary full verb plus object and notes that borderline cases are gradual. Revised issue #82 high-level policy deliberately does not equate that conventionality with fixed target membership: the clicked verb, determiner, noun, or adverb remains its own Lexeme.",
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
