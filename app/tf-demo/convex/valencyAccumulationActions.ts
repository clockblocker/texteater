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
	dumgenValencyAccumulator,
	type ValencyAccumulator,
} from "../server/valencyAccumulation";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, env, internalAction } from "./_generated/server";
import { ConvexActionCtx, runConvexEffect } from "./model/convexEffect";
import { deploymentDumgen, modelTransports } from "./model/deploymentDumgen";

/**
 * The production ValencyAccumulator: Dumgen's `knowledge.accumulateValency`,
 * jev through TypeSafe and Luna through OpenAI with the deployment's keys.
 * Runs only where `TF_KNOWLEDGE_PRODUCTION=1` and both keys are set.
 */
function productionValencyAccumulator():
	| ValencyAccumulator<Jev | Luna>
	| undefined {
	const { jev, luna } = modelTransports();
	if (env.TF_KNOWLEDGE_PRODUCTION !== "1" || !jev || !luna) return undefined;
	return dumgenValencyAccumulator;
}

/** Accumulates one occurrence's concrete Valency Pattern, after its click (ADR 0034). */
export const accumulate = internalAction({
	args: {
		attestationId: v.id("attestations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const accumulator = productionValencyAccumulator();
		if (accumulator) await accumulateValency(ctx, args, accumulator);
		return null;
	},
});

const runValencyAccumulation = Effect.fn("ValencyAccumulation.run")(function* (
	args: { readonly attestationId: Id<"attestations"> },
	accumulate: ValencyAccumulator<Jev | Luna>,
) {
	const actionCtx = yield* ConvexActionCtx;
	const occurrence = yield* actionCtx.runQuery(
		internal.valencyAccumulation.begin,
		{ attestationId: args.attestationId },
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
			valency: occurrence.valency,
		}).pipe(Effect.provide(deploymentDumgen())),
	);
	if (Exit.isFailure(exit)) {
		if (Cause.hasInterruptsOnly(exit.cause)) return yield* Effect.interrupt;
		yield* Effect.logError("ValencyAccumulationFailed").pipe(
			Effect.annotateLogs({
				attestationId: args.attestationId,
				...internalErrorDescriptor(Cause.squash(exit.cause)),
			}),
		);
		return;
	}
	const { changes, realizedPattern, failures } = exit.value;
	if (failures.length > 0)
		yield* Effect.logError("ValencyAccumulationFailed").pipe(
			Effect.annotateLogs({
				attestationId: args.attestationId,
				failures: failures.map(({ leaf, code }) => ({ leaf, code })),
			}),
		);
	if (changes.length === 0 && realizedPattern === null) return;
	const published = yield* actionCtx.runMutation(
		internal.valencyAccumulation.publish,
		{
			attestationId: args.attestationId,
			readingId: occurrence.readingId,
			reading: occurrence.reading,
			changes: [...changes],
			realizedPattern,
		},
	);
	if (published.status === "Rejected")
		yield* Effect.logError("ValencyAccumulationRejected").pipe(
			Effect.annotateLogs({
				attestationId: args.attestationId,
				message: published.message,
			}),
		);
});

/**
 * One run: the occurrence and its Reading's stored patterns, the model work,
 * and publication of any new pattern plus the Attestation's realized pattern.
 */
export async function accumulateValency(
	ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
	args: { readonly attestationId: Id<"attestations"> },
	accumulate: ValencyAccumulator<Jev | Luna>,
): Promise<void> {
	await runConvexEffect(ctx, runValencyAccumulation(args, accumulate));
}
