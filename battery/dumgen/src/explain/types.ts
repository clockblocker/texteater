/**
 * What `explain.pronoun` takes and gives: a passage of Sentences that ends
 * with the pronoun's, the pronoun's Segments, and the noun units the
 * answer may name; out come the candidates the pronoun refers to.
 */

/** One Segment of a passage Sentence, numbered as the host numbers it. */
type PassageSegment = {
	readonly index: number;
	readonly text: string;
};

/** One Sentence of the passage, as much of it as the host gives. */
export type PassageSentence = {
	/** Its Segments in reading order; a cut Sentence holds only its last ones. */
	readonly segments: readonly PassageSegment[];
	/**
	 * The noun and proper-noun units the answer may name, each by its
	 * Segments' `index` numbers. The host picks them; `explain.pronoun`
	 * names nothing else.
	 */
	readonly candidates: readonly (readonly number[])[];
	/** The Sentence's start was cut off, so the passage begins mid-Sentence. */
	readonly cut?: true;
};

export type ExplainPronounInput = {
	/** The passage's language; German (`de`) only, so far. */
	readonly language: "de";
	/** The context before the pronoun, then the pronoun's Sentence, last. */
	readonly passage: readonly PassageSentence[];
	/** The pronoun's Segments, by `index` in the last Sentence. */
	readonly pronoun: readonly number[];
};

/** A candidate the pronoun refers to: its Sentence in the passage and its Segments. */
export type Antecedent = {
	/** The Sentence's position in `passage`. */
	readonly sentence: number;
	/** The candidate's Segments, as the host gave them. */
	readonly segments: readonly number[];
};
