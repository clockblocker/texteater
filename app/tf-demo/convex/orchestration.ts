"use node";

import { type Infer, v } from "convex/values";
import {
	createDumdictService,
	type DumdictPlan,
	type DumdictStoragePort,
	makeSurfaceId,
	type NewNoteSlice,
	type ReadingPatchSlice,
	type StoredReadingsSlice,
} from "dumdict";
import { buildDumgen } from "dumgen";
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
import { type ActionCtx, action } from "./_generated/server";
import {
	type dictionaryPlanValidator,
	type nonResolvedGrammaticalValidator,
	type resolvedGrammaticalValidator,
	resolveSegmentResultValidator,
	type reusableAttestationValidator,
	semanticRelationValidator,
} from "./model/validators";

const dumgen = buildDumgen();

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
		return { decision: "Unresolved", language: input.language };
	}
	return {
		decision: "NotImplemented",
		language: input.language,
		route: { ...input.route },
	};
}

function resolvedGrammaticalActionResult(
	input: Extract<
		ResolveSegmentResult["grammatical"],
		{ decision: "Resolved" }
	>,
): ResolvedGrammaticalActionResult {
	return {
		...input,
		attestation: {
			...input.attestation,
			members: input.attestation.members.map((member) => ({ ...member })),
			surface: {
				...input.attestation.surface,
				lemma: { ...input.attestation.surface.lemma },
			},
		},
		interaction: {
			...input.interaction,
			memberSegmentIndices: [...input.interaction.memberSegmentIndices],
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
	return {
		baseRevision: input.baseRevision,
		changes: input.changes.map((change) => {
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

function orchestratorFor(ctx: ActionCtx) {
	return createTfDemoOrchestrator({
		dumgen,
		dictionary: createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		}),
		persistence: createConvexPersistence(ctx),
	});
}

function createConvexPersistence(ctx: ActionCtx): OrchestrationPersistence {
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
			}) as Promise<ResolvedClickCommit>;
		},
		async persistReusedResolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistReusedResolvedClick,
				{
					...input,
					sentenceId: input.sentenceId as Id<"sentences">,
					attestationId: input.attestationId as Id<"attestations">,
				},
			) as Promise<ReusedResolvedClickCommit>;
		},
		async persistUnresolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistUnresolvedClick,
				{
					...input,
					sentenceId: input.sentenceId as Id<"sentences">,
				},
			) as Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
		},
	};
}

function createConvexDumdictStorage(ctx: ActionCtx): DumdictStoragePort<"de"> {
	return {
		async findStoredReadings({ lemma }) {
			return ctx.runQuery(
				internal.dumdictStorage.findDumdictStoredReadings,
				{ lemmaKey: lemmaIdentityKey(lemma) },
			) as unknown as Promise<StoredReadingsSlice<"de">>;
		},
		async loadNewNoteContext({ draft }) {
			const ownedSurface = draft.ownedSurfaces?.[0]?.surface;
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictNewNoteContext,
				{
					lemmaKey: lemmaIdentityKey(draft.reading.lemma),
					readingKey: readingIdentityKey(draft.reading),
					...(ownedSurface
						? { surfaceKey: makeSurfaceId("de", ownedSurface) }
						: {}),
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
		async getInfoForRelationsCleanup() {
			throw new Error(
				"The tf-demo vertical slice does not run relation cleanup.",
			);
		},
		async loadCleanupRelationsContext() {
			throw new Error(
				"The tf-demo vertical slice does not run relation cleanup.",
			);
		},
	};
}
