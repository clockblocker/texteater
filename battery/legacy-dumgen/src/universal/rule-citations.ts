/**
 * A dumspec Rule as a prompt paragraph cites it (system ADR 0037): the Rule's
 * id and the hash of its statement when the paragraph was last checked
 * against it. When dumspec rewords the Rule, `tests/rule-citations.test.ts`
 * fails until someone re-reads the paragraph and cites the new hash. The
 * prompt keeps its own wording; it never copies the Rule's.
 */
interface RuleCitation {
	readonly rule: string;
	readonly hash: string;
}

/** One paragraph of a prompt and the Rules it implements. */
interface ParagraphCitation {
	/** The paragraph's first words, which find it in the prompt text. */
	readonly opens: string;
	readonly implements: readonly RuleCitation[];
}

/**
 * A prompt text whose lines are paragraphs, with the Rules each paragraph
 * implements, in order.
 */
export interface CitingPrompt {
	readonly name: string;
	readonly text: string;
	readonly paragraphs: readonly ParagraphCitation[];
}
