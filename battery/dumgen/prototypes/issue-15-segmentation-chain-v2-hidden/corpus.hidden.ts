// PROTOTYPE ONLY — immutable eval gold for issue #15.
//
// This module is an evaluator-side boundary. Prompt Sources and example
// builders must never import it. Use blind-evaluation-input.ts to construct
// model inputs without exposing gold.

export const CORPUS_VERSION = "segmentation-chain-v2-hidden" as const;

export const SEGMENT_KINDS = [
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
] as const;

export type SegmentKind = (typeof SEGMENT_KINDS)[number];
export type IntakeDecision =
	| "Accepted"
	| "UnsupportedLanguage"
	| "Unintelligible";

export type Segment = Readonly<{
	kind: SegmentKind;
	text: string;
}>;

export type SegmentationStratum =
	| "clean-german"
	| "german-boundaries"
	| "typo-or-variant-preservation"
	| "structural-reconstruction"
	| "partially-opaque"
	| "unintelligible"
	| "unsupported-language"
	| "hebrew-fused-material";

export type SegmentationRequirement =
	| "german"
	| "punctuation-boundary"
	| "whitespace-boundary"
	| "ordinary-typo-preservation"
	| "licensed-variant-preservation"
	| "conservative-reconstruction"
	| "abbreviation-non-expansion"
	| "local-opaque-preservation"
	| "unintelligible-intake"
	| "unsupported-language-intake"
	| "non-whitespace-delimited-fused-material";

export type AcceptedGold = Readonly<{
	decision: "Accepted";
	segments: readonly Segment[];
}>;

export type RejectedGold = Readonly<{
	decision: Exclude<IntakeDecision, "Accepted">;
}>;

export type HiddenSegmentationCase = Readonly<{
	id: `SC2-${string}`;
	stratum: SegmentationStratum;
	requirements: readonly SegmentationRequirement[];
	source: string;
	gold: AcceptedGold | RejectedGold;
}>;

const R = (text: string): Segment => ({
	kind: "ResolvableText",
	text,
});
const O = (text: string): Segment => ({ kind: "OpaqueText", text });
const W = (text: string): Segment => ({ kind: "Whitespace", text });
const P = (text: string): Segment => ({ kind: "Punctuation", text });

const accepted = (segments: readonly Segment[]): AcceptedGold => ({
	decision: "Accepted",
	segments,
});

const rejected = (decision: RejectedGold["decision"]): RejectedGold => ({
	decision,
});

