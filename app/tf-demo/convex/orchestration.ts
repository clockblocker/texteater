"use node";

import { type FunctionReference, makeFunctionReference } from "convex/server";
import { type Infer, v } from "convex/values";
import type { ApplyGeneratedKnowledgeRequest } from "dumdict";
import { createDumdictService } from "dumdict/runtime";
import { directSemanticRelationValues } from "dumrel";
import * as Effect from "effect/Effect";
import type { InspectionCapture } from "../server/inspectionCapture";
import {
	createTfDemoOrchestrator,
	type LateResolvedClickCommit,
	type OrchestrationPersistence,
	type ResolutionContext,
	type ResolutionProgressObserver,
	type ResolvedClickCommit,
	type ResolveSegmentInput,
	type ResolveSegmentResult,
	type ReusableAttestation,
	type ReusedResolvedClickCommit,
	type UnresolvedClickCommit,
} from "../server/linguisticOrchestration";
import {
	createProductionDumgen,
	createProductionKnowledgeDraft,
} from "../server/modelExecution";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../server/operationalParsing";
import {
	parseResolvedGrammar,
	type ResolvedGrammar,
} from "../server/resolutionGrammar";
import {
	executeResolutionSession,
	type ResolutionSessionLifecyclePort,
} from "../server/resolutionSessionExecution";
import { api, internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import {
	createConvexDumdictStorage,
	type DictionaryPlanResult,
	dictionaryPlanResult,
} from "./dumdictActionStorage";
import { inspectionFor } from "./inspectionAction";
import { generatedKnowledgeAllowedForPublication } from "./model/generatedKnowledgeContainment";
import {
	projectResolutionGrammar,
	projectResolutionReading,
	type ResolutionSessionGuard,
} from "./model/resolutionSessions";
import {
	knowledgeProductionEvidenceValidator,
	type nonResolvedGrammaticalValidator,
	relationPublicationRunValidator,
	type resolvedGrammaticalValidator,
	resolveSegmentResultValidator,
	type reusableAttestationValidator,
} from "./model/validators";
import type { RelationPublicationRun } from "./relationPublication";

const MAX_KNOWLEDGE_PLAN_ATTEMPTS = 3;

const submitTextResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		textId: v.id("texts"),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitTextActionResult = Infer<typeof submitTextResultValidator>;

type ResolutionCatalogMiss = Extract<
	ResolveSegmentResult,
	{ catalogMiss: unknown }
>["catalogMiss"];

const recordAndSettleCatalogMiss = makeFunctionReference<
	"mutation",
	{ guard: ResolutionSessionGuard; miss: ResolutionCatalogMiss },
	null
>(
	"catalogGrowthSignals:recordAndSettleCatalogMiss",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{ guard: ResolutionSessionGuard; miss: ResolutionCatalogMiss },
	null
>;

const recordRelationPublicationFailure = makeFunctionReference<
	"mutation",
	{ attemptKey: string; run: RelationPublicationRun },
	null
>(
	"relationPublication:recordPublicationFailure",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{ attemptKey: string; run: RelationPublicationRun },
	null
>;

type ResolveSegmentActionResult = Infer<typeof resolveSegmentResultValidator>;
type ResolvedGrammaticalActionResult = Infer<
	typeof resolvedGrammaticalValidator
>;
type NonResolvedGrammaticalActionResult = Infer<
	typeof nonResolvedGrammaticalValidator
>;
type ReusableAttestationResult = Infer<typeof reusableAttestationValidator>;
type GrammaticalResolveSegmentResult = Extract<
	ResolveSegmentResult,
	{ grammatical: unknown }
>["grammatical"];

function convexId<TableName extends TableNames>(value: string): Id<TableName> {
	return value as Id<TableName>;
}

function nonResolvedGrammaticalActionResult(
	input: Extract<
		GrammaticalResolveSegmentResult,
		{ decision: "Unresolved" | "NotImplemented" }
	>,
): NonResolvedGrammaticalActionResult {
	return input;
}

function resolvedGrammaticalActionResult(
	input: ResolvedGrammar,
): ResolvedGrammaticalActionResult {
	const parsed = parseResolvedGrammar(input);
	return {
		...parsed,
		encounter: {
			sentence: {
				...parsed.encounter.sentence,
				segments: parsed.encounter.sentence.segments.map((segment) => ({
					...segment,
				})),
			},
			target: {
				...parsed.encounter.target,
				memberSegmentIndices: [
					...parsed.encounter.target.memberSegmentIndices,
				],
			},
		},
	};
}
function resolvedGrammaticalCheckpoint(
	input: ResolvedGrammaticalActionResult,
): ResolvedGrammar {
	return parseResolvedGrammar(input);
}

function reusableAttestationResult(
	input: ReusableAttestation,
): ReusableAttestationResult {
	return {
		attestationId: convexId<"attestations">(input.attestationId),
		grammatical: resolvedGrammaticalActionResult(input.grammatical),
		reading: {
			...input.reading,
			lemma: { ...input.reading.lemma },
		},
	};
}

/**
 * The commit-time rollback fallback. It removes only generated relation plan
 * operations so base Knowledge from the same model response can still commit.
 */
export function withoutGeneratedRelationPlan(
	plan: DictionaryPlanResult,
): DictionaryPlanResult {
	const changes: DictionaryPlanResult["changes"] = [];
	for (const change of plan.changes) {
		if (
			change.type === "createPendingSemanticRelation" ||
			change.type === "deletePendingSemanticRelation"
		) {
			continue;
		}
		if (change.type !== "patchReading") {
			changes.push(change);
			continue;
		}
		const ops = change.ops.filter((operation) => {
			if (
				typeof operation !== "object" ||
				operation === null ||
				!("kind" in operation) ||
				operation.kind !== "applyKnowledgeChange" ||
				!("envelope" in operation) ||
				typeof operation.envelope !== "object" ||
				operation.envelope === null ||
				!("change" in operation.envelope) ||
				typeof operation.envelope.change !== "object" ||
				operation.envelope.change === null ||
				!("aspect" in operation.envelope.change)
			) {
				return true;
			}
			return operation.envelope.change.aspect !== "semanticRelations";
		});
		if (ops.length > 0) changes.push({ ...change, ops });
	}
	return {
		...plan,
		changes,
	};
}

function committedOccurrenceResult(
	input:
		| Extract<ResolvedClickCommit, { status: "Committed" | "Reused" }>
		| LateResolvedClickCommit,
) {
	return {
		...input,
		clickId: convexId<"visitorClicks">(input.clickId),
		readingId: convexId<"readings">(input.readingId),
		attestationId: convexId<"attestations">(input.attestationId),
		occurrence: reusableAttestationResult(input.occurrence),
	};
}

function reusedClickResult(input: ReusedResolvedClickCommit) {
	return {
		...input,
		clickId: convexId<"visitorClicks">(input.clickId),
		readingId: convexId<"readings">(input.readingId),
		attestationId: convexId<"attestations">(input.attestationId),
	};
}

function lateResolvedClickResult(input: LateResolvedClickCommit) {
	return {
		...input,
		status: "Reused" as const,
		clickId: convexId<"visitorClicks">(input.clickId),
		readingId: convexId<"readings">(input.readingId),
		attestationId: convexId<"attestations">(input.attestationId),
		occurrence: reusableAttestationResult(input.occurrence),
	};
}

function resolveSegmentActionResult(
	result: ResolveSegmentResult,
): ResolveSegmentActionResult {
	if ("catalogMiss" in result) {
		return { catalogMiss: result.catalogMiss };
	}
	if ("readingResolution" in result) {
		const grammatical = resolvedGrammaticalActionResult(result.grammatical);
		const reading = {
			...result.reading,
			lemma: { ...result.reading.lemma },
		};
		const dictionaryPlan = dictionaryPlanResult(result.dictionaryPlan);
		if (!("reused" in result)) {
			return {
				grammatical,
				readingResolution: { ...result.readingResolution },
				reading,
				dictionaryPlan,
				persisted:
					result.persisted.status === "MembershipConflict"
						? {
								...result.persisted,
								conflictingAttestationIds:
									result.persisted.conflictingAttestationIds.map(
										(id) => convexId<"attestations">(id),
									),
							}
						: { ...result.persisted },
			};
		}
		return {
			grammatical,
			readingResolution: { ...result.readingResolution },
			reading,
			dictionaryPlan,
			reused: result.reused,
			persisted: committedOccurrenceResult(result.persisted),
		};
	}
	if ("deduplicated" in result) {
		return "reading" in result
			? {
					grammatical: resolvedGrammaticalActionResult(
						result.grammatical,
					),
					reading: {
						...result.reading,
						lemma: { ...result.reading.lemma },
					},
					reused: true,
					deduplicated: true,
					persisted: {
						...result.persisted,
						clickId: convexId<"visitorClicks">(
							result.persisted.clickId,
						),
						readingId: convexId<"readings">(
							result.persisted.readingId,
						),
						occurrence: reusableAttestationResult(
							result.persisted.occurrence,
						),
					},
				}
			: {
					grammatical: {
						decision: "Unresolved",
						language: result.grammatical.language,
					},
					deduplicated: true,
					persisted: {
						...result.persisted,
						clickId: convexId<"visitorClicks">(
							result.persisted.clickId,
						),
					},
				};
	}
	return "reading" in result
		? {
				grammatical: resolvedGrammaticalActionResult(
					result.grammatical,
				),
				reading: {
					...result.reading,
					lemma: { ...result.reading.lemma },
				},
				reused: true,
				persisted:
					"occurrence" in result.persisted
						? lateResolvedClickResult(result.persisted)
						: reusedClickResult(result.persisted),
			}
		: {
				grammatical: nonResolvedGrammaticalActionResult(
					result.grammatical,
				),
				persisted: {
					...result.persisted,
					clickId: convexId<"visitorClicks">(
						result.persisted.clickId,
					),
				},
			};
}

export const submitText = action({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitTextResultValidator,
	handler: async (ctx, args): Promise<SubmitTextActionResult> => {
		const requestId = crypto.randomUUID();
		if (args.inspectionVisitorId) {
			await ctx.runMutation(internal.resolutionInspection.beginAnalysis, {
				requestId,
				visitorId: args.inspectionVisitorId,
				sourceText: args.sourceText,
			});
		}
		const inspection = args.inspectionVisitorId
			? await inspectionFor(ctx, requestId)
			: undefined;
		let state: "Complete" | "PermanentFailure" = "PermanentFailure";
		try {
			const run = () =>
				Effect.runPromise(
					orchestratorFor(
						ctx,
						undefined,
						undefined,
						inspection,
					).submitText(args),
				);
			const result = inspection
				? await inspection.promise(
						"Analyze submitted text",
						"app/tf-demo · linguisticOrchestration",
						{ sourceText: args.sourceText },
						run,
						true,
					)
				: await run();
			state = "Complete";
			return {
				status: "Accepted",
				textId: convexId<"texts">(result.persisted.textId),
			};
		} finally {
			await inspection?.flush();
			if (args.inspectionVisitorId) {
				await ctx.runMutation(
					internal.resolutionInspection.finishAnalysis,
					{ requestId, state },
				);
			}
		}
	},
});

export const resolveSegment = action({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: resolveSegmentResultValidator,
	handler: async (ctx, args): Promise<ResolveSegmentActionResult> =>
		resolveSegmentActionResult(
			await Effect.runPromise(
				orchestratorFor(ctx).resolveSegment({
					...args,
					sentenceId: args.sentenceId,
				}),
			),
		),
});

export const runResolutionSession = internalAction({
	args: {
		requestId: v.string(),
		runToken: v.string(),
		segmentId: v.id("segments"),
	},
	returns: v.null(),
	handler: async (ctx, guard): Promise<null> => {
		const inspection = await inspectionFor(ctx, guard.requestId);
		const run = () =>
			Effect.runPromise(
				executeResolutionSession({
					identity: guard,
					lifecycle: tracedResolutionLifecycle(
						createConvexResolutionSessionLifecycle(ctx, guard),
						inspection,
					),
					resolve: (selection, checkpoints, observer, context) => {
						const resolution = orchestratorFor(
							ctx,
							guard,
							observer,
							inspection,
						).resolveSegment(selection, checkpoints, context);
						return inspection
							? inspection.effect(
									"Resolve selected segment",
									"app/tf-demo · linguisticOrchestration",
									{ selection, checkpoints },
									resolution,
								)
							: resolution;
					},
				}),
			);
		try {
			if (inspection)
				await inspection.promise(
					"Resolution session",
					"app/tf-demo · orchestration.runResolutionSession",
					guard,
					run,
					true,
				);
			else await run();
		} finally {
			await inspection?.flush();
		}
		return null;
	},
});

function tracedResolutionLifecycle(
	lifecycle: ResolutionSessionLifecyclePort,
	inspection?: InspectionCapture,
): ResolutionSessionLifecyclePort {
	if (!inspection) return lifecycle;
	return {
		begin: () =>
			inspection.promise(
				"Load checkpoints and start run",
				"app/tf-demo · resolutionSessions",
				{},
				() => lifecycle.begin(),
			),
		advance: (event) =>
			event.progress === "RouteAvailable" ||
			event.progress === "Committing"
				? lifecycle.advance(event)
				: inspection.promise(
						`Save ${event.progress}`,
						"app/tf-demo · resolutionSessions",
						event,
						() => lifecycle.advance(event),
					),
		settle: (result) =>
			inspection.promise(
				`Settle ${result.kind}`,
				"app/tf-demo · resolutionSessions",
				result,
				() => lifecycle.settle(result),
			),
		record: (record) => {
			if (record.kind !== "Succeeded") inspection.markFailed();
			return inspection.promise(
				`Record ${record.kind}`,
				"app/tf-demo · resolutionSessions",
				record,
				() => lifecycle.record(record),
			);
		},
	};
}

function createConvexResolutionSessionLifecycle(
	ctx: ActionCtx,
	guard: ResolutionSessionGuard,
): ResolutionSessionLifecyclePort {
	return {
		async begin() {
			const input = await ctx.runMutation(
				internal.resolutionSessions.beginRun,
				{ guard },
			);
			if (!input) return null;

			return {
				selection: input.selection,
				context: {
					...input.context,
					lemmaCandidates:
						input.context.lemmaCandidates.map(parseGermanLemma),
				} as ResolutionContext,
				checkpoints: {
					...(input.checkpoints.grammatical
						? {
								grammatical: resolvedGrammaticalCheckpoint(
									input.checkpoints.grammatical,
								),
							}
						: {}),
					...(input.checkpoints.reading
						? {
								reading: {
									resolution:
										input.checkpoints.reading.resolution,
									reading: parseGermanReading(
										input.checkpoints.reading.reading,
									),
								},
							}
						: {}),
				},
			};
		},
		async advance(event) {
			switch (event.progress) {
				case "RouteAvailable":
				case "Committing":
					// Route is published when claiming the run; commit publishes terminal progress.
					return;
				case "GrammarAvailable":
					await ctx.runMutation(internal.resolutionSessions.advance, {
						guard,
						progress: event.progress,
						grammar: projectResolutionGrammar(event.grammatical),
						grammaticalCheckpoint: resolvedGrammaticalActionResult(
							event.grammatical,
						),
					});
					return;
				case "ReadingAvailable":
					await ctx.runMutation(internal.resolutionSessions.advance, {
						guard,
						progress: event.progress,
						reading: projectResolutionReading(event.reading),
						readingCheckpoint: {
							resolution: event.readingResolution,
							reading: event.reading,
						},
					});
			}
		},
		async settle(result) {
			if (result.kind === "CatalogMiss") {
				await ctx.runMutation(recordAndSettleCatalogMiss, {
					guard,
					miss: result.miss,
				});
				return;
			}
			await ctx.runMutation(
				internal.resolutionSessions.settleAfterRun,
				result.kind === "Complete"
					? {
							guard,
							result: {
								...result,
								readingId: convexId<"readings">(
									result.readingId,
								),
								attestationId: convexId<"attestations">(
									result.attestationId,
								),
							},
						}
					: { guard, result },
			);
		},
		async record(record) {
			switch (record.kind) {
				case "Succeeded":
					await ctx.runMutation(
						internal.resolutionSessions.recordRunSuccess,
						{
							guard,
							phase: record.phase,
							generationEvents: [...record.generationEvents],
						},
					);
					return;
				case "GenerationFailed":
					await ctx.runMutation(
						internal.resolutionSessions.recordRunFailure,
						{
							guard,
							phase: record.phase,
							failure: record.failure,
							generationEvents: [...record.generationEvents],
						},
					);
					return;
				case "InternalFailed":
					await ctx.runMutation(
						internal.resolutionSessions.recordInternalRunFailure,
						{
							guard,
							phase: record.phase,
							diagnosticId: record.diagnosticId,
							errorName: record.errorName,
							errorFingerprint: record.errorFingerprint,
							generationEvents: [...record.generationEvents],
						},
					);
			}
		},
	};
}

function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard?: ResolutionSessionGuard,
	observer?: ResolutionProgressObserver,
	inspection?: InspectionCapture,
) {
	const dictionary = createDumdictService({
		language: "de",
		storage: createConvexDumdictStorage(ctx),
	});
	const persistence = createConvexPersistence(ctx, sessionGuard);
	const tracedPersistence: OrchestrationPersistence = inspection
		? {
				persistSubmittedText: (input) =>
					inspection.promise(
						"Persist submitted text",
						"app/tf-demo",
						input,
						() => persistence.persistSubmittedText(input),
					),
				loadResolutionContext: (input) =>
					inspection.promise(
						"Load resolution context",
						"app/tf-demo",
						input,
						() => persistence.loadResolutionContext(input),
					),
				persistResolvedClick: (input) =>
					inspection.promise(
						"Commit resolved occurrence",
						"app/tf-demo · persistence",
						input,
						() => persistence.persistResolvedClick(input),
					),
				persistReusedResolvedClick: (input) =>
					inspection.promise(
						"Commit reused occurrence",
						"app/tf-demo · persistence",
						input,
						() => persistence.persistReusedResolvedClick(input),
					),
				persistUnresolvedClick: (input) =>
					inspection.promise(
						"Commit unresolved encounter",
						"app/tf-demo · persistence",
						input,
						() => persistence.persistUnresolvedClick(input),
					),
			}
		: persistence;
	return createTfDemoOrchestrator({
		draftKnowledge: ({ encounter, reading, visitorId }) =>
			Effect.gen(function* () {
				const [settings, authorization] = yield* Effect.tryPromise(() =>
					Promise.all([
						ctx.runQuery(api.knowledgeSettings.get, { visitorId }),
						ctx.runQuery(
							internal.relationPublication.getAuthorization,
							{},
						),
					]),
				);
				const { generationRequestFor } = yield* Effect.promise(
					() => import("../server/generatedKnowledgeRequest"),
				);
				return yield* createProductionKnowledgeDraft(
					{
						encounter,
						reading,
						request: generationRequestFor(
							reading,
							authorization.rollbackStopped
								? []
								: authorization.qualifiedKinds,
							{
								translationLanguages: (
									["en", "ru"] as const
								).filter(
									(language) =>
										settings.translations[language],
								),
							},
						),
					},
					inspection,
				);
			}),
		dumgen: createProductionDumgen(
			observer?.generationEvent,
			{},
			inspection,
		),
		dictionary: inspection
			? {
					...dictionary,
					findStoredReadings: (input) =>
						inspection.effect(
							"Find stored Readings",
							"battery/dumdict",
							input,
							dictionary.findStoredReadings(input),
						),
					prepare: {
						...dictionary.prepare,
						addNewNote: (input) =>
							inspection.effect(
								"Prepare new Reading",
								"battery/dumdict",
								input,
								dictionary.prepare.addNewNote(input),
							),
						ensureOwnedSurface: (input) =>
							inspection.effect(
								"Prepare owned Surface",
								"battery/dumdict",
								input,
								dictionary.prepare.ensureOwnedSurface(input),
							),
					},
				}
			: dictionary,
		persistence: tracedPersistence,
		inspection,
		...(observer ? { observer } : {}),
	});
}

function createConvexPersistence(
	ctx: ActionCtx,
	sessionGuard?: ResolutionSessionGuard,
): OrchestrationPersistence {
	return {
		async persistSubmittedText(input) {
			return ctx.runMutation(internal.persistence.persistSubmittedText, {
				...input,
				sentences: input.sentences.map((sentence) => ({
					...sentence,
					segments: sentence.segments.map((segment) => ({
						...segment,
					})),
				})),
			});
		},
		async loadResolutionContext(input) {
			const context = await ctx.runQuery(
				internal.resolutionContext.load,
				{
					...input,
					sentenceId: convexId<"sentences">(input.sentenceId),
				},
			);
			return {
				...context,
				lemmaCandidates: context.lemmaCandidates.map(parseGermanLemma),
			} as ResolutionContext;
		},
		async persistResolvedClick(input) {
			const dictionaryPlan = dictionaryPlanResult(input.dictionaryPlan);
			return ctx.runMutation(internal.persistence.persistResolvedClick, {
				...convexSegmentSelectionArgs(input),
				dictionaryPlan,
				...(input.knowledgeDraftJson
					? { knowledgeDraftJson: input.knowledgeDraftJson }
					: {}),
				reading: input.reading,
				readingKey: input.readingKey,
				occurrence: {
					...input.occurrence,
					attestation: {
						...input.occurrence.attestation,
						members: input.occurrence.attestation.members.map(
							(member) => ({ ...member }),
						),
					},
					memberSegmentIndices: [
						...input.occurrence.memberSegmentIndices,
					],
				},
				...(sessionGuard ? { sessionGuard } : {}),
			}) as Promise<ResolvedClickCommit>;
		},
		async persistReusedResolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistReusedResolvedClick,
				{
					...convexSegmentSelectionArgs(input),
					attestationId: input.attestationId as Id<"attestations">,
					...(sessionGuard ? { sessionGuard } : {}),
				},
			) as Promise<ReusedResolvedClickCommit>;
		},
		async persistUnresolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistUnresolvedClick,
				{
					...convexSegmentSelectionArgs(input),
					...(sessionGuard ? { sessionGuard } : {}),
				},
			) as Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
		},
	};
}

