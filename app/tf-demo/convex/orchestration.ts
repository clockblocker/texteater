"use node";

import { type FunctionReference, makeFunctionReference } from "convex/server";
import { type Infer, v } from "convex/values";
import type {
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsSlice,
	DumdictPlan,
	DumdictStoragePort,
	NewNoteSlice,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "dumdict";
import { createDumdictService, makeSurfaceId } from "dumdict/runtime";
import {
	type Dumgen,
	type GenerationEvent,
	type GrammaticalResult,
	parseAsGrammaticalResult,
} from "dumgen";
import { encodedRuntimePromptData } from "dumgen/runtime-prompt-data";
import {
	type KnowledgeChange,
	type PendingSemanticRelation,
	parseAsKnowledgeChange,
	parseAsPendingSemanticRelation,
} from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import {
	createTfDemoOrchestrator,
	type LateResolvedClickCommit,
	type OrchestrationPersistence,
	type PersistedSentence,
	type RecordedClick,
	type ResolvedClickCommit,
	type ResolveSegmentResult,
	type ReusableAttestation,
	type ReusedResolvedClickCommit,
	readingIdentityKey,
	type UnresolvedClickCommit,
} from "../server/linguisticOrchestration";
import {
	parseGermanReading,
	unwrapOperationalParse,
} from "../server/operationalParsing";
import {
	classifyResolutionFailure,
	projectResolutionGenerationEvent,
	type ResolutionGenerationEvent,
	type ResolutionRunPhase,
} from "../server/resolutionFailure";
import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import { generatedKnowledgeAllowedForPublication } from "./model/generatedKnowledgeContainment";
import {
	projectResolutionGrammar,
	projectResolutionReading,
	type ResolutionSessionGuard,
} from "./model/resolutionSessions";
import {
	type dictionaryPlanValidator,
	type nonResolvedGrammaticalValidator,
	relationPublicationRunValidator,
	type resolvedGrammaticalValidator,
	resolveSegmentResultValidator,
	type reusableAttestationValidator,
} from "./model/validators";
import type { RelationPublicationRun } from "./relationPublication";

const MAX_KNOWLEDGE_PLAN_ATTEMPTS = 3;

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
type DictionaryPlanResult = Infer<typeof dictionaryPlanValidator>;
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

function mutableReading(input: ReusableAttestation["reading"]) {
	return { ...input, lemma: { ...input.lemma } };
}

function mutablePendingRecord(
	input: Extract<
		DumdictPlan<"de">["changes"][number],
		{
			type:
				| "createPendingSemanticRelation"
				| "deletePendingSemanticRelation";
		}
	>["record"],
) {
	return {
		sourceReading: mutableReading(input.sourceReading),
		pending: {
			...input.pending,
			target: { ...input.pending.target },
		},
		locator: { ...input.locator },
	};
}

function mutablePreconditions(
	input: DumdictPlan<"de">["changes"][number]["preconditions"],
) {
	return input.map((precondition) => {
		switch (precondition.kind) {
			case "lemmaExists":
			case "lemmaMissing":
				return { ...precondition, lemma: { ...precondition.lemma } };
			case "readingExists":
			case "readingMissing":
			case "readingAttestationMissing":
				return {
					...precondition,
					reading: mutableReading(precondition.reading),
				};
			case "pendingRelationExists":
			case "pendingRelationMissing":
				return {
					...precondition,
					record: mutablePendingRecord(precondition.record),
				};
			default:
				return { ...precondition };
		}
	});
}

export function dictionaryPlanResult(
	input: DumdictPlan<"de">,
): DictionaryPlanResult {
	const parsed = input;
	return {
		baseRevision: parsed.baseRevision,
		changes: parsed.changes.map((change) => {
			const preconditions = mutablePreconditions(change.preconditions);
			switch (change.type) {
				case "createLemma":
					return {
						...change,
						record: {
							...change.record,
							lemma: { ...change.record.lemma },
						},
						preconditions,
					};
				case "createReading":
					return {
						...change,
						entry: {
							...change.entry,
							reading: mutableReading(change.entry.reading),
							attestedTranslations: [
								...change.entry.attestedTranslations,
							],
							attestations: [...change.entry.attestations],
						},
						preconditions,
					};
				case "patchReading":
					return {
						...change,
						reading: mutableReading(change.reading),
						ops: change.ops.map((operation) =>
							operation.kind === "addAttestation"
								? { ...operation }
								: {
										...operation,
										envelope: {
											...operation.envelope,
											reading: mutableReading(
												operation.envelope.reading,
											),
										},
									},
						),
						preconditions,
					};
				case "createOwnedSurface":
					return {
						...change,
						entry: {
							...change.entry,
							ownerLemma: { ...change.entry.ownerLemma },
							surface: {
								...change.entry.surface,
								lemma: { ...change.entry.surface.lemma },
							},
							attestedTranslations: [
								...change.entry.attestedTranslations,
							],
							attestations: [...change.entry.attestations],
						},
						preconditions,
					};
				case "createPendingSemanticRelation":
				case "deletePendingSemanticRelation":
					return {
						...change,
						record: mutablePendingRecord(change.record),
						preconditions,
					};
				default: {
					const unsupported: never = change;
					throw new Error(
						`Unsupported Dumdict plan change: ${String(unsupported)}`,
					);
				}
			}
		}),
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
	returns: v.any(),
	handler: async (ctx, args): Promise<unknown> =>
		orchestratorFor(ctx).submitText(args),
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
		let phase: ResolutionRunPhase = "Route";
		const generationEvents: ResolutionGenerationEvent[] = [];
		const onGenerationEvent = (event: GenerationEvent) => {
			const projected = projectResolutionGenerationEvent(event, {
				requestId: guard.requestId,
				runToken: guard.runToken,
				phase,
			});
			if (generationEvents.length < 64) generationEvents.push(projected);
			console.info(
				JSON.stringify({
					event: "ResolutionGeneration",
					generation: projected,
				}),
			);
		};
		try {
			await ctx.runMutation(internal.resolutionSessions.advance, {
				guard,
				progress: "RouteAvailable",
			});
			phase = input.readingCheckpoint
				? "Commit"
				: input.grammaticalCheckpoint
					? "Reading"
					: "Grammar";
			const result = await orchestratorFor(
				ctx,
				guard,
				(nextPhase) => {
					phase = nextPhase;
				},
				onGenerationEvent,
			).resolveSegment(input, {
				...(input.grammaticalCheckpoint
					? {
							grammatical: resolvedGrammaticalCheckpoint(
								input.grammaticalCheckpoint,
							),
						}
					: {}),
				...(input.readingCheckpoint
					? {
							reading: {
								resolution: input.readingCheckpoint.resolution,
								reading: parseGermanReading(
									input.readingCheckpoint.reading,
								),
							},
						}
					: {}),
			});
			if ("catalogMiss" in result) {
				await ctx.runMutation(recordAndSettleCatalogMiss, {
					guard,
					miss: result.catalogMiss,
				});
				await ctx.runMutation(
					internal.resolutionSessions.recordRunSuccess,
					{ guard, phase, generationEvents },
				);
				return null;
			}
			if ("deduplicated" in result && result.deduplicated) {
				if (result.persisted.status === "Resolved") {
					await ctx.runMutation(
						internal.resolutionSessions.settleAfterRun,
						{
							guard,
							result: {
								kind: "Complete",
								readingId: convexId<"readings">(
									result.persisted.readingId,
								),
								attestationId: convexId<"attestations">(
									result.persisted.occurrence.attestationId,
								),
								grammar: projectResolutionGrammar(
									result.persisted.occurrence.grammatical,
								),
								reading: projectResolutionReading(
									result.persisted.occurrence.reading,
								),
							},
						},
					);
				} else {
					await ctx.runMutation(
						internal.resolutionSessions.settleAfterRun,
						{ guard, result: { kind: "Unresolved" } },
					);
				}
			}
			await ctx.runMutation(
				internal.resolutionSessions.recordRunSuccess,
				{ guard, phase, generationEvents },
			);
		} catch (error) {
			const classified = classifyResolutionFailure(error);
			const diagnosticId = crypto.randomUUID();
			try {
				if (classified.kind === "Generation") {
					await ctx.runMutation(
						internal.resolutionSessions.recordRunFailure,
						{
							guard,
							phase,
							failure: classified.failure,
							generationEvents,
						},
					);
				} else {
					console.error(
						JSON.stringify({
							event: "ResolutionRunInternalFailure",
							requestId: guard.requestId,
							runToken: guard.runToken,
							phase,
							diagnosticId,
							errorName: classified.errorName,
							errorFingerprint: classified.errorFingerprint,
						}),
					);
					await ctx.runMutation(
						internal.resolutionSessions.recordInternalRunFailure,
						{
							guard,
							phase,
							diagnosticId,
							errorName: classified.errorName,
							errorFingerprint: classified.errorFingerprint,
							generationEvents,
						},
					);
				}
			} catch (recordingError) {
				const recordingFailure =
					classifyResolutionFailure(recordingError);
				console.error(
					JSON.stringify({
						event: "ResolutionFailureRecordingFailed",
						requestId: guard.requestId,
						runToken: guard.runToken,
						phase,
						diagnosticId,
						recordingFailure,
					}),
				);
			}
		}
		return null;
	},
});

