"use node";

import { v } from "convex/values";
import type {
	ComparisonInput,
	KnowledgeInput,
	KnowledgeProduction,
} from "dumgen/types";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import {
	inspected,
	inspectionStep,
	type SpanHops,
	spanHops,
} from "../server/inspectionCapture";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import { createProductionDumgen } from "../server/modelExecution";
import { parseGermanReading } from "../server/operationalParsing";
import {
	asksParticipleSource,
	contributedParticipleSource,
} from "../server/participleSource";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { inspectionFor } from "./inspectionAction";
import {
	generatedKnowledgeAllowedForPublication,
	type RelationPublicationFingerprints,
	requestedRelationKinds,
} from "./model/generatedKnowledgeContainment";
import { publishInRelationChunks } from "./model/relationPublicationChunks";

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
		const run = async (spans: SpanHops) => {
			const hop = <T>(
				name: string,
				input: unknown,
				work: () => Promise<T>,
			) => spans.hop(name, OWNER, input, work);
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
			/** The run `begin` claimed; only it may end the attempt. */
			let claimedRun: number | null = null;
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
				claimedRun = input.runNumber;
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
					topUpOnly: input.topUpOnly,
				});
				requested = request;
				const participleSource = asksParticipleSource(reading, {
					topUpOnly: input.topUpOnly,
					knowledge: input.existingKnowledge,
				});
				/** The source verb's new Reading, stored with the final batch. */
				let participleSourceReading: Dumling.Reading<"de"> | undefined;
				const requestedKinds = requestedRelationKinds(
					"semanticRelations" in request ? request : {},
				);
				rejectedRun = {
					runNumber: input.runNumber,
					requestedKinds,
					artifactPath: authorization.artifactPath,
					fingerprints: authorization.fingerprints,
				};
				type Publishable = {
					changes: KnowledgeProduction["changes"];
					pendingRelations: KnowledgeProduction<"de">["pendingRelations"];
				};
				const publish = async (
					final: boolean,
					publishable: Publishable,
					failures: KnowledgeProduction<"de">["failures"],
					/** What the gate checks and the final publication records. */
					relationRun: {
						requestedKinds: typeof requestedKinds;
						proposed: Publishable["pendingRelations"];
					} = { requestedKinds: [], proposed: [] },
				) => {
					const args = {
						attemptKey,
						final,
						reading,
						...(final && participleSourceReading
							? { participleSourceReading }
							: {}),
						changes: [...publishable.changes],
						pendingRelations: [...publishable.pendingRelations],
						productionEvidence: {
							request,
							failures: [...failures],
							operationTraces: final ? operationTraces : [],
						},
						relationPublication: {
							runNumber: input.runNumber,
							requestedKinds: relationRun.requestedKinds,
							artifactPath: authorization.artifactPath,
							fingerprints: authorization.fingerprints,
							proposals: relationRun.proposed.map((pending) => ({
								relation: pending.relation,
								targetShadow: pending.target,
							})),
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
					return result.status;
				};
				publishContribution = async (changes) => {
					await publish(false, { changes, pendingRelations: [] }, []);
				};
				const { encounter } = parseResolvedGrammar({
					encounter: input.encounter,
					attestation: input.attestation,
				});
				const generated = await spans.run(
					knowledgeDumgen
						.produceKnowledge({
							encounter,
							reading,
							request: {
								// A stored frame drops `valency`: only a Reading
								// with no frame yet asks for one.
								...missingKnowledgeRequest(request, {
									knowledge: input.existingKnowledge,
									checkedRelationKinds:
										input.checkedRelationKinds,
								}),
								...(participleSource
									? { participleSource: null }
									: {}),
							},
							// Coverage is per occurrence: the stored frame may lack this sentence's government.
							attestedGovernment: input.government,
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
								runNumber: input.runNumber,
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
				// A Participle Source always has a target (ADR 0035): a source
				// verb the dictionary lacks gets a Reading before the link. A
				// source whose Reading cannot be generated is dropped and fails
				// its aspect, so the run is Partial and retries it.
				let production: KnowledgeProduction<"de"> = generated;
				const sourceVerb = contributedParticipleSource(
					generated.changes,
				);
				if (sourceVerb) {
					try {
						const stored = await hop(
							"Find the source verb's stored Readings",
							{ lemma: sourceVerb },
							() =>
								ctx.runQuery(
									internal.dumdictStorage.queries
										.findStoredReadings,
									{ lemmaKey: lemmaIdentityKey(sourceVerb) },
								),
						);
						if (stored.length === 0) {
							const resolution = await spans.run(
								knowledgeDumgen.resolveOrGenerateReadingEmojiDescription(
									{
										encounter,
										lemma: sourceVerb,
										candidates: [],
									} as ComparisonInput<"de">,
								),
							);
							participleSourceReading = parseGermanReading({
								unitKind: "Reading",
								lemma: sourceVerb,
								emojiDescription: resolution.emojiDescription,
							});
						}
					} catch (error) {
						console.error(
							"The Participle Source's verb could not be resolved",
							error,
						);
						production = {
							...generated,
							changes: generated.changes.filter(
								(change) =>
									change.aspect !== "participleSource",
							),
							failures: [
								...generated.failures,
								{
									aspect: "participleSource",
									code: "Unresolved",
									message:
										"The source verb's Reading could not be generated.",
								},
							],
						};
					}
				}
				// Relations too many for one plan commit in chunks first; the
				// last chunk settles the run.
				await publishInRelationChunks(
					generatedKnowledgeAllowedForPublication(
						production,
						qualifiedKinds,
					),
					({ final, proposed, ...chunk }) =>
						publish(
							final,
							chunk,
							final ? production.failures : [],
							{
								requestedKinds,
								proposed: [...proposed],
							},
						),
				);
				return null;
			} catch (error) {
				await publicationQueue;
				spans.failure(
					"Knowledge generation failed",
					OWNER,
					requested,
					error,
				);
				console.error("Knowledge generation attempt failed", error);
				await ctx.runMutation(internal.knowledgeGeneration.fail, {
					attemptKey,
					runNumber: claimedRun,
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
			// Publication hops and generation run in the root's runtime, so
			// their spans sit under the root's.
			return await Effect.runPromise(
				inspected(
					Effect.flatMap(Effect.runtime<never>(), (runtime) =>
						Effect.tryPromise({
							try: () => run(spanHops(runtime)),
							catch: (error) => error,
						}),
					).pipe(
						Effect.withSpan("Generate and publish Knowledge", {
							...inspectionStep(OWNER, { attemptKey }),
							root: true,
						}),
					),
					inspection,
				),
			);
		} finally {
			await inspection?.flush();
		}
	},
});
