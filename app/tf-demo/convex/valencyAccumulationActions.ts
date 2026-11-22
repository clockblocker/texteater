"use node";

import { v } from "convex/values";
import type { Jev, Luna } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import {
	annotateInspectionStep,
	markSpanFailed,
	recordFailedStep,
} from "../server/inspectionCapture";
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
import {
	inspectedMutation,
	inspectedQuery,
	runConvexEffect,
} from "./model/convexEffect";
import { deploymentDumgen, modelTransports } from "./model/deploymentDumgen";
import { inspectionFor } from "./model/inspectionAction";

const OWNER = "app/tf-demo · valencyAccumulationActions";

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
		inspectRequestId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const accumulator = productionValencyAccumulator();
		if (accumulator) await accumulateValency(ctx, args, accumulator);
		return null;
	},
});

const runValencyAccumulation = Effect.fn("Accumulate valency", { root: true })(
	function* (
		args: { readonly attestationId: Id<"attestations"> },
		accumulate: ValencyAccumulator<Jev | Luna>,
	) {
		yield* annotateInspectionStep(OWNER, args);
		const occurrence = yield* inspectedQuery(
			"Load valency accumulation input",
			OWNER,
			args,
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
			if (Cause.hasInterruptsOnly(exit.cause))
				return yield* Effect.interrupt;
			const error = Cause.squash(exit.cause);
			yield* recordFailedStep(
				"Valency accumulation failed",
				OWNER,
				args,
				error,
			);
			yield* Effect.logError("ValencyAccumulationFailed").pipe(
				Effect.annotateLogs({
					attestationId: args.attestationId,
					...internalErrorDescriptor(error),
				}),
			);
			return;
		}
		const { changes, realizedPattern, failures } = exit.value;
		if (failures.length > 0) {
			yield* markSpanFailed;
			yield* Effect.logError("ValencyAccumulationFailed").pipe(
				Effect.annotateLogs({
					attestationId: args.attestationId,
					failures: failures.map(({ leaf, code }) => ({
						leaf,
						code,
					})),
				}),
			);
		}
		if (changes.length === 0 && realizedPattern === null) return;
		const publishArgs = {
			attestationId: args.attestationId,
			readingId: occurrence.readingId,
			reading: occurrence.reading,
			changes: [...changes],
			realizedPattern,
		};
		const published = yield* inspectedMutation(
			"Publish accumulated valency",
			OWNER,
			publishArgs,
			internal.valencyAccumulation.publish,
			publishArgs,
		);
		if (published.status === "Rejected") {
			yield* markSpanFailed;
			yield* Effect.logError("ValencyAccumulationRejected").pipe(
				Effect.annotateLogs({
					attestationId: args.attestationId,
					message: published.message,
				}),
			);
		}
	},
);

/**
 * One run: the occurrence and its Reading's stored patterns, the model work,
 * and publication of any new pattern plus the Attestation's realized pattern.
 */
export async function accumulateValency(
	ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
	args: {
		readonly attestationId: Id<"attestations">;
		readonly inspectRequestId?: string;
	},
	accumulate: ValencyAccumulator<Jev | Luna>,
): Promise<void> {
	const { inspectRequestId, ...input } = args;
	const inspection = inspectRequestId
		? inspectionFor(ctx, inspectRequestId, true, "PostClick")
		: undefined;
	await runConvexEffect(ctx, runValencyAccumulation(input, accumulate), {
		inspection,
	});
}
