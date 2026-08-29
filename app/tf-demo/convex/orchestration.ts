"use node";

import { type FunctionReference, makeFunctionReference } from "convex/server";
import { type Infer, v } from "convex/values";
import type { ApplyGeneratedKnowledgeRequest, DumdictPlan } from "dumdict";
import { createDumdictService } from "dumdict/runtime";
import {
	type Dumgen,
	type GenerationEvent,
	type GrammaticalResult,
	parseAsGrammaticalResult,
} from "dumgen";
import { encodedRuntimePromptData } from "dumgen/runtime-prompt-data";
import { type KnowledgeChange, parseAsKnowledgeChange } from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";
import {
	createTfDemoOrchestrator,
	type LateResolvedClickCommit,
	type OrchestrationPersistence,
	type PersistedSentence,
	type RecordedClick,
	type ResolutionProgressObserver,
	type ResolvedClickCommit,
	type ResolveSegmentInput,
	type ResolveSegmentResult,
	type ReusableAttestation,
	type ReusedResolvedClickCommit,
	type UnresolvedClickCommit,
} from "../server/linguisticOrchestration";
import {
	parseGermanReading,
	unwrapOperationalParse,
} from "../server/operationalParsing";
import {
	executeResolutionSession,
	type ResolutionSessionLifecyclePort,
} from "../server/resolutionSessionExecution";
import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import {
	createConvexDumdictStorage,
	type DictionaryPlanResult,
	dictionaryPlanResult,
} from "./dumdictStorage";
import { generatedKnowledgeAllowedForPublication } from "./model/generatedKnowledgeContainment";
import {
	projectResolutionGrammar,
	projectResolutionReading,
	type ResolutionSessionGuard,
} from "./model/resolutionSessions";
import {
	type nonResolvedGrammaticalValidator,
	readingDefinitionChangeValidator,
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

function createLazyDumgen(
	onGenerationEvent?: (event: GenerationEvent) => void,
): Dumgen {
	let dumgenPromise: Promise<Dumgen> | undefined;
	const getDumgen = () => {
		dumgenPromise ??= Promise.all([
			import("dumgen/openai-fetch"),
			import("dumgen/runtime"),
		]).then(([{ buildOpenAiFetchSdk }, { buildDumgenRuntime }]) =>
			buildDumgenRuntime({
				runtimePromptData: encodedRuntimePromptData,
				sdk: buildOpenAiFetchSdk({ onGenerationEvent }),
				async generateKnowledge() {
					throw new Error(
						"Knowledge generation runs in its dedicated Convex action.",
					);
				},
			}),
		);
		return dumgenPromise;
	};
	return {
		segment: async (sentences) => (await getDumgen()).segment(sentences),
		resolve: {
			grammatical: async (language, input) =>
				(await getDumgen()).resolve.grammatical(language, input),
			reading: async (language, input) =>
				(await getDumgen()).resolve.reading(language, input),
		},
		generate: {
			knowledge: async () => {
				throw new Error(
					"Knowledge generation runs in its dedicated Convex action.",
				);
			},
		},
	};
}

const lazyDumgen = createLazyDumgen();

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
	if (input.decision === "Unresolved") {
		const parsed = unwrapOperationalParse<GrammaticalResult<"de">>(
			parseAsGrammaticalResult(input, "de"),
		);
		if (parsed.decision !== "Unresolved") {
			throw new Error("Expected an Unresolved grammatical result.");
		}
		return { decision: "Unresolved", language: parsed.language };
	}
	const parsed = unwrapOperationalParse<GrammaticalResult<"de">>(
		parseAsGrammaticalResult(input, "de"),
	);
	if (parsed.decision !== "NotImplemented") {
		throw new Error("Expected a NotImplemented grammatical result.");
	}
	return {
		decision: "NotImplemented",
		language: parsed.language,
		route: { ...parsed.route },
	};
}

