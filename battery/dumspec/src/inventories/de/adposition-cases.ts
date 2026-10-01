/** A case a German adposition assigns to its complement. */
export type GermanAdpositionCase = "Acc" | "Dat" | "Gen";

/**
 * Where a German adposition stands: before its complement (`wegen des
 * Sturms`) or after it (`des Nebels wegen`). These are the table's own
 * labels: no Lemma or Attestation records the position, since the sentence
 * shows it (ADR 0032).
 */
export type GermanAdpositionPosition = "Prep" | "Post";

/** The cases a German adposition takes in one position, or a Locution ADP's. */
export type GermanAdpositionCases = {
	/** Every case it takes there, a colloquial one included. */
	readonly allowed: readonly GermanAdpositionCase[];
	/** The normative case when another allowed case is colloquial (`wegen` Gen), else null. */
	readonly preferred: GermanAdpositionCase | null;
	/** Acc answers wohin?, Dat answers wo? (`auf den Tisch`, `auf dem Tisch`). */
	readonly twoWay: boolean;
};

/**
 * Each position a Lexeme ADP takes, with that position's cases. A position
 * it doesn't list isn't allowed.
 */
export type GermanAdpositionPositions = Readonly<
	Partial<Record<GermanAdpositionPosition, GermanAdpositionCases>>
>;

/**
 * One ADP Case Table entry: a Lexeme ADP's positions, or a Locution ADP's one
 * case set. A Locution ADP has no position, since its words are its
 * Canonical Form (`um … willen`, `im Vergleich zu`).
 */
export type GermanAdpositionEntry =
	| {
			readonly family: "Lexeme";
			readonly positions: GermanAdpositionPositions;
	  }
	| { readonly family: "Locution"; readonly cases: GermanAdpositionCases };

const only = (
	grammaticalCase: GermanAdpositionCase,
): GermanAdpositionCases => ({
	allowed: [grammaticalCase],
	preferred: null,
	twoWay: false,
});
const twoWay: GermanAdpositionCases = {
	allowed: ["Acc", "Dat"],
	preferred: null,
	twoWay: true,
};
/** Genitive in the written norm, dative in colloquial or regional use (`wegen dem Regen`). */
const genitiveColloquialDative: GermanAdpositionCases = {
	allowed: ["Gen", "Dat"],
	preferred: "Gen",
	twoWay: false,
};
const genitiveOrDative: GermanAdpositionCases = {
	allowed: ["Gen", "Dat"],
	preferred: null,
	twoWay: false,
};
/** A bare complement that shows no case (`Porto inklusive`). */
const caseless: GermanAdpositionCases = {
	allowed: [],
	preferred: null,
	twoWay: false,
};

/** A preposition: it stands only before its complement. */
const prep = (cases: GermanAdpositionCases): GermanAdpositionPositions => ({
	Prep: cases,
});
/** A postposition: it stands only after its complement (`der Ordnung halber`). */
const post = (cases: GermanAdpositionCases): GermanAdpositionPositions => ({
	Post: cases,
});
/** Either side of its complement, with the same cases (`gemäß den Regeln`, `den Regeln gemäß`). */
const prepOrPost = (
	cases: GermanAdpositionCases,
): GermanAdpositionPositions => ({ Prep: cases, Post: cases });

/**
 * The German Lexeme ADPs, keyed by Canonical Form, each with the positions it
 * takes and the cases for each. It covers the standard adpositions, checked
 * against Duden and grammis, the governable prepositions and every adposition
 * Grammatical Resolution produces in its reviewed cases. `preferred` marks
 * only a split between the written norm and colloquial or regional use; an
 * elevated or rare second case leaves it null. Case is grammar, not Lemma
 * identity (ADR 0034): no two German ADPs differ by case alone. It is a fact
 * about German, so it lives here and not in Dumling (ADR 0041).
 */
