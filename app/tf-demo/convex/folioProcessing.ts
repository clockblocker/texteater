"use node";

import { v } from "convex/values";
import { operations } from "dumgen";
import * as Effect from "effect/Effect";
import { type FolioRunEnd, processFolio } from "../server/folioIntake";
import { SCROLL_TARGET_LANGUAGE } from "../shared/supported-target-language";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, internalAction } from "./_generated/server";
import { runConvexEffect } from "./model/convexEffect";
import { deploymentDumgen, requireJev } from "./model/deploymentDumgen";
import { folioProcessingPort } from "./model/folios";

/** A run hands over to a fresh action after this long, inside Convex's 10 minutes. */
const RUN_BUDGET_MS = 4 * 60_000;

const runFolioWindow = Effect.fn("FolioProcessing.run")(function* (
	ctx: ActionCtx,
	folioId: Id<"folios">,
	run: number,
) {
	const startedAt = Date.now();
	const port = folioProcessingPort(ctx, folioId, run);
	return yield* Effect.gen(function* () {
		yield* requireJev;
		return yield* processFolio({
			dumgen: operations,
			language: SCROLL_TARGET_LANGUAGE,
			hasTime: () => Date.now() - startedAt < RUN_BUDGET_MS,
			port,
		}).pipe(Effect.provide(deploymentDumgen()));
	}).pipe(
		Effect.catchTags({
			VisitorActionError: () =>
				Effect.promise(() => port.failed()).pipe(
					Effect.as<FolioRunEnd>({ kind: "Failed" }),
				),
		}),
	);
});

/**
 * Processes the one Folio a Learner asked for (#1216), window by window.
 * Anything that fails, a deployment without a TypeSafe key included,
 * fails the Folio, and the Learner may ask again.
 */
export const run = internalAction({
	args: { folioId: v.id("folios"), run: v.number() },
	returns: v.null(),
	handler: async (ctx, { folioId, run }) => {
		const end = await runConvexEffect(
			ctx,
			runFolioWindow(ctx, folioId, run),
		);
		if (end.kind === "Continue")
			await ctx.scheduler.runAfter(0, internal.folioProcessing.run, {
				folioId,
				run,
			});
		return null;
	},
});
