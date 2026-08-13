import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { resolved, type Segment, sentence } from "./builders";
import { evidence, IDS, udPartOfSpeech } from "./sources";

const JE_DESTO_CONTAMINATION_KEY = "target-construction:paired-frame:je-desto";
const ENTWEDER_ODER_CONTAMINATION_KEY =
	"target-construction:paired-frame:entweder-oder";
const EINERSEITS_ANDERERSEITS_CONTAMINATION_KEY =
	"target-construction:paired-frame:einerseits-andererseits";
const SOWOHL_ALS_AUCH_CONTAMINATION_KEY =
	"target-construction:paired-frame:sowohl-als-auch";
const ZUM_FUSION_CONTAMINATION_KEY = "target-construction:fusion:zum";
const AM_FUSION_CONTAMINATION_KEY = "target-construction:fusion:am";
const CRINGE_CONTAMINATION_KEY = "target-lexeme:cringe";
const ZEIT_IST_GELD_CONTAMINATION_KEY =
	"target-phraseme:aphorism:zeit-ist-geld";

const lexeme = (
	words: readonly string[],
	clickedSegmentIndex: number,
	kind: Parameters<typeof resolved<"Lexeme">>[4],
) => lexemeFromSegments(sentence(words), clickedSegmentIndex, kind);

const lexemeFromSegments = (
	segments: readonly Segment[],
	clickedSegmentIndex: number,
	kind: Parameters<typeof resolved<"Lexeme">>[4],
) => ({
	...resolved(
		segments,
		clickedSegmentIndex,
		[clickedSegmentIndex],
		"Lexeme",
		kind,
	),
	explanation: evidence(
		kind === "AUX" ? IDS.modalVerb : udPartOfSpeech(kind),
		`The complete sentence disambiguates the clicked occurrence as Lexeme/${kind} in Dumling's UD-inspired product inventory.`,
	),
});

const fusion = {
	...resolved(
		sentence(["Sie", "geht", "zum", "Bahnhof"]),
		4,
		[4],
		"Construction",
		"Fusion",
	),
	contaminationKeys: [ZUM_FUSION_CONTAMINATION_KEY],
	explanation: evidence(
		IDS.fusionZu,
		"The IDS preposition entry explicitly identifies zum as the fusion of zu plus dem. IDS does not assign Dumgen's Construction/Fusion route; issue #82 product policy maps the one fused source Segment at original index 4 to that route.",
	),
};

const fixedPhraseme = (
	segments: readonly Segment[],
	clickedSegmentIndex: number,
	memberSegmentIndices: readonly number[],
	kind: "Aphorism" | "DiscourseFormula" | "Proverb",
) => ({
	...resolved(
		segments,
		clickedSegmentIndex,
		memberSegmentIndices,
		"Phraseme",
		kind,
	),
	explanation: evidence(
		fixedPhrasemeEvidence[kind].source,
		fixedPhrasemeEvidence[kind].claim,
	),
});

const fixedPhrasemeEvidence = {
	Aphorism: {
		source: IDS.phraseolexeme,
		claim: "IDS establishes the category-level fixed multiword criterion. IDS does not classify Wissen ist Macht as Dumgen Phraseme/Aphorism; issue #82 product policy supplies that route and includes all three fixed words.",
	},
	DiscourseFormula: {
		source: IDS.phraseolexeme,
		claim: "IDS establishes the category-level fixed multiword criterion. IDS does not assign Dumgen's route to Herzlichen Dank; issue #82 product policy treats this conventional greeting response as Phraseme/DiscourseFormula and includes both fixed words.",
	},
	Proverb: {
		source: IDS.proverbMorgenstund,
		claim: "This IDS proverb study identifies Morgenstund hat Gold im Mund as a proverb. Issue #82 product policy projects that evidence to Phraseme/Proverb and includes every fixed written component in source order.",
	},
} as const;

const formerCollocationMember = (
	segments: readonly Segment[],
	clickedSegmentIndex: number,
	kind: Parameters<typeof resolved<"Lexeme">>[4],
) => ({
	...resolved(
		segments,
		clickedSegmentIndex,
		[clickedSegmentIndex],
		"Lexeme",
		kind,
	),
	explanation: evidence(
		IDS.functionVerbGroup,
		`IDS distinguishes conventional function-verb combinations from ordinary full-verb predicates. This classifier omits that multiword route and classifies the clicked occurrence independently as Lexeme/${kind}.`,
	),
});

