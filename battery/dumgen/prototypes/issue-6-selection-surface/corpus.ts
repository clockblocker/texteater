export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type Segment = {
	readonly kind: SegmentKind;
	readonly text: string;
};

export type CorpusSentence = {
	readonly id: string;
	readonly language: "de" | "en";
	readonly segments: readonly Segment[];
};

export type GoldCase = {
	readonly id: string;
	readonly sentence: CorpusSentence;
	readonly clickedSegmentIndex: number;
	readonly surfaceSegmentIndices: readonly number[];
	readonly attestedSurface: string;
	readonly selectedOrthography: "Standard" | "Typo";
	readonly normalizedSurface: string;
	readonly spelling: "Canonical" | "Variant";
	readonly realizationCoverage: "Full" | "Partial";
};

const R = (text: string): Segment => ({ kind: "ResolvableText", text });
const W = (text = " "): Segment => ({ kind: "Whitespace", text });
const P = (text: string): Segment => ({ kind: "Punctuation", text });

const sentences = {
	"CR-01": sentence("CR-01", "de", [R("Mutter"), P(".")]),
	"CR-02": sentence("CR-02", "en", [
		R("Mark"),
		W(),
		R("gvae"),
		W(),
		R("up"),
		W(),
		R("on"),
		W(),
		R("it"),
		P("."),
	]),
	"CR-03": sentence("CR-03", "en", [R("u"), W(), R("r"), W(), R("him")]),
	"CR-04": sentence("CR-04", "de", [
		R("Er"),
		W(),
		R("heulte"),
		W(),
		R("mit"),
		P("."),
	]),
	"CR-05": sentence("CR-05", "de", [
		R("Pass"),
		W(),
		R("auf"),
		W(),
		R("dich"),
		W(),
		R("auf"),
		P("!"),
	]),
	"CR-06": sentence("CR-06", "de", [R("Nur"), W(), R("Bahnhof"), P("!")]),
	"CR-07": sentence("CR-07", "de", [
		R("Sie"),
		W(),
		R("las"),
		W(),
		R("das"),
		W(),
		R("rote"),
		W(),
		R("Buch"),
		P("."),
	]),
	"CR-08": sentence("CR-08", "de", [
		R("Er"),
		W(),
		R("hat"),
		W(),
		R("das"),
		W(),
		R("Buch"),
		W(),
		R("ge"),
		R("öffne"),
		R("t"),
		P("."),
	]),
	"CR-09": sentence("CR-09", "en", [
		R("The"),
		W(),
		R("armor"),
		W(),
		R("gleamed"),
		P("."),
	]),
	"CR-10": sentence("CR-10", "en", [
		R("The"),
		W(),
		R("armour"),
		W(),
		R("gleamed"),
		P("."),
	]),
	"CR-11": sentence("CR-11", "en", [
		R("The"),
		W(),
		R("book"),
		W(),
		R("fell"),
		P("."),
	]),
	"CR-12": sentence("CR-12", "en", [
		R("They"),
		W(),
		R("book"),
		W(),
		R("rooms"),
		P("."),
	]),
	"CR-13": sentence("CR-13", "de", [R("Ich"), W(), R("spielte"), P(".")]),
	"CR-14": sentence("CR-14", "de", [R("Er"), W(), R("spielte"), P(".")]),
	"CR-15": sentence("CR-15", "de", [
		R("Das"),
		W(),
		R("Schloss"),
		W(),
		R("an"),
		W(),
		R("der"),
		W(),
		R("Tür"),
		W(),
		R("klemmt"),
		P("."),
	]),
	"CR-16": sentence("CR-16", "de", [
		R("Der"),
		W(),
		R("Motor"),
		W(),
		R("läuft"),
		P("."),
	]),
	"CR-17": sentence("CR-17", "de", [
		R("Die"),
		W(),
		R("Uhr"),
		W(),
		R("läuft"),
		P("."),
	]),
} as const;

