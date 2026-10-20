import type { ProcessedSentence } from "../../server/folioIntake";
import {
	cutFolios,
	FOLIOS_AHEAD,
	MAX_WINDOW_FAILURES,
	retryDelayMs,
	windowsOf,
} from "../../server/folios";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

/*
 * A book's Folios in storage (#1193): written with its Scrolls, processed
 * by `folioProcessing.run` from the reader's Folio up to `FOLIOS_AHEAD`
 * after it, one window at a time.
 */

/** After this long without a check-in, a run counts as gone. */
const STALE_RUN_MS = 10 * 60_000;

/** Writes a book Scroll's Folios, all of them unprocessed. */
export async function writeFolios(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
	sentences: readonly {
		readonly position: number;
		readonly paragraph?: number;
		readonly stitchedText: string;
	}[],
): Promise<void> {
	for (const folio of cutFolios(sentences))
		await ctx.db.insert("folios", {
			scrollId,
			...folio,
			processedWindows: 0,
		});
}

/** The Folio a Sentence position reads in; null for a Scroll with none. */
function folioAt(ctx: QueryCtx, scrollId: Id<"scrolls">, position: number) {
	return ctx.db
		.query("folios")
		.withIndex("by_scroll_id_and_start", (q) =>
			q.eq("scrollId", scrollId).lte("start", position),
		)
		.order("desc")
		.first();
}

const isPending = (folio: Doc<"folios">) =>
	folio.processedWindows < folio.windows;

/** The first unprocessed Folio from the reader's, at most `FOLIOS_AHEAD` after it. */
async function pendingFolio(
	ctx: QueryCtx,
	scrollId: Id<"scrolls">,
	readerStart: number,
) {
	const reader = await folioAt(ctx, scrollId, readerStart);
	if (!reader) return null;
	const near = await ctx.db
		.query("folios")
		.withIndex("by_scroll_id_and_start", (q) =>
			q.eq("scrollId", scrollId).gte("start", reader.start),
		)
		.take(FOLIOS_AHEAD + 1);
	return near.find(isPending) ?? null;
}

function findRun(ctx: QueryCtx, scrollId: Id<"scrolls">) {
	return ctx.db
		.query("folioRuns")
		.withIndex("by_scroll_id", (q) => q.eq("scrollId", scrollId))
		.unique();
}

/**
 * The reader is at `position` in a Scroll: processing follows them there.
 * A Scroll without Folios, such as a paste, has nothing to process. A run
 * starts unless one is running, or the Folios near the reader are done.
 */
export async function followReader(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
	position: number,
): Promise<void> {
	const folio = await folioAt(ctx, scrollId, position);
	if (!folio) return;
	const run = await findRun(ctx, scrollId);
	const runId =
		run?._id ??
		(await ctx.db.insert("folioRuns", {
			scrollId,
			readerStart: folio.start,
			failures: 0,
		}));
	if (run && run.readerStart !== folio.start)
		await ctx.db.patch(run._id, { readerStart: folio.start });
	const now = Date.now();
	if (run?.heartbeat !== undefined && now - run.heartbeat < STALE_RUN_MS)
		return;
	if (!(await pendingFolio(ctx, scrollId, folio.start))) return;
	await ctx.db.patch(runId, { heartbeat: now, failures: 0 });
	await ctx.scheduler.runAfter(0, internal.folioProcessing.run, {
		scrollId,
	});
}

/**
 * The next window to process for the reader's Folios, with its stored
 * Sentences, or null once they are all processed; null also ends the run,
 * in the same transaction, so a reader's move never finds it half gone.
 */
export async function nextFolioWindow(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
) {
	const run = await findRun(ctx, scrollId);
	if (!run) return null;
	const folio = await pendingFolio(ctx, scrollId, run.readerStart);
	if (!folio) {
		await ctx.db.patch(run._id, { heartbeat: undefined });
		return null;
	}
	const sentences = await ctx.db
		.query("sentences")
		.withIndex("by_scroll_id_and_position", (q) =>
			q
				.eq("scrollId", scrollId)
				.gte("position", folio.start)
				.lt("position", folio.end),
		)
		.collect();
	const window = folio.processedWindows;
	const stored = windowsOf(sentences)[window];
	if (!stored) throw new Error("A Folio's window holds its Sentences.");
	await ctx.db.patch(run._id, { heartbeat: Date.now() });
	return {
		folioId: folio._id,
		window,
		sentences: stored.map((sentence) => ({
			sentenceId: sentence._id,
			...(sentence.paragraph === undefined
				? {}
				: { paragraph: sentence.paragraph }),
			stitchedText: sentence.stitchedText,
		})),
	};
}

/**
 * A window failed: its run waits and retries it, or, after
 * `MAX_WINDOW_FAILURES` in a row or when it may not `retry`, stops until
 * the reader moves. Returns the wait, or null when it stopped.
 */
export async function recordWindowFailure(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
	retry: boolean,
): Promise<number | null> {
	const run = await findRun(ctx, scrollId);
	if (!run) return null;
	const failures = run.failures + 1;
	if (!retry || failures >= MAX_WINDOW_FAILURES) {
		await ctx.db.patch(run._id, { heartbeat: undefined, failures: 0 });
		return null;
	}
	const afterMs = retryDelayMs(failures);
	await ctx.db.patch(run._id, {
		heartbeat: Date.now() + afterMs,
		failures,
	});
	return afterMs;
}

/** A window was stored: its run's failures start over. */
export async function recordWindowStored(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
): Promise<void> {
	const run = await findRun(ctx, scrollId);
	if (run && run.failures > 0) await ctx.db.patch(run._id, { failures: 0 });
}

/** Deletes a Scroll's Folios and its run. */
export async function discardFolios(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
): Promise<void> {
	const folios = await ctx.db
		.query("folios")
		.withIndex("by_scroll_id_and_start", (q) => q.eq("scrollId", scrollId))
		.collect();
	for (const folio of folios) await ctx.db.delete(folio._id);
	const run = await findRun(ctx, scrollId);
	if (run) await ctx.db.delete(run._id);
}

/**
 * The storage a run of `folioProcessing.run` processes a Scroll through:
 * the `folios` mutations, from an action.
 */
export function folioProcessingPort(
	ctx: Pick<ActionCtx, "runMutation">,
	scrollId: Id<"scrolls">,
) {
	return {
		nextWindow: () =>
			ctx.runMutation(internal.folios.nextWindow, { scrollId }),
		storeWindow: async (
			{ folioId, window }: { folioId: Id<"folios">; window: number },
			sentences: readonly ProcessedSentence<Id<"sentences">>[],
		) => {
			await ctx.runMutation(internal.folios.storeWindow, {
				folioId,
				window,
				sentences: sentences.map((sentence) => ({
					...sentence,
					segments: [...sentence.segments],
					units: [...sentence.units],
				})),
			});
		},
		windowFailed: () =>
			ctx.runMutation(internal.folios.windowFailed, {
				scrollId,
				retry: true,
			}),
	};
}
