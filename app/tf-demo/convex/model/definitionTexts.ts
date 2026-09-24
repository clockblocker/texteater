import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";

import type { Infer } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { MAX_SEGMENTS_PER_SENTENCE } from "./storedSegments";
import type { segmentInputValidator } from "./validators";

const materializeDefinitionText = makeFunctionReference<
	"action",
	{ ownerReadingKey: string },
	null
>("definitionTextActions:materialize") as unknown as FunctionReference<
	"action",
	"internal",
	{ ownerReadingKey: string },
	null
>;

const recoverStaleDefinitionTextRun = makeFunctionReference<
	"mutation",
	{ ownerReadingKey: string; runNumber: number },
	boolean
>("definitionTexts:recoverStaleRun") as unknown as FunctionReference<
	"mutation",
	"internal",
	{ ownerReadingKey: string; runNumber: number },
	boolean
>;

/** Longer than a Convex action may run, so a quiet run is a dead one. */
export const STALE_DEFINITION_TEXT_RUN_AFTER_MS = 11 * 60 * 1_000;

/**
 * Dead runs in a row after which the watchdog fails the row instead of
 * running it again. The next change to the Reading's Knowledge reschedules it.
 */
export const MAX_INTERRUPTED_DEFINITION_TEXT_RUNS = 3;

export const DEFINITION_FAILED_MESSAGE = "Definition segmentation failed.";

/** The definition aspect of stored Reading Knowledge, or null when absent. */
export function definitionOf(knowledge: unknown): string | null {
	if (
		!knowledge ||
		typeof knowledge !== "object" ||
		Array.isArray(knowledge)
	) {
		return null;
	}
	const value = Reflect.get(knowledge, "definition");
	if (typeof value !== "string") return null;
	const normalized = value.trim().normalize("NFC");
	return normalized.length > 0 ? normalized : null;
}

export function findDefinitionText(
	ctx: QueryCtx | MutationCtx,
	ownerReadingKey: string,
): Promise<Doc<"definitionTexts"> | null> {
	return ctx.db
		.query("definitionTexts")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
}

/**
 * Keeps at most one live Definition Text per Reading in step with its
 * Knowledge. A changed or retracted definition schedules the materializer,
 * which strips the previous Definition Text before segmenting the next one.
 * An in-flight materialization is not rescheduled; it re-reads the requested
 * definition when it settles, and its watchdog reruns it if it never does.
 */
export async function syncDefinitionText(
	ctx: MutationCtx,
	ownerReadingKey: string,
	knowledge: unknown,
): Promise<void> {
	const definition = definitionOf(knowledge) ?? undefined;
	const existing = await findDefinitionText(ctx, ownerReadingKey);
	if (!existing) {
		if (definition === undefined) return;
		await ctx.db.insert("definitionTexts", {
			ownerReadingKey,
			definition,
			state: "Scheduled",
			updatedAt: Date.now(),
		});
		await scheduleDefinitionTextRun(ctx, { ownerReadingKey });
		return;
	}
	const settled = existing.state === "Ready" || existing.state === "Failed";
	if (
		settled &&
		existing.state === "Ready" &&
		existing.definition === definition &&
		existing.materializedDefinition === definition
	) {
		return;
	}
	if (
		settled &&
		definition === undefined &&
		existing.textId === undefined &&
		existing.definition === undefined
	) {
		return;
	}
	await ctx.db.patch(existing._id, {
		definition,
		state: settled ? "Scheduled" : existing.state,
		failureMessage: undefined,
		...(settled ? { interruptedRuns: undefined } : {}),
		updatedAt: Date.now(),
	});
	if (settled) await scheduleDefinitionTextRun(ctx, existing);
}

/**
 * Schedules the next materialization run of a Scheduled row together with
 * the watchdog that reruns it if the action dies before settling.
 */