function convexSegmentSelectionArgs(input: ResolveSegmentInput) {
	return {
		requestId: input.requestId,
		visitorId: input.visitorId,
		sentenceId: input.sentenceId as Id<"sentences">,
		clickedSegmentIndex: input.clickedSegmentIndex,
	};
}

export const applyGeneratedKnowledgePlan = internalAction({
	args: {
		attemptKey: v.string(),
		publication: v.optional(
			v.object({ sequence: v.number(), final: v.boolean() }),
		),
		reading: v.any(),
		changes: v.array(v.any()),
		pendingRelations: v.array(v.any()),
		productionEvidence: knowledgeProductionEvidenceValidator,
		relationPublication: relationPublicationRunValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const inspection = await inspectionFor(
			ctx,
			args.attemptKey,
			"Knowledge",
		);
		const run = async () => {
			try {
				const publishable = generatedKnowledgeAllowedForPublication(
					args,
					args.relationPublication.requestedKinds,
				);
				const request = structuredClone({
					reading: args.reading,
					changes: publishable.changes,
					pendingRelations: publishable.pendingRelations,
				}) as ApplyGeneratedKnowledgeRequest<"de">;
				for (
					let index = 0;
					index < MAX_KNOWLEDGE_PLAN_ATTEMPTS;
					index += 1
				) {
					const planning = createDumdictService({
						language: "de",
						storage: createConvexDumdictStorage(ctx),
					}).prepare.applyGeneratedKnowledge(request);
					const prepared = await Effect.runPromise(
						inspection
							? inspection.effect(
									"Prepare generated Knowledge",
									"battery/dumdict",
									request,
									planning,
								)
							: planning,
					);
					const fullPlan = dictionaryPlanResult(prepared.plan);
					const commitInput = {
						attemptKey: args.attemptKey,
						...(args.publication
							? { publication: args.publication }
							: {}),
						plan: fullPlan,
						baseKnowledgePlan:
							withoutGeneratedRelationPlan(fullPlan),
						generatedChanges: publishable.changes,
						productionEvidence: args.productionEvidence,
						relationPublication: args.relationPublication,
					};
					const commit = () =>
						ctx.runMutation(
							internal.knowledgeGeneration.commitGenerated,
							commitInput,
						);
					const committed = inspection
						? await inspection.promise(
								"Commit generated Knowledge",
								"app/tf-demo · knowledgeGeneration.commitGenerated",
								commitInput,
								commit,
							)
						: await commit();
					if (committed.status !== "DictionaryConflict") return null;
				}
				throw new Error("Knowledge save conflict.");
			} catch (error) {
				inspection?.failure(
					"Knowledge publication failed",
					"app/tf-demo · orchestration.applyGeneratedKnowledgePlan",
					args,
					error,
				);
				console.error("Generated Knowledge planning failed", error);
				// The final publication retries any contribution that failed here.
				if (args.publication && !args.publication.final) throw error;
				if (args.relationPublication.requestedKinds.length > 0) {
					await ctx.runMutation(recordRelationPublicationFailure, {
						attemptKey: args.attemptKey,
						run: args.relationPublication,
					});
				}
				await ctx.runMutation(internal.knowledgeGeneration.fail, {
					attemptKey: args.attemptKey,
					failureCode: "generationFailed",
					productionEvidence: args.productionEvidence,
					failureMessage:
						"Knowledge generation failed. Please retry.",
				});
				return null;
			}
		};
		try {
			return inspection
				? await inspection.promise(
						"Publish generated Knowledge",
						"app/tf-demo · orchestration.applyGeneratedKnowledgePlan",
						args,
						run,
						true,
					)
				: await run();
		} finally {
			await inspection?.flush();
		}
	},
});

