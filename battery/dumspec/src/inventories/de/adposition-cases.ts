/** A case a German adposition assigns to its complement. */
export type GermanAdpositionCase = "Acc" | "Dat" | "Gen";

/** What the ADP Case Table records for one German adposition. */
export type GermanAdpositionCases = {
	/** Every case the adposition takes, a colloquial one included. */
	readonly allowed: readonly GermanAdpositionCase[];
	/** The normative case when another allowed case is colloquial (`wegen` Gen), else null. */
	readonly preferred: GermanAdpositionCase | null;
	/** Acc answers wohin?, Dat answers wo? (`auf den Tisch`, `auf dem Tisch`). */
	readonly twoWay: boolean;
};

type AdpType = "Prep" | "Post" | "Circ";
type Entry =
	| GermanAdpositionCases
	| { readonly byAdpType: Partial<Record<AdpType, GermanAdpositionCases>> };

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

/**
 * The ADP Case Table: the closed, authored list of German adpositions with
 * the cases each takes, keyed by Canonical Form and, where position changes
 * the case, by `adpType` (`den Fluss entlang` Acc, `entlang des Flusses` Gen).
 * It covers the standard adpositions, checked against Duden, the governable
 * prepositions and every adposition Grammatical Resolution produces in its
 * reviewed cases. `preferred` marks only a split between the written norm and
 * colloquial or regional use; an elevated or rare second case leaves it null.
 * Case is grammar, not Lemma identity (ADR 0034): no two German ADPs differ
 * by case alone. It is a fact about German, so it lives here and not in
 * Dumling (ADR 0041).
 */