const germanAdpositions: Readonly<Record<string, GermanAdpositionPositions>> = {
	// Two-way prepositions.
	an: prep(twoWay),
	auf: prep(twoWay),
	hinter: prep(twoWay),
	in: prep(twoWay),
	neben: prep(twoWay),
	// den ganzen Tag über: a time span, after an accusative.
	über: { Prep: twoWay, Post: only("Acc") },
	unter: prep(twoWay),
	vor: prep(twoWay),
	zwischen: prep(twoWay),
	// Accusative.
	betreffend: post(only("Acc")), // den Vorfall betreffend.
	bis: prep(only("Acc")),
	contra: prep(only("Acc")),
	durch: prepOrPost(only("Acc")), // die ganze Nacht durch.
	für: prep(only("Acc")),
	gegen: prep(only("Acc")),
	je: prep(only("Acc")), // je erwachsenen Teilnehmer.
	kontra: prep(only("Acc")),
	ohne: prep(only("Acc")),
	per: prep(only("Acc")),
	pro: prep(only("Acc")),
	um: prep(only("Acc")),
	versus: prep(only("Acc")),
	via: prep(only("Acc")),
	wider: prep(only("Acc")),
	// Dative.
	aus: prep(only("Dat")),
	außer: prep(only("Dat")),
	bei: prep(only("Dat")),
	entgegen: prep(only("Dat")),
	entsprechend: prepOrPost(only("Dat")), // dem Antrag entsprechend.
	gegenüber: prepOrPost(only("Dat")),
	gemäß: prepOrPost(only("Dat")),
	getreu: prep(only("Dat")),
	gleich: prep(only("Dat")), // Elevated: gleich einem Ball.
	mit: prep(only("Dat")),
	mitsamt: prep(only("Dat")),
	nach: prepOrPost(only("Dat")), // meiner Meinung nach.
	nahe: prep(only("Dat")),
	nächst: prep(only("Dat")), // Elevated, as is zunächst.
	nebst: prep(only("Dat")),
	samt: prep(only("Dat")),
	seit: prep(only("Dat")),
	von: prep(only("Dat")),
	zu: prepOrPost(only("Dat")), // der Stadt zu: towards it.
	zuliebe: post(only("Dat")), // den Kindern zuliebe.
	zunächst: prepOrPost(only("Dat")), // der Straße zunächst.
	zuwider: post(only("Dat")), // dem Gesetz zuwider.
	// Dative, with an accusative for dates and amounts (ab ersten Mai).
	ab: prep({ allowed: ["Dat", "Acc"], preferred: null, twoWay: false }),
	// Dative, with an elevated genitive (binnen eines Jahres).
	binnen: prep({ allowed: ["Dat", "Gen"], preferred: null, twoWay: false }),
	// Genitive.
	abseits: prep(only("Gen")),
	abzüglich: prep(only("Gen")),
	angesichts: prep(only("Gen")),
	anhand: prep(only("Gen")),
	anlässlich: prep(only("Gen")),
	anstelle: prep(only("Gen")),
	aufgrund: prep(only("Gen")),
	aufseiten: prep(only("Gen")),
	behufs: prep(only("Gen")),
	beiderseits: prep(only("Gen")),
	betreffs: prep(only("Gen")),
	bezüglich: prep(only("Gen")),
	diesseits: prep(only("Gen")),
	eingedenk: prepOrPost(only("Gen")), // eingedenk der Gefahr, der Gefahr eingedenk.
	halber: post(only("Gen")), // der Ordnung halber.
	hinsichtlich: prep(only("Gen")),
	infolge: prep(only("Gen")),
	inmitten: prep(only("Gen")),
	jenseits: prep(only("Gen")),
	kraft: prep(only("Gen")),
	mangels: prep(only("Gen")),
	namens: prep(only("Gen")),
	ob: prep(only("Gen")),
	oberhalb: prep(only("Gen")),
	seitens: prep(only("Gen")),
	unbeschadet: prepOrPost(only("Gen")), // unbeschadet seiner Rechte, seiner Rechte unbeschadet.
	ungeachtet: prepOrPost(only("Gen")), // ungeachtet der Warnung, der Warnung ungeachtet.
	unterhalb: prep(only("Gen")),
	unweit: prep(only("Gen")),
	vermöge: prep(only("Gen")),
	vorbehaltlich: prep(only("Gen")),
	zugunsten: prep(only("Gen")),
	zulasten: prep(only("Gen")),
	zuungunsten: prep(only("Gen")),
	zuzüglich: prep(only("Gen")),
	zwecks: prep(only("Gen")),
	// Genitive in the written norm, dative in colloquial or regional use;
	// Duden marks trotz + Dat as southern German, Swiss and Austrian.
	anstatt: prep(genitiveColloquialDative),
	außerhalb: prep(genitiveColloquialDative),
	innerhalb: prep(genitiveColloquialDative),
	statt: prep(genitiveColloquialDative),
	trotz: prep(genitiveColloquialDative),
	während: prep(genitiveColloquialDative),
	// wegen des Sturms, wegen dem Regen; postposed only with the
	// genitive, which Duden labels elevated (des Nebels wegen).
	wegen: { Prep: genitiveColloquialDative, Post: only("Gen") },
	// Genitive or dative, neither preferred: the dative where the genitive
	// is unmarked (einschließlich Getränken), or as an equal or rarer
	// alternative (laut dem Bericht).
	ausschließlich: prep(genitiveOrDative),
	dank: prep(genitiveOrDative),
	einschließlich: { Prep: genitiveOrDative, Post: caseless }, // Sophia einschließlich.
	exklusive: prep(genitiveOrDative),
	fern: prep(genitiveOrDative), // Dat rarer.
	"inkl.": prep(genitiveOrDative),
	inklusive: { Prep: genitiveOrDative, Post: caseless }, // Porto inklusive.
	laut: prep(genitiveOrDative),
	längs: prep(genitiveOrDative),
	mittels: prep(genitiveOrDative),
	// Case by position.
	entlang: {
		// den Fluss entlang; Duden: Dat is Swiss, elsewhere rare.
		Post: { allowed: ["Acc", "Dat"], preferred: "Acc", twoWay: false },
		// entlang des Flusses, entlang dem Fluss.
		Prep: genitiveOrDative,
	},
	zufolge: { Post: only("Dat"), Prep: only("Gen") }, // dem Bericht zufolge.
};

