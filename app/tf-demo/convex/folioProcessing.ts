"use node";

import { v } from "convex/values";
import { processFolio } from "../server/folioIntake";
import { dumgenTracing } from "../server/inspectionCapture";
import { SCROLL_TARGET_LANGUAGE } from "../shared/supported-target-language";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { productionDumgen } from "./model/deploymentDumgen";
import { folioProcessingPort } from "./model/folios";

/** A run hands over to a fresh action after this long, inside Convex's 10 minutes. */
const RUN_BUDGET_MS = 4 * 60_000;

/**
 * Processes the one Folio a Learner asked for (#1216), window by window.
 * Anything that fails, a deployment without a TypeSafe key included,
 * fails the Folio, and the Learner may ask again.
 */
export const run = internalAction({
	args: { folioId: v.id("folios"), run: v.number() },
	returns: v.null(),
	handler: async (ctx, { folioId, run }) => {
		const startedAt = Date.now();
		const port = folioProcessingPort(ctx, folioId, run);
		let dumgen: ReturnType<typeof productionDumgen>;
		try {
			dumgen = productionDumgen(dumgenTracing(undefined));
		} catch {
			await port.failed();
			return null;
		}
		const end = await processFolio({
			dumgen,
			language: SCROLL_TARGET_LANGUAGE,
			hasTime: () => Date.now() - startedAt < RUN_BUDGET_MS,
			port,
		});
		if (end.kind === "Continue")
			await ctx.scheduler.runAfter(0, internal.folioProcessing.run, {
				folioId,
				run,
			});
		return null;
	},
});
