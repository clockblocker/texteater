import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import {
	findDefinitionText,
	writeDefinitionText,
} from "./model/definitionTexts";
import { loadStoredSegments } from "./model/storedSegments";
import {
	definitionTextStateValidator,
	languageValidator,
	segmentInputValidator,
} from "./model/validators";

const MAX_SENTENCES_PER_DEFINITION = 8;

export const loadSync = internalQuery({
	args: { ownerReadingKey: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			state: definitionTextStateValidator,
			definition: v.optional(v.string()),
			materializedDefinition: v.optional(v.string()),
			textId: v.optional(v.id("texts")),
			language: v.union(v.null(), languageValidator),
		}),
	),
	handler: async (ctx, { ownerReadingKey }) => {
		const row = await findDefinitionText(ctx, ownerReadingKey);
		if (!row) return null;
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", ownerReadingKey),
			)
			.unique();
		const lemma = reading ? await ctx.db.get(reading.lemmaId) : null;
		const language = lemma?.language;
		return {
			state: row.state,
			...(row.definition !== undefined
				? { definition: row.definition }
				: {}),
			...(row.materializedDefinition !== undefined
				? { materializedDefinition: row.materializedDefinition }
				: {}),
			...(row.textId ? { textId: row.textId } : {}),
			language:
				language === "de" || language === "en" || language === "he"
					? language
					: null,
		};
	},
});

export const markRunning = internalMutation({
	args: { ownerReadingKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey }) => {
		const row = await findDefinitionText(ctx, ownerReadingKey);
		if (row && row.state !== "Running") {
			await ctx.db.patch(row._id, {
				state: "Running",
				failureMessage: undefined,
				updatedAt: Date.now(),
			});
		}
		return null;
	},
});

/**
 * Removes the Definition Text's Sentence and Text rows after Analysis
 * Stripping emptied them, and forgets the live pointer. The state row stays
 * so a replacement definition can be written next.
 */
export const deleteTextRows = internalMutation({
	args: { ownerReadingKey: v.string(), textId: v.id("texts") },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey, textId }) => {
		await deleteDefinitionTextRows(ctx, textId);
		const row = await findDefinitionText(ctx, ownerReadingKey);
		if (row?.textId === textId) {
			await ctx.db.patch(row._id, {
				textId: undefined,
				sentenceId: undefined,
				materializedDefinition: undefined,
				updatedAt: Date.now(),
			});
		}
		return null;
	},
});

/** Deletes the state row and any Text rows it still points at. */
export const deleteRows = internalMutation({
	args: { ownerReadingKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey }) => {
		const row = await findDefinitionText(ctx, ownerReadingKey);
		if (!row) return null;
		if (row.textId) await deleteDefinitionTextRows(ctx, row.textId);
		await ctx.db.delete(row._id);
		return null;
	},
});

export const persistSegmented = internalMutation({
	args: {
		ownerReadingKey: v.string(),
		definition: v.string(),
		language: languageValidator,
		segmentedSentenceId: v.string(),
		segments: v.array(segmentInputValidator),
	},
	returns: v.union(v.literal("Ready"), v.literal("Stale")),
	handler: async (ctx, args) => {
		const row = await findDefinitionText(ctx, args.ownerReadingKey);
		if (!row || row.definition !== args.definition) return "Stale";
		if (row.textId) {
			throw new Error(
				"A live Definition Text must be removed before its replacement is written.",
			);
		}
		await writeDefinitionText(ctx, args);
		return "Ready";
	},
});

export const settle = internalMutation({
	args: {
		ownerReadingKey: v.string(),
		outcome: v.union(
			v.object({ kind: v.literal("Ready") }),
			v.object({ kind: v.literal("Retracted") }),
			v.object({ kind: v.literal("Failed"), message: v.string() }),
		),
	},
	returns: v.union(v.literal("Settled"), v.literal("Reschedule")),
	handler: async (ctx, { ownerReadingKey, outcome }) => {
		const row = await findDefinitionText(ctx, ownerReadingKey);
		if (!row) return "Settled";
		if (outcome.kind === "Retracted") {
			if (row.definition === undefined) {
				await ctx.db.delete(row._id);
				return "Settled";
			}
			await ctx.db.patch(row._id, {
				state: "Scheduled",
				updatedAt: Date.now(),
			});
			return "Reschedule";
		}
		if (outcome.kind === "Failed") {
			await ctx.db.patch(row._id, {
				state: "Failed",
				failureMessage: outcome.message.slice(0, 200),
				updatedAt: Date.now(),
			});
			return "Settled";
		}
		if (row.definition !== row.materializedDefinition) {
			await ctx.db.patch(row._id, {
				state: "Scheduled",
				updatedAt: Date.now(),
			});
			return "Reschedule";
		}
		if (row.state !== "Ready") {
			await ctx.db.patch(row._id, {
				state: "Ready",
				updatedAt: Date.now(),
			});
		}
		return "Settled";
	},
});

async function deleteDefinitionTextRows(ctx: MutationCtx, textId: Id<"texts">) {
	const sentences = await ctx.db
		.query("sentences")
		.withIndex("by_text_id_and_position", (q) => q.eq("textId", textId))
		.take(MAX_SENTENCES_PER_DEFINITION + 1);
	if (sentences.length > MAX_SENTENCES_PER_DEFINITION) {
		throw new Error("A Definition Text holds at most one Sentence.");
	}
	for (const sentence of sentences) {
		const segments = await loadStoredSegments(ctx, sentence._id);
		if (
			segments.some(
				(segment) =>
					segment.attestationMembership !== undefined ||
					segment.resolutionState !== undefined,
			)
		) {
			throw new Error(
				"Strip the Definition Text's analysis before deleting its rows.",
			);
		}
		await Promise.all(
			segments.map((segment) => ctx.db.delete(segment._id)),
		);
		await ctx.db.delete(sentence._id);
	}
	if (await ctx.db.get(textId)) await ctx.db.delete(textId);
}
