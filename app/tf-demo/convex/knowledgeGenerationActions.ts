"use node";

import { v } from "convex/values";
import { createDumgen, createOpenAILuna, createTypeSafeAsk } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { dumgenKnowledgeProducer } from "../server/dumgenKnowledgeProducer";
import type { generationRequestFor } from "../server/generatedKnowledgeRequest";
import {
	dumgenTracing,
	type InspectionCapture,
	inspected,
	inspectionStep,
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
import { internalErrorDescriptor } from "../server/resolutionFailure";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { internal } from "./_generated/api";
import { type ActionCtx, env, internalAction } from "./_generated/server";
import type { GenerationInput } from "./knowledgeGeneration";
import {
	generatedKnowledgeAllowedForPublication,
	type RelationPublicationFingerprints,
	requestedRelationKinds,
} from "./model/generatedKnowledgeContainment";
import { inspectionFor } from "./model/inspectionAction";
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

type ClaimedInput = Extract<GenerationInput, { kind: "Generate" }>;
type RequestedKinds = ReturnType<typeof requestedRelationKinds>;
type Publishable = Pick<KnowledgeProduction, "changes" | "pendingRelations">;

/** A relation run whose model output never reached a publication. */
type RejectedRelationRun = {
	readonly runNumber: number;
	readonly requestedKinds: RequestedKinds;
	readonly artifactPath: string | null;
	readonly fingerprints: RelationPublicationFingerprints;
};

/** One attempt's run: what every stage reads. */
type KnowledgeRun = {
	readonly ctx: ActionCtx;
	readonly attemptKey: string;
	readonly produce: KnowledgeProducer;
	readonly inspection: InspectionCapture | undefined;
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
	readonly asksParticipleSource: boolean;
};

/**
 * What a run's failure path records, handed from stage to stage: the run
 * `begin` claimed (only it may end the attempt), the request, the relation
 * run a failure before publication rejects, whether generation completed,
 * the aspect failures it returned, and the operation traces.
 */
type KnowledgeRunRecord = {
	readonly phase: "Claim" | "Request" | "Produce" | "Publish";
	readonly runNumber: number | null;
	readonly request: unknown;
	readonly rejectedRelationRun?: RejectedRelationRun;
	readonly generationCompleted: boolean;
	readonly failures: KnowledgeProduction["failures"];
	readonly operationTraces: readonly string[];
};

/** A stage's error or defect, with the record its failure path stores. */
class KnowledgeRunFailure {
	readonly _tag = "KnowledgeRunFailure";
	readonly record: KnowledgeRunRecord;
	readonly error: unknown;
	constructor(record: KnowledgeRunRecord, error: unknown) {
		this.record = record;
		this.error = error;
	}
}

/**
 * Tags a stage's error or defect with the record its failure path stores.
 * An interrupt-only cause propagates untagged: an interrupted run records
 * nothing, and the stale-run watchdog ends it as interrupted.
 */
function failsWith(record: KnowledgeRunRecord) {
	return <A, E, R>(
		stage: Effect.Effect<A, E, R>,
	): Effect.Effect<A, KnowledgeRunFailure, R> =>
		stage.pipe(
			Effect.catchCause((cause) =>
				Cause.hasInterruptsOnly(cause)
					? Effect.interrupt
					: Effect.fail(
							new KnowledgeRunFailure(
								record,
								Cause.squash(cause),
							),
						),
			),
		);
}

/** Promise work as an inspection step under the current span. */
function hop<T>(name: string, input: unknown, work: () => Promise<T>) {
	// The rejection passes through untouched; failsWith folds it into a
	// KnowledgeRunFailure.
	// @effect-diagnostics-next-line unknownInEffectCatch:off
	return Effect.tryPromise({ try: work, catch: (error) => error }).pipe(
		Effect.withSpan(name, inspectionStep(OWNER, input)),
	);
}

function planRun(input: ClaimedInput) {
	return Effect.gen(function* () {
		if (input.reading.lemma.language !== "de")
			return yield* Effect.fail(
				// failsWith folds this into a KnowledgeRunFailure.
				// @effect-diagnostics-next-line globalErrorInEffectFailure:off
				new Error("Unsupported Knowledge language."),
			);
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
			asksParticipleSource: asksParticipleSource(reading, {
				topUpOnly: input.topUpOnly,
				knowledge: input.existingKnowledge,
			}),
		};
		return plan;
	});
}

