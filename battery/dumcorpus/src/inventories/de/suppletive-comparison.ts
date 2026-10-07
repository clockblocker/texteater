/** A comparable adverb's positive and its compared forms, as Duden gives them. */
type GermanSuppletiveComparison = {
	readonly positive: string;
	readonly comparative: string;
	/** The adverbial superlative, with its am. */
	readonly superlative: string;
};

/**
 * The adverbs whose compared forms the positive cannot be read off: gern,
 * bald, gut and viel compare from another stem (Rule
 * de/comparability-is-lexical: "suppletive ones included (gern → lieber)"),
 * and wenig is listed beside viel, whose counterpart it is. A compared form
 * cites its positive (Rule de/canonical-form-is-the-headword).
 */
export const germanSuppletiveComparisons: readonly GermanSuppletiveComparison[] =
	[
		{ positive: "gern", comparative: "lieber", superlative: "am liebsten" },
		{ positive: "bald", comparative: "eher", superlative: "am ehesten" },
		{ positive: "gut", comparative: "besser", superlative: "am besten" },
		{ positive: "viel", comparative: "mehr", superlative: "am meisten" },
		{
			positive: "wenig",
			comparative: "weniger",
			superlative: "am wenigsten",
		},
	];
