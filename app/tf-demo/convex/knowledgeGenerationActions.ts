"use node";

import { v } from "convex/values";
import { createDumgen, createOpenAILuna, createTypeSafeAsk } from "dumgen";
import * as Effect from "effect/Effect";
import { dumgenKnowledgeProducer } from "../server/dumgenKnowledgeProducer";
import {
	dumgenTracing,
	inspected,
	inspectionStep,
	type SpanHops,
	spanHops,
	withoutPayloads,
} from "../server/inspectionCapture";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import type {
	KnowledgeProducer,
	KnowledgeProduction,
} from "../server/knowledgeProduction";
import { parseGermanReading } from "../server/operationalParsing";
import { asksParticipleSource } from "../server/participleSource";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { type ActionCtx, env, internalAction } from "./_generated/server";
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

/** The aspects an incremental publication may carry (`knowledgeGeneration.publish`). */
const BASE_TEXT_ASPECTS = new Set([
	"transcription",
	"definition",
	"translations",
]);

/**
 * The production KnowledgeProducer: Dumgen's `knowledge.produce` (#887),
 * jev through TypeSafe and Luna through OpenAI with the deployment's keys.
 * It runs only where `TF_KNOWLEDGE_PRODUCTION=1`, so a deployment turns
 * Knowledge on once the user rules on shipping it (#883 point 10); elsewhere,
 * and without a key, a run fails with the safe message and calls no model.
 */
export function productionKnowledgeProducer(): KnowledgeProducer {
	return dumgenKnowledgeProducer((tracing) => {
		if (env.TF_KNOWLEDGE_PRODUCTION !== "1")
			throw new Error(
				"Knowledge production is off on this deployment (TF_KNOWLEDGE_PRODUCTION).",
			);
		if (!env.TYPESAFE_API_KEY || !env.OPENAI_API_KEY)
			throw new Error(
				"Knowledge production needs TYPESAFE_API_KEY and OPENAI_API_KEY.",
			);
		return createDumgen({
			jev: createTypeSafeAsk({ apiKey: env.TYPESAFE_API_KEY }),
			luna: createOpenAILuna({ apiKey: env.OPENAI_API_KEY }),
			...tracing,
		});
	});
}

/** Runs Knowledge production for one attempt with the production producer. */
export const runKnowledgeGeneration = internalAction({
	args: { attemptKey: v.string(), inspect: v.optional(v.boolean()) },
	returns: v.null(),
	handler: (ctx, args) =>
		generateKnowledge(ctx, args, productionKnowledgeProducer()),
});

/**
 * One attempt's Knowledge run with the given producer, which a test passes
 * in place of the production one.
 *
 * The action owns model execution only. It claims the run with one mutation,
 * publishes each contribution with one mutation, and finishes with one
 * mutation; sequencing, dedupe, the relation gate, and dictionary planning
 * live in `knowledgeGeneration.publish` beside the data they change.
 */
export async function generateKnowledge(
	ctx: ActionCtx,
	{ attemptKey, inspect }: { attemptKey: string; inspect?: boolean },
	produce: KnowledgeProducer,
): Promise<null> {
	const inspection = inspectionFor(
		ctx,
		attemptKey,
		inspect === true,
		"Knowledge",
	);
	const run = async (spans: SpanHops) => {
		const hop = <T>(name: string, input: unknown, work: () => Promise<T>) =>
			spans.hop(name, OWNER, input, work);
		let rejectedRun:
			| {
					runNumber: number;
					requestedKinds: ReturnType<typeof requestedRelationKinds>;
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
			// Dumgen waits for each contribution's publication; structural
			// aspects reach the dictionary with the final publication only.
			const onContribution = (changes: KnowledgeProduction["changes"]) =>
				Effect.promise(() => {
					const text = changes.filter((change) =>
						BASE_TEXT_ASPECTS.has(change.aspect),
					);
					if (text.length === 0) return publicationQueue;
					pendingContributions.push(...structuredClone(text));
					publicationQueue = publicationQueue
						.then(async () => {
							// Coalesce siblings that finish while a commit is in flight.
							const contribution = pendingContributions.splice(0);
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
					return publicationQueue;
				});
			const reading = parseGermanReading(input.reading);
			const { authorization } = input;
			const qualifiedKinds = authorization.rollbackStopped
				? []
				: authorization.qualifiedKinds;
			const generationRequestFor = await getGenerationRequestBuilder();
			const request = generationRequestFor(reading, qualifiedKinds, {
				translationLanguages: input.translationLanguages,
				topUpOnly: input.topUpOnly,
			});
			requested = request;
			const participleSource = asksParticipleSource(reading, {
				topUpOnly: input.topUpOnly,
				knowledge: input.existingKnowledge,
			});
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
				pendingRelations: KnowledgeProduction["pendingRelations"];
			};
			const publish = async (
				final: boolean,
				publishable: Publishable,
				failures: KnowledgeProduction["failures"],
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
			const { encounter, attestation } = parseResolvedGrammar({
				encounter: input.encounter,
				attestation: input.attestation,
			});
			const generated = await spans.run(
				produce(
					{
						encounter,
						reading,
						attestation,
						origin: input.origin,
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
					},
					{
						onContribution,
						// DEV inspection renders the calls with their payloads;
						// the run's evidence keeps every trace without them.
						...dumgenTracing(inspection, (trace) =>
							operationTraces.push(
								JSON.stringify(withoutPayloads(trace)),
							),
						),
					},
				).pipe(
					Effect.withSpan(
						"Produce Knowledge",
						inspectionStep(OWNER, { attemptKey }),
					),
				),
			);
			await publicationQueue;
			// An authored Reading the catalog does not cover (ADR 0021).
			const [catalogMiss] = generated.failures;
			if (
				catalogMiss &&
				generated.changes.length === 0 &&
				generated.failures.every(({ code }) => code === "CatalogMiss")
			) {
				generationCompleted = true;
				const { family, kind } = reading.lemma;
				const miss = {
					decision: "CatalogMiss" as const,
					stage: "knowledge.produce",
					route: `de/${family}/${kind}`,
					message: catalogMiss.message,
				};
				await hop("Record catalog miss", miss, () =>
					ctx.runMutation(
						internal.catalogGrowthSignals
							.recordKnowledgeCatalogMiss,
						{
							attemptKey,
							runNumber: input.runNumber,
							miss,
							productionEvidence: {
								request,
								failures: [...generated.failures],
								operationTraces,
							},
						},
					),
				);
				return null;
			}
			generationCompleted = true;
			// Relations too many for one plan commit in chunks first; the
			// last chunk settles the run.
			await publishInRelationChunks(
				generatedKnowledgeAllowedForPublication(
					generated,
					qualifiedKinds,
				),
				({ final, proposed, ...chunk }) =>
					publish(final, chunk, final ? generated.failures : [], {
						requestedKinds,
						proposed: [...proposed],
					}),
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
				failureMessage: "Knowledge generation failed. Please retry.",
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
		// Publication hops and generation run with the root's services, so
		// their spans sit under the root's.
		return await Effect.runPromise(
			inspected(
				Effect.flatMap(Effect.context<never>(), (services) =>
					Effect.tryPromise({
						try: () => run(spanHops(services)),
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
}
