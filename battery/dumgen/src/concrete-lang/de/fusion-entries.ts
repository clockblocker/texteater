import type {
	AbbreviationEntry,
	CliticEntry,
	FusionEntry,
	FusionTable,
} from "../../universal/fusion-table.js";

/**
 * German fusion Entries (Dumgen ADR 0004, issue 498). Reviewed data: the
 * eight standard preposition-article fusions, the Duden-listed colloquial
 * ones, the apostrophe clitics, and the abbreviation table. One-liners are
 * learner-facing German, like authored Knowledge definitions.
 *
 * Article components carry the case the preposition governs in the fusion.
 * The article's Paradigm Cell also depends on the noun's gender (dem Wald,
 * dem Haus), so the noun derives it (system ADR 0032).
 */
export type GermanArticleComponent = {
	readonly case: "Dat" | "Acc";
};

type GermanFusion = FusionEntry & {
	readonly article: GermanArticleComponent;
};

const fusion = (
	form: string,
	adposition: readonly [span: string, surface: string],
	article: readonly [span: string, surface: string],
	grammaticalCase: GermanArticleComponent["case"],
	oneLiner: string,
	register: FusionEntry["register"] = "Standard",
): GermanFusion => ({
	form,
	components: [
		{ span: adposition[0], surface: adposition[1], role: "Adposition" },
		{ span: article[0], surface: article[1], role: "Article" },
	],
	oneLiner,
	register,
	article: { case: grammaticalCase },
});

/** Preposition plus definite article written as one word. */
export const germanFusions: readonly GermanFusion[] = [
	fusion(
		"im",
		["i", "in"],
		["m", "dem"],
		"Dat",
		"„im“ ist „in dem“: Präposition und bestimmter Artikel im Dativ, zu einem Wort verschmolzen (im Wald).",
	),
	fusion(
		"ins",
		["in", "in"],
		["s", "das"],
		"Acc",
		"„ins“ ist „in das“: Präposition und bestimmter Artikel im Akkusativ, zu einem Wort verschmolzen (ins Haus).",
	),
	fusion(
		"zum",
		["zu", "zu"],
		["m", "dem"],
		"Dat",
		"„zum“ ist „zu dem“: Präposition und bestimmter Artikel im Dativ (zum Bahnhof).",
	),
	fusion(
		"zur",
		["zu", "zu"],
		["r", "der"],
		"Dat",
		"„zur“ ist „zu der“: Präposition und weiblicher bestimmter Artikel im Dativ (zur Schule).",
	),
	fusion(
		"am",
		["a", "an"],
		["m", "dem"],
		"Dat",
		"„am“ ist „an dem“: Präposition und bestimmter Artikel im Dativ (am Fenster). Vor einem Superlativ (am besten) ist es keine Verschmelzung.",
	),
	fusion(
		"ans",
		["an", "an"],
		["s", "das"],
		"Acc",
		"„ans“ ist „an das“: Präposition und bestimmter Artikel im Akkusativ (ans Meer).",
	),
	fusion(
		"beim",
		["bei", "bei"],
		["m", "dem"],
		"Dat",
		"„beim“ ist „bei dem“: Präposition und bestimmter Artikel im Dativ (beim Arzt).",
	),
	fusion(
		"vom",
		["vo", "von"],
		["m", "dem"],
		"Dat",
		"„vom“ ist „von dem“: Präposition und bestimmter Artikel im Dativ (vom Bahnhof).",
	),
	// Duden lists these as colloquial written fusions; the reader meets them in
	// informal text and dialogue.
	fusion(
		"aufs",
		["auf", "auf"],
		["s", "das"],
		"Acc",
		"„aufs“ ist umgangssprachlich „auf das“ (aufs Dach).",
		"Colloquial",
	),
	fusion(
		"durchs",
		["durch", "durch"],
		["s", "das"],
		"Acc",
		"„durchs“ ist umgangssprachlich „durch das“ (durchs Fenster).",
		"Colloquial",
	),
	fusion(
		"fürs",
		["für", "für"],
		["s", "das"],
		"Acc",
		"„fürs“ ist umgangssprachlich „für das“ (fürs Erste).",
		"Colloquial",
	),
	fusion(
		"ums",
		["um", "um"],
		["s", "das"],
		"Acc",
		"„ums“ ist umgangssprachlich „um das“ (ums Haus).",
		"Colloquial",
	),
	fusion(
		"übers",
		["über", "über"],
		["s", "das"],
		"Acc",
		"„übers“ ist umgangssprachlich „über das“ (übers Wochenende).",
		"Colloquial",
	),
	fusion(
		"unters",
		["unter", "unter"],
		["s", "das"],
		"Acc",
		"„unters“ ist umgangssprachlich „unter das“ (unters Bett).",
		"Colloquial",
	),
	fusion(
		"hinters",
		["hinter", "hinter"],
		["s", "das"],
		"Acc",
		"„hinters“ ist umgangssprachlich „hinter das“ (hinters Haus).",
		"Colloquial",
	),
	fusion(
		"vors",
		["vor", "vor"],
		["s", "das"],
		"Acc",
		"„vors“ ist umgangssprachlich „vor das“ (vors Tor).",
		"Colloquial",
	),
	fusion(
		"überm",
		["über", "über"],
		["m", "dem"],
		"Dat",
		"„überm“ ist umgangssprachlich „über dem“ (überm Tisch).",
		"Colloquial",
	),
	fusion(
		"unterm",
		["unter", "unter"],
		["m", "dem"],
		"Dat",
		"„unterm“ ist umgangssprachlich „unter dem“ (unterm Bett).",
		"Colloquial",
	),
	fusion(
		"hinterm",
		["hinter", "hinter"],
		["m", "dem"],
		"Dat",
		"„hinterm“ ist umgangssprachlich „hinter dem“ (hinterm Haus).",
		"Colloquial",
	),
	fusion(
		"vorm",
		["vor", "vor"],
		["m", "dem"],
		"Dat",
		"„vorm“ ist umgangssprachlich „vor dem“ (vorm Fenster).",
		"Colloquial",
	),
];

