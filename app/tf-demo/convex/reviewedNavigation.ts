import { v } from "convex/values";
import { selectNounHeadingArticle } from "dumgen/authored";
import { readingIdentityKey } from "../server/linguisticIdentity";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../server/operationalParsing";
import { type MutationCtx, mutation } from "./_generated/server";
import {
	completeAuthoredComponentKnowledge,
	createDumdictTransaction,
} from "./dumdictTransaction";
import { lemmaValue, readingValue } from "./model/occurrenceAttestations";
import { visitorError } from "./model/validators";
import { reviewedAlternatives } from "./modules/notes/relations";

async function destination(ctx: MutationCtx, readingKey: string) {
	return (
		(
			await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingKey),
				)
				.unique()
		)?._id ?? null
	);
}

/** Materializes only the reviewed Reading selected by this navigation request. */
export const followGrammaticalAlternative = mutation({
	args: { sourceReadingId: v.id("readings"), readingKey: v.string() },
	returns: v.id("readings"),
	handler: async (ctx, { sourceReadingId, readingKey }) => {
		const reading = await ctx.db.get(sourceReadingId);
		const lemma = reading ? await ctx.db.get(reading.lemmaId) : null;
		if (!reading || !lemma) throw new Error("Reading not found.");
		const source = parseGermanReading(readingValue(reading, lemma));
		const selected = reviewedAlternatives(source.lemma).find(
			(alternative) =>
				readingIdentityKey(alternative.reading) === readingKey,
		);
		if (!selected)
			throw visitorError(
				"InvalidInput",
				"This Reading is not a reviewed grammatical alternative.",
			);
		const existing = await destination(ctx, readingKey);
		if (existing) return existing;
		const stored = await createDumdictTransaction(ctx).ensureReadingEntry({
			entry: {
				reading: selected.reading,
				attestedTranslations: [],
				attestations: [],
				notes: "",
			},
		});
		const created = await destination(ctx, readingKey);
		if (stored.status !== "committed" || !created)
			throw new Error("Grammatical alternative could not be stored.");
		return created;
	},
});

/** Opens a noun heading's reviewed article without creating a semantic relation or encounter. */
export const followNounArticle = mutation({
	args: { lemmaId: v.id("lemmas") },
	returns: v.id("readings"),
	handler: async (ctx, { lemmaId }) => {
		const noun = await ctx.db.get(lemmaId);
		if (!noun) throw new Error("Lemma not found.");
		const selected = selectNounHeadingArticle(
			parseGermanLemma(lemmaValue(noun)),
		);
		if (!selected)
			throw new Error("This Lemma has no noun heading article.");
		const readingKey = readingIdentityKey(selected.reading);
		if (!(await destination(ctx, readingKey))) {
			const stored = await createDumdictTransaction(
				ctx,
			).ensureReadingEntry({
				entry: {
					reading: selected.reading,
					knowledge: {
						definition: selected.knowledge.definition,
						translations: selected.knowledge.translations,
					},
					attestedTranslations: [],
					attestations: [],
					notes: "",
				},
			});
			if (stored.status !== "committed")
				throw new Error("The article Reading could not be stored.");
		}
		const reading = await destination(ctx, readingKey);
		if (!reading)
			throw new Error("Article Reading has not been materialized.");
		// An article stored before its reviewed Knowledge was authored is
		// completed here.
		await completeAuthoredComponentKnowledge(ctx, selected.reading);
		return reading;
	},
});