function pendingLocatorFromRecord(value: unknown): {
	sourceReadingKey: string;
	relation: (typeof directSemanticRelationValues)[number];
	targetPendingId: string;
} | null {
	if (!value || typeof value !== "object") return null;
	const locator = Reflect.get(value, "locator");
	if (!locator || typeof locator !== "object") return null;
	const sourceReadingKey = Reflect.get(locator, "sourceReadingKey");
	const relation = Reflect.get(locator, "relation");
	const targetPendingId = Reflect.get(locator, "targetPendingId");
	if (
		typeof sourceReadingKey !== "string" ||
		typeof relation !== "string" ||
		!directSemanticRelationValues.includes(
			relation as (typeof directSemanticRelationValues)[number],
		) ||
		typeof targetPendingId !== "string"
	) {
		return null;
	}
	return {
		sourceReadingKey,
		relation: relation as (typeof directSemanticRelationValues)[number],
		targetPendingId,
	};
}

const shadowCleanupResultValidator = v.union(
	v.object({
		status: v.literal("applied"),
		baseRevision: v.string(),
		nextRevision: v.string(),
		message: v.string(),
	}),
	v.object({
		status: v.literal("conflict"),
		code: v.union(
			v.literal("revisionConflict"),
			v.literal("semanticPreconditionFailed"),
		),
		baseRevision: v.string(),
		latestRevision: v.string(),
		message: v.string(),
	}),
	v.object({
		status: v.literal("rejected"),
		code: v.string(),
		message: v.string(),
	}),
);

