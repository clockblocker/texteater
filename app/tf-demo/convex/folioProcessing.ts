"use node";

import { v } from "convex/values";
import { processFolios } from "../server/folioIntake";
import { dumgenTracing } from "../server/inspectionCapture";
import { SCROLL_TARGET_LANGUAGE } from "../shared/supported-target-language";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { productionDumgen } from "./model/deploymentDumgen";
import { folioProcessingPort } from "./model/folios";

/** A run hands over to a fresh action after this long, inside Convex's 10 minutes. */
const RUN_BUDGET_MS = 4 * 60_000;

/**
 * Processes a book's Scroll from the reader's Folio up to `FOLIOS_AHEAD`
 * after it, window by window (#1193), re-reading the reader's place before
 * each window, so a jump moves it there. A failed window is retried after a
 * wait; a deployment without a TypeSafe key processes nothing.
 */
export const run = internalAction({
	args: { scrollId: v.id("scrolls") },
	returns: v.null(),
	handler: async (ctx, { scrollId }) => {
		const startedAt = Date.now();
		let dumgen: ReturnType<typeof productionDumgen>;
		try {
			dumgen = productionDumgen(dumgenTracing(undefined));
		} catch {
			// No key: the run stops; the reader's next move tries again.
			await ctx.runMutation(internal.folios.windowFailed, {
				scrollId,
				retry: false,
			});
			return null;
		}
		const end = await processFolios({
			dumgen,
			language: SCROLL_TARGET_LANGUAGE,
			hasTime: () => Date.now() - startedAt < RUN_BUDGET_MS,
			port: folioProcessingPort(ctx, scrollId),
		});
		if (end.kind === "Retry" || end.kind === "Continue")
			await ctx.scheduler.runAfter(
				end.kind === "Retry" ? end.afterMs : 0,
				internal.folioProcessing.run,
				{ scrollId },
			);
		return null;
	},
});