const cases = [
	{
		id: "SC2-DE-CLEAN-001",
		stratum: "clean-german",
		requirements: ["german"],
		source: "Der Igel sucht im Laub.",
		gold: accepted([
			R("Der"),
			W(" "),
			R("Igel"),
			W(" "),
			R("sucht"),
			W(" "),
			R("im"),
			W(" "),
			R("Laub"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-CLEAN-002",
		stratum: "clean-german",
		requirements: ["german"],
		source: "Neben dem Brunnen blühen Rosen.",
		gold: accepted([
			R("Neben"),
			W(" "),
			R("dem"),
			W(" "),
			R("Brunnen"),
			W(" "),
			R("blühen"),
			W(" "),
			R("Rosen"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-CLEAN-003",
		stratum: "clean-german",
		requirements: ["german"],
		source: "Morgen fährt der letzte Bus.",
		gold: accepted([
			R("Morgen"),
			W(" "),
			R("fährt"),
			W(" "),
			R("der"),
			W(" "),
			R("letzte"),
			W(" "),
			R("Bus"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-BOUND-001",
		stratum: "german-boundaries",
		requirements: ["german", "punctuation-boundary", "whitespace-boundary"],
		source: "„Kommst du?“, fragte Lea.",
		gold: accepted([
			P("„"),
			R("Kommst"),
			W(" "),
			R("du"),
			P("?"),
			P("“"),
			P(","),
			W(" "),
			R("fragte"),
			W(" "),
			R("Lea"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-BOUND-002",
		stratum: "german-boundaries",
		requirements: ["german", "punctuation-boundary", "whitespace-boundary"],
		source: "Links;\trechts   Mitte!\n",
		gold: accepted([
			R("Links"),
			P(";"),
			W("\t"),
			R("rechts"),
			W("   "),
			R("Mitte"),
			P("!"),
			W("\n"),
		]),
	},
	{
		id: "SC2-DE-BOUND-003",
		stratum: "german-boundaries",
		requirements: ["german", "punctuation-boundary"],
		source: "Nord-/Süd-Richtung",
		gold: accepted([
			R("Nord"),
			P("-"),
			P("/"),
			R("Süd"),
			P("-"),
			R("Richtung"),
		]),
	},
	{
		id: "SC2-DE-BOUND-004",
		stratum: "german-boundaries",
		requirements: ["german", "punctuation-boundary", "whitespace-boundary"],
		source: "Ach ... wirklich?!",
		gold: accepted([
			R("Ach"),
			W(" "),
			P("."),
			P("."),
			P("."),
			W(" "),
			R("wirklich"),
			P("?"),
			P("!"),
		]),
	},
	{
		id: "SC2-DE-PRESERVE-001",
		stratum: "typo-or-variant-preservation",
		requirements: ["german", "ordinary-typo-preservation"],
		source: "Wir waren seperat unterwegs.",
		gold: accepted([
			R("Wir"),
			W(" "),
			R("waren"),
			W(" "),
			R("seperat"),
			W(" "),
			R("unterwegs"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-PRESERVE-002",
		stratum: "typo-or-variant-preservation",
		requirements: ["german", "ordinary-typo-preservation"],
		source: "Die Zahlen wiederspiegeln den Trend.",
		gold: accepted([
			R("Die"),
			W(" "),
			R("Zahlen"),
			W(" "),
			R("wiederspiegeln"),
			W(" "),
			R("den"),
			W(" "),
			R("Trend"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-PRESERVE-003",
		stratum: "typo-or-variant-preservation",
		requirements: ["german", "licensed-variant-preservation"],
		source: "Die Crème schmeckt nach Vanille.",
		gold: accepted([
			R("Die"),
			W(" "),
			R("Crème"),
			W(" "),
			R("schmeckt"),
			W(" "),
			R("nach"),
			W(" "),
			R("Vanille"),
			P("."),
		]),
	},
	{
		id: "SC2-DE-PRESERVE-004",
		stratum: "typo-or-variant-preservation",
		requirements: ["german", "licensed-variant-preservation"],
		source: "Sein Portmonee liegt im Rucksack.",
		gold: accepted([
			R("Sein"),
			W(" "),
			R("Portmonee"),
			W(" "),
			R("liegt"),
			W(" "),
			R("im"),
			W(" "),
			R("Rucksack"),
			P("."),
		]),
	},
	{
		id: "SC2-RECON-001",
		stratum: "structural-reconstruction",
		requirements: ["german", "conservative-reconstruction"],
		source: "AmAbendlesenwirzusammen.",
		gold: accepted([
			R("Am"),
			W(" "),
			R("Abend"),
			W(" "),
			R("lesen"),
			W(" "),
			R("wir"),
			W(" "),
			R("zusammen"),
			P("."),
		]),
	},
	{
		id: "SC2-RECON-002",
		stratum: "structural-reconstruction",
		requirements: ["german", "conservative-reconstruction"],
		source: "DaskleineBoottreibtweiter.",
		gold: accepted([
			R("Das"),
			W(" "),
			R("kleine"),
			W(" "),
			R("Boot"),
			W(" "),
			R("treibt"),
			W(" "),
			R("weiter"),
			P("."),
		]),
	},
	{
		id: "SC2-RECON-003",
		stratum: "structural-reconstruction",
		requirements: ["german", "conservative-reconstruction"],
		source: "Siekannheutenichtmitkommen.",
		gold: accepted([
			R("Sie"),
			W(" "),
			R("kann"),
			W(" "),
			R("heute"),
			W(" "),
			R("nicht"),
			W(" "),
			R("mitkommen"),
			P("."),
		]),
	},
	{
		id: "SC2-RECON-004",
		stratum: "structural-reconstruction",
		requirements: [
			"conservative-reconstruction",
			"abbreviation-non-expansion",
		],
		source: "ng l u r here rn",
		gold: accepted([
			R("ngl"),
			W(" "),
			R("u"),
			W(" "),
			R("r"),
			W(" "),
			R("here"),
			W(" "),
			R("rn"),
		]),
	},
	{
		id: "SC2-MIXED-001",
		stratum: "partially-opaque",
		requirements: ["german", "local-opaque-preservation"],
		source: "Bitte leg vurz neben das Fenster.",
		gold: accepted([
			R("Bitte"),
			W(" "),
			R("leg"),
			W(" "),
			O("vurz"),
			W(" "),
			R("neben"),
			W(" "),
			R("das"),
			W(" "),
			R("Fenster"),
			P("."),
		]),
	},
	{
		id: "SC2-MIXED-002",
		stratum: "partially-opaque",
		requirements: ["german", "local-opaque-preservation"],
		source: "Der Status ist qlmv, sonst stabil.",
		gold: accepted([
			R("Der"),
			W(" "),
			R("Status"),
			W(" "),
			R("ist"),
			W(" "),
			O("qlmv"),
			P(","),
			W(" "),
			R("sonst"),
			W(" "),
			R("stabil"),
			P("."),
		]),
	},
	{
		id: "SC2-MIXED-003",
		stratum: "partially-opaque",
		requirements: ["german", "local-opaque-preservation"],
		source: "Auf dem Display blinkt 🪼 kurz.",
		gold: accepted([
			R("Auf"),
			W(" "),
			R("dem"),
			W(" "),
			R("Display"),
			W(" "),
			R("blinkt"),
			W(" "),
			O("🪼"),
			W(" "),
			R("kurz"),
			P("."),
		]),
	},
	{
		id: "SC2-UNINT-001",
		stratum: "unintelligible",
		requirements: ["unintelligible-intake"],
		source: "ptkzv—rrqx; lmjfb",
		gold: rejected("Unintelligible"),
	},
	{
		id: "SC2-UNINT-002",
		stratum: "unintelligible",
		requirements: ["unintelligible-intake"],
		source: "wqnmv bltkx? fzjjp",
		gold: rejected("Unintelligible"),
	},
	{
		id: "SC2-UNSUP-001",
		stratum: "unsupported-language",
		requirements: ["unsupported-language-intake"],
		source: "Il gatto dorme sul divano.",
		gold: rejected("UnsupportedLanguage"),
	},
	{
		id: "SC2-UNSUP-002",
		stratum: "unsupported-language",
		requirements: ["unsupported-language-intake"],
		source: "Bu kitap oldukça ilginç.",
		gold: rejected("UnsupportedLanguage"),
	},
	{
		id: "SC2-HE-FUSED-001",
		stratum: "hebrew-fused-material",
		requirements: ["non-whitespace-delimited-fused-material"],
		source: "והמורה בכיתה.",
		gold: accepted([
			R("ו"),
			R("ה"),
			R("מורה"),
			W(" "),
			R("ב"),
			R("כיתה"),
			P("."),
		]),
	},
	{
		id: "SC2-HE-FUSED-002",
		stratum: "hebrew-fused-material",
		requirements: ["non-whitespace-delimited-fused-material"],
		source: "לספריו יש כריכות.",
		gold: accepted([
			R("ל"),
			R("ספר"),
			R("יו"),
			W(" "),
			R("יש"),
			W(" "),
			R("כריכות"),
			P("."),
		]),
	},
	{
		id: "SC2-HE-FUSED-003",
		stratum: "hebrew-fused-material",
		requirements: ["non-whitespace-delimited-fused-material"],
		source: "וכשחזרנו, חייכנו.",
		gold: accepted([
			R("ו"),
			R("כ"),
			R("ש"),
			R("חזרנו"),
			P(","),
			W(" "),
			R("חייכנו"),
			P("."),
		]),
	},
	{
		id: "SC2-HE-FUSED-004",
		stratum: "hebrew-fused-material",
		requirements: ["non-whitespace-delimited-fused-material"],
		source: "מהבית יצאנו מוקדם.",
		gold: accepted([
			R("מ"),
			R("ה"),
			R("בית"),
			W(" "),
			R("יצאנו"),
			W(" "),
			R("מוקדם"),
			P("."),
		]),
	},
] as const satisfies readonly HiddenSegmentationCase[];

function deepFreeze<T>(value: T): Readonly<T> {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		Object.freeze(value);
		for (const nested of Object.values(value)) deepFreeze(nested);
	}
	return value;
}

export const HIDDEN_SEGMENTATION_CASES = deepFreeze(cases);