const pairedFrameTarget = (
	clickedSegmentIndex: number,
	memberSegmentIndices: readonly number[],
) => ({
	...resolved(
		pairedFrame,
		clickedSegmentIndex,
		memberSegmentIndices,
		"Construction",
		"PairedFrame",
	),
	contaminationKeys: [JE_DESTO_CONTAMINATION_KEY],
	explanation: evidence(
		IDS.pairedFrame,
		"IDS describes je with obligatory desto or umso as a two-part proportional correlation. Issue #82 product policy maps je and desto to Construction/PairedFrame membership while keeping the comparative fillers separate.",
	),
});

const pairedFrameFiller = (clickedSegmentIndex: number) => ({
	...resolved(
		pairedFrame,
		clickedSegmentIndex,
		[clickedSegmentIndex],
		"Lexeme",
		"ADJ",
	),
	contaminationKeys: [JE_DESTO_CONTAMINATION_KEY],
	explanation: evidence(
		IDS.pairedFrame,
		"IDS places the comparative expressions after je and desto inside their respective degree phrases. Issue #82 product policy therefore keeps this freely supplied comparative adjective outside Construction/PairedFrame membership.",
	),
});

const aphorism = sentence(["Wissen", "ist", "Macht"]);
const discourseFormula = sentence(["Herzlichen", "Dank"], "!");
const proverb = sentence(["Morgenstund", "hat", "Gold", "im", "Mund"]);
const measuresCollocation = sentence([
	"Nach",
	"dem",
	"Sturm",
	"ergriff",
	"die",
	"Stadt",
	"sofort",
	"wirksame",
	"Maßnahmen",
]);
const criticismCollocation = sentence([
	"Im",
	"Leitartikel",
	"übte",
	"die",
	"Zeitung",
	"scharfe",
	"Kritik",
	"an",
	"dem",
	"Vorschlag",
]);
const considerationCollocation = sentence([
	"Trotz",
	"des",
	"Zeitdrucks",
	"nahm",
	"Lea",
	"stets",
	"Rücksicht",
	"auf",
	"ihre",
	"Kollegen",
]);
const availabilityCollocation = sentence([
	"Für",
	"den",
	"Workshop",
	"stellte",
	"das",
	"Team",
	"aktuelle",
	"Daten",
	"zur",
	"Verfügung",
]);
const applicationCollocation = sentence([
	"Kurz",
	"vor",
	"Fristende",
	"stellte",
	"Nora",
	"noch",
	"einen",
	"Antrag",
]);
const demonstrationAphorism = sentence(["Zeit", "ist", "Geld"]);
const demonstrationPairedFrame = sentence(["Entweder", "hier", "oder", "dort"]);
const demonstrationMatchedPairedFrame: Segment[] = [
	{ kind: "ResolvableText", text: "Einerseits" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "lokal" },
	{ kind: "Punctuation", text: "," },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "andererseits" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "digital" },
	{ kind: "Punctuation", text: "." },
];
const demonstrationSowohlPairedFrame = sentence([
	"Der",
	"Entwurf",
	"ist",
	"sowohl",
	"schlicht",
	"als",
	"auch",
	"robust",
]);
const demonstrationPairedFrameFiller: Segment[] = [
	{ kind: "ResolvableText", text: "Je" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "länger" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "der" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Weg" },
	{ kind: "Punctuation", text: "," },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "desto" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "müder" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "die" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Reisenden" },
	{ kind: "Punctuation", text: "." },
];
const demonstrationFusion = sentence(["Wir", "fahren", "zum", "Museum"]);
const demonstrationSymbol = sentence([
	"Die",
	"Quote",
	"liegt",
	"bei",
	"zwölf",
	"%",
]);
const demonstrationPredicativeCringe = sentence([
	"Sein",
	"Kommentar",
	"wirkt",
	"cringe",
]);
const pairedFrame: Segment[] = [
	{ kind: "ResolvableText", text: "Je" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "früher" },
	{ kind: "Punctuation", text: "," },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "desto" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "besser" },
	{ kind: "Punctuation", text: "." },
];
const diagnosticPairedFrame: Segment[] = [
	{ kind: "ResolvableText", text: "Je" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "wärmer" },
	{ kind: "Punctuation", text: "," },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "desto" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "schöner" },
	{ kind: "Punctuation", text: "." },
];
const diagnosticEitherFrame = sentence(["Entweder", "Kaffee", "oder", "Tee"]);
const subordinateClause: Segment[] = [
	{ kind: "ResolvableText", text: "Weil" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "es" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "regnet" },
	{ kind: "Punctuation", text: "," },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "bleibt" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "sie" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "zu" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Hause" },
	{ kind: "Punctuation", text: "." },
];