export const applyReadingKnowledgeChange = action({
	args: {
		knowledgeChangeKey: v.string(),
		ownerReadingKey: v.string(),
		change: v.any(),
	},
	returns: v.any(),
	handler: async (ctx, args): Promise<unknown> => {
		const change = unwrapOperationalParse<KnowledgeChange>(
			parseAsKnowledgeChange(args.change),
		);
		const persisted: unknown = await ctx.runMutation(
			internal.persistence.persistKnowledgeChange,
			{ ...args, change },
		);
		return persisted;
	},
});

function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard?: ResolutionSessionGuard,
	onPhase?: (phase: ResolutionRunPhase) => void,
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
		...(sessionGuard
			? {
					observer: {
						async grammarAvailable({ grammatical }) {
							await ctx.runMutation(
								internal.resolutionSessions.advance,
								{
									guard: sessionGuard,
									progress: "GrammarAvailable",
									grammar:
										projectResolutionGrammar(grammatical),
									grammaticalCheckpoint:
										resolvedGrammaticalActionResult(
											grammatical,
										),
								},
							);
							onPhase?.("Reading");
						},
						async readingAvailable({ reading, readingResolution }) {
							await ctx.runMutation(
								internal.resolutionSessions.advance,
								{
									guard: sessionGuard,
									progress: "ReadingAvailable",
									reading: projectResolutionReading(reading),
									readingCheckpoint: {
										resolution: readingResolution,
										reading,
									},
								},
							);
							onPhase?.("Commit");
						},
						async committing() {
							onPhase?.("Commit");
							await ctx.runMutation(
								internal.resolutionSessions.advance,
								{
									guard: sessionGuard,
									progress: "Committing",
								},
							);
						},
					},
				}
			: {}),
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
				{
					...input,
					sentenceId: input.sentenceId as Id<"sentences">,
				},
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
				...input,
				sentenceId: input.sentenceId as Id<"sentences">,
				dictionaryPlan,
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
					...input,
					sentenceId: input.sentenceId as Id<"sentences">,
					attestationId: input.attestationId as Id<"attestations">,
					...(sessionGuard ? { sessionGuard } : {}),
				},
			) as Promise<ReusedResolvedClickCommit>;
		},
		async persistUnresolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistUnresolvedClick,
				{
					...input,
					sentenceId: input.sentenceId as Id<"sentences">,
					...(sessionGuard ? { sessionGuard } : {}),
				},
			) as Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
		},
	};
}

