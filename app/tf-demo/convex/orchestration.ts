"use node";

import { type Infer, v } from "convex/values";
import {
	type CleanupRelationsSlice,
	createDumdictService,
	type DumdictPlan,
	type DumdictStoragePort,
	makeSurfaceId,
	type NewNoteSlice,
	type ReadingPatchSlice,
	type RelationsCleanupInfoSlice,
	type StoredReadingsSlice,
} from "dumdict";
import { getDumdictSchemasFor } from "dumdict/schema";
import { buildDumgen } from "dumgen";
import {
	notImplementedGrammaticalResultSchema,
	resolvedGrammaticalResultSchema,
	unresolvedGrammaticalResultSchema,
} from "dumgen/schema";
import { pendingSemanticRelationSchema } from "dumrel";
import {
	applyValidatedKnowledgeContribution,
	createTfDemoOrchestrator,
	type LateResolvedClickCommit,
	lemmaIdentityKey,
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
import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import {
	projectResolutionGrammar,
	projectResolutionReading,
	type ResolutionSessionGuard,
} from "./model/resolutionSessions";
import {
	type dictionaryPlanValidator,
	type nonResolvedGrammaticalValidator,
	type resolvedGrammaticalValidator,
	resolveSegmentResultValidator,
	type reusableAttestationValidator,
	semanticRelationValidator,
} from "./model/validators";

const dumgen = buildDumgen();
const germanDumdictSchemas = getDumdictSchemasFor("de");

type ResolveSegmentActionResult = Infer<typeof resolveSegmentResultValidator>;
type ResolvedGrammaticalActionResult = Infer<
	typeof resolvedGrammaticalValidator
>;
type NonResolvedGrammaticalActionResult = Infer<
	typeof nonResolvedGrammaticalValidator
>;
type ReusableAttestationResult = Infer<typeof reusableAttestationValidator>;
type DictionaryPlanResult = Infer<typeof dictionaryPlanValidator>;

function convexId<TableName extends TableNames>(value: string): Id<TableName> {
	return value as Id<TableName>;
}

function nonResolvedGrammaticalActionResult(
	input: Extract<
		ResolveSegmentResult["grammatical"],
		{ decision: "Unresolved" | "NotImplemented" }
	>,
): NonResolvedGrammaticalActionResult {
	if (input.decision === "Unresolved") {
		const parsed = unresolvedGrammaticalResultSchema.parse(input);
		return { decision: "Unresolved", language: parsed.language };
	}
	const parsed = notImplementedGrammaticalResultSchema.parse(input);
	return {
		decision: "NotImplemented",
		language: parsed.language,
		route: { ...parsed.route },
	};
}

function resolvedGrammaticalActionResult(
	input: Extract<
		ResolveSegmentResult["grammatical"],
		{ decision: "Resolved" }
	>,
): ResolvedGrammaticalActionResult {
	const parsed = resolvedGrammaticalResultSchema.parse(input);
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

function dictionaryPlanResult(input: DumdictPlan<"de">): DictionaryPlanResult {
	const parsed = germanDumdictSchemas.dumdictPlanSchema.parse(input);
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
											owner: {
												...operation.envelope.owner,
												reading: mutableReading(
													operation.envelope.owner
														.reading,
												),
											},
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
		try {
			await ctx.runMutation(internal.resolutionSessions.advance, {
				guard,
				stage: "RouteAvailable",
			});
			const result = await orchestratorFor(ctx, guard).resolveSegment(
				input,
			);
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
		} catch {
			try {
				await ctx.runMutation(
					internal.resolutionSessions.settleAfterRun,
					{
						guard,
						result: {
							kind: "Failed",
							message: "Resolution could not be completed.",
						},
					},
				);
			} catch {
				// The session was invalidated or settled atomically with the Click.
			}
		}
		return null;
	},
});

export const contributeKnowledge = action({
	args: {
		contributionKey: v.string(),
		ownerKind: v.union(v.literal("Lemma"), v.literal("Reading")),
		ownerKey: v.string(),
		change: v.any(),
	},
	returns: v.any(),
	handler: async (ctx, args): Promise<unknown> => {
		const stored = await ctx.runQuery(
			internal.persistence.getKnowledgeOwner,
			{ ownerKind: args.ownerKind, ownerKey: args.ownerKey },
		);
		if (!stored) throw new Error("Knowledge owner does not exist.");
		const applied = applyValidatedKnowledgeContribution({
			owner:
				args.ownerKind === "Lemma"
					? {
							kind: "Lemma",
							lemma: stored.owner,
							...(stored.knowledge === undefined
								? {}
								: { knowledge: stored.knowledge }),
						}
					: {
							kind: "Reading",
							reading: stored.owner,
							...(stored.knowledge === undefined
								? {}
								: { knowledge: stored.knowledge }),
						},
			change: args.change,
		});
		const persisted: unknown = await ctx.runMutation(
			internal.persistence.persistKnowledgeContribution,
			{
				...args,
				change: applied.change,
				knowledge: applied.knowledge,
			},
		);
		return { ...applied, persisted };
	},
});