type ShadowCleanupActionResult =
	| {
			status: "applied";
			baseRevision: string;
			nextRevision: string;
			message: string;
	  }
	| {
			status: "conflict";
			code: "revisionConflict" | "semanticPreconditionFailed";
			baseRevision: string;
			latestRevision: string;
			message: string;
	  }
	| { status: "rejected"; code: string; message: string };

function shadowCleanupConflict(
	code: "revisionConflict" | "semanticPreconditionFailed",
	baseRevision: string,
	latestRevision: string,
	message: string,
): ShadowCleanupActionResult {
	return {
		status: "conflict",
		code,
		baseRevision,
		latestRevision,
		message,
	};
}

export const cleanupPendingRelation = action({
	args: {
		shadowId: v.id("shadows"),
		locatorKey: v.string(),
		baseRevision: v.string(),
	},
	returns: shadowCleanupResultValidator,
	handler: async (ctx, args): Promise<ShadowCleanupActionResult> => {
		const selection: {
			revision: string;
			pendingRecord: unknown | null;
		} = await ctx.runQuery(internal.shadowResolution.loadPendingSelection, {
			shadowId: args.shadowId,
			locatorKey: args.locatorKey,
		});
		if (selection.revision !== args.baseRevision) {
			return shadowCleanupConflict(
				"revisionConflict",
				args.baseRevision,
				selection.revision,
				"Shadow inspection is stale. Refresh before resolving this reference.",
			);
		}
		if (selection.pendingRecord === null) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The exact pending Shadow reference no longer exists.",
			);
		}
		const pendingLocator = pendingLocatorFromRecord(
			selection.pendingRecord,
		);
		if (!pendingLocator) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The pending Shadow reference is malformed and cannot be changed.",
			);
		}
		const result = await Effect.runPromise(
			createDumdictService({
				language: "de",
				storage: createConvexDumdictStorage(ctx),
			})
				.cleanupRelations({
					baseRevision: args.baseRevision,
					resolutions: [
						{
							locator: pendingLocator,
						},
					],
				})
				.pipe(
					Effect.match({
						onFailure: (error) => error,
						onSuccess: (value) => value,
					}),
				),
		);
		if ("status" in result && result.status === "applied") {
			return {
				status: "applied",
				baseRevision: result.baseRevision,
				nextRevision: result.nextRevision,
				message: result.summary.message,
			};
		}
		if (
			"_tag" in result &&
			(result._tag === "DumdictRevisionConflict" ||
				result._tag === "DumdictSemanticPreconditionFailure")
		) {
			return {
				status: "conflict",
				code:
					result._tag === "DumdictRevisionConflict"
						? "revisionConflict"
						: "semanticPreconditionFailed",
				baseRevision: result.baseRevision,
				latestRevision: result.latestRevision ?? selection.revision,
				message: result.message ?? "Shadow cleanup conflicted.",
			};
		}
		if ("_tag" in result && result._tag === "DumdictRejection")
			return {
				status: "rejected",
				code: result.code,
				message: result.message ?? "Shadow cleanup was rejected.",
			};
		throw new Error("Shadow cleanup storage failed.");
	},
});

