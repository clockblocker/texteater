"use node";

import { v } from "convex/values";
import type { Jev, Luna } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { dumgenKnowledgeProducer } from "../server/dumgenKnowledgeProducer";
import type { generationRequestFor } from "../server/generatedKnowledgeRequest";
import {
	annotateInspectionStep,
	recordFailedStep,
	withoutPayloads,
} from "../server/inspectionCapture";
import { asksBreakdown } from "../server/knowledgeBreakdown";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import type {
	KnowledgeProducer,
	KnowledgeProduction,
} from "../server/knowledgeProduction";
import {
	failsWith,
	KnowledgeProductionUnavailableError,
	KnowledgePublicationRejected,
	type KnowledgeRunFailure,
	type KnowledgeRunRecord,
	UnsupportedKnowledgeLanguage,
} from "../server/knowledgeRunErrors";
import { asksSource } from "../server/knowledgeSource";
import { parseGermanReading } from "../server/operationalParsing";
import { internalErrorDescriptor } from "../server/resolutionFailure";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { type ActionCtx, env, internalAction } from "./_generated/server";
import type { GenerationInput } from "./knowledgeGeneration";
import {
	ConvexActionCtx,
	inspectedMutation,
	inspectedQuery,
	runConvexEffect,
} from "./model/convexEffect";
import { knowledgeDumgen, modelTransports } from "./model/deploymentDumgen";
import {
	generatedKnowledgeAllowedForPublication,
	requestedRelationKinds,
} from "./model/generatedKnowledgeContainment";
import { inspectionFor } from "./model/inspectionAction";
import { createRelationChunkQueue } from "./model/relationPublicationChunks";

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
export function productionKnowledgeProducer(): KnowledgeProducer<Jev | Luna> {
	return dumgenKnowledgeProducer(
		Effect.suspend(() => {
			if (env.TF_KNOWLEDGE_PRODUCTION !== "1")
				return Effect.fail(
					new KnowledgeProductionUnavailableError({
						reason: "ProductionFlagOff",
					}),
				);
			const { jev, luna } = modelTransports();
			if (!jev || !luna)
				return Effect.fail(
					new KnowledgeProductionUnavailableError({
						reason: "MissingModelKeys",
					}),
				);
			return Effect.void;
		}),
	);
}

/** Runs Knowledge production for one attempt with the production producer. */
export const runKnowledgeGeneration = internalAction({
	args: { attemptKey: v.string(), inspect: v.optional(v.boolean()) },
	returns: v.null(),
	handler: (ctx, args) =>
		generateKnowledge(ctx, args, productionKnowledgeProducer()),
});

type ClaimedInput = Extract<GenerationInput, { kind: "Generate" }>;
type RequestedKinds = ReturnType<typeof requestedRelationKinds>;
type Publishable = Pick<KnowledgeProduction, "changes" | "pendingRelations">;

/** One attempt's run: what every stage reads. */
type KnowledgeRun = {
	readonly attemptKey: string;
	readonly produce: KnowledgeProducer<Jev | Luna>;
	/** Each Dumgen operation's trace without payloads, as evidence keeps it. */
	readonly operationTraces: string[];
};

/** What a claimed run asks for, built from its input before any model call. */
type KnowledgePlan = {
	readonly input: ClaimedInput;
	readonly reading: Dumling.Reading<"de">;
	readonly qualifiedKinds: ClaimedInput["authorization"]["qualifiedKinds"];
	readonly request: ReturnType<typeof generationRequestFor>;
	readonly requestedKinds: RequestedKinds;
	readonly asksSource: boolean;
	readonly asksBreakdown: boolean;
};

