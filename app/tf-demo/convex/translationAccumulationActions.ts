"use node";

import { v } from "convex/values";
import type { Jev, Luna } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { parseGermanReading } from "../server/operationalParsing";
import { internalErrorDescriptor } from "../server/resolutionFailure";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import {
	dumgenTranslationAccumulator,
	type TranslationAccumulator,
} from "../server/translationAccumulation";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, env, internalAction } from "./_generated/server";
import { ConvexActionCtx, runConvexEffect } from "./model/convexEffect";
import { deploymentDumgen, modelTransports } from "./model/deploymentDumgen";
import { translationLanguageValidator } from "./model/validators";

/**
 * The production TranslationAccumulator: Dumgen's
 * `knowledge.accumulateTranslations`, jev through TypeSafe and Luna
 * through OpenAI with the deployment's keys. Like Knowledge production, it
 * runs only where `TF_KNOWLEDGE_PRODUCTION=1` and both keys are set;
 * elsewhere it is undefined and the run calls no model.
 */
function productionTranslationAccumulator():
	| TranslationAccumulator<Jev | Luna>
	| undefined {
	const { jev, luna } = modelTransports();
	if (env.TF_KNOWLEDGE_PRODUCTION !== "1" || !jev || !luna) return undefined;
	return dumgenTranslationAccumulator;
}

/** Accumulates one occurrence's translations, after its click (ADR 0047). */
export const accumulate = internalAction({
	args: {
		attestationId: v.id("attestations"),
		languages: v.array(translationLanguageValidator),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const accumulator = productionTranslationAccumulator();
		if (accumulator) await accumulateTranslations(ctx, args, accumulator);
		return null;
	},
});

const runTranslationAccumulation = Effect.fn("TranslationAccumulation.run")(
	function* (
		args: {
			readonly attestationId: Id<"attestations">;
			readonly languages: readonly ("en" | "ru")[];
		},
		accumulate: TranslationAccumulator<Jev | Luna>,
	) {
		const actionCtx = yield* ConvexActionCtx;
		const occurrence = yield* actionCtx.runQuery(
			internal.translationAccumulation.begin,
			{
				attestationId: args.attestationId,
				languages: [...args.languages],
			},
		);
		if (!occurrence) return;
		const reading = parseGermanReading(occurrence.reading);
		const { encounter, attestation } = parseResolvedGrammar({
			encounter: occurrence.encounter,
			attestation: occurrence.attestation,
		});
		const exit = yield* Effect.exit(
			accumulate({
				encounter,
				reading,
				attestation,
				translations: occurrence.translations,
			}).pipe(Effect.provide(deploymentDumgen())),
		);
		if (Exit.isFailure(exit)) {
			if (Cause.hasInterruptsOnly(exit.cause))
				return yield* Effect.interrupt;
			yield* Effect.logError("TranslationAccumulationFailed").pipe(
				Effect.annotateLogs({
					attestationId: args.attestationId,
					...internalErrorDescriptor(Cause.squash(exit.cause)),
				}),
			);
			return;
		}
		const { changes, failures } = exit.value;
		if (failures.length > 0)
			yield* Effect.logError("TranslationAccumulationFailed").pipe(
				Effect.annotateLogs({
					attestationId: args.attestationId,
					failures: failures.map(({ leaf, code }) => ({
						leaf,
						code,
					})),
				}),
			);
		if (changes.length === 0) return;
		const published = yield* actionCtx.runMutation(
			internal.translationAccumulation.publish,
			{
				readingId: occurrence.readingId,
				reading: occurrence.reading,
				changes: [...changes],
			},
		);
		if (published.status === "Rejected")
			yield* Effect.logError("TranslationAccumulationRejected").pipe(
				Effect.annotateLogs({
					attestationId: args.attestationId,
					message: published.message,
				}),
			);
	},
);

/**
 * One run: the occurrence and its Reading's stored translations, the
 * model work, and the publication of what it found missing. A language
 * that failed adds nothing and is logged; a later click asks again.
 */
export async function accumulateTranslations(
	ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
	args: {
		readonly attestationId: Id<"attestations">;
		readonly languages: readonly ("en" | "ru")[];
	},
	accumulate: TranslationAccumulator<Jev | Luna>,
): Promise<void> {
	await runConvexEffect(ctx, runTranslationAccumulation(args, accumulate));
}
