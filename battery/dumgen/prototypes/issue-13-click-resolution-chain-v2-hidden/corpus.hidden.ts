// PROTOTYPE ONLY — immutable evaluator gold for GitHub issue #13.
//
// Prompt Sources and example builders must never import this module.
// blind-inference-input.ts is the only runner-facing projection.

export const CORPUS_VERSION = "click-resolution-chain-v2-hidden" as const;

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type Segment = Readonly<{
	kind: SegmentKind;
	text: string;
}>;

export type SegmentedSentence = Readonly<{
	id: `crc2_sentence_${string}`;
	language: "de" | "en";
	segments: readonly Segment[];
}>;

export type ClickStratum =
	| "simple-citation"
	| "repeated-token-particle"
	| "clicked-or-nonclicked-typo"
	| "discontinuous-morpheme"
	| "partial-phraseme"
	| "non-phraseme-control"
	| "canonical-or-variant-spelling"
	| "citation-or-inflection";

export type ClickRequirement =
	| "repeated-identical-token"
	| "governed-vs-detached-particle"
	| "discontinuous-morpheme-excludes-stem"
	| "partial-phraseme"
	| "non-phraseme-control"
	| "clicked-typo"
	| "non-clicked-typo"
	| "canonical-spelling"
	| "variant-spelling"
	| "citation-surface"
	| "inflection-surface"
	| "full-coverage"
	| "partial-coverage"
	| "zero-insertion"
	| "zero-lemmatization";

export type EntryReference = Readonly<{
	key: string;
	citationForm: string;
	family: "Lexeme" | "Phraseme" | "Morpheme";
	subkind: "NOUN" | "VERB" | "ADP" | "ADJ" | "Idiom" | "Circumfix";
}>;

export type NormalizedMember = Readonly<{
	index: number;
	normalizedText: string;
}>;

export type SelectionSurfaceGold = Readonly<{
	surfaceSegmentIndices: readonly number[];
	attestedSurface: string;
	selectedOrthography: "Standard" | "Typo";
	normalizedMembers: readonly NormalizedMember[];
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	realizationCoverage: "Full" | "Partial";
	surfaceKind: "Citation" | "Inflection";
	inflectionalFeatures: Readonly<Record<string, string>>;
	entry: EntryReference;
	forbiddenNormalizedSurfaces: readonly string[];
}>;

export type HiddenClickCase = Readonly<{
	id: `CRC2-${string}`;
	stratum: ClickStratum;
	requirements: readonly ClickRequirement[];
	sentence: SegmentedSentence;
	clickedSegmentIndex: number;
	gold: SelectionSurfaceGold;
}>;

const R = (text: string): Segment => ({ kind: "ResolvableText", text });
const W = (): Segment => ({ kind: "Whitespace", text: " " });
const P = (text: string): Segment => ({ kind: "Punctuation", text });

const sentences = {
	lantern: sentence("crc2_sentence_lantern", "de", [R("Laterne"), P(".")]),
	repeatedParticle: sentence("crc2_sentence_repeated_particle", "de", [
		R("Ruf"),
		W(),
		R("den"),
		W(),
		R("Arzt"),
		W(),
		R("an"),
		W(),
		R("der"),
		W(),
		R("Rezeption"),
		W(),
		R("an"),
		P("."),
	]),
	nonclickedTypo: sentence("crc2_sentence_nonclicked_typo", "en", [
		R("Mia"),
		W(),
		R("loked"),
		W(),
		R("the"),
		W(),
		R("number"),
		W(),
		R("up"),
		P("."),
	]),
	circumfix: sentence("crc2_sentence_circumfix", "de", [
		R("Wir"),
		W(),
		R("sind"),
		W(),
		R("gestern"),
		W(),
		R("ge"),
		R("fahr"),
		R("en"),
		P("."),
	]),
	partialIdiom: sentence("crc2_sentence_partial_idiom", "de", [
		R("Jetzt"),
		W(),
		R("reinen"),
		W(),
		R("Tisch"),
		P("!"),
	]),
	ordinaryPhrase: sentence("crc2_sentence_ordinary_phrase", "de", [
		R("Der"),
		W(),
		R("Schreiner"),
		W(),
		R("hob"),
		W(),
		R("den"),
		W(),
		R("runden"),
		W(),
		R("Tisch"),
		P("."),
	]),
	canonicalPortemonnaie: sentence(
		"crc2_sentence_canonical_portemonnaie",
		"de",
		[
			R("Das"),
			W(),
			R("Portemonnaie"),
			W(),
			R("war"),
			W(),
			R("leer"),
			P("."),
		],
	),
	variantPortmonee: sentence("crc2_sentence_variant_portmonee", "de", [
		R("Sein"),
		W(),
		R("Portmonee"),
		W(),
		R("blieb"),
		W(),
		R("zu"),
		W(),
		R("Hause"),
		P("."),
	]),
	sehenCitation: sentence("crc2_sentence_sehen_citation", "de", [
		R("Wir"),
		W(),
		R("wollen"),
		W(),
		R("sehen"),
		P("."),
	]),
	sehenInflection: sentence("crc2_sentence_sehen_inflection", "de", [
		R("Gestern"),
		W(),
		R("sahen"),
		W(),
		R("wir"),
		W(),
		R("Sterne"),
		P("."),
	]),
} as const;

