"use node";

import { messageOf } from "common-utils";
import { v } from "convex/values";
import { operations } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import {
	annotateInspectionStep,
	markSpanFailed,
} from "../server/inspectionCapture";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
	inspectedMutation,
	inspectedQuery,
	runConvexEffect,
} from "./model/convexEffect";
import {
	clickCallDeadlineMs,
	deploymentDumgen,
} from "./model/deploymentDumgen";
import { inspectionFor } from "./model/inspectionAction";

const OWNER = "app/tf-demo · pronounExplanationActions";

const explainPronoun = Effect.fn("Explain pronoun", { root: true })(function* ({
	explanationId,
	run,
	inspectRequestId,
}: {
	readonly explanationId: Id<"pronounExplanations">;
	readonly run: number;
	readonly inspectRequestId: string | undefined;
}) {
	yield* annotateInspectionStep(OWNER, { explanationId, run });
	const request = yield* inspectedQuery(
		"Load pronoun passage",
		OWNER,
		{ explanationId, run },
		internal.pronounExplanations.loadRequest,
		{ explanationId, run },
	);
	if (!request) return;
	const outcome = yield* operations.explain.pronoun(request.input).pipe(
		Effect.provide(
			deploymentDumgen({
				timeoutMs: clickCallDeadlineMs(),
				promptCaching: true,
			}),
		),
		Effect.map((antecedents) => ({
			kind: "Resolved" as const,
			antecedents: antecedents.flatMap(({ sentence, segments }) => {
				const sentenceId = request.sentenceIds[sentence];
				return sentenceId
					? [{ sentenceId, segments: [...segments] }]
					: [];
			}),
		})),
		Effect.catchCause((cause) => {
			if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
			const message = messageOf(Cause.squash(cause));
			console.warn(`The pronoun was not explained: ${message}`);
			return markSpanFailed.pipe(
				Effect.as({ kind: "Failed" as const, message }),
			);
		}),
	);
	yield* inspectedMutation(
		"Settle pronoun explanation",
		OWNER,
		{ explanationId, run, outcome },
		internal.pronounExplanations.settle,
		{
			explanationId,
			run,
			outcome,
			...(inspectRequestId ? { inspectRequestId } : {}),
		},
	);
});

/**
 * Runs one Pronoun Explanation: Dumgen's `explain.pronoun` over the
 * passage the run loads, one synchronous Luna call at the click deadline
 * with its prompt cached, then settles the explanation with what Luna
 * named, read back to Sentences, or with why it failed. A run that is no
 * longer the explanation's loads nothing and asks nothing.
 */
export const explain = internalAction({
	args: {
		explanationId: v.id("pronounExplanations"),
		run: v.number(),
		inspectRequestId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { explanationId, run, inspectRequestId }) => {
		const inspection = inspectRequestId
			? inspectionFor(ctx, inspectRequestId, true)
			: undefined;
		await runConvexEffect(
			ctx,
			explainPronoun({ explanationId, run, inspectRequestId }),
			{ inspection },
		);
		return null;
	},
});
