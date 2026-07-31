export type EntryFamily = "Lexeme" | "Phraseme" | "Morpheme" | "Construction";

export type IdentityDecision = "Existing" | "ProposeNew";

export type InherentFeatures = Readonly<Record<string, string>>;

export type EntryCandidate = {
	readonly entryId: string;
	readonly language: "de" | "ru";
	readonly family: EntryFamily;
	readonly subkind: string;
	readonly citationForm: string;
	readonly inherentFeatures: InherentFeatures;
	readonly boundaryGloss: string;
};

export type GoldEntry = {
	readonly decision: IdentityDecision;
	readonly entryId: string | null;
	readonly family: EntryFamily;
	readonly subkind: string;
	readonly citationForm: string;
	readonly inherentFeatures: InherentFeatures;
};

export type EntryCase = {
	readonly id: string;
	readonly group:
		| "baseline"
		| "same-entry"
		| "homonym"
		| "part-of-speech"
		| "new-entry";
	readonly language: "de" | "ru";
	readonly sentence: string;
	readonly normalizedSurface: string;
	readonly surfaceKind: "Citation" | "Inflection";
	readonly inflectionalFeatures: InherentFeatures;
	readonly boundaryPolicyVersion: string;
	readonly candidates: readonly EntryCandidate[];
	readonly gold: GoldEntry;
};

const de = (
	entryId: string,
	family: EntryFamily,
	subkind: string,
	citationForm: string,
	inherentFeatures: InherentFeatures,
	boundaryGloss: string,
): EntryCandidate => ({
	entryId,
	language: "de",
	family,
	subkind,
	citationForm,
	inherentFeatures,
	boundaryGloss,
});

const ru = (entryId: string, boundaryGloss: string): EntryCandidate => ({
	entryId,
	language: "ru",
	family: "Lexeme",
	subkind: "NOUN",
	citationForm: "коса",
	inherentFeatures: { gender: "Fem" },
	boundaryGloss,
});

const MUTTER_PARENT = de(
	"de-e-001",
	"Lexeme",
	"NOUN",
	"Mutter",
	{ gender: "Fem" },
	"mother or female parent; plural Mütter",
);
const MUTTER_NUT = de(
	"de-e-002",
	"Lexeme",
	"NOUN",
	"Mutter",
	{ gender: "Fem" },
	"threaded mechanical nut; plural Muttern",
);
const WOLF_IDIOM = de(
	"de-e-003",
	"Phraseme",
	"Idiom",
	"mit den Wölfen heulen",
	{},
	"join in with a group despite private disagreement",
);
const MITHEULEN = de(
	"de-e-004",
	"Lexeme",
	"VERB",
	"mitheulen",
	{ hasSepPrefix: "mit" },
	"join in howling or figuratively join a chorus",
);
const AUFPASSEN = de(
	"de-e-005",
	"Lexeme",
	"VERB",
	"aufpassen",
	{ hasSepPrefix: "auf" },
	"pay attention or be careful",
);
const AUF_ADP = de(
	"de-e-006",
	"Lexeme",
	"ADP",
	"auf",
	{ adpType: "Prep" },
	"preposition expressing location, direction, or related relation",
);
const BAHNHOF_IDIOM = de(
	"de-e-007",
	"Phraseme",
	"Idiom",
	"nur Bahnhof verstehen",
	{},
	"understand nothing of what is being said",
);
const BAHNHOF_NOUN = de(
	"de-e-008",
	"Lexeme",
	"NOUN",
	"Bahnhof",
	{ gender: "Masc" },
	"railway station",
);
const ROT_ADJ = de(
	"de-e-009",
	"Lexeme",
	"ADJ",
	"rot",
	{},
	"having the color red",
);
const GE_T = de(
	"de-e-010",
	"Morpheme",
	"Circumfix",
	"ge-…-t",
	{},
	"discontinuous German participle marker",
);
const OEFFNEN = de(
	"de-e-011",
	"Lexeme",
	"VERB",
	"öffnen",
	{},
	"open something",
);
const SPIELEN = de("de-e-012", "Lexeme", "VERB", "spielen", {}, "play");
const SCHLOSS = de(
	"de-e-013",
	"Lexeme",
	"NOUN",
	"Schloss",
	{ gender: "Neut" },
	"German boundary policy groups a lock and a palace or castle as one polysemous Lexeme",
);
const SCHLIESSEN = de(
	"de-e-014",
	"Lexeme",
	"VERB",
	"schließen",
	{},
	"close or lock; its past-tense Surface may be schloss",
);
const BANK_FINANCE = de(
	"de-e-015",
	"Lexeme",
	"NOUN",
	"Bank",
	{ gender: "Fem" },
	"financial institution; plural Banken",
);
const BANK_BENCH = de(
	"de-e-016",
	"Lexeme",
	"NOUN",
	"Bank",
	{ gender: "Fem" },
	"bench or long seat; plural Bänke",
);
const LAUT_ADJ = de("de-e-017", "Lexeme", "ADJ", "laut", {}, "loud");
const LAUT_ADP = de(
	"de-e-018",
	"Lexeme",
	"ADP",
	"laut",
	{ adpType: "Prep", governedCase: "Gen" },
	"according to, governed by a following report or source",
);
const LAUFEN_FUNCTION = de(
	"de-e-019",
	"Lexeme",
	"VERB",
	"laufen",
	{},
	"operate or function, including a motor or clock",
);
const LAUFEN_MOVE = de(
	"de-e-020",
	"Lexeme",
	"VERB",
	"laufen",
	{},
	"move by running or walking",
);
const TON_SOUND = de(
	"de-e-021",
	"Lexeme",
	"NOUN",
	"Ton",
	{ gender: "Masc" },
	"sound or musical tone",
);

