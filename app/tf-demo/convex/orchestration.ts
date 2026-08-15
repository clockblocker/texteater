"use node";

import { v } from "convex/values";
import {
	createDumdictService,
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
	lemmaIdentityKey,
	type OrchestrationPersistence,
	type PersistedSentence,
	readingIdentityKey,
} from "../server/linguisticOrchestration";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, action } from "./_generated/server";
import { semanticRelationValidator } from "./model/validators";

const dumgen = buildDumgen();

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
	returns: v.any(),
	handler: async (ctx, args): Promise<unknown> => {
		const prior: {
			clickId: Id<"visitorClicks">;
			status: "Unresolved" | "Resolved";
			resolutionId?: Id<"grammaticalResolutions">;
			readingId?: Id<"readings">;
		} | null = await ctx.runQuery(
			internal.persistence.findClickResultByRequestId,
			{ requestId: args.requestId },
		);
		if (prior) return { deduplicated: true, persisted: prior };
		return orchestratorFor(ctx).resolveSegment({
			...args,
			sentenceId: args.sentenceId,
		});
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
		async persistResolvedClick(input) {
			return ctx.runMutation(internal.persistence.persistResolvedClick, {
				...input,
				sentenceId: input.sentenceId as Id<"sentences">,
				resolution: {
					...input.resolution,
					memberSegmentIndices: [
						...input.resolution.memberSegmentIndices,
					],
				},
			});
		},
		async persistUnresolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistUnresolvedClick,
				{
					...input,
					sentenceId: input.sentenceId as Id<"sentences">,
				},
			);
		},
	};
}

function createConvexDumdictStorage(ctx: ActionCtx): DumdictStoragePort<"de"> {
	return {
		async findStoredReadings({ lemma }) {
			return ctx.runQuery(
				internal.dumdictStorage.findDumdictStoredReadings,
				{ lemmaKey: lemmaIdentityKey(lemma) },
			) as Promise<StoredReadingsSlice<"de">>;
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
			) as Promise<NewNoteSlice<"de">>;
		},
		async loadReadingForPatch({ reading }) {
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictReadingForPatch,
				{ readingKey: readingIdentityKey(reading) },
			) as Promise<ReadingPatchSlice<"de">>;
		},
		async commitChanges({ baseRevision, changes }) {
			return ctx.runMutation(
				internal.dumdictStorage.commitDumdictChanges,
				{
					baseRevision,
					changes: [...changes],
				},
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