function resolvedGrammaticalActionResult(
	input: Extract<GrammaticalResolveSegmentResult, { decision: "Resolved" }>,
): ResolvedGrammaticalActionResult {
	const parsed = unwrapOperationalParse<GrammaticalResult<"de">>(
		parseAsGrammaticalResult(input, "de"),
	);
	if (parsed.decision !== "Resolved") {
		throw new Error("Expected a Resolved grammatical result.");
	}
	return {
		...parsed,
		attestation: {
			...parsed.attestation,
			members: parsed.attestation.members.map((member) => ({
				...member,
			})),
			surface: {
				...parsed.attestation.surface,
				lemma: { ...parsed.attestation.surface.lemma },
			},
		},
		interaction: {
			...parsed.interaction,
			memberSegmentIndices: [...parsed.interaction.memberSegmentIndices],
		},
	};
}

function resolvedGrammaticalCheckpoint(
	input: ResolvedGrammaticalActionResult,
): Extract<GrammaticalResult<"de">, { decision: "Resolved" }> {
	const parsed = unwrapOperationalParse<GrammaticalResult<"de">>(
		parseAsGrammaticalResult(input, "de"),
	);
	if (parsed.decision !== "Resolved") {
		throw new Error("Expected a resolved Grammar checkpoint.");
	}
	return parsed;
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
	},
	returns: submitTextResultValidator,
	handler: async (ctx, args): Promise<SubmitTextActionResult> => {
		const result = await orchestratorFor(ctx).submitText(args);
		if (!result.ok) {
			return {
				status: "Rejected",
				message: result.error.message,
			};
		}
		return {
			status: "Accepted",
			textId: convexId<"texts">(result.persisted.textId),
		};
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
			await orchestratorFor(ctx).resolveSegment({
				...args,
				sentenceId: args.sentenceId,
			}),
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
		await executeResolutionSession({
			identity: guard,
			lifecycle: createConvexResolutionSessionLifecycle(ctx, guard),
			resolve: (selection, checkpoints, observer, onGenerationEvent) =>
				orchestratorFor(
					ctx,
					guard,
					observer,
					onGenerationEvent,
				).resolveSegment(selection, checkpoints),
		});
		return null;
	},
});

