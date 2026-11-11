/**
 * German fusion, clitic and abbreviation data (Dumgen ADR 0004, issue 498),
 * which Dumgen's Segment stage cuts with. Reviewed data: the eight standard
 * preposition-article fusions, the Duden-listed colloquial ones, the spoken
 * verb + du fusions (kannste, #1338), the apostrophe clitics, and the
 * abbreviation table. One-liners are
 * learner-facing German, like authored Knowledge definitions.
 *
 * The types are plain data; Dumgen's fusion table reads these entries as its
 * own `FusionEntry`, `CliticEntry` and `AbbreviationEntry`.
 */

type Register = "Standard" | "Colloquial" | "Dialect";
type Surfaces = string | readonly [string, string, ...string[]];

/** One Segment of a fused word: the letters shown and the surface they stand for. */
type FusionComponent = {
	readonly span: string;
	readonly surface: string;
	readonly role: "Adposition" | "Article" | "Verb" | "Pronoun";
};

/**
 * Article components carry the case the preposition governs in the fusion.
 * The article's Paradigm Cell also depends on the noun's gender (dem Wald,
 * dem Haus), so the noun derives it (system ADR 0032).
 */
type GermanArticleComponent = {
	readonly case: "Dat" | "Acc";
};

/** A preposition and a definite article written as one word. */
type GermanArticleFusion = {
	readonly form: string;
	readonly components: readonly [FusionComponent, FusionComponent];
	readonly oneLiner: string;
	readonly register: Register;
	readonly article: GermanArticleComponent;
};

/** A finite verb and the pronoun du after it written as one word (haste). */
type GermanDuFusion = {
	readonly form: string;
	readonly components: readonly [FusionComponent, FusionComponent];
	readonly oneLiner: string;
	readonly register: Register;
};

type GermanFusion = GermanArticleFusion | GermanDuFusion;

/** An apostrophe clitic: the clitic Segment, apostrophe included. */
type GermanClitic = {
	readonly clitic: string;
	readonly surface: Surfaces;
	readonly role: "Pronoun" | "Article";
	readonly attachment: "Attached" | "Free" | "Both";
	/** Hosts the clitic attaches to, or null for any word. */
	readonly hosts: readonly string[] | null;
	readonly oneLiner: string;
	readonly register: Register;
};

/** An abbreviation: one Segment whose surface is the expansion. */
type GermanAbbreviation = {
	/** The abbreviation as written, dots included. */
	readonly text: string;
	readonly surface: Surfaces;
	/** The whole-unit Kind the expansion resolves to when known. */
	readonly kind: string | null;
	readonly oneLiner: string;
	/** Also written without its final dot, as British usage writes a title (Mr Dursley). */
	readonly dotOptional?: true;
};

const fusion = (
	form: string,
	adposition: readonly [span: string, surface: string],
	article: readonly [span: string, surface: string],
	grammaticalCase: GermanArticleComponent["case"],
	oneLiner: string,
	register: Register = "Standard",
): GermanArticleFusion => ({
	form,
	components: [
		{ span: adposition[0], surface: adposition[1], role: "Adposition" },
		{ span: article[0], surface: article[1], role: "Article" },
	],
	oneLiner,
	register,
	article: { case: grammaticalCase },
});

/**
 * A spoken verb + du fusion: the verb's second person without its final t,
 * then te for „du“ (kannste is kanns + te, „kannst du“). Its first piece stands
 * for the finite verb and its second for the pronoun.
 */
const duFusion = (verb: string, example: string): GermanDuFusion => {
	const span = verb.slice(0, -1);
	const form = `${span}te`;
	return {
		form,
		components: [
			{ span, surface: verb, role: "Verb" },
			{ span: "te", surface: "du", role: "Pronoun" },
		],
		oneLiner: `„${form}“ ist umgangssprachlich „${verb} du“: Verb und Pronomen, zu einem Wort verschmolzen (${example}).`,
		register: "Colloquial",
	};
};