export async function scheduleDefinitionTextRun(
	ctx: MutationCtx,
	row: Pick<Doc<"definitionTexts">, "ownerReadingKey" | "runNumber">,
): Promise<void> {
	if (!ctx.scheduler) return;
	await ctx.scheduler.runAfter(0, materializeDefinitionText, {
		ownerReadingKey: row.ownerReadingKey,
	});
	await ctx.scheduler.runAfter(
		STALE_DEFINITION_TEXT_RUN_AFTER_MS,
		recoverStaleDefinitionTextRun,
		{
			ownerReadingKey: row.ownerReadingKey,
			runNumber: (row.runNumber ?? 0) + 1,
		},
	);
}

/**
 * Whether `runNumber` is the row's current run: the one a Scheduled row will
 * claim next, or the one a Running row claimed.
 */
export function ownsDefinitionTextRun(
	row: Pick<Doc<"definitionTexts">, "state" | "runNumber">,
	runNumber: number,
): boolean {
	return row.state === "Scheduled"
		? (row.runNumber ?? 0) + 1 === runNumber
		: row.state === "Running" && row.runNumber === runNumber;
}

/**
 * Writes one segmented definition as a hidden Definition Text and marks the
 * state row Ready. Callers must have removed any previous live Text first.
 */
export async function writeDefinitionText(
	ctx: MutationCtx,
	input: {
		readonly ownerReadingKey: string;
		readonly definition: string;
		readonly language: "de" | "en" | "he";
		readonly segmentedSentenceId: string;
		readonly segments: readonly Infer<typeof segmentInputValidator>[];
	},
): Promise<{ textId: Id<"texts">; sentenceId: Id<"sentences"> }> {
	if (
		input.segments.length === 0 ||
		input.segments.length > MAX_SEGMENTS_PER_SENTENCE
	) {
		throw new Error(
			`A Definition Sentence must contain 1-${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
		);
	}
	const stitchedText = input.segments.map(({ text }) => text).join("");
	const textId = await ctx.db.insert("texts", {
		submissionKey: `definition:${input.ownerReadingKey}:${input.segmentedSentenceId}`,
		sourceText: stitchedText,
		origin: { kind: "Definition", readingKey: input.ownerReadingKey },
	});
	const sentenceId = await ctx.db.insert("sentences", {
		segmentedSentenceId: input.segmentedSentenceId,
		textId,
		position: 0,
		language: input.language,
		stitchedText,
	});
	await Promise.all(
		input.segments.map((segment, index) =>
			ctx.db.insert("segments", { sentenceId, index, ...segment }),
		),
	);
	const existing = await findDefinitionText(ctx, input.ownerReadingKey);
	const value = {
		ownerReadingKey: input.ownerReadingKey,
		definition: input.definition,
		materializedDefinition: input.definition,
		state: "Ready" as const,
		...(existing?.runNumber !== undefined
			? { runNumber: existing.runNumber }
			: {}),
		textId,
		sentenceId,
		updatedAt: Date.now(),
	};
	if (existing) await ctx.db.replace(existing._id, value);
	else await ctx.db.insert("definitionTexts", value);
	return { textId, sentenceId };
}

/**
 * Fixture path: segments and writes a definition inside one mutation with a
 * caller-supplied segmenter, skipping the scheduled materializer. Reloading
 * the same definition is a no-op; a changed one replaces the Text in place
 * because fixture Texts carry no Visitor analysis worth stripping.
 */
export async function ensureInlineDefinitionText(
	ctx: MutationCtx,
	input: {
		readonly ownerReadingKey: string;
		readonly knowledge: unknown;
		readonly language: "de" | "en" | "he";
		readonly segment: (
			text: string,
		) => readonly Infer<typeof segmentInputValidator>[];
	},
): Promise<void> {
	const definition = definitionOf(input.knowledge);
	const existing = await findDefinitionText(ctx, input.ownerReadingKey);
	if (definition === null) return;
	if (
		existing?.state === "Ready" &&
		existing.materializedDefinition === definition
	) {
		return;
	}
	if (existing?.textId) {
		throw new Error(
			`Definition of ${input.ownerReadingKey} changed; strip its Definition Text before reloading fixtures.`,
		);
	}
	await writeDefinitionText(ctx, {
		ownerReadingKey: input.ownerReadingKey,
		definition,
		language: input.language,
		segmentedSentenceId: `definition:${input.ownerReadingKey}`,
		segments: input.segment(definition),
	});
}
