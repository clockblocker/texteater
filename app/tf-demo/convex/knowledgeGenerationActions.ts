"use node";

import { type FunctionReference, makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import type { KnowledgeInput } from "dumgen/types";
import * as Effect from "effect/Effect";
import { createProductionDumgen } from "../server/modelExecution";
import { parseGermanReading } from "../server/operationalParsing";
import {
	type CatalogMissSignal,
	parseResolvedGrammar,
} from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
	type effectiveRelationPublicationPolicy,
	generatedKnowledgeAllowedForPublication,
	requestedRelationKinds,
} from "./model/generatedKnowledgeContainment";
import type { RelationPublicationAuthorization } from "./relationPublication";

const getRelationPublicationAuthorization = makeFunctionReference<
	"query",
	Record<string, never>,
	RelationPublicationAuthorization
>("relationPublication:getAuthorization") as unknown as FunctionReference<
	"query",
	"internal",
	Record<string, never>,
	RelationPublicationAuthorization
>;

const recordRejectedRelationOutput = makeFunctionReference<
	"mutation",
	{
		attemptKey: string;
		runNumber: number;
		requestedKinds: ReturnType<typeof requestedRelationKinds>;
		artifactPath: string | null;
		fingerprints: RelationPublicationAuthorization["fingerprints"];
	},
	null
>("relationPublication:recordRejectedOutput") as unknown as FunctionReference<
	"mutation",
	"internal",
	{
		attemptKey: string;
		runNumber: number;
		requestedKinds: ReturnType<typeof requestedRelationKinds>;
		artifactPath: string | null;
		fingerprints: RelationPublicationAuthorization["fingerprints"];
	},
	null
>;

const recordKnowledgeCatalogMiss = makeFunctionReference<
	"mutation",
	{ attemptKey: string; miss: CatalogMissSignal },
	null
>(
	"catalogGrowthSignals:recordKnowledgeCatalogMiss",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{ attemptKey: string; miss: CatalogMissSignal },
	null
>;

const knowledgeDumgen = createProductionDumgen();

function getGenerationRequestBuilder() {
	return import("../server/generatedKnowledgeRequest").then(
		({ generationRequestFor }) => generationRequestFor,
	);
}

export const runKnowledgeGeneration = internalAction({
	args: { attemptKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { attemptKey }) => {
		let rejectedRun:
			| {
					runNumber: number;
					requestedKinds: ReturnType<typeof requestedRelationKinds>;
					artifactPath: string | null;
					fingerprints: ReturnType<
						typeof effectiveRelationPublicationPolicy
					>["fingerprints"];
			  }
			| undefined;
		let generationCompleted = false;
		await ctx.runMutation(internal.knowledgeGeneration.markRunning, {
			attemptKey,
		});
		try {
			const input = await ctx.runQuery(
				internal.knowledgeGeneration.loadInput,
				{ attemptKey },
			);
			if (!input || input.kind === "Full") return null;
			if (input.reading.lemma.language !== "de") {
				throw new Error("Unsupported Knowledge language.");
			}
			const reading = parseGermanReading(input.reading);
			const authorization = await ctx.runQuery(
				getRelationPublicationAuthorization,
				{},
			);
			const qualifiedKinds = authorization.rollbackStopped
				? []
				: authorization.qualifiedKinds;
			const generationRequestFor = await getGenerationRequestBuilder();
			const request = generationRequestFor(reading, qualifiedKinds);
			const requestedKinds = requestedRelationKinds(
				"semanticRelations" in request ? request : {},
			);
			rejectedRun = {
				runNumber: input.runNumber,
				requestedKinds,
				artifactPath: authorization.artifactPath,
				fingerprints: authorization.fingerprints,
			};
			const generated = await Effect.runPromise(
				knowledgeDumgen
					.produceKnowledge({
						encounter: parseResolvedGrammar({
							encounter: input.encounter,
							attestation: input.attestation,
						}).encounter,
						reading,
						request,
					} as KnowledgeInput<"de">)
					.pipe(
						Effect.catchTag("CatalogMiss", (failure) =>
							Effect.succeed({
								decision: "CatalogMiss" as const,
								stage: failure.stage,
								route: failure.route ?? "de",
								message: failure.message,
							}),
						),
					),
			);
			if ("decision" in generated) {
				generationCompleted = true;
				await ctx.runMutation(recordKnowledgeCatalogMiss, {
					attemptKey,
					miss: generated,
				});
				return null;
			}
			generationCompleted = true;
			const publishable = generatedKnowledgeAllowedForPublication(
				generated,
				qualifiedKinds,
			);
			await ctx.runAction(
				internal.orchestration.applyGeneratedKnowledgePlan,
				{
					attemptKey,
					reading,
					changes: publishable.changes,
					pendingRelations: publishable.pendingRelations,
					relationPublication: {
						runNumber: input.runNumber,
						requestedKinds,
						artifactPath: authorization.artifactPath,
						fingerprints: authorization.fingerprints,
						proposals: publishable.pendingRelations.map(
							(pending) => ({
								relation: pending.relation,
								targetShadow: pending.target,
							}),
						),
					},
				},
			);
			return null;
		} catch (error) {
			console.error("Knowledge generation attempt failed", error);
			if (
				!generationCompleted &&
				rejectedRun &&
				rejectedRun.requestedKinds.length > 0
			) {
				await ctx.runMutation(recordRejectedRelationOutput, {
					attemptKey,
					...rejectedRun,
				});
			}
			await ctx.runMutation(internal.knowledgeGeneration.fail, {
				attemptKey,
				failureCode: "generationFailed",
				failureMessage: "Knowledge generation failed. Please retry.",
			});
			return null;
		}
	},
});