/**
 * One `knowledgeGeneration.publish` call. A Rejected publication fails;
 * the final one already failed the run inside its own transaction.
 */
function publishKnowledge(
	{ ctx, attemptKey, operationTraces }: KnowledgeRun,
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
	return hop(
		final
			? "Publish generated Knowledge"
			: "Publish Knowledge contribution",
		args,
		() => ctx.runMutation(internal.knowledgeGeneration.publish, args),
	).pipe(
		Effect.flatMap((result) =>
			result.status === "Rejected"
				? // failsWith folds this into a KnowledgeRunFailure.
					// @effect-diagnostics-next-line globalErrorInEffectFailure:off
					Effect.fail(new Error(result.message))
				: Effect.succeed(result.status),
		),
	);
}

/**
 * Publishes one contribution's base text; structural aspects reach the
 * dictionary with the final publication only. The producer hands
 * contributions on one at a time and waits for each (`onContribution`), so
 * commits never overlap. A failed commit is logged and leaves the run going:
 * the final publication carries every text change, so it retries the
 * unsaved text.
 */
function publishContribution(
	run: KnowledgeRun,
	plan: KnowledgePlan,
	contribution: KnowledgeProduction["changes"],
) {
	return Effect.suspend(() => {
		const changes = structuredClone(
			contribution.filter((change) =>
				BASE_TEXT_ASPECTS.has(change.aspect),
			),
		);
		if (changes.length === 0) return Effect.void;
		return publishKnowledge(
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
					: Effect.sync(() =>
							console.error(
								JSON.stringify({
									event: "KnowledgeContributionPublicationFailed",
									attemptKey: run.attemptKey,
									runNumber: plan.input.runNumber,
									...internalErrorDescriptor(
										Cause.squash(cause),
									),
								}),
							),
						),
			),
		);
	});
}

function produceKnowledge(run: KnowledgeRun, plan: KnowledgePlan) {
	return Effect.gen(function* () {
		const { input, reading, request } = plan;
		const { encounter, attestation } = parseResolvedGrammar({
			encounter: input.encounter,
			attestation: input.attestation,
		});
		return yield* run
			.produce(
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
						...(plan.asksParticipleSource
							? { participleSource: null }
							: {}),
					},
				},
				{
					// Dumgen waits for each contribution's publication.
					onContribution: (changes) =>
						publishContribution(run, plan, changes),
					// DEV inspection renders the calls with their payloads; the
					// run's evidence keeps every trace without them.
					...dumgenTracing(run.inspection, (trace) =>
						run.operationTraces.push(
							JSON.stringify(withoutPayloads(trace)),
						),
					),
				},
			)
			.pipe(
				Effect.withSpan(
					"Produce Knowledge",
					inspectionStep(OWNER, { attemptKey: run.attemptKey }),
				),
			);
	});
}

/** An authored Reading the catalog does not cover (ADR 0021). */
function catalogMissOf({ changes, failures }: KnowledgeProduction) {
	const [first] = failures;
	return first &&
		changes.length === 0 &&
		failures.every(({ code }) => code === "CatalogMiss")
		? first
		: undefined;
}

function recordCatalogMiss(
	{ ctx, attemptKey, operationTraces }: KnowledgeRun,
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
	return hop("Record catalog miss", miss, () =>
		ctx.runMutation(
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
		),
	);
}

/**
 * Publishes what the run generated. Relations too many for one plan commit
 * in chunks first; the last chunk settles the run.
 */