const KOSA_HAIR = ru("ru-e-001", "a braid or plait of hair");
const KOSA_SCYTHE = ru("ru-e-002", "a long-handled scythe for cutting grass");
const KOSA_SPIT = ru(
	"ru-e-003",
	"a narrow spit or sandbar projecting into water",
);

const caseOf = (
	id: string,
	group: EntryCase["group"],
	language: EntryCase["language"],
	sentence: string,
	normalizedSurface: string,
	surfaceKind: EntryCase["surfaceKind"],
	inflectionalFeatures: InherentFeatures,
	candidates: readonly EntryCandidate[],
	gold: GoldEntry,
): EntryCase => ({
	id,
	group,
	language,
	sentence,
	normalizedSurface,
	surfaceKind,
	inflectionalFeatures,
	boundaryPolicyVersion:
		language === "de" ? "de-entry-boundaries-v1" : "ru-entry-boundaries-v1",
	candidates,
	gold,
});

const existing = (candidate: EntryCandidate): GoldEntry => ({
	decision: "Existing",
	entryId: candidate.entryId,
	family: candidate.family,
	subkind: candidate.subkind,
	citationForm: candidate.citationForm,
	inherentFeatures: candidate.inherentFeatures,
});

export const CORPUS: readonly EntryCase[] = [
	caseOf(
		"DE-01-MUTTER",
		"homonym",
		"de",
		"Meine Mutter kommt morgen.",
		"Mutter",
		"Citation",
		{},
		[MUTTER_PARENT, MUTTER_NUT],
		existing(MUTTER_PARENT),
	),
	caseOf(
		"DE-02-WOLF-IDIOM",
		"baseline",
		"de",
		"Obwohl er anderer Meinung war, heulte er mit.",
		"heulte mit",
		"Inflection",
		{
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
		},
		[WOLF_IDIOM, MITHEULEN],
		existing(WOLF_IDIOM),
	),
	caseOf(
		"DE-03-AUFPASSEN",
		"part-of-speech",
		"de",
		"Pass auf dich auf!",
		"pass auf",
		"Inflection",
		{ mood: "Imp", number: "Sing", person: "2", verbForm: "Fin" },
		[AUFPASSEN, AUF_ADP],
		existing(AUFPASSEN),
	),
	caseOf(
		"DE-04-AUF-ADP",
		"part-of-speech",
		"de",
		"Pass auf dich auf!",
		"auf",
		"Citation",
		{},
		[AUFPASSEN, AUF_ADP],
		existing(AUF_ADP),
	),
	caseOf(
		"DE-05-BAHNHOF-IDIOM",
		"baseline",
		"de",
		"Bei der Erklärung verstand sie nur Bahnhof.",
		"nur Bahnhof",
		"Citation",
		{},
		[BAHNHOF_IDIOM, BAHNHOF_NOUN],
		existing(BAHNHOF_IDIOM),
	),
	caseOf(
		"DE-06-ROT",
		"baseline",
		"de",
		"Sie las das rote Buch.",
		"rote",
		"Inflection",
		{ case: "Acc", degree: "Pos", gender: "Neut", number: "Sing" },
		[ROT_ADJ],
		existing(ROT_ADJ),
	),
	caseOf(
		"DE-07-GE-T",
		"baseline",
		"de",
		"Er hat das Buch geöffnet.",
		"get",
		"Citation",
		{},
		[GE_T, OEFFNEN],
		existing(GE_T),
	),
	caseOf(
		"DE-08-SPIELEN-1P",
		"same-entry",
		"de",
		"Ich spielte.",
		"spielte",
		"Inflection",
		{
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Past",
			verbForm: "Fin",
		},
		[SPIELEN],
		existing(SPIELEN),
	),
	caseOf(
		"DE-09-SPIELEN-3P",
		"same-entry",
		"de",
		"Er spielte.",
		"spielte",
		"Inflection",
		{
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
		},
		[SPIELEN],
		existing(SPIELEN),
	),
	caseOf(
		"DE-10-SCHLOSS-LOCK",
		"same-entry",
		"de",
		"Das Schloss an der Tür klemmt.",
		"Schloss",
		"Citation",
		{},
		[SCHLOSS, SCHLIESSEN],
		existing(SCHLOSS),
	),
	caseOf(
		"DE-11-SCHLOSS-PALACE",
		"same-entry",
		"de",
		"Das Schloss liegt auf einem Hügel.",
		"Schloss",
		"Citation",
		{},
		[SCHLOSS, SCHLIESSEN],
		existing(SCHLOSS),
	),
	caseOf(
		"DE-12-BANK-FINANCE",
		"homonym",
		"de",
		"Die Banken vergeben Kredite.",
		"Banken",
		"Inflection",
		{ case: "Nom", number: "Plur" },
		[BANK_FINANCE, BANK_BENCH],
		existing(BANK_FINANCE),
	),
	caseOf(
		"DE-13-BANK-BENCH",
		"homonym",
		"de",
		"Die Bänke im Park sind nass.",
		"Bänke",
		"Inflection",
		{ case: "Nom", number: "Plur" },
		[BANK_FINANCE, BANK_BENCH],
		existing(BANK_BENCH),
	),
	caseOf(
		"DE-14-LAUT-ADJ",
		"part-of-speech",
		"de",
		"Die Musik ist laut.",
		"laut",
		"Citation",
		{},
		[LAUT_ADJ, LAUT_ADP],
		existing(LAUT_ADJ),
	),
	caseOf(
		"DE-15-LAUT-ADP",
		"part-of-speech",
		"de",
		"Laut Bericht blieb die Straße gesperrt.",
		"laut",
		"Citation",
		{},
		[LAUT_ADJ, LAUT_ADP],
		existing(LAUT_ADP),
	),
	caseOf(
		"DE-16-LAUFEN-MOTOR",
		"same-entry",
		"de",
		"Der Motor läuft.",
		"läuft",
		"Inflection",
		{
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		[LAUFEN_FUNCTION, LAUFEN_MOVE],
		existing(LAUFEN_FUNCTION),
	),
	caseOf(
		"DE-17-LAUFEN-CLOCK",
		"same-entry",
		"de",
		"Die Uhr läuft.",
		"läuft",
		"Inflection",
		{
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		[LAUFEN_FUNCTION, LAUFEN_MOVE],
		existing(LAUFEN_FUNCTION),
	),
	caseOf(
		"RU-01-KOSA-HAIR",
		"homonym",
		"ru",
		"Она заплела длинную косу.",
		"косу",
		"Inflection",
		{ case: "Acc", number: "Sing" },
		[KOSA_HAIR, KOSA_SCYTHE, KOSA_SPIT],
		existing(KOSA_HAIR),
	),
	caseOf(
		"RU-02-KOSA-SCYTHE",
		"homonym",
		"ru",
		"Крестьянин точил косу перед покосом.",
		"косу",
		"Inflection",
		{ case: "Acc", number: "Sing" },
		[KOSA_HAIR, KOSA_SCYTHE, KOSA_SPIT],
		existing(KOSA_SCYTHE),
	),
	caseOf(
		"RU-03-KOSA-SPIT",
		"homonym",
		"ru",
		"Песчаная коса далеко выдаётся в море.",
		"коса",
		"Citation",
		{},
		[KOSA_HAIR, KOSA_SCYTHE, KOSA_SPIT],
		existing(KOSA_SPIT),
	),
	caseOf(
		"DE-18-TON-NEW",
		"new-entry",
		"de",
		"Der Töpfer formte den Ton.",
		"Ton",
		"Citation",
		{},
		[TON_SOUND],
		{
			decision: "ProposeNew",
			entryId: null,
			family: "Lexeme",
			subkind: "NOUN",
			citationForm: "Ton",
			inherentFeatures: { gender: "Masc" },
		},
	),
];