export const routeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"target-de-core-kakao": {
			...lexeme(["Der", "heiße", "Kakao", "schmeckt", "gut"], 4, "NOUN"),
			contaminationKeys: ["target-stimulus:kakao"],
		},
		"target-de-core-trotz": {
			...lexeme(["Trotz", "Regen", "kommt", "sie"], 0, "ADP"),
			contaminationKeys: ["target-stimulus:trotz"],
		},
		"target-de-route-lexeme-adj": lexeme(
			["Der", "kluge", "Hund", "schläft"],
			2,
			"ADJ",
		),
		"target-de-route-lexeme-adp": lexeme(
			["Gegenüber", "dem", "Rathaus", "steht", "eine", "Bank"],
			0,
			"ADP",
		),
		"target-de-route-lexeme-adv": lexeme(
			["Sie", "kommt", "heute"],
			4,
			"ADV",
		),
		"target-de-route-lexeme-aux": lexeme(
			["Sie", "muss", "heute", "arbeiten"],
			2,
			"AUX",
		),
		"target-de-route-lexeme-cconj": lexeme(
			["Er", "singt", "und", "sie", "tanzt"],
			4,
			"CCONJ",
		),
		"target-de-route-lexeme-det": lexeme(
			["Dieser", "Hund", "schläft"],
			0,
			"DET",
		),
		"target-de-route-lexeme-intj": lexeme(
			["Ach", "das", "tut", "weh"],
			0,
			"INTJ",
		),
		"target-de-route-lexeme-noun": lexeme(
			["Das", "Haus", "steht", "leer"],
			2,
			"NOUN",
		),
		"target-de-route-lexeme-num": lexeme(
			["Sie", "kauft", "drei", "Äpfel"],
			4,
			"NUM",
		),
		"target-de-route-lexeme-part": lexeme(
			["Sie", "schläft", "nicht"],
			4,
			"PART",
		),
		"target-de-route-lexeme-pron": lexeme(
			["Jemand", "wartet", "draußen"],
			0,
			"PRON",
		),
		"target-de-route-lexeme-propn": lexeme(
			["Ada", "liest", "leise"],
			0,
			"PROPN",
		),
		"target-de-route-lexeme-sconj": lexemeFromSegments(
			subordinateClause,
			0,
			"SCONJ",
		),
		"target-de-route-lexeme-sym": lexeme(
			["Der", "Preis", "beträgt", "zehn", "€"],
			8,
			"SYM",
		),
		"target-de-route-lexeme-verb": lexeme(
			["Der", "Hund", "schläft"],
			4,
			"VERB",
		),
		"target-de-demo-default-modal-kann": lexeme(
			["Heute", "kann", "Lea", "arbeiten"],
			2,
			"AUX",
		),
		"target-de-demo-default-particle-doch": lexeme(
			["Lea", "kommt", "doch", "heute"],
			4,
			"PART",
		),
		"target-de-demo-default-interjection-oh": lexeme(
			["Oh", "das", "überrascht", "mich"],
			0,
			"INTJ",
		),
		"target-de-demo-default-copula-bleibt": {
			...resolved(
				sentence(["Nora", "bleibt", "ruhig"]),
				2,
				[2],
				"Lexeme",
				"AUX",
			),
			explanation: evidence(
				IDS.copula,
				"IDS classifies bleibt as a copula combined with a predicative complement. Issue #82 keeps the meaning-bearing copula as the standalone high-level Lexeme/AUX target rather than grouping it with ruhig.",
			),
		},
		"target-de-demo-aphorism-zeit-click-zeit": {
			...resolved(
				demonstrationAphorism,
				0,
				[0, 2, 4],
				"Phraseme",
				"Aphorism",
			),
			contaminationKeys: [ZEIT_IST_GELD_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.phraseolexeme,
				"IDS establishes the fixed multiword criterion. Issue #82 treats Zeit ist Geld as the complete Phraseme/Aphorism target under the German high-level policy.",
			),
		},
		"target-de-demo-aphorism-zeit-click-ist": {
			...resolved(
				demonstrationAphorism,
				2,
				[0, 2, 4],
				"Phraseme",
				"Aphorism",
			),
			contaminationKeys: [ZEIT_IST_GELD_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.phraseolexeme,
				"The clicked copular spelling participates in the fixed Aphorism rather than becoming a standalone AUX under this high-level occurrence.",
			),
		},
		"target-de-demo-aphorism-zeit-click-geld": {
			...resolved(
				demonstrationAphorism,
				4,
				[0, 2, 4],
				"Phraseme",
				"Aphorism",
			),
			contaminationKeys: [ZEIT_IST_GELD_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.phraseolexeme,
				"Every fixed member click returns the same source-ordered Aphorism target.",
			),
		},
		"target-de-demo-paired-entweder-click-entweder": {
			...resolved(
				demonstrationPairedFrame,
				0,
				[0, 4],
				"Construction",
				"PairedFrame",
			),
			contaminationKeys: [ENTWEDER_ODER_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedEitherOr,
				"IDS describes entweder ... oder as a correlated pair. Issue #82 includes only the two fixed anchors in Construction/PairedFrame membership.",
			),
		},
		"target-de-demo-paired-entweder-click-hier": {
			...resolved(demonstrationPairedFrame, 2, [2], "Lexeme", "ADV"),
			contaminationKeys: [ENTWEDER_ODER_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedEitherOr,
				"IDS describes entweder ... oder as the correlated frame. Issue #82 keeps the freely supplied locative filler hier outside frame membership and routes the clicked occurrence as Lexeme/ADV.",
			),
		},
		"target-de-demo-paired-entweder-click-dort": {
			...resolved(demonstrationPairedFrame, 6, [6], "Lexeme", "ADV"),
			contaminationKeys: [ENTWEDER_ODER_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedEitherOr,
				"IDS describes entweder ... oder as the correlated frame. Issue #82 keeps the freely supplied locative filler dort outside frame membership and routes the clicked occurrence as Lexeme/ADV.",
			),
		},
		"target-de-demo-paired-einerseits-click-einerseits": {
			...resolved(
				demonstrationMatchedPairedFrame,
				0,
				[0, 5],
				"Construction",
				"PairedFrame",
			),
			contaminationKeys: [EINERSEITS_ANDERERSEITS_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"Issue #82 treats einerseits and andererseits as the two fixed PairedFrame anchors while the supplied adjectives lokal and digital remain free fillers.",
			),
		},
		"target-de-demo-paired-einerseits-click-lokal": {
			...resolved(
				demonstrationMatchedPairedFrame,
				2,
				[2],
				"Lexeme",
				"ADJ",
			),
			contaminationKeys: [EINERSEITS_ANDERERSEITS_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"Issue #82 keeps the freely supplied adjective lokal outside the einerseits ... andererseits PairedFrame.",
			),
		},
		"target-de-demo-paired-einerseits-click-andererseits": {
			...resolved(
				demonstrationMatchedPairedFrame,
				5,
				[0, 5],
				"Construction",
				"PairedFrame",
			),
			contaminationKeys: [EINERSEITS_ANDERERSEITS_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"Issue #82 pairs the second anchor andererseits with the earlier anchor einerseits, not with either adjacent adjective filler.",
			),
		},
		"target-de-demo-paired-einerseits-click-digital": {
			...resolved(
				demonstrationMatchedPairedFrame,
				7,
				[7],
				"Lexeme",
				"ADJ",
			),
			contaminationKeys: [EINERSEITS_ANDERERSEITS_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"Issue #82 keeps the freely supplied adjective digital outside the einerseits ... andererseits PairedFrame.",
			),
		},
		"target-de-demo-paired-sowohl-click-robust": {
			...resolved(
				demonstrationSowohlPairedFrame,
				14,
				[14],
				"Lexeme",
				"ADJ",
			),
			contaminationKeys: [SOWOHL_ALS_AUCH_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"Issue #82 treats sowohl, als, and auch as the correlated anchors while the freely supplied predicate adjective robust remains a standalone Lexeme/ADJ.",
			),
		},
		"target-de-demo-paired-entweder-click-oder": {
			...resolved(
				demonstrationPairedFrame,
				4,
				[0, 4],
				"Construction",
				"PairedFrame",
			),
			contaminationKeys: [ENTWEDER_ODER_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedEitherOr,
				"The locative fillers hier and dort are free context; either fixed anchor selects the same PairedFrame.",
			),
		},
		"target-de-demo-paired-je-click-laenger": {
			...resolved(
				demonstrationPairedFrameFiller,
				2,
				[2],
				"Lexeme",
				"ADJ",
			),
			contaminationKeys: [JE_DESTO_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"IDS describes je ... desto as a proportional correlation but places the comparative expressions inside the degree phrases organized by its anchors. Issue #82 therefore keeps the freely supplied comparative länger outside Construction/PairedFrame membership and classifies the clicked occurrence as Lexeme/ADJ.",
			),
		},
		"target-de-demo-fusion-zum": {
			...resolved(demonstrationFusion, 4, [4], "Construction", "Fusion"),
			contaminationKeys: [ZUM_FUSION_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.fusionZu,
				"The IDS preposition entry identifies zum as zu plus dem. Issue #82 maps the one fused source segment to Construction/Fusion rather than Lexeme/ADP.",
			),
		},
		"target-de-demo-symbol-percent": {
			...resolved(demonstrationSymbol, 10, [10], "Lexeme", "SYM"),
			explanation: evidence(
				udPartOfSpeech("SYM"),
				"The clicked percent sign is a standalone symbol rather than part of the neighboring number; issue #82 maps that occurrence to Lexeme/SYM.",
			),
		},
		"target-de-demo-predicative-cringe-click-cringe": {
			...resolved(
				demonstrationPredicativeCringe,
				6,
				[6],
				"Lexeme",
				"ADJ",
			),
			contaminationKeys: [CRINGE_CONTAMINATION_KEY],
			explanation: evidence(
				udPartOfSpeech("ADJ"),
				"The borrowed property word cringe is predicative after wirkt. Dumling's UD-inspired product inventory therefore uses the informative Lexeme/ADJ route rather than residual X or a nominal analysis.",
			),
		},
		"target-de-route-phraseme-aphorism-click-wissen": fixedPhraseme(
			aphorism,
			0,
			[0, 2, 4],
			"Aphorism",
		),
		"target-de-route-phraseme-aphorism-click-ist": fixedPhraseme(
			aphorism,
			2,
			[0, 2, 4],
			"Aphorism",
		),
		"target-de-route-phraseme-aphorism-click-macht": fixedPhraseme(
			aphorism,
			4,
			[0, 2, 4],
			"Aphorism",
		),
		"target-de-route-phraseme-discourse-click-herzlichen": fixedPhraseme(
			discourseFormula,
			0,
			[0, 2],
			"DiscourseFormula",
		),
		"target-de-route-phraseme-discourse-click-dank": fixedPhraseme(
			discourseFormula,
			2,
			[0, 2],
			"DiscourseFormula",
		),
		"target-de-route-phraseme-proverb-click-morgenstund": fixedPhraseme(
			proverb,
			0,
			[0, 2, 4, 6, 8],
			"Proverb",
		),
		"target-de-route-phraseme-proverb-click-hat": fixedPhraseme(
			proverb,
			2,
			[0, 2, 4, 6, 8],
			"Proverb",
		),
		"target-de-route-phraseme-proverb-click-gold": fixedPhraseme(
			proverb,
			4,
			[0, 2, 4, 6, 8],
			"Proverb",
		),
		"target-de-route-phraseme-proverb-click-im": fixedPhraseme(
			proverb,
			6,
			[0, 2, 4, 6, 8],
			"Proverb",
		),
		"target-de-route-phraseme-proverb-click-mund": fixedPhraseme(
			proverb,
			8,
			[0, 2, 4, 6, 8],
			"Proverb",
		),
		"target-de-route-phraseme-collocation-massnahmen-click-ergriff":
			formerCollocationMember(measuresCollocation, 6, "VERB"),
		"target-de-route-phraseme-collocation-massnahmen-click-massnahmen":
			formerCollocationMember(measuresCollocation, 16, "NOUN"),
		"target-de-route-phraseme-collocation-kritik-click-uebte":
			formerCollocationMember(criticismCollocation, 4, "VERB"),
		"target-de-route-phraseme-collocation-kritik-click-kritik":
			formerCollocationMember(criticismCollocation, 12, "NOUN"),
		"target-de-route-phraseme-collocation-ruecksicht-click-nahm":
			formerCollocationMember(considerationCollocation, 6, "VERB"),
		"target-de-route-phraseme-collocation-ruecksicht-click-ruecksicht":
			formerCollocationMember(considerationCollocation, 12, "NOUN"),
		"target-de-route-phraseme-collocation-verfuegung-click-stellte":
			formerCollocationMember(availabilityCollocation, 6, "VERB"),
		"target-de-route-phraseme-collocation-verfuegung-click-zur": {
			...resolved(
				availabilityCollocation,
				16,
				[16],
				"Construction",
				"Fusion",
			),
			explanation: evidence(
				IDS.fusionZu,
				"IDS identifies zur as the fusion of zu plus der. Once this classifier omits the larger Collocation route, the clicked fused source word independently routes as the singleton Construction/Fusion.",
			),
		},
		"target-de-route-phraseme-collocation-verfuegung-click-verfuegung":
			formerCollocationMember(availabilityCollocation, 18, "NOUN"),
		"target-de-route-phraseme-collocation-antrag-click-stellte":
			formerCollocationMember(applicationCollocation, 6, "VERB"),
		"target-de-route-phraseme-collocation-antrag-click-einen":
			formerCollocationMember(applicationCollocation, 12, "DET"),
		"target-de-route-phraseme-collocation-antrag-click-antrag":
			formerCollocationMember(applicationCollocation, 14, "NOUN"),
		"target-de-route-construction-fusion": fusion,
		"target-de-diagnostic-fusion-am": {
			...resolved(
				sentence(["Sie", "wartet", "am", "Bahnhof"]),
				4,
				[4],
				"Construction",
				"Fusion",
			),
			contaminationKeys: [AM_FUSION_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.fusionZu,
				"IDS establishes the German preposition-article contraction category. In this locative occurrence, am realizes an plus dem; issue #82 maps exactly the clicked fused source segment to Construction/Fusion and excludes Bahnhof.",
			),
		},
		"target-de-route-construction-paired-click-je": pairedFrameTarget(
			0,
			[0, 5],
		),
		"target-de-route-construction-paired-click-desto": pairedFrameTarget(
			5,
			[0, 5],
		),
		"target-de-route-construction-paired-near-frueher":
			pairedFrameFiller(2),
		"target-de-route-construction-paired-near-besser": pairedFrameFiller(7),
		"target-de-diagnostic-paired-je-near-waermer": {
			...resolved(diagnosticPairedFrame, 2, [2], "Lexeme", "ADJ"),
			contaminationKeys: [JE_DESTO_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"The repeated je ... desto frame changes only its comparative values. wärmer fills the first degree slot and remains a standalone clicked Lexeme/ADJ.",
			),
		},
		"target-de-diagnostic-paired-je-near-schoener": {
			...resolved(diagnosticPairedFrame, 7, [7], "Lexeme", "ADJ"),
			contaminationKeys: [JE_DESTO_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedFrame,
				"The repeated je ... desto frame changes only its comparative values. schöner fills the second degree slot and remains a standalone clicked Lexeme/ADJ.",
			),
		},
		"target-de-diagnostic-paired-entweder-near-kaffee": {
			...resolved(diagnosticEitherFrame, 2, [2], "Lexeme", "NOUN"),
			contaminationKeys: [ENTWEDER_ODER_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedEitherOr,
				"In entweder ... oder, Kaffee is a freely supplied nominal alternative rather than a fixed anchor. The clicked filler is Lexeme/NOUN only.",
			),
		},
		"target-de-diagnostic-paired-entweder-near-tee": {
			...resolved(diagnosticEitherFrame, 6, [6], "Lexeme", "NOUN"),
			contaminationKeys: [ENTWEDER_ODER_CONTAMINATION_KEY],
			explanation: evidence(
				IDS.pairedEitherOr,
				"In entweder ... oder, Tee is a freely supplied nominal alternative rather than a fixed anchor. The clicked filler is Lexeme/NOUN only.",
			),
		},
	} satisfies GoldenCaseRegistry<
		typeof canonicalInputSchema,
		typeof canonicalOutputSchema
	>,
});