/**
 * Verb + du fusions of spoken German and its written dialogue (Duden lists
 * haste as umgangssprachlich). No pattern rule finds them, since -ste and -te
 * are also past-tense endings: a spelling is listed only when it is no other
 * form of a German word a reader meets. musste (musst du) is the past of
 * müssen, so it is never listed, nor sollte, hasste, küsste, reiste or
 * wusste, nor weißte (weißt du), the past of weißen (Er weißte die Wand).
 * haste (hast du) is also the first person of hasten (Ich haste zum Zug),
 * which jev's Segment Choice cut as hast du at 0.63 to 0.87 (#1341). It is
 * listed all the same, as the most frequent of them: a reader of the
 * inventory must keep it whole beside a subject of its own (ich, er, wir,
 * man), which a word that holds du never has.
 */
const duFusions: readonly GermanDuFusion[] = [
	duFusion("hast", "Haste das gesehen?"),
	duFusion("bist", "Biste müde?"),
	duFusion("kannst", "Kannste mir helfen?"),
	duFusion("willst", "Willste mitkommen?"),
	duFusion("siehst", "Siehste, ich hatte recht."),
	duFusion("kommst", "Kommste heute?"),
	duFusion("gehst", "Gehste mit?"),
	duFusion("machst", "Was machste da?"),
	duFusion("glaubst", "Glaubste das?"),
	duFusion("meinst", "Meinste wirklich?"),
	duFusion("darfst", "Darfste das?"),
	duFusion("wirst", "Wirste schon sehen."),
	duFusion("hörst", "Hörste mich?"),
];

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
	...duFusions,
];

/**
 * Apostrophe clitics (issue 492, groups 1, 2 and 5). The apostrophe belongs
 * to the clitic Segment: geht's is [[gehen|geht]][[es|'s]]. Free forms are
 * one Segment normalized to the full article. Elision inside one word
 * (hab', 'nabend) and name genitives (Max') are not clitics.
 */
export const germanClitics: readonly GermanClitic[] = [
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
	surface: GermanAbbreviation["surface"],
	kind: string | null,
	oneLiner: string,
	options: Pick<GermanAbbreviation, "dotOptional"> = {},
): GermanAbbreviation => ({ text, surface, kind, oneLiner, ...options });

/**
 * Abbreviations are one Segment whose surface is the expansion. Multi-word
 * expansions are Locutions whose Kind is the part of speech the whole acts as
 * (ADR 0039), not Collocations. No code reads an entry's Kind: it records the
 * issue 498 rulings (z.B., z.T., u.a., usw., o.ä., v.a., i.A., d.h., bzw. and
 * Dipl.-Ing., plus vgl. and sog. accepted in its review), and the rest are the
 * obvious whole-unit Kind, still open to review. Candidate surfaces mark an
 * ambiguous abbreviation the sentence must decide.
 */
export const germanAbbreviations: readonly GermanAbbreviation[] = [
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
	// Duden lists the English titles as German nouns (der Mister, die
	// Missis); British usage writes them without the dot (Mr und Mrs Dursley).
	abbreviation(
		"Mr.",
		"Mister",
		"NOUN",
		"„Mr.“ steht für die englische Anrede „Mister“: Herr.",
		{ dotOptional: true },
	),
	abbreviation(
		"Mrs.",
		"Missis",
		"NOUN",
		"„Mrs.“ steht für die englische Anrede „Missis“: Frau.",
		{ dotOptional: true },
	),
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
		["Million", "Millionen"],
		"NOUN",
		"„Mio.“ steht für „Million“ oder „Millionen“.",
	),
	abbreviation(
		"Mrd.",
		["Milliarde", "Milliarden"],
		"NOUN",
		"„Mrd.“ steht für „Milliarde“ oder „Milliarden“.",
	),
];