const planRun = Effect.fn("KnowledgeGeneration.planRun")(function* (
	input: ClaimedInput,
) {
	if (input.reading.lemma.language !== "de")
		return yield* new UnsupportedKnowledgeLanguage({
			language: input.reading.lemma.language,
		});
	const reading = parseGermanReading(input.reading);
	const { authorization } = input;
	const qualifiedKinds = authorization.rollbackStopped
		? []
		: authorization.qualifiedKinds;
	const requestFor = yield* Effect.promise(getGenerationRequestBuilder);
	const request = requestFor(reading, qualifiedKinds, {
		translationLanguages: input.translationLanguages,
		topUpOnly: input.topUpOnly,
	});
	const plan: KnowledgePlan = {
		input,
		reading,
		qualifiedKinds,
		request,
		requestedKinds: requestedRelationKinds(
			"semanticRelations" in request ? request : {},
		),
		asksSource: asksSource(reading, {
			topUpOnly: input.topUpOnly,
			knowledge: input.existingKnowledge,
		}),
		asksBreakdown: asksBreakdown(reading, {
			topUpOnly: input.topUpOnly,
			knowledge: input.existingKnowledge,
		}),
	};
	return plan;
});

/**
 * One `knowledgeGeneration.publish` call. A Rejected publication fails;
 * the final one already failed the run inside its own transaction.
 */
