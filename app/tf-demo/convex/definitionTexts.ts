import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import {
	findDefinitionText,
	ownsDefinitionTextRun,
	STALE_DEFINITION_TEXT_RUN_AFTER_MS,
	scheduleDefinitionTextRun,
	writeDefinitionText,
} from "./model/definitionTexts";
import { loadStoredSegments } from "./model/storedSegments";
import {
	definitionTextStateValidator,
	languageValidator,
	segmentInputValidator,
} from "./model/validators";

const MAX_SENTENCES_PER_DEFINITION = 8;

const DEFINITION_FAILED_MESSAGE = "Definition segmentation failed.";

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

/**
 * Claims the Scheduled row for a new run and returns its number. Any other
 * state means the action is late or a duplicate and must not run.
 */
export const markRunning = internalMutation({
	args: { ownerReadingKey: v.string() },
	returns: v.union(v.number(), v.null()),
	handler: async (ctx, { ownerReadingKey }) => {
		const row = await findDefinitionText(ctx, ownerReadingKey);
		if (row?.state !== "Scheduled") return null;
		const runNumber = (row.runNumber ?? 0) + 1;
		await ctx.db.patch(row._id, {
			state: "Running",
			runNumber,
			failureMessage: undefined,
			updatedAt: Date.now(),
		});
		return runNumber;
	},
});

/**
 * The watchdog every scheduled run carries. A run that stayed Scheduled or
 * Running longer than an action may live lost its action, so the row goes
 * back to Scheduled and materializes again for the latest definition.
 */
export const recoverStaleRun = internalMutation({
	args: { ownerReadingKey: v.string(), runNumber: v.number() },
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const row = await findDefinitionText(ctx, args.ownerReadingKey);
		if (!row || !ownsDefinitionTextRun(row, args.runNumber)) return false;
		const age = Date.now() - row.updatedAt;
		if (age < STALE_DEFINITION_TEXT_RUN_AFTER_MS) {
			await ctx.scheduler.runAfter(
				STALE_DEFINITION_TEXT_RUN_AFTER_MS - age,
				internal.definitionTexts.recoverStaleRun,
				args,
			);
			return false;
		}
		await ctx.db.patch(row._id, {
			state: "Scheduled",
			updatedAt: Date.now(),
		});
		await scheduleDefinitionTextRun(ctx, row);
		return true;
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
		runNumber: v.number(),
		definition: v.string(),
		language: languageValidator,
		segmentedSentenceId: v.string(),
		segments: v.array(segmentInputValidator),
	},
	returns: v.union(v.literal("Ready"), v.literal("Stale")),
	handler: async (ctx, { runNumber, ...args }) => {
		const row = await findDefinitionText(ctx, args.ownerReadingKey);
		if (
			row?.state !== "Running" ||
			row.runNumber !== runNumber ||
			row.definition !== args.definition
		)
			return "Stale";
		if (row.textId) {
			throw new Error(
				"A live Definition Text must be removed before its replacement is written.",
			);
		}
		await writeDefinitionText(ctx, args);
		return "Ready";
	},
});

/**
 * Ends `runNumber`. A definition that changed while it ran is scheduled again
 * in this transaction, so no dying action can leave the row without a run. A
 * run that no longer owns the row, being late or replaced, changes nothing.
 */
export const settle = internalMutation({
	args: {
		ownerReadingKey: v.string(),
		runNumber: v.number(),
		outcome: v.union(
			v.object({ kind: v.literal("Ready") }),
			v.object({ kind: v.literal("Retracted") }),
			v.object({ kind: v.literal("Failed") }),
		),
	},
	returns: v.union(
		v.literal("Settled"),
		v.literal("Rescheduled"),
		v.literal("Ignored"),
	),
	handler: async (ctx, { ownerReadingKey, runNumber, outcome }) => {
		const row = await findDefinitionText(ctx, ownerReadingKey);
		// A run that persisted its Text already left the row Ready.
		if (
			!row ||
			row.runNumber !== runNumber ||
			(row.state !== "Running" && row.state !== "Ready")
		)
			return "Ignored";
		if (outcome.kind === "Retracted") {
			if (row.definition === undefined) {
				await ctx.db.delete(row._id);
				return "Settled";
			}
			await ctx.db.patch(row._id, {
				state: "Scheduled",
				updatedAt: Date.now(),
			});
			await scheduleDefinitionTextRun(ctx, row);
			return "Rescheduled";
		}
		if (outcome.kind === "Failed") {
			await ctx.db.patch(row._id, {
				state: "Failed",
				// The internal error stays in the log; the learner sees this.
				failureMessage: DEFINITION_FAILED_MESSAGE,
				updatedAt: Date.now(),
			});
			return "Settled";
		}
		if (row.definition !== row.materializedDefinition) {
			await ctx.db.patch(row._id, {
				state: "Scheduled",
				updatedAt: Date.now(),
			});
			await scheduleDefinitionTextRun(ctx, row);
			return "Rescheduled";
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
