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
/** Genitive in the written norm, dative in colloquial use (`wegen dem Regen`). */
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
 * It covers the governable prepositions and every adposition Grammatical
 * Resolution produces in its reviewed cases. Case is grammar, not Lemma
 * identity (ADR 0034): no two German ADPs differ by case alone.
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
	bis: only("Acc"),
	durch: only("Acc"),
	für: only("Acc"),
	gegen: only("Acc"),
	ohne: only("Acc"),
	um: only("Acc"),
	// Dative.
	aus: only("Dat"),
	außer: only("Dat"),
	bei: only("Dat"),
	gegenüber: only("Dat"),
	gemäß: only("Dat"),
	mit: only("Dat"),
	nach: only("Dat"),
	seit: only("Dat"),
	von: only("Dat"),
	zu: only("Dat"),
	zuliebe: only("Dat"),
	// Genitive.
	aufgrund: only("Gen"),
	behufs: only("Gen"),
	ob: only("Gen"),
	anstatt: genitiveColloquialDative,
	außerhalb: genitiveColloquialDative,
	"inkl.": genitiveColloquialDative,
	innerhalb: genitiveColloquialDative,
	statt: genitiveColloquialDative,
	trotz: genitiveColloquialDative,
	während: genitiveColloquialDative,
	wegen: genitiveColloquialDative,
	dank: genitiveOrDative,
	entlang: {
		byAdpType: { Post: only("Acc"), Prep: genitiveOrDative },
	},
	// Circumpositions.
	"an ... vorbei": only("Dat"),
	"über ... hinaus": only("Acc"),
	"um ... willen": only("Gen"),
	"von ... an": only("Dat"),
	"von ... aus": only("Dat"),
};

type AdpositionLemma = {
	readonly canonicalForm: string;
	readonly coreFeatures: { readonly adpType?: string | null };
};

/**
 * The cases a German ADP Lemma takes, or null when the ADP Case Table does not
 * list it (a foreign or rare adposition, or `entlang` with no `adpType`).
 */
export function germanAdpositionCases(
	lemma: AdpositionLemma,
): GermanAdpositionCases | null {
	const entry = Object.hasOwn(germanAdpositionCaseTable, lemma.canonicalForm)
		? germanAdpositionCaseTable[lemma.canonicalForm]
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