/**
 * Apostrophe clitics (issue 492, groups 1, 2 and 5). The apostrophe belongs
 * to the clitic Segment: geht's is [[gehen|geht]][[es|'s]]. Free forms are
 * one Segment normalized to the full article. Elision inside one word
 * (hab', 'nabend) and name genitives (Max') are not clitics.
 */
export const germanClitics: readonly CliticEntry[] = [
	{
		clitic: "'s",
		surface: ["es", "das"],
		role: "Pronoun",
		attachment: "Both",
		hosts: null,
		oneLiner:
			"„'s“ ist meist das verkürzte Pronomen „es“ (geht's, hab's, wenn's); in süddeutscher Umgangssprache steht es auch für den Artikel „das“ ('s Wetter).",
		register: "Colloquial",
	},
	{
		clitic: "'m",
		surface: "dem",
		role: "Article",
		attachment: "Attached",
		hosts: null,
		oneLiner:
			"„'m“ ist der verkürzte Artikel „dem“ nach einer Präposition (auf'm Tisch, mit'm Rad).",
		register: "Colloquial",
	},
	{
		clitic: "'n",
		surface: ["ein", "den"],
		role: "Article",
		attachment: "Both",
		hosts: null,
		oneLiner:
			"„'n“ ist ein verkürzter Artikel: „ein“ (so 'n Ding) oder „den“ nach einer Präposition (in'n Garten); der Satz entscheidet.",
		register: "Colloquial",
	},
	{
		clitic: "'ne",
		surface: "eine",
		role: "Article",
		attachment: "Both",
		hosts: null,
		oneLiner: "„'ne“ ist der verkürzte Artikel „eine“ ('ne Frage).",
		register: "Colloquial",
	},
	{
		clitic: "'nen",
		surface: "einen",
		role: "Article",
		attachment: "Both",
		hosts: null,
		oneLiner: "„'nen“ ist der verkürzte Artikel „einen“ ('nen Kaffee).",
		register: "Colloquial",
	},
	{
		clitic: "'nem",
		surface: "einem",
		role: "Article",
		attachment: "Both",
		hosts: null,
		oneLiner: "„'nem“ ist der verkürzte Artikel „einem“ (mit 'nem Freund).",
		register: "Colloquial",
	},
	{
		clitic: "'ner",
		surface: "einer",
		role: "Article",
		attachment: "Both",
		hosts: null,
		oneLiner:
			"„'ner“ ist der verkürzte Artikel „einer“ (bei 'ner Freundin).",
		register: "Colloquial",
	},
];

const abbreviation = (
	text: string,
	surface: AbbreviationEntry["surface"],
	kind: string | null,
	oneLiner: string,
): AbbreviationEntry => ({ text, surface, kind, oneLiner });

/**
 * Abbreviations are one Segment whose surface is the expansion. Multi-word
 * expansions are multi-member Lexemes with a whole-unit Kind (ADR 0009), not
 * Collocations; the Kinds ruled on issue 498 are marked, the rest are the
 * obvious whole-unit Kind and stay open to review. Candidate surfaces mark an
 * ambiguous abbreviation the sentence must decide.
 */
