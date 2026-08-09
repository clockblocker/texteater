import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { resolved, type Segment, sentence } from "./builders";
import { evidence, IDS } from "./sources";

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
		kind === "AUX" ? IDS.modalVerb : IDS.wordClasses,
		`The complete sentence disambiguates the clicked occurrence as Lexeme/${kind}.`,
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
	explanation: evidence(
		IDS.pairedFrame,
		"IDS places the comparative expressions after je and desto inside their respective degree phrases. Issue #82 product policy therefore keeps this freely supplied comparative adjective outside Construction/PairedFrame membership.",
	),
});

const aphorism = sentence(["Wissen", "ist", "Macht"]);
const discourseFormula = sentence(["Herzlichen", "Dank"], "!");
const proverb = sentence(["Morgenstund", "hat", "Gold", "im", "Mund"]);
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
		"target-de-route-lexeme-x": lexeme(
			["Das", "Wort", "lol", "steht", "hier"],
			4,
			"X",
		),
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
		"target-de-route-construction-fusion": fusion,
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
	} satisfies GoldenCaseRegistry<
		typeof canonicalInputSchema,
		typeof canonicalOutputSchema
	>,
});