/** Materializes only the reviewed Reading selected by this navigation request. */
export const followGrammaticalAlternative = action({
	args: { sourceReadingId: v.id("readings"), readingKey: v.string() },
	returns: v.id("readings"),
	handler: async (
		ctx,
		{ sourceReadingId, readingKey },
	): Promise<Id<"readings">> => {
		const [{ reviewedAlternatives }, { readingIdentityKey }] =
			await Promise.all([
				import("./modules/notes/relations"),
				import("../server/linguisticIdentity"),
			]);
		const source = parseGermanReading(
			await ctx.runQuery(internal.reviewedNavigation.source, {
				readingId: sourceReadingId,
			}),
		);
		const selected = reviewedAlternatives(source.lemma).find(
			({ reading }) => readingIdentityKey(reading) === readingKey,
		);
		if (!selected)
			throw new Error(
				"This Reading is not a reviewed grammatical alternative.",
			);
		const dictionary = createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		});
		for (
			let attempt = 0;
			attempt < MAX_KNOWLEDGE_PLAN_ATTEMPTS;
			attempt++
		) {
			const existing = await ctx.runQuery(
				internal.reviewedNavigation.destination,
				{ readingKey },
			);
			if (existing) return existing;
			const result = await Effect.runPromise(
				Effect.either(
					dictionary.ensureReadingEntry({
						entry: {
							reading: selected.reading,
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					}),
				),
			);
			const destination = await ctx.runQuery(
				internal.reviewedNavigation.destination,
				{ readingKey },
			);
			if (destination) return destination;
			if (
				result._tag === "Left" &&
				result.left._tag !== "DumdictRevisionConflict"
			)
				throw new Error("Grammatical alternative could not be stored.");
		}
		throw new Error(
			"Grammatical alternative conflicted with another change; try again.",
		);
	},
});