const entries = {
	lantern: entry("E2-DE-LATERNE", "Laterne", "Lexeme", "NOUN"),
	anrufen: entry("E2-DE-ANRUFEN", "anrufen", "Lexeme", "VERB"),
	anAdposition: entry("E2-DE-AN-ADP", "an", "Lexeme", "ADP"),
	lookUp: entry("E2-EN-LOOK-UP", "look up", "Lexeme", "VERB"),
	geEn: entry("E2-DE-GE-EN", "ge-…-en", "Morpheme", "Circumfix"),
	cleanSlate: entry(
		"E2-DE-REINEN-TISCH-MACHEN",
		"reinen Tisch machen",
		"Phraseme",
		"Idiom",
	),
	rund: entry("E2-DE-RUND", "rund", "Lexeme", "ADJ"),
	portemonnaie: entry("E2-DE-PORTEMONNAIE", "Portemonnaie", "Lexeme", "NOUN"),
	sehen: entry("E2-DE-SEHEN", "sehen", "Lexeme", "VERB"),
} as const;

const cases = [
	clickCase(
		"CRC2-SIMPLE-001",
		"simple-citation",
		["canonical-spelling", "citation-surface", "full-coverage"],
		sentences.lantern,
		0,
		gold([0], "Laterne", "Standard", [[0, "Laterne"]], {
			entry: entries.lantern,
		}),
	),
	clickCase(
		"CRC2-REPEAT-001-VERB",
		"repeated-token-particle",
		[
			"repeated-identical-token",
			"governed-vs-detached-particle",
			"canonical-spelling",
			"inflection-surface",
			"full-coverage",
			"zero-insertion",
			"zero-lemmatization",
		],
		sentences.repeatedParticle,
		0,
		gold(
			[0, 12],
			"Ruf an",
			"Standard",
			[
				[0, "ruf"],
				[12, "an"],
			],
			{
				entry: entries.anrufen,
				surfaceKind: "Inflection",
				features: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					verbForm: "Fin",
				},
				forbidden: ["anrufen", "ruf den Arzt an"],
			},
		),
	),
	clickCase(
		"CRC2-REPEAT-002-GOVERNED",
		"repeated-token-particle",
		[
			"repeated-identical-token",
			"governed-vs-detached-particle",
			"canonical-spelling",
			"citation-surface",
			"full-coverage",
		],
		sentences.repeatedParticle,
		6,
		gold([6], "an", "Standard", [[6, "an"]], {
			entry: entries.anAdposition,
		}),
	),
	clickCase(
		"CRC2-REPEAT-003-PARTICLE",
		"repeated-token-particle",
		[
			"repeated-identical-token",
			"governed-vs-detached-particle",
			"canonical-spelling",
			"inflection-surface",
			"full-coverage",
			"zero-insertion",
			"zero-lemmatization",
		],
		sentences.repeatedParticle,
		12,
		gold(
			[0, 12],
			"Ruf an",
			"Standard",
			[
				[0, "ruf"],
				[12, "an"],
			],
			{
				entry: entries.anrufen,
				surfaceKind: "Inflection",
				features: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					verbForm: "Fin",
				},
				forbidden: ["anrufen", "ruf den Arzt an"],
			},
		),
	),
	clickCase(
		"CRC2-TYPO-001-CLICKED",
		"clicked-or-nonclicked-typo",
		[
			"clicked-typo",
			"canonical-spelling",
			"inflection-surface",
			"full-coverage",
			"zero-lemmatization",
		],
		sentences.nonclickedTypo,
		2,
		gold(
			[2, 8],
			"loked up",
			"Typo",
			[
				[2, "looked"],
				[8, "up"],
			],
			{
				entry: entries.lookUp,
				surfaceKind: "Inflection",
				features: {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Past",
					verbForm: "Fin",
				},
				forbidden: ["look up"],
			},
		),
	),
	clickCase(
		"CRC2-TYPO-002-NONCLICKED",
		"clicked-or-nonclicked-typo",
		[
			"non-clicked-typo",
			"canonical-spelling",
			"inflection-surface",
			"full-coverage",
			"zero-lemmatization",
		],
		sentences.nonclickedTypo,
		8,
		gold(
			[2, 8],
			"loked up",
			"Standard",
			[
				[2, "looked"],
				[8, "up"],
			],
			{
				entry: entries.lookUp,
				surfaceKind: "Inflection",
				features: {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Past",
					verbForm: "Fin",
				},
				forbidden: ["look up"],
			},
		),
	),
	clickCase(
		"CRC2-MORPH-001-PREFIX",
		"discontinuous-morpheme",
		[
			"discontinuous-morpheme-excludes-stem",
			"canonical-spelling",
			"citation-surface",
			"full-coverage",
			"zero-insertion",
		],
		sentences.circumfix,
		6,
		gold(
			[6, 8],
			"geen",
			"Standard",
			[
				[6, "ge"],
				[8, "en"],
			],
			{
				entry: entries.geEn,
				forbidden: ["gefahren", "fahren"],
			},
		),
	),
	clickCase(
		"CRC2-MORPH-002-SUFFIX",
		"discontinuous-morpheme",
		[
			"discontinuous-morpheme-excludes-stem",
			"canonical-spelling",
			"citation-surface",
			"full-coverage",
			"zero-insertion",
		],
		sentences.circumfix,
		8,
		gold(
			[6, 8],
			"geen",
			"Standard",
			[
				[6, "ge"],
				[8, "en"],
			],
			{
				entry: entries.geEn,
				forbidden: ["gefahren", "fahren"],
			},
		),
	),
	clickCase(
		"CRC2-PARTIAL-001-ADJECTIVE",
		"partial-phraseme",
		[
			"partial-phraseme",
			"canonical-spelling",
			"citation-surface",
			"partial-coverage",
			"zero-insertion",
		],
		sentences.partialIdiom,
		2,
		gold(
			[2, 4],
			"reinen Tisch",
			"Standard",
			[
				[2, "reinen"],
				[4, "Tisch"],
			],
			{
				entry: entries.cleanSlate,
				coverage: "Partial",
				forbidden: ["reinen Tisch machen"],
			},
		),
	),
	clickCase(
		"CRC2-PARTIAL-002-NOUN",
		"partial-phraseme",
		[
			"partial-phraseme",
			"canonical-spelling",
			"citation-surface",
			"partial-coverage",
			"zero-insertion",
		],
		sentences.partialIdiom,
		4,
		gold(
			[2, 4],
			"reinen Tisch",
			"Standard",
			[
				[2, "reinen"],
				[4, "Tisch"],
			],
			{
				entry: entries.cleanSlate,
				coverage: "Partial",
				forbidden: ["reinen Tisch machen"],
			},
		),
	),
	clickCase(
		"CRC2-CONTROL-001-ORDINARY-ADJECTIVE",
		"non-phraseme-control",
		[
			"non-phraseme-control",
			"canonical-spelling",
			"inflection-surface",
			"full-coverage",
			"zero-lemmatization",
		],
		sentences.ordinaryPhrase,
		8,
		gold([8], "runden", "Standard", [[8, "runden"]], {
			entry: entries.rund,
			surfaceKind: "Inflection",
			features: {
				case: "Acc",
				degree: "Pos",
				gender: "Masc",
				number: "Sing",
			},
			forbidden: ["rund", "runden Tisch"],
		}),
	),
	clickCase(
		"CRC2-SPELLING-001-CANONICAL",
		"canonical-or-variant-spelling",
		["canonical-spelling", "citation-surface", "full-coverage"],
		sentences.canonicalPortemonnaie,
		2,
		gold([2], "Portemonnaie", "Standard", [[2, "Portemonnaie"]], {
			entry: entries.portemonnaie,
		}),
	),
	clickCase(
		"CRC2-SPELLING-002-VARIANT",
		"canonical-or-variant-spelling",
		["variant-spelling", "citation-surface", "full-coverage"],
		sentences.variantPortmonee,
		2,
		gold([2], "Portmonee", "Standard", [[2, "Portmonee"]], {
			entry: entries.portemonnaie,
			spelling: "Variant",
			forbidden: ["Portemonnaie"],
		}),
	),
	clickCase(
		"CRC2-KIND-001-CITATION",
		"citation-or-inflection",
		["canonical-spelling", "citation-surface", "full-coverage"],
		sentences.sehenCitation,
		4,
		gold([4], "sehen", "Standard", [[4, "sehen"]], {
			entry: entries.sehen,
		}),
	),
	clickCase(
		"CRC2-KIND-002-INFLECTION",
		"citation-or-inflection",
		[
			"canonical-spelling",
			"inflection-surface",
			"full-coverage",
			"zero-lemmatization",
		],
		sentences.sehenInflection,
		2,
		gold([2], "sahen", "Standard", [[2, "sahen"]], {
			entry: entries.sehen,
			surfaceKind: "Inflection",
			features: {
				mood: "Ind",
				number: "Plur",
				person: "1",
				tense: "Past",
				verbForm: "Fin",
			},
			forbidden: ["sehen"],
		}),
	),
] as const satisfies readonly HiddenClickCase[];

