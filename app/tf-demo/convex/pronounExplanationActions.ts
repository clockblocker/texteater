"use node";

import { messageOf } from "common-utils";
import { v } from "convex/values";
import { operations } from "dumgen";
import * as Effect from "effect/Effect";
import { logged } from "../server/logging";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
	clickCallDeadlineMs,
	deploymentDumgen,
} from "./model/deploymentDumgen";

/**
 * Runs one Pronoun Explanation: Dumgen's `explain.pronoun` over the
 * passage the run loads, one synchronous Luna call at the click deadline
 * with its prompt cached, then settles the explanation with what Luna
 * named, read back to Sentences, or with why it failed. A run that is no
 * longer the explanation's loads nothing and asks nothing.
 */
export const explain = internalAction({
	args: { explanationId: v.id("pronounExplanations"), run: v.number() },
	returns: v.null(),
	handler: async (ctx, { explanationId, run }) => {
		const request = await ctx.runQuery(
			internal.pronounExplanations.loadRequest,
			{ explanationId, run },
		);
		if (!request) return null;
		let outcome:
			| {
					kind: "Resolved";
					antecedents: {
						sentenceId: (typeof request.sentenceIds)[number];
						segments: number[];
					}[];
			  }
			| { kind: "Failed"; message: string };
		try {
			const antecedents = await Effect.runPromise(
				operations.explain.pronoun(request.input).pipe(
					logged,
					Effect.provide(
						deploymentDumgen({
							timeoutMs: clickCallDeadlineMs(),
							promptCaching: true,
						}),
					),
				),
			);
			outcome = {
				kind: "Resolved",
				antecedents: antecedents.flatMap(({ sentence, segments }) => {
					const sentenceId = request.sentenceIds[sentence];
					return sentenceId
						? [{ sentenceId, segments: [...segments] }]
						: [];
				}),
			};
		} catch (cause) {
			console.warn(`The pronoun was not explained: ${messageOf(cause)}`);
			outcome = { kind: "Failed", message: messageOf(cause) };
		}
		await ctx.runMutation(internal.pronounExplanations.settle, {
			explanationId,
			run,
			outcome,
		});
		return null;
	},
});
