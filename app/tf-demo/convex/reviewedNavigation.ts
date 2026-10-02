import { v } from "convex/values";
import { readingIdentityKey } from "../server/linguisticIdentity";
import { parseGermanReading } from "../server/operationalParsing";
import { type MutationCtx, mutation } from "./_generated/server";
import { createDumdictTransaction } from "./dumdictTransaction";
import { readingValue } from "./model/occurrenceAttestations";
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
