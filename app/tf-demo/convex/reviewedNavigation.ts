import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { readingValue } from "./model/occurrenceAttestations";
import { readingValueValidator } from "./model/validators";

export const source = internalQuery({
	args: { readingId: v.id("readings") },
	returns: readingValueValidator,
	handler: async (ctx, { readingId }) => {
		const reading = await ctx.db.get(readingId);
		if (!reading) throw new Error("Reading not found.");
		const lemma = await ctx.db.get(reading.lemmaId);
		if (!lemma) throw new Error("Lemma not found.");
		return readingValue(reading, lemma);
	},
});
export const destination = internalQuery({
	args: { readingKey: v.string() },
	returns: v.union(v.id("readings"), v.null()),
	handler: async (ctx, { readingKey }) =>
		(
			await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingKey),
				)
				.unique()
		)?._id ?? null,
});
