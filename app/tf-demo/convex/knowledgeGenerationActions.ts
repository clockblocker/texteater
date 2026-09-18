"use node";

import { type FunctionReference, makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import type { KnowledgeInput, KnowledgeProduction } from "dumgen/types";
import * as Effect from "effect/Effect";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import { createProductionDumgen } from "../server/modelExecution";
import { parseGermanReading } from "../server/operationalParsing";
import {
	type CatalogMissSignal,
	parseResolvedGrammar,
} from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { inspectionFor } from "./inspectionAction";
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
	{
		attemptKey: string;
		miss: CatalogMissSignal;
		productionEvidence?: {
			request: unknown;
			failures: [];
			operationTraces: string[];
		};
	},
	null
>(
	"catalogGrowthSignals:recordKnowledgeCatalogMiss",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{
		attemptKey: string;
		miss: CatalogMissSignal;
		productionEvidence?: {
			request: unknown;
			failures: [];
			operationTraces: string[];
		};
	},
	null
>;

function getGenerationRequestBuilder() {
	return import("../server/generatedKnowledgeRequest").then(
		({ generationRequestFor }) => generationRequestFor,
	);
}

export const runKnowledgeGeneration = internalAction({
	args: { attemptKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { attemptKey }) => {
		const inspection = await inspectionFor(ctx, attemptKey, "Knowledge");
		const run = async () => {
			let rejectedRun:
				| {
						runNumber: number;
						requestedKinds: ReturnType<
							typeof requestedRelationKinds
						>;
						artifactPath: string | null;
						fingerprints: ReturnType<
							typeof effectiveRelationPublicationPolicy
						>["fingerprints"];
				  }
				| undefined;
			let generationCompleted = false;
			const operationTraces: string[] = [];
			let publicationQueue = Promise.resolve();
			const pendingContributions: KnowledgeProduction["changes"][number][] =
				[];
			let publicationSequence = 0;
			const publishedChanges = new Set<string>();
			let publishContribution: (
				changes: KnowledgeProduction["changes"],
			) => Promise<void> = async () => {};

			let requested: unknown = {};
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
				const knowledgeDumgen = createProductionDumgen(
					(event) => {
						if (event.kind === "TraceRecorded")
							operationTraces.push(event.traceJson);
					},
					{
						knowledgeDraft: input.knowledgeDraftJson
							? JSON.parse(input.knowledgeDraftJson)
							: undefined,
						onKnowledgeContribution: (changes) => {
							pendingContributions.push(
								...structuredClone(changes),
							);
							publicationQueue = publicationQueue
								.then(async () => {
									// Coalesce siblings that finish while a commit is in flight.
									const contribution =
										pendingContributions.splice(0);
									if (contribution.length)
										await publishContribution(contribution);
								})
								.catch((error) => {
									// Keep generation running; the final commit retries unsaved text.
									console.error(
										"Incremental Knowledge publication failed",
										error,
									);
								});
						},
					},
					inspection,
				);
				const reading = parseGermanReading(input.reading);
				const authorization = await ctx.runQuery(
					getRelationPublicationAuthorization,
					{},
				);
				const qualifiedKinds = authorization.rollbackStopped
					? []
					: authorization.qualifiedKinds;
				const generationRequestFor =
					await getGenerationRequestBuilder();
				const request = generationRequestFor(reading, qualifiedKinds, {
					translationLanguages: input.translationLanguages,
					translationsOnly: input.translationsOnly,
				});
				requested = request;
				const requestedKinds = requestedRelationKinds(
					"semanticRelations" in request ? request : {},
				);
				rejectedRun = {
					runNumber: input.runNumber,
					requestedKinds,
					artifactPath: authorization.artifactPath,
					fingerprints: authorization.fingerprints,
				};
				publishContribution = async (changes) => {
					await ctx.runAction(
						internal.orchestration.applyGeneratedKnowledgePlan,
						{
							attemptKey,
							publication: {
								sequence: ++publicationSequence,
								final: false,
							},
							reading,
							changes: [...changes],
							pendingRelations: [],
							productionEvidence: {
								request,
								failures: [],
								operationTraces: [],
							},
							relationPublication: {
								runNumber: input.runNumber,
								requestedKinds: [],
								artifactPath: authorization.artifactPath,
								fingerprints: authorization.fingerprints,
								proposals: [],
							},
						},
					);
					for (const change of changes)
						publishedChanges.add(JSON.stringify(change));
				};
				const generated = await Effect.runPromise(
					knowledgeDumgen
						.produceKnowledge({
							encounter: parseResolvedGrammar({
								encounter: input.encounter,
								attestation: input.attestation,
							}).encounter,
							reading,
							request: missingKnowledgeRequest(
								request,
								input.existingKnowledge,
							),
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
				await publicationQueue;
				if ("decision" in generated) {
					generationCompleted = true;
					await ctx.runMutation(recordKnowledgeCatalogMiss, {
						attemptKey,
						miss: generated,
						productionEvidence: {
							request,
							failures: [],
							operationTraces,
						},
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
						publication: {
							sequence: ++publicationSequence,
							final: true,
						},
						reading,
						changes: publishable.changes.filter(
							(change) =>
								!publishedChanges.has(JSON.stringify(change)),
						),
						pendingRelations: publishable.pendingRelations,
						productionEvidence: {
							request,
							failures: [...generated.failures],
							operationTraces,
						},
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
				await publicationQueue;
				inspection?.failure(
					"Knowledge generation failed",
					"app/tf-demo · knowledgeGenerationActions",
					requested,
					error,
				);
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
					productionEvidence: {
						request: requested,
						failures: [],
						operationTraces,
					},
					failureMessage:
						"Knowledge generation failed. Please retry.",
				});
				return null;
			}
		};
		try {
			return inspection
				? await inspection.promise(
						"Generate and publish Knowledge",
						"app/tf-demo · knowledgeGenerationActions",
						{ attemptKey },
						run,
						true,
					)
				: await run();
		} finally {
			await inspection?.flush();
		}
	},
});