export function createConvexDumdictStorage(
	ctx: ActionCtx,
): DumdictStoragePort<"de"> {
	return {
		async findStoredReadings({ lemma }) {
			return ctx.runQuery(
				internal.dumdictStorage.findDumdictStoredReadings,
				{ lemmaKey: lemmaIdentityKey(lemma) },
			) as unknown as Promise<StoredReadingsSlice<"de">>;
		},
		async loadNewNoteContext({ draft }) {
			const readingKey = readingIdentityKey(draft.reading);
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictNewNoteContext,
				{
					lemmaKey: lemmaIdentityKey(draft.reading.lemma),
					proposedLemma: draft.reading.lemma,
					readingKey,
					surfaceKeys:
						draft.ownedSurfaces?.map(({ surface }) =>
							makeSurfaceId("de", surface),
						) ?? [],
					explicitLemmaTargetKeys:
						draft.relations?.flatMap(({ target }) =>
							target.kind === "existing"
								? [lemmaIdentityKey(target.lemma)]
								: [],
						) ?? [],
					pendingProposalKeys:
						draft.relations?.flatMap(({ target }) =>
							target.kind === "pending"
								? [pendingProposalIdentityKey(target.pending)]
								: [],
						) ?? [],
				},
			) as unknown as Promise<NewNoteSlice<"de">>;
		},
		async loadReadingForPatch({ reading }) {
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictReadingForPatch,
				{ readingKey: readingIdentityKey(reading) },
			) as Promise<ReadingPatchSlice<"de">>;
		},
		async commitChanges({ baseRevision, changes }) {
			const plan = dictionaryPlanResult({ baseRevision, changes });
			return ctx.runMutation(
				internal.dumdictStorage.commitDumdictChanges,
				plan,
			);
		},
		async getInfoForRelationsCleanup({ canonicalForm }) {
			return ctx.runQuery(
				internal.dumdictStorage.getDumdictRelationsCleanupInfo,
				{ canonicalForm },
			) as unknown as Promise<RelationsCleanupInfoSlice<"de">>;
		},
		async loadCleanupRelationsContext({ resolutions }) {
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictCleanupRelationsContext,
				{
					locatorKeys: resolutions.map(({ locator }) =>
						pendingLocatorIdentityKey(locator),
					),
				},
			) as unknown as Promise<CleanupRelationsSlice<"de">>;
		},
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

function pendingProposalIdentityKey(input: unknown): string {
	const pending = unwrapOperationalParse<PendingSemanticRelation>(
		parseAsPendingSemanticRelation(input),
	);
	return JSON.stringify([
		pending.relation,
		pending.target.language,
		pending.target.canonicalForm,
		pending.target.family,
		pending.target.kind,
	]);
}

function pendingLocatorIdentityKey(input: {
	sourceReadingKey: string;
	relation: string;
	targetPendingId: string;
}): string {
	return JSON.stringify([
		input.sourceReadingKey,
		input.relation,
		input.targetPendingId,
	]);
}

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