export const germanAbbreviations: readonly AbbreviationEntry[] = [
	abbreviation(
		"bzw.",
		"beziehungsweise",
		"CCONJ",
		"„bzw.“ steht für „beziehungsweise“: oder genauer gesagt, je nachdem.",
	),
	abbreviation("ca.", "circa", "ADV", "„ca.“ steht für „circa“: ungefähr."),
	abbreviation(
		"evtl.",
		"eventuell",
		"ADV",
		"„evtl.“ steht für „eventuell“: möglicherweise, unter Umständen.",
	),
	abbreviation(
		"ggf.",
		"gegebenenfalls",
		"ADV",
		"„ggf.“ steht für „gegebenenfalls“: wenn es nötig oder passend ist.",
	),
	abbreviation(
		"vgl.",
		"vergleiche",
		"VERB",
		"„vgl.“ steht für „vergleiche“: ein Verweis auf eine andere Stelle.",
	),
	abbreviation("Nr.", "Nummer", "NOUN", "„Nr.“ steht für „Nummer“."),
	abbreviation(
		"z.B.",
		"zum Beispiel",
		"ADV",
		"„z.B.“ steht für „zum Beispiel“ und leitet ein Beispiel ein.",
	),
	abbreviation(
		"d.h.",
		"das heißt",
		"CCONJ",
		"„d.h.“ steht für „das heißt“ und leitet eine Erklärung ein.",
	),
	abbreviation(
		"usw.",
		"und so weiter",
		"ADV",
		"„usw.“ steht für „und so weiter“ am Ende einer Aufzählung.",
	),
	abbreviation(
		"u.a.",
		["unter anderem", "und andere"],
		"ADV",
		"„u.a.“ steht für „unter anderem“ oder, nach Namen, für „und andere“; der Satz entscheidet.",
	),
	abbreviation(
		"o.ä.",
		"oder Ähnliches",
		"ADV",
		"„o.ä.“ steht für „oder Ähnliches“ am Ende einer Aufzählung.",
	),
	abbreviation(
		"o.Ä.",
		"oder Ähnliches",
		"ADV",
		"„o.Ä.“ ist die Duden-Schreibung von „o.ä.“: oder Ähnliches.",
	),
	abbreviation(
		"z.T.",
		"zum Teil",
		"ADV",
		"„z.T.“ steht für „zum Teil“: teilweise.",
	),
	abbreviation(
		"v.a.",
		"vor allem",
		"ADV",
		"„v.a.“ steht für „vor allem“: besonders.",
	),
	abbreviation(
		"i.A.",
		["im Allgemeinen", "im Auftrag"],
		"ADV",
		"„i.A.“ steht für „im Allgemeinen“ oder, in Briefen, für „im Auftrag“; der Satz entscheidet.",
	),
	abbreviation(
		"u.U.",
		"unter Umständen",
		"ADV",
		"„u.U.“ steht für „unter Umständen“: möglicherweise.",
	),
	abbreviation(
		"bspw.",
		"beispielsweise",
		"ADV",
		"„bspw.“ steht für „beispielsweise“: zum Beispiel.",
	),
	abbreviation(
		"sog.",
		"sogenannt",
		"ADJ",
		"„sog.“ steht für „sogenannt“ vor einer Bezeichnung.",
	),
	abbreviation(
		"inkl.",
		"inklusive",
		"ADP",
		"„inkl.“ steht für „inklusive“: einschließlich.",
	),
	abbreviation("Abb.", "Abbildung", "NOUN", "„Abb.“ steht für „Abbildung“."),
	abbreviation(
		"Dr.",
		"Doktor",
		"NOUN",
		"„Dr.“ steht für den Titel „Doktor“.",
	),
	abbreviation(
		"Prof.",
		"Professor",
		"NOUN",
		"„Prof.“ steht für den Titel „Professor“.",
	),
	abbreviation(
		"Dipl.-Ing.",
		"Diplom-Ingenieur",
		"NOUN",
		"„Dipl.-Ing.“ steht für den Titel „Diplom-Ingenieur“.",
	),
	abbreviation("Hr.", "Herr", "NOUN", "„Hr.“ steht für die Anrede „Herr“."),
	abbreviation("Fr.", "Frau", "NOUN", "„Fr.“ steht für die Anrede „Frau“."),
	abbreviation(
		"Str.",
		"Straße",
		"NOUN",
		"„Str.“ steht für „Straße“ in Adressen.",
	),
	abbreviation("Tel.", "Telefon", "NOUN", "„Tel.“ steht für „Telefon“."),
	abbreviation(
		"Jh.",
		"Jahrhundert",
		"NOUN",
		"„Jh.“ steht für „Jahrhundert“.",
	),
	abbreviation(
		"Mio.",
		"Million",
		"NOUN",
		"„Mio.“ steht für „Million“ oder „Millionen“.",
	),
	abbreviation(
		"Mrd.",
		"Milliarde",
		"NOUN",
		"„Mrd.“ steht für „Milliarde“ oder „Milliarden“.",
	),
];

export const germanFusionTable: FusionTable = {
	language: "de",
	fusions: germanFusions,
	clitics: germanClitics,
	abbreviations: germanAbbreviations,
};
