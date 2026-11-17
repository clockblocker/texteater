import { defineTable } from "convex/server";
import { v } from "convex/values";

/** A noun unit a pronoun refers to: its Sentence and its Segments there. */
export const antecedentValidator = v.object({
	sentenceId: v.id("sentences"),
	segments: v.array(v.number()),
});

/**
 * Where one explanation is: asked once, by the run that may settle it;
 * answered with its Antecedents, none for an expletive `es`; or failed
 * until someone asks again.
 */
const pronounExplanationStateValidator = v.union(
	v.object({
		kind: v.literal("Pending"),
		run: v.number(),
		startedAt: v.number(),
	}),
	v.object({
		kind: v.literal("Resolved"),
		antecedents: v.array(antecedentValidator),
	}),
	v.object({
		kind: v.literal("Failed"),
		run: v.number(),
		message: v.string(),
	}),
);

/** The explainer's stored answers, shared by every Visitor. */
export const explanationTables = {
	/**
	 * A Pronoun Explanation: what one pronoun unit of a Sentence refers to,
	 * asked once for everyone. The row is the single in-flight marker, so a
	 * second click finds it Pending and asks nothing.
	 */
	pronounExplanations: defineTable({
		scrollId: v.id("scrolls"),
		sentenceId: v.id("sentences"),
		/** The pronoun's Segments, `pronounKey` of them: `"4"`, `"4,6"`. */
		pronounKey: v.string(),
		pronoun: v.array(v.number()),
		state: pronounExplanationStateValidator,
	})
		.index("by_sentence_id_and_pronoun_key", ["sentenceId", "pronounKey"])
		.index("by_scroll_id", ["scrollId"]),
};
