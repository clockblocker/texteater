"use node";

import { v } from "convex/values";
import type { Jev, Luna } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { logged } from "../server/logging";
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
	const occurrence = await ctx.runQuery(
		internal.translationAccumulation.begin,
		{ attestationId: args.attestationId, languages: [...args.languages] },
	);
	if (!occurrence) return;
	const reading = parseGermanReading(occurrence.reading);
	const { encounter, attestation } = parseResolvedGrammar({
		encounter: occurrence.encounter,
		attestation: occurrence.attestation,
	});
	const exit = await Effect.runPromiseExit(
		logged(
			accumulate({
				encounter,
				reading,
				attestation,
				translations: occurrence.translations,
			}),
		).pipe(Effect.provide(deploymentDumgen())),
	);
	if (Exit.isFailure(exit)) {
		console.error(
			JSON.stringify({
				event: "TranslationAccumulationFailed",
				attestationId: args.attestationId,
				...internalErrorDescriptor(Cause.squash(exit.cause)),
			}),
		);
		return;
	}
	const { changes, failures } = exit.value;
	if (failures.length > 0)
		console.error(
			JSON.stringify({
				event: "TranslationAccumulationFailed",
				attestationId: args.attestationId,
				failures: failures.map(({ leaf, code }) => ({ leaf, code })),
			}),
		);
	if (changes.length === 0) return;
	const published = await ctx.runMutation(
		internal.translationAccumulation.publish,
		{
			readingId: occurrence.readingId,
			reading: occurrence.reading,
			changes: [...changes],
		},
	);
	if (published.status === "Rejected")
		console.error(
			JSON.stringify({
				event: "TranslationAccumulationRejected",
				attestationId: args.attestationId,
				message: published.message,
			}),
		);
}