/** Opens a noun heading's reviewed article without creating a semantic relation or encounter. */
export const followNounArticle = action({
	args: { lemmaId: v.id("lemmas") },
	returns: v.id("readings"),
	handler: async (ctx, { lemmaId }): Promise<Id<"readings">> => {
		const [{ selectNounHeadingArticle }, { readingIdentityKey }] =
			await Promise.all([
				import("dumgen"),
				import("../server/linguisticIdentity"),
			]);
		const lemma = await ctx.runQuery(
			internal.reviewedNavigation.nounSource,
			{ lemmaId },
		);
		const selected = selectNounHeadingArticle(parseGermanLemma(lemma));
		if (!selected)
			throw new Error("This Lemma has no noun heading article.");
		const readingKey = readingIdentityKey(selected.reading);
		const existing = await ctx.runQuery(
			internal.reviewedNavigation.destination,
			{ readingKey },
		);
		if (existing)
			return ctx.runMutation(
				internal.reviewedNavigation.completeNounArticleKnowledge,
				{ lemmaId },
			);
		const dictionary = createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		});
		for (
			let attempt = 0;
			attempt < MAX_KNOWLEDGE_PLAN_ATTEMPTS;
			attempt++
		) {
			const result = await Effect.runPromise(
				Effect.either(
					dictionary.ensureReadingEntry({
						entry: {
							reading: selected.reading,
							knowledge: {
								definition: selected.knowledge.definition,
								translations: selected.knowledge.translations,
							},
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					}),
				),
			);
			if (result._tag === "Left") {
				const concurrent = await ctx.runQuery(
					internal.reviewedNavigation.destination,
					{ readingKey },
				);
				if (concurrent)
					return ctx.runMutation(
						internal.reviewedNavigation
							.completeNounArticleKnowledge,
						{ lemmaId },
					);
				if (result.left._tag === "DumdictRevisionConflict") continue;
				throw new Error("The article Reading could not be stored.");
			}
			const destination = await ctx.runQuery(
				internal.reviewedNavigation.destination,
				{ readingKey },
			);
			if (destination)
				return ctx.runMutation(
					internal.reviewedNavigation.completeNounArticleKnowledge,
					{ lemmaId },
				);
		}
		throw new Error(
			"Opening the article conflicted with another change; try again.",
		);
	},
});