const publishKnowledge = Effect.fn("KnowledgeGeneration.publishKnowledge")(
	function* (
		{ attemptKey, operationTraces }: KnowledgeRun,
		{ input, reading, request }: KnowledgePlan,
		final: boolean,
		publishable: Publishable,
		failures: KnowledgeProduction["failures"],
		/** What the gate checks and the final publication records. */
		relationRun: {
			readonly requestedKinds: RequestedKinds;
			readonly proposed: Publishable["pendingRelations"];
		} = { requestedKinds: [], proposed: [] },
	) {
		const { authorization } = input;
		const args = {
			attemptKey,
			final,
			reading,
			changes: [...publishable.changes],
			pendingRelations: [...publishable.pendingRelations],
			productionEvidence: {
				request,
				failures: [...failures],
				operationTraces: final ? [...operationTraces] : [],
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
		const result = yield* inspectedMutation(
			final
				? "Publish generated Knowledge"
				: "Publish Knowledge contribution",
			OWNER,
			args,
			internal.knowledgeGeneration.publish,
			args,
		);
		if (result.status === "Rejected")
			return yield* new KnowledgePublicationRejected({
				attemptKey,
				final,
				cause: new Error(result.message),
			});
		return result.status;
	},
);

/**
 * Publishes one contribution's base text; structural aspects reach the
 * dictionary with the final publication only. The producer hands
 * contributions on one at a time and waits for each (`onContribution`), so
 * commits never overlap. A failed commit is logged and leaves the run going:
 * the final publication carries every text change, so it retries the
 * unsaved text.
 */
const publishContribution = Effect.fn(
	"KnowledgeGeneration.publishContribution",
)(function* (
	run: KnowledgeRun,
	plan: KnowledgePlan,
	contribution: KnowledgeProduction["changes"],
) {
	const changes = structuredClone(
		contribution.filter((change) => BASE_TEXT_ASPECTS.has(change.aspect)),
	);
	if (changes.length === 0) return;
	yield* publishKnowledge(
		run,
		plan,
		false,
		{ changes, pendingRelations: [] },
		[],
	).pipe(
		// A started commit settles before the run moves on.
		Effect.uninterruptible,
		Effect.catchCause((cause) =>
			Cause.hasInterruptsOnly(cause)
				? Effect.interrupt
				: Effect.logError(
						"KnowledgeContributionPublicationFailed",
					).pipe(
						Effect.annotateLogs({
							attemptKey: run.attemptKey,
							runNumber: plan.input.runNumber,
							...internalErrorDescriptor(Cause.squash(cause)),
						}),
					),
		),
	);
});

const produceKnowledge = Effect.fn("Produce Knowledge")(function* (
	run: KnowledgeRun,
	plan: KnowledgePlan,
) {
	yield* annotateInspectionStep(OWNER, { attemptKey: run.attemptKey });
	const actionCtx = yield* ConvexActionCtx;
	const actionCtxLayer = Layer.succeed(ConvexActionCtx, actionCtx);
	const { input, reading, request } = plan;
	const { encounter, attestation } = parseResolvedGrammar({
		encounter: input.encounter,
		attestation: input.attestation,
	});
	return yield* run.produce(
		{
			encounter,
			reading,
			attestation,
			origin: input.origin,
			request: {
				// A stored frame drops `valency`: only a Reading with no
				// frame yet asks for one.
				...missingKnowledgeRequest(request, {
					knowledge: input.existingKnowledge,
					checkedRelationKinds: input.checkedRelationKinds,
				}),
				...(plan.asksSource ? { source: null } : {}),
			},
			// The Source decides whether the Breakdown stands (ADR 0050).
			breakdown: plan.asksBreakdown,
		},
		{
			// Dumgen waits for each contribution's publication.
			onContribution: (changes) =>
				publishContribution(run, plan, changes).pipe(
					Effect.provide(actionCtxLayer),
				),
			sourcePointsBack: (change) =>
				inspectedQuery(
					"Check the Source's direction",
					OWNER,
					change,
					internal.knowledgeGeneration.sourcePointsBack,
					{ reading, change },
				).pipe(Effect.provide(actionCtxLayer)),
		},
	);
});

/** An authored Reading the catalog does not cover (ADR 0021). */
function catalogMissOf({ changes, failures }: KnowledgeProduction) {
	const [first] = failures;
	return first &&
		changes.length === 0 &&
		failures.every(({ code }) => code === "CatalogMiss")
		? first
		: undefined;
}

const recordCatalogMiss = Effect.fn("KnowledgeGeneration.recordCatalogMiss")(
	function* (
		{ attemptKey, operationTraces }: KnowledgeRun,
		{ input, reading, request }: KnowledgePlan,
		failures: KnowledgeProduction["failures"],
		message: string,
	) {
		const { family, kind } = reading.lemma;
		const miss = {
			decision: "CatalogMiss" as const,
			stage: "knowledge.produce",
			route: `de/${family}/${kind}`,
			message,
		};
		yield* inspectedMutation(
			"Record catalog miss",
			OWNER,
			miss,
			internal.catalogGrowthSignals.recordKnowledgeCatalogMiss,
			{
				attemptKey,
				runNumber: input.runNumber,
				miss,
				productionEvidence: {
					request,
					failures: [...failures],
					operationTraces: [...operationTraces],
				},
			},
		);
	},
);

/**
 * Publishes what the run generated. Relations too many for one plan commit
 * in chunks first; the last chunk settles the run.
 */
const publishGenerated = Effect.fn("KnowledgeGeneration.publishGenerated")(
	function* (
		run: KnowledgeRun,
		plan: KnowledgePlan,
		generated: KnowledgeProduction,
	) {
		const catalogMiss = catalogMissOf(generated);
		if (catalogMiss)
			return yield* recordCatalogMiss(
				run,
				plan,
				generated.failures,
				catalogMiss.message,
			);
		const queue = createRelationChunkQueue(
			generatedKnowledgeAllowedForPublication(
				generated,
				plan.qualifiedKinds,
			),
		);
		for (let next = queue.next(); next; next = queue.next()) {
			const { final, proposed, ...chunk } = next.publication;
			const status = yield* publishKnowledge(
				run,
				plan,
				final,
				chunk,
				final ? generated.failures : [],
				{
					requestedKinds: plan.requestedKinds,
					proposed: [...proposed],
				},
			);
			if (status === "OverBudget") {
				queue.splitAndRequeue(next);
				continue;
			}
			if (status !== "Committed") return;
		}
	},
);

/**
 * Records a failed run with the generic learner message (the mutation
 * ignores provider text) and logs it without the error's text; DEV
 * inspection keeps the raw error. A recording that fails is logged the same
 * way and leaves the attempt Running for the stale-run watchdog.
 *
 * Uses `Effect.fnUntraced` deliberately so `KnowledgeGenerationFailed` and
 * `KnowledgeFailureRecordingFailed` log directly under the enclosing
 * `"Generate and publish Knowledge"` span.
 */
const recordFailure = Effect.fnUntraced(function* (
	{ attemptKey }: KnowledgeRun,
	{ record, error }: KnowledgeRunFailure,
) {
	yield* recordFailedStep(
		"Knowledge generation failed",
		OWNER,
		record.request,
		error,
	);
	yield* Effect.logError("KnowledgeGenerationFailed").pipe(
		Effect.annotateLogs({
			attemptKey,
			runNumber: record.runNumber,
			phase: record.phase,
			...internalErrorDescriptor(error),
		}),
	);
	const { rejectedRelationRun } = record;
	yield* inspectedMutation(
		"Record failed run",
		OWNER,
		{ attemptKey },
		internal.knowledgeGeneration.fail,
		{
			attemptKey,
			runNumber: record.runNumber,
			failureCode: "generationFailed",
			productionEvidence: {
				request: record.request,
				failures: [...record.failures],
				operationTraces: [...record.operationTraces],
			},
			failureMessage: "Knowledge generation failed. Please retry.",
			...(!record.generationCompleted &&
			rejectedRelationRun &&
			rejectedRelationRun.requestedKinds.length > 0
				? { rejectedRelationRun }
				: {}),
		},
	).pipe(
		Effect.catch((recordingError) =>
			Effect.logError("KnowledgeFailureRecordingFailed").pipe(
				Effect.annotateLogs({
					attemptKey,
					runNumber: record.runNumber,
					phase: record.phase,
					recordingFailure: internalErrorDescriptor(recordingError),
				}),
			),
		),
	);
});

/** Claim → load input → build request → produce → publish. */
const knowledgeRun = Effect.fn("KnowledgeGeneration.run")(function* (
	run: KnowledgeRun,
) {
	const unclaimed: KnowledgeRunRecord = {
		phase: "Claim",
		runNumber: null,
		request: {},
		generationCompleted: false,
		failures: [],
		operationTraces: run.operationTraces,
	};
	const input = yield* inspectedMutation(
		"Claim attempt and load input",
		OWNER,
		{ attemptKey: run.attemptKey },
		internal.knowledgeGeneration.begin,
		{ attemptKey: run.attemptKey },
	).pipe(failsWith(run.attemptKey, unclaimed));
	if (!input || input.kind === "Full") return;
	const claimed: KnowledgeRunRecord = {
		...unclaimed,
		phase: "Request",
		runNumber: input.runNumber,
	};
	const plan = yield* planRun(input).pipe(failsWith(run.attemptKey, claimed));
	const { authorization } = input;
	const planned: KnowledgeRunRecord = {
		...claimed,
		phase: "Produce",
		request: plan.request,
		rejectedRelationRun: {
			runNumber: input.runNumber,
			requestedKinds: plan.requestedKinds,
			artifactPath: authorization.artifactPath,
			fingerprints: authorization.fingerprints,
		},
	};
	const generated = yield* produceKnowledge(run, plan).pipe(
		failsWith(run.attemptKey, planned),
	);
	yield* publishGenerated(run, plan, generated).pipe(
		failsWith(run.attemptKey, {
			...planned,
			phase: "Publish",
			generationCompleted: true,
			failures: generated.failures,
		}),
	);
});

const generateAndPublishKnowledge = Effect.fn(
	"Generate and publish Knowledge",
	{ root: true },
)(function* (run: KnowledgeRun) {
	yield* annotateInspectionStep(OWNER, { attemptKey: run.attemptKey });
	yield* knowledgeRun(run).pipe(
		Effect.catchTags({
			KnowledgeRunFailure: (failure) => recordFailure(run, failure),
		}),
	);
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
	produce: KnowledgeProducer<Jev | Luna>,
): Promise<null> {
	const inspection = inspectionFor(
		ctx,
		attemptKey,
		inspect === true,
		"Knowledge",
	);
	const run: KnowledgeRun = {
		attemptKey,
		produce,
		operationTraces: [],
	};
	await runConvexEffect(
		ctx,
		generateAndPublishKnowledge(run).pipe(
			// The action's one Dumgen, built when its run starts.
			Effect.provide(knowledgeDumgen),
		),
		{
			inspection,
			// DEV inspection renders the calls with their payloads; the
			// run's evidence keeps every trace without them.
			traceSink: (trace) =>
				run.operationTraces.push(
					JSON.stringify(withoutPayloads(trace)),
				),
		},
	);
	return null;
}