export const contributeRelation = action({
	args: {
		contributionKey: v.string(),
		sourceReadingKey: v.string(),
		relation: semanticRelationValidator,
		targetReadingKey: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args): Promise<unknown> => {
		if (args.sourceReadingKey === args.targetReadingKey) {
			throw new Error("A Reading cannot relate to itself in tf-demo.");
		}
		const [source, target] = await Promise.all([
			ctx.runQuery(internal.persistence.getKnowledgeOwner, {
				ownerKind: "Reading",
				ownerKey: args.sourceReadingKey,
			}),
			ctx.runQuery(internal.persistence.getKnowledgeOwner, {
				ownerKind: "Reading",
				ownerKey: args.targetReadingKey,
			}),
		]);
		if (!source || !target) {
			throw new Error(
				"Both relation endpoints must be stored Dumdict Readings.",
			);
		}
		const applied = applyValidatedKnowledgeContribution({
			owner: {
				kind: "Reading",
				reading: source.owner,
				...(source.knowledge === undefined
					? {}
					: { knowledge: source.knowledge }),
			},
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: args.relation,
				value: [target.owner],
			},
		});
		const persisted: unknown = await ctx.runMutation(
			internal.persistence.persistKnowledgeContribution,
			{
				contributionKey: args.contributionKey,
				ownerKind: "Reading",
				ownerKey: args.sourceReadingKey,
				change: applied.change,
				knowledge: applied.knowledge,
			},
		);
		return { ...applied, persisted };
	},
});

function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard?: ResolutionSessionGuard,
) {
	return createTfDemoOrchestrator({
		dumgen,
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
									stage: "GrammarAvailable",
									grammar:
										projectResolutionGrammar(grammatical),
								},
							);
						},
						async readingAvailable({ reading }) {
							await ctx.runMutation(
								internal.resolutionSessions.advance,
								{
									guard: sessionGuard,
									stage: "ReadingAvailable",
									reading: projectResolutionReading(reading),
								},
							);
						},
						async committing() {
							await ctx.runMutation(
								internal.resolutionSessions.advance,
								{
									guard: sessionGuard,
									stage: "Committing",
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
					readingKey,
					surfaceKeys:
						draft.ownedSurfaces?.map(({ surface }) =>
							makeSurfaceId("de", surface),
						) ?? [],
					explicitReadingTargetKeys:
						draft.relations?.flatMap(({ target }) =>
							target.kind === "existing"
								? [readingIdentityKey(target.reading)]
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
					targetReadingKeys: resolutions.flatMap(
						({ targetReading }) =>
							targetReading
								? [readingIdentityKey(targetReading)]
								: [],
					),
				},
			) as unknown as Promise<CleanupRelationsSlice<"de">>;
		},
	};
}

function pendingProposalIdentityKey(input: unknown): string {
	const pending = pendingSemanticRelationSchema.parse(input);
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
		targetReadingId: v.optional(v.id("readings")),
	},
	returns: shadowCleanupResultValidator,
	handler: async (ctx, args): Promise<ShadowCleanupActionResult> => {
		const selection: {
			revision: string;
			pendingRecord: unknown | null;
			targetReadingEntry: unknown | null;
		} = await ctx.runQuery(internal.shadowResolution.loadPendingSelection, {
			shadowId: args.shadowId,
			locatorKey: args.locatorKey,
			...(args.targetReadingId
				? { targetReadingId: args.targetReadingId }
				: {}),
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
		if (args.targetReadingId && selection.targetReadingEntry === null) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The selected Reading candidate no longer exists.",
			);
		}

		const pendingResult =
			germanDumdictSchemas.pendingSemanticRelationRecordSchema.safeParse(
				selection.pendingRecord,
			);
		if (!pendingResult.success) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The pending Shadow reference is malformed and cannot be changed.",
			);
		}
		const targetResult = selection.targetReadingEntry
			? germanDumdictSchemas.readingEntrySchema.safeParse(
					selection.targetReadingEntry,
				)
			: null;
		if (targetResult && !targetResult.success) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The selected Reading candidate is malformed.",
			);
		}
		const result = await createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		}).cleanupRelations({
			baseRevision: args.baseRevision,
			resolutions: [
				{
					locator: pendingResult.data.locator,
					...(targetResult?.success
						? { targetReading: targetResult.data.reading }
						: {}),
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