function sentence(
	id: SegmentedSentence["id"],
	language: SegmentedSentence["language"],
	segments: readonly Segment[],
): SegmentedSentence {
	return { id, language, segments };
}

function entry(
	key: string,
	citationForm: string,
	family: EntryReference["family"],
	subkind: EntryReference["subkind"],
): EntryReference {
	return { key, citationForm, family, subkind };
}

type GoldOptions = Readonly<{
	entry: EntryReference;
	spelling?: SelectionSurfaceGold["spelling"];
	coverage?: SelectionSurfaceGold["realizationCoverage"];
	surfaceKind?: SelectionSurfaceGold["surfaceKind"];
	features?: Readonly<Record<string, string>>;
	forbidden?: readonly string[];
}>;

function gold(
	surfaceSegmentIndices: readonly number[],
	attestedSurface: string,
	selectedOrthography: SelectionSurfaceGold["selectedOrthography"],
	normalizedMembers: readonly (readonly [number, string])[],
	options: GoldOptions,
): SelectionSurfaceGold {
	return {
		surfaceSegmentIndices,
		attestedSurface,
		selectedOrthography,
		normalizedMembers: normalizedMembers.map(([index, normalizedText]) => ({
			index,
			normalizedText,
		})),
		normalizedSurface: joinNormalized(normalizedMembers, attestedSurface),
		spelling: options.spelling ?? "Canonical",
		realizationCoverage: options.coverage ?? "Full",
		surfaceKind: options.surfaceKind ?? "Citation",
		inflectionalFeatures: options.features ?? {},
		entry: options.entry,
		forbiddenNormalizedSurfaces: options.forbidden ?? [],
	};
}

function joinNormalized(
	members: readonly (readonly [number, string])[],
	attestedSurface: string,
): string {
	if (members.length === 1) return members[0]?.[1] ?? "";
	return attestedSurface.includes(" ")
		? members.map((member) => member[1]).join(" ")
		: members.map((member) => member[1]).join("");
}

function clickCase(
	id: HiddenClickCase["id"],
	stratum: ClickStratum,
	requirements: readonly ClickRequirement[],
	sentenceValue: SegmentedSentence,
	clickedSegmentIndex: number,
	goldValue: SelectionSurfaceGold,
): HiddenClickCase {
	return {
		id,
		stratum,
		requirements,
		sentence: sentenceValue,
		clickedSegmentIndex,
		gold: goldValue,
	};
}

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

export const HIDDEN_CLICK_CASES = deepFreeze(cases);
