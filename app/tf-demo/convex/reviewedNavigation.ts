import { v } from "convex/values";
import { selectNounHeadingArticle } from "dumgen/authored";
import { readingIdentityKey } from "../server/linguisticIdentity";
import { parseGermanLemma } from "../server/operationalParsing";
import { internalMutation, internalQuery } from "./_generated/server";
import { bumpDictionaryRevision } from "./dumdictStorage/storage";
import { completeAuthoredComponentKnowledge } from "./dumdictStorage/transaction";
import { lemmaValue, readingValue } from "./model/occurrenceAttestations";
import { lemmaValueValidator, readingValueValidator } from "./model/validators";

export const nounSource = internalQuery({
	args: { lemmaId: v.id("lemmas") },
	returns: lemmaValueValidator,
	handler: async (ctx, { lemmaId }) => {
		const lemma = await ctx.db.get(lemmaId);
		if (!lemma) throw new Error("Lemma not found.");
		return lemmaValue(lemma);
	},
});

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

/** Completes an article entry stored before its reviewed Knowledge was authored. */
export const completeNounArticleKnowledge = internalMutation({
	args: { lemmaId: v.id("lemmas") },
	returns: v.id("readings"),
	handler: async (ctx, { lemmaId }) => {
		const noun = await ctx.db.get(lemmaId);
		const selected = noun
			? selectNounHeadingArticle(parseGermanLemma(lemmaValue(noun)))
			: null;
		if (!selected)
			throw new Error("This Lemma has no noun heading article.");
		const readingKey = readingIdentityKey(selected.reading);
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) => q.eq("readingKey", readingKey))
			.unique();
		if (!reading)
			throw new Error("Article Reading has not been materialized.");
		if (!(await completeAuthoredComponentKnowledge(ctx, selected.reading)))
			return reading._id;
		await bumpDictionaryRevision(ctx);
		return reading._id;
	},
});