function createConvexResolutionSessionLifecycle(
	ctx: ActionCtx,
	guard: ResolutionSessionGuard,
): ResolutionSessionLifecyclePort {
	return {
		async begin() {
			const input = await ctx.runQuery(
				internal.resolutionSessions.getRunInput,
				{ guard },
			);
			if (!input) return null;
			const started = await ctx.runMutation(
				internal.resolutionSessions.markRunStarted,
				{ guard },
			);
			if (!started) return null;
			return {
				selection: input.selection,
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
					await ctx.runMutation(internal.resolutionSessions.advance, {
						guard,
						progress: event.progress,
					});
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

export const applyReadingKnowledgeChange = action({
	args: {
		knowledgeChangeKey: v.string(),
		ownerReadingKey: v.string(),
		change: readingDefinitionChangeValidator,
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const change = unwrapOperationalParse<KnowledgeChange>(
			parseAsKnowledgeChange(args.change),
		);
		if (change.aspect !== "definition") {
			throw new Error(
				"Only definition changes are accepted by this action.",
			);
		}
		await ctx.runMutation(internal.persistence.persistKnowledgeChange, {
			...args,
			change,
		});
		return null;
	},
});

function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard?: ResolutionSessionGuard,
	observer?: ResolutionProgressObserver,
	onGenerationEvent?: (event: GenerationEvent) => void,
) {
	return createTfDemoOrchestrator({
		dumgen: onGenerationEvent
			? createLazyDumgen(onGenerationEvent)
			: lazyDumgen,
		dictionary: createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		}),
		persistence: createConvexPersistence(ctx, sessionGuard),
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
		async getSentenceForResolution({ sentenceId }) {
			return ctx.runQuery(internal.persistence.getSentenceForResolution, {
				sentenceId: sentenceId as Id<"sentences">,
			}) as Promise<PersistedSentence | null>;
		},
		async findRecordedClick(input) {
			return ctx.runQuery(
				internal.persistence.findClickResultByRequestId,
				convexSegmentSelectionArgs(input),
			) as Promise<RecordedClick | null>;
		},
		async findAttestation({ sentenceId, clickedSegmentIndex }) {
			return ctx.runQuery(
				internal.persistence.findAttestationForSegment,
				{
					sentenceId: sentenceId as Id<"sentences">,
					clickedSegmentIndex,
				},
			) as Promise<ReusableAttestation | null>;
		},
		async persistResolvedClick(input) {
			const dictionaryPlan = dictionaryPlanResult(input.dictionaryPlan);
			return ctx.runMutation(internal.persistence.persistResolvedClick, {
				...convexSegmentSelectionArgs(input),
				dictionaryPlan,
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
		reading: v.any(),
		changes: v.array(v.any()),
		pendingRelations: v.array(v.any()),
		relationPublication: relationPublicationRunValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		try {
			const publishable = generatedKnowledgeAllowedForPublication(
				args,
				args.relationPublication.requestedKinds,
			);
			const request = JSON.parse(
				JSON.stringify({
					reading: args.reading,
					changes: publishable.changes,
					pendingRelations: publishable.pendingRelations,
				}),
			) as ApplyGeneratedKnowledgeRequest<"de">;
			for (
				let index = 0;
				index < MAX_KNOWLEDGE_PLAN_ATTEMPTS;
				index += 1
			) {
				let capturedPlan: DumdictPlan<"de"> | undefined;
				const planned = await createDumdictService({
					language: "de",
					storage: createConvexDumdictStorage(ctx),
				}).applyGeneratedKnowledge(request, {
					applyPlan: async (plan) => {
						capturedPlan = plan;
						return {
							status: "committed",
							nextRevision: plan.baseRevision,
						};
					},
				});
				if (planned.status === "rejected") {
					throw new Error("Generated Knowledge was rejected.");
				}
				if (!capturedPlan)
					throw new Error("Dumdict did not produce a plan.");
				const fullPlan = dictionaryPlanResult(capturedPlan);
				const committed = await ctx.runMutation(
					internal.knowledgeGeneration.commitGenerated,
					{
						attemptKey: args.attemptKey,
						plan: fullPlan,
						baseKnowledgePlan:
							withoutGeneratedRelationPlan(fullPlan),
						generatedChanges: publishable.changes,
						relationPublication: args.relationPublication,
					},
				);
				if (committed.status !== "DictionaryConflict") return null;
			}
			throw new Error("Knowledge save conflict.");
		} catch (error) {
			console.error("Generated Knowledge planning failed", error);
			if (args.relationPublication.requestedKinds.length > 0) {
				await ctx.runMutation(recordRelationPublicationFailure, {
					attemptKey: args.attemptKey,
					run: args.relationPublication,
				});
			}
			await ctx.runMutation(internal.knowledgeGeneration.fail, {
				attemptKey: args.attemptKey,
				failureCode: "generationFailed",
				failureMessage: "Knowledge generation failed. Please retry.",
			});
			return null;
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
		const result = await createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		}).cleanupRelations({
			baseRevision: args.baseRevision,
			resolutions: [
				{
					locator: pendingLocator,
				},
			],
		});
		if (result.status === "applied") {
			return {
				status: "applied",
				baseRevision: result.baseRevision,
				nextRevision: result.nextRevision,
				message: result.summary.message,
			};
		}
		if (result.status === "conflict") {
			return {
				status: "conflict",
				code: result.code,
				baseRevision: result.baseRevision,
				latestRevision: result.latestRevision ?? selection.revision,
				message: result.message ?? "Shadow cleanup conflicted.",
			};
		}
		return {
			status: "rejected",
			code: result.code,
			message: result.message ?? "Shadow cleanup was rejected.",
		};
	},
});