export const CORPUS: readonly GoldCase[] = [
	gold("CR-01@0", sentences["CR-01"], 0, [0], "Mutter", "Standard", "Mutter"),
	gold(
		"CR-02@2",
		sentences["CR-02"],
		2,
		[2, 4],
		"gvae up",
		"Typo",
		"gave up",
	),
	gold(
		"CR-02@4",
		sentences["CR-02"],
		4,
		[2, 4],
		"gvae up",
		"Standard",
		"gave up",
	),
	gold(
		"CR-03@0",
		sentences["CR-03"],
		0,
		[0, 2, 4],
		"u r him",
		"Typo",
		"you are him",
	),
	gold(
		"CR-03@2",
		sentences["CR-03"],
		2,
		[0, 2, 4],
		"u r him",
		"Typo",
		"you are him",
	),
	gold(
		"CR-03@4",
		sentences["CR-03"],
		4,
		[0, 2, 4],
		"u r him",
		"Standard",
		"you are him",
	),
	gold(
		"CR-04@2",
		sentences["CR-04"],
		2,
		[2, 4],
		"heulte mit",
		"Standard",
		"heulte mit",
		"Canonical",
		"Partial",
	),
	gold(
		"CR-04@4",
		sentences["CR-04"],
		4,
		[2, 4],
		"heulte mit",
		"Standard",
		"heulte mit",
		"Canonical",
		"Partial",
	),
	gold(
		"CR-05@0",
		sentences["CR-05"],
		0,
		[0, 6],
		"Pass auf",
		"Standard",
		"pass auf",
	),
	gold("CR-05@2", sentences["CR-05"], 2, [2], "auf", "Standard", "auf"),
	gold(
		"CR-05@6",
		sentences["CR-05"],
		6,
		[0, 6],
		"Pass auf",
		"Standard",
		"pass auf",
	),
	gold(
		"CR-06@2",
		sentences["CR-06"],
		2,
		[0, 2],
		"Nur Bahnhof",
		"Standard",
		"nur Bahnhof",
		"Canonical",
		"Partial",
	),
	gold("CR-07@6", sentences["CR-07"], 6, [6], "rote", "Standard", "rote"),
	gold("CR-08@8", sentences["CR-08"], 8, [8, 10], "get", "Standard", "get"),
	gold("CR-08@10", sentences["CR-08"], 10, [8, 10], "get", "Standard", "get"),
	gold("CR-09@2", sentences["CR-09"], 2, [2], "armor", "Standard", "armor"),
	gold(
		"CR-10@2",
		sentences["CR-10"],
		2,
		[2],
		"armour",
		"Standard",
		"armour",
		"Variant",
	),
	gold("CR-11@2", sentences["CR-11"], 2, [2], "book", "Standard", "book"),
	gold("CR-12@2", sentences["CR-12"], 2, [2], "book", "Standard", "book"),
	gold(
		"CR-13@2",
		sentences["CR-13"],
		2,
		[2],
		"spielte",
		"Standard",
		"spielte",
	),
	gold(
		"CR-14@2",
		sentences["CR-14"],
		2,
		[2],
		"spielte",
		"Standard",
		"spielte",
	),
	gold(
		"CR-15@2",
		sentences["CR-15"],
		2,
		[2],
		"Schloss",
		"Standard",
		"Schloss",
	),
	gold("CR-16@4", sentences["CR-16"], 4, [4], "läuft", "Standard", "läuft"),
	gold("CR-17@4", sentences["CR-17"], 4, [4], "läuft", "Standard", "läuft"),
];

function sentence(
	id: string,
	language: "de" | "en",
	segments: readonly Segment[],
): CorpusSentence {
	return { id, language, segments };
}

function gold(
	id: string,
	sentenceValue: CorpusSentence,
	clickedSegmentIndex: number,
	surfaceSegmentIndices: readonly number[],
	attestedSurface: string,
	selectedOrthography: "Standard" | "Typo",
	normalizedSurface: string,
	spelling: "Canonical" | "Variant" = "Canonical",
	realizationCoverage: "Full" | "Partial" = "Full",
): GoldCase {
	return {
		id,
		sentence: sentenceValue,
		clickedSegmentIndex,
		surfaceSegmentIndices,
		attestedSurface,
		selectedOrthography,
		normalizedSurface,
		spelling,
		realizationCoverage,
	};
}