/**
 * The German Locution ADPs, keyed by Canonical Form, each with one case set:
 * the circumpositions (ADR 0039) and the complex prepositions
 * (de/complex-preposition).
 */
const germanLocutionAdpositions: Readonly<
	Record<string, GermanAdpositionCases>
> = {
	"an … entlang": only("Dat"),
	"an … vorbei": only("Dat"),
	"auf … hin": only("Acc"),
	"im Vergleich zu": only("Dat"),
	"über … hinaus": only("Acc"),
	"über … hinweg": only("Acc"),
	"um … herum": only("Acc"),
	"um … willen": only("Gen"),
	"von … an": only("Dat"),
	"von … aus": only("Dat"),
	"von … her": only("Dat"),
	"von … wegen": only("Gen"), // von Amts wegen.
	"zu … hin": only("Dat"),
};

/**
 * A Canonical Form as the table keys it: without letter case, as Lemma
 * identity compares it (ADR 0002), and with a circumposition's open slot as
 * `…`, so an unparsed Lemma's ASCII `...` finds it too.
 */
const tableKey = (canonicalForm: string) =>
	canonicalForm.replaceAll("...", "…").toLocaleLowerCase("de");
const byKey = <T>(table: Readonly<Record<string, T>>) =>
	new Map(
		Object.entries(table).map(([form, value]) => [tableKey(form), value]),
	);
const lexemeEntries = byKey(germanAdpositions);
const locutionEntries = byKey(germanLocutionAdpositions);

/** What the table looks up: an ADP Lemma's Family and Canonical Form. */
type AdpositionLemma = {
	readonly family: string;
	readonly canonicalForm: string;
};

/**
 * The ADP Case Table entry for a German ADP Lemma: a Lexeme ADP's positions
 * with their cases, or a Locution ADP's case set. Null when the table does
 * not list it, which dumspec reports as a missing entry; it never stands for
 * "any case".
 */
export function germanAdpositionEntry(
	lemma: AdpositionLemma,
): GermanAdpositionEntry | null {
	const key = tableKey(lemma.canonicalForm);
	if (lemma.family === "Lexeme") {
		const positions = lexemeEntries.get(key);
		return positions ? { family: "Lexeme", positions } : null;
	}
	if (lemma.family === "Locution") {
		const cases = locutionEntries.get(key);
		return cases ? { family: "Locution", cases } : null;
	}
	return null;
}

/**
 * Every case an entry allows: a Lexeme ADP's across all its positions, in
 * table order, or a Locution ADP's.
 */
export function germanAdpositionAllowedCases(
	entry: GermanAdpositionEntry,
): readonly GermanAdpositionCase[] {
	if (entry.family === "Locution") return entry.cases.allowed;
	return [
		...new Set(
			Object.values(entry.positions).flatMap((cases) => cases.allowed),
		),
	];
}

/**
 * Whether the table lists a German ADP Lemma and one of its positions, or its
 * Locution case set, takes this case. An unlisted ADP takes none.
 */
export function germanAdpositionAllows(
	lemma: AdpositionLemma,
	grammaticalCase: string,
): boolean {
	const entry = germanAdpositionEntry(lemma);
	return (
		entry !== null &&
		(germanAdpositionAllowedCases(entry) as readonly string[]).includes(
			grammaticalCase,
		)
	);
}
