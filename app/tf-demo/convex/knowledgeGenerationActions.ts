"use node";

import { v } from "convex/values";
import type { KnowledgeInput, KnowledgeProduction } from "dumgen/types";
import * as Effect from "effect/Effect";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import { createProductionDumgen } from "../server/modelExecution";
import { parseGermanReading } from "../server/operationalParsing";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { inspectionFor } from "./inspectionAction";
import {
	generatedKnowledgeAllowedForPublication,
	type RelationPublicationFingerprints,
	requestedRelationKinds,
} from "./model/generatedKnowledgeContainment";

const OWNER = "app/tf-demo · knowledgeGenerationActions";

function getGenerationRequestBuilder() {
	return import("../server/generatedKnowledgeRequest").then(
		({ generationRequestFor }) => generationRequestFor,
	);
}

/**
 * Runs the Knowledge model pipeline for one attempt.
 *
 * The action owns model execution only. It claims the run with one mutation,
 * publishes each contribution with one mutation, and finishes with one
 * mutation; sequencing, dedupe, the relation gate, and dictionary planning
 * live in `knowledgeGeneration.publish` beside the data they change.
 */
export const runKnowledgeGeneration = internalAction({
	args: { attemptKey: v.string(), inspect: v.optional(v.boolean()) },
	returns: v.null(),
	handler: async (ctx, { attemptKey, inspect }) => {
		const inspection = inspectionFor(
			ctx,
			attemptKey,
			inspect === true,
			"Knowledge",
		);
		const hop = <T>(name: string, input: unknown, run: () => Promise<T>) =>
			inspection ? inspection.promise(name, OWNER, input, run) : run();
		const run = async () => {
			let rejectedRun:
				| {
						runNumber: number;
						requestedKinds: ReturnType<
							typeof requestedRelationKinds
						>;
						artifactPath: string | null;
						fingerprints: RelationPublicationFingerprints;
				  }
				| undefined;
			let generationCompleted = false;
			const operationTraces: string[] = [];
			let publicationQueue = Promise.resolve();
			const pendingContributions: KnowledgeProduction["changes"][number][] =
				[];
			let publishContribution: (
				changes: KnowledgeProduction["changes"],
			) => Promise<void> = async () => {};

			let requested: unknown = {};
			try {
				const input = await hop(
					"Claim attempt and load input",
					{ attemptKey },
					() =>
						ctx.runMutation(internal.knowledgeGeneration.begin, {
							attemptKey,
						}),
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
									// Keep generation running; the final publication retries unsaved text.
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
				const { authorization } = input;
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
				const publish = async (
					final: boolean,
					publishable: {
						changes: KnowledgeProduction["changes"];
						pendingRelations: KnowledgeProduction<"de">["pendingRelations"];
					},
					failures: KnowledgeProduction<"de">["failures"],
				) => {
					const args = {
						attemptKey,
						final,
						reading,
						changes: [...publishable.changes],
						pendingRelations: [...publishable.pendingRelations],
						productionEvidence: {
							request,
							failures: [...failures],
							operationTraces: final ? operationTraces : [],
						},
						relationPublication: {
							runNumber: input.runNumber,
							requestedKinds: final ? requestedKinds : [],
							artifactPath: authorization.artifactPath,
							fingerprints: authorization.fingerprints,
							proposals: publishable.pendingRelations.map(
								(pending) => ({
									relation: pending.relation,
									targetShadow: pending.target,
								}),
							),
						},
					};
					const result = await hop(
						final
							? "Publish generated Knowledge"
							: "Publish Knowledge contribution",
						args,
						() =>
							ctx.runMutation(
								internal.knowledgeGeneration.publish,
								args,
							),
					);
					if (result.status === "Rejected")
						throw new Error(result.message);
				};
				publishContribution = (changes) =>
					publish(false, { changes, pendingRelations: [] }, []);
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
					await hop("Record catalog miss", generated, () =>
						ctx.runMutation(
							internal.catalogGrowthSignals
								.recordKnowledgeCatalogMiss,
							{
								attemptKey,
								miss: generated,
								productionEvidence: {
									request,
									failures: [],
									operationTraces,
								},
							},
						),
					);
					return null;
				}
				generationCompleted = true;
				await publish(
					true,
					generatedKnowledgeAllowedForPublication(
						generated,
						qualifiedKinds,
					),
					generated.failures,
				);
				return null;
			} catch (error) {
				await publicationQueue;
				inspection?.failure(
					"Knowledge generation failed",
					OWNER,
					requested,
					error,
				);
				console.error("Knowledge generation attempt failed", error);
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
					...(!generationCompleted &&
					rejectedRun &&
					rejectedRun.requestedKinds.length > 0
						? { rejectedRelationRun: rejectedRun }
						: {}),
				});
				return null;
			}
		};
		try {
			return inspection
				? await inspection.promise(
						"Generate and publish Knowledge",
						OWNER,
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