const germanAdpositionCaseTable: Readonly<Record<string, Entry>> = {
	// Two-way prepositions.
	an: twoWay,
	auf: twoWay,
	hinter: twoWay,
	in: twoWay,
	neben: twoWay,
	über: twoWay,
	unter: twoWay,
	vor: twoWay,
	zwischen: twoWay,
	// Accusative.
	betreffend: only("Acc"), // Post: den Vorfall betreffend.
	bis: only("Acc"),
	contra: only("Acc"),
	durch: only("Acc"),
	für: only("Acc"),
	gegen: only("Acc"),
	je: only("Acc"), // je erwachsenen Teilnehmer.
	kontra: only("Acc"),
	ohne: only("Acc"),
	per: only("Acc"),
	pro: only("Acc"),
	um: only("Acc"),
	versus: only("Acc"),
	via: only("Acc"),
	wider: only("Acc"),
	// Dative.
	aus: only("Dat"),
	außer: only("Dat"),
	bei: only("Dat"),
	entgegen: only("Dat"),
	entsprechend: only("Dat"),
	gegenüber: only("Dat"),
	gemäß: only("Dat"),
	getreu: only("Dat"),
	gleich: only("Dat"), // Elevated: einem Adler gleich.
	mit: only("Dat"),
	mitsamt: only("Dat"),
	nach: only("Dat"),
	nahe: only("Dat"),
	nächst: only("Dat"), // Elevated, as is zunächst.
	nebst: only("Dat"),
	samt: only("Dat"),
	seit: only("Dat"),
	von: only("Dat"),
	zu: only("Dat"),
	zuliebe: only("Dat"),
	zunächst: only("Dat"),
	zuwider: only("Dat"), // Post: dem Gesetz zuwider.
	// Dative, with an accusative for dates and amounts (ab ersten Mai).
	ab: { allowed: ["Dat", "Acc"], preferred: null, twoWay: false },
	// Dative, with an elevated genitive (binnen eines Jahres).
	binnen: { allowed: ["Dat", "Gen"], preferred: null, twoWay: false },
	// Genitive.
	abseits: only("Gen"),
	abzüglich: only("Gen"),
	angesichts: only("Gen"),
	anhand: only("Gen"),
	anlässlich: only("Gen"),
	anstelle: only("Gen"),
	aufgrund: only("Gen"),
	aufseiten: only("Gen"),
	behufs: only("Gen"),
	beiderseits: only("Gen"),
	betreffs: only("Gen"),
	bezüglich: only("Gen"),
	diesseits: only("Gen"),
	halber: only("Gen"), // Post: der Ordnung halber.
	hinsichtlich: only("Gen"),
	infolge: only("Gen"),
	inmitten: only("Gen"),
	jenseits: only("Gen"),
	kraft: only("Gen"),
	mangels: only("Gen"),
	namens: only("Gen"),
	ob: only("Gen"),
	oberhalb: only("Gen"),
	seitens: only("Gen"),
	ungeachtet: only("Gen"), // Prep and Post: ungeachtet der Warnung, der Warnung ungeachtet.
	unterhalb: only("Gen"),
	unweit: only("Gen"),
	vermöge: only("Gen"),
	vorbehaltlich: only("Gen"),
	zugunsten: only("Gen"),
	zulasten: only("Gen"),
	zuungunsten: only("Gen"),
	zuzüglich: only("Gen"),
	zwecks: only("Gen"),
	// Genitive in the written norm, dative in colloquial or regional use;
	// Duden marks trotz + Dat as southern German, Swiss and Austrian.
	anstatt: genitiveColloquialDative,
	außerhalb: genitiveColloquialDative,
	innerhalb: genitiveColloquialDative,
	statt: genitiveColloquialDative,
	trotz: genitiveColloquialDative,
	während: genitiveColloquialDative,
	wegen: genitiveColloquialDative,
	// Genitive or dative, neither preferred: the dative where the genitive is
	// unmarked (einschließlich Getränken), or as an equal or rarer alternative
	// (laut dem Bericht).
	ausschließlich: genitiveOrDative,
	dank: genitiveOrDative,
	einschließlich: genitiveOrDative,
	exklusive: genitiveOrDative,
	fern: genitiveOrDative, // Dat rarer.
	"inkl.": genitiveOrDative,
	inklusive: genitiveOrDative,
	laut: genitiveOrDative,
	längs: genitiveOrDative,
	mittels: genitiveOrDative,
	// By position.
	entlang: {
		byAdpType: {
			// Duden: Dat is Swiss, elsewhere rare.
			Post: { allowed: ["Acc", "Dat"], preferred: "Acc", twoWay: false },
			Prep: genitiveOrDative,
		},
	},
	zufolge: { byAdpType: { Post: only("Dat"), Prep: only("Gen") } },
	// Circumpositions: Locution ADPs (ADR 0039), found by Canonical Form. No
	// check reads them while a Locution ADP records no case (#652).
	"an … entlang": only("Dat"),
	"an … vorbei": only("Dat"),
	"auf … hin": only("Acc"),
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

type AdpositionLemma = {
	readonly canonicalForm: string;
	readonly coreFeatures: { readonly adpType?: string | null };
};

/**
 * The cases a German ADP Lemma takes, or null when the ADP Case Table does not
 * list it (a foreign or rare adposition, or `entlang` with no `adpType`). A
 * circumposition's open slot is `…`; an unparsed Lemma's ASCII `...` finds it
 * too, as Dumling normalizes it.
 */
export function germanAdpositionCases(
	lemma: AdpositionLemma,
): GermanAdpositionCases | null {
	const key = lemma.canonicalForm.replaceAll("...", "…");
	const entry = Object.hasOwn(germanAdpositionCaseTable, key)
		? germanAdpositionCaseTable[key]
		: undefined;
	if (!entry) return null;
	if (!("byAdpType" in entry)) return entry;
	const adpType = lemma.coreFeatures.adpType;
	return (adpType && entry.byAdpType[adpType as AdpType]) || null;
}

/**
 * Whether a German ADP Lemma can take this case. An adposition the table does
 * not list takes any oblique case.
 */
export function germanAdpositionAllows(
	lemma: AdpositionLemma,
	grammaticalCase: string,
): boolean {
	const cases = germanAdpositionCases(lemma);
	return cases
		? (cases.allowed as readonly string[]).includes(grammaticalCase)
		: ["Acc", "Dat", "Gen"].includes(grammaticalCase);
}
