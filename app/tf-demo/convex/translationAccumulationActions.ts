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
import { parseReading } from "../server/operationalParsing";
import { internalErrorDescriptor } from "../server/resolutionFailure";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import {
	dumgenTranslationAccumulator,
	type TranslationAccumulator,
} from "../server/translationAccumulation";
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
import { translationLanguageValidator } from "./model/validators";

const OWNER = "app/tf-demo · translationAccumulationActions";

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
		inspectRequestId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const accumulator = productionTranslationAccumulator();
		if (accumulator) await accumulateTranslations(ctx, args, accumulator);
		return null;
	},
});

const runTranslationAccumulation = Effect.fn("Accumulate translations", {
	root: true,
})(function* (
	args: {
		readonly attestationId: Id<"attestations">;
		readonly languages: readonly ("en" | "ru")[];
	},
	accumulate: TranslationAccumulator<Jev | Luna>,
) {
	yield* annotateInspectionStep(OWNER, args);
	const beginArgs = {
		attestationId: args.attestationId,
		languages: [...args.languages],
	};
	const occurrence = yield* inspectedQuery(
		"Load translation accumulation input",
		OWNER,
		beginArgs,
		internal.translationAccumulation.begin,
		beginArgs,
	);
	if (!occurrence) return;
	const reading = parseReading(occurrence.reading);
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
		if (Cause.hasInterruptsOnly(exit.cause)) return yield* Effect.interrupt;
		const error = Cause.squash(exit.cause);
		yield* recordFailedStep(
			"Translation accumulation failed",
			OWNER,
			args,
			error,
		);
		yield* Effect.logError("TranslationAccumulationFailed").pipe(
			Effect.annotateLogs({
				attestationId: args.attestationId,
				...internalErrorDescriptor(error),
			}),
		);
		return;
	}
	const { changes, failures } = exit.value;
	if (failures.length > 0) {
		yield* markSpanFailed;
		yield* Effect.logError("TranslationAccumulationFailed").pipe(
			Effect.annotateLogs({
				attestationId: args.attestationId,
				failures: failures.map(({ leaf, code }) => ({
					leaf,
					code,
				})),
			}),
		);
	}
	if (changes.length === 0) return;
	const publishArgs = {
		readingId: occurrence.readingId,
		reading: occurrence.reading,
		changes: [...changes],
	};
	const published = yield* inspectedMutation(
		"Publish accumulated translations",
		OWNER,
		publishArgs,
		internal.translationAccumulation.publish,
		publishArgs,
	);
	if (published.status === "Rejected") {
		yield* markSpanFailed;
		yield* Effect.logError("TranslationAccumulationRejected").pipe(
			Effect.annotateLogs({
				attestationId: args.attestationId,
				message: published.message,
			}),
		);
	}
});

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
		readonly inspectRequestId?: string;
	},
	accumulate: TranslationAccumulator<Jev | Luna>,
): Promise<void> {
	const { inspectRequestId, ...input } = args;
	const inspection = inspectRequestId
		? inspectionFor(ctx, inspectRequestId, true, "PostClick")
		: undefined;
	await runConvexEffect(ctx, runTranslationAccumulation(input, accumulate), {
		inspection,
	});
}