function publishGenerated(
	run: KnowledgeRun,
	plan: KnowledgePlan,
	generated: KnowledgeProduction,
) {
	const catalogMiss = catalogMissOf(generated);
	if (catalogMiss)
		return recordCatalogMiss(
			run,
			plan,
			generated.failures,
			catalogMiss.message,
		);
	return Effect.gen(function* () {
		const services = yield* Effect.context<never>();
		// The rethrown squash passes through; failsWith folds it into a
		// KnowledgeRunFailure.
		// @effect-diagnostics-next-line unknownInEffectCatch:off
		yield* Effect.tryPromise({
			try: (signal) =>
				publishInRelationChunks(
					generatedKnowledgeAllowedForPublication(
						generated,
						plan.qualifiedKinds,
					),
					async ({ final, proposed, ...chunk }) => {
						const exit = await Effect.runPromiseExitWith(services)(
							publishKnowledge(
								run,
								plan,
								final,
								chunk,
								final ? generated.failures : [],
								{
									requestedKinds: plan.requestedKinds,
									proposed: [...proposed],
								},
							),
							{ signal },
						);
						if (Exit.isSuccess(exit)) return exit.value;
						throw Cause.squash(exit.cause);
					},
				),
			catch: (error) => error,
		});
	});
}

/**
 * Records a failed run with the generic learner message (the mutation
 * ignores provider text) and logs it without the error's text; DEV
 * inspection keeps the raw error. A recording that fails is logged the same
 * way and leaves the attempt Running for the stale-run watchdog.
 */
function recordFailure(
	{ ctx, attemptKey }: KnowledgeRun,
	{ record, error }: KnowledgeRunFailure,
) {
	return Effect.gen(function* () {
		spanHops(yield* Effect.context<never>()).failure(
			"Knowledge generation failed",
			OWNER,
			record.request,
			error,
		);
		console.error(
			JSON.stringify({
				event: "KnowledgeGenerationFailed",
				attemptKey,
				runNumber: record.runNumber,
				phase: record.phase,
				...internalErrorDescriptor(error),
			}),
		);
		const { rejectedRelationRun } = record;
		yield* hop("Record failed run", { attemptKey }, () =>
			ctx.runMutation(internal.knowledgeGeneration.fail, {
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
			}),
		).pipe(
			Effect.catch((recordingError) =>
				Effect.sync(() =>
					console.error(
						JSON.stringify({
							event: "KnowledgeFailureRecordingFailed",
							attemptKey,
							runNumber: record.runNumber,
							phase: record.phase,
							recordingFailure:
								internalErrorDescriptor(recordingError),
						}),
					),
				),
			),
		);
	});
}

/** Claim → load input → build request → produce → publish. */
function knowledgeRun(run: KnowledgeRun) {
	return Effect.gen(function* () {
		const unclaimed: KnowledgeRunRecord = {
			phase: "Claim",
			runNumber: null,
			request: {},
			generationCompleted: false,
			failures: [],
			operationTraces: run.operationTraces,
		};
		const input = yield* hop(
			"Claim attempt and load input",
			{ attemptKey: run.attemptKey },
			() =>
				run.ctx.runMutation(internal.knowledgeGeneration.begin, {
					attemptKey: run.attemptKey,
				}),
		).pipe(failsWith(unclaimed));
		if (!input || input.kind === "Full") return;
		const claimed: KnowledgeRunRecord = {
			...unclaimed,
			phase: "Request",
			runNumber: input.runNumber,
		};
		const plan = yield* planRun(input).pipe(failsWith(claimed));
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
			failsWith(planned),
		);
		yield* publishGenerated(run, plan, generated).pipe(
			failsWith({
				...planned,
				phase: "Publish",
				generationCompleted: true,
				failures: generated.failures,
			}),
		);
	});
}

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
	const run: KnowledgeRun = {
		ctx,
		attemptKey,
		produce,
		inspection,
		operationTraces: [],
	};
	try {
		await Effect.runPromise(
			inspected(
				knowledgeRun(run).pipe(
					Effect.catch((failure) => recordFailure(run, failure)),
					Effect.withSpan("Generate and publish Knowledge", {
						...inspectionStep(OWNER, { attemptKey }),
						root: true,
					}),
				),
				inspection,
			),
		);
		return null;
	} finally {
		await inspection?.flush();
	}
}
