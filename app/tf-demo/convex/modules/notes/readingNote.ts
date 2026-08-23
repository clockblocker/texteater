import { v } from "convex/values";
import type {
	LemmaReference,
	ProjectedSemanticRelations,
	ReadingKnowledge,
	ReadingReference,
} from "dumrel";

import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadCompleteOccurrenceMembers } from "../../model/occurrenceAttestations";
import {
	descriptorFromStoredShadow,
	shadowIsCompatible,
	structuralShadowLocatorKey,
} from "../../model/shadows";
import {
	pendingRelationProjectionValidator,
	projectPendingRelations,
} from "./pendingRelations";
import {
	isUnitReadingFamily,
	projectReadingKnowledge,
	projectReadingValue,
} from "./projections";
import {
	loadRelationProjections,
	relationProjectionValidator,
} from "./relations";

const MAX_PENDING_RELATIONS_PER_READING_NOTE = 100;
const MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE = 200;
const SOURCE_CONTEXT_PAGE_SIZE = 6;

const unitShadowProjectionValidator = v.object({
	language: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

const readingValueLemmaValidator = v.object({
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

const readingValueReadingValidator = v.object({
	lemma: readingValueLemmaValidator,
	emojiDescription: v.string(),
});

const readingNoteLemmaValidator = v.object({
	ownerKind: v.literal("Lemma"),
	ownerKey: v.string(),
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

const readingNoteReadingValidator = v.object({
	ownerKind: v.literal("Reading"),
	ownerKey: v.string(),
	readingId: v.id("readings"),
	lemma: readingNoteLemmaValidator,
	emojiDescription: v.string(),
});

const structuralShadowProjectionValidator = v.object({
	aspect: v.union(
		v.literal("morphologicalTree"),
		v.literal("lexicalBreakdown"),
	),
	path: v.string(),
	descriptor: unitShadowProjectionValidator,
	target: v.object({
		kind: v.literal("ShadowNote"),
		shadowId: v.id("shadows"),
	}),
});

const readingKnowledgeValidator = v.object({
	transcription: v.optional(v.string()),
	definition: v.optional(v.string()),
	translations: v.optional(v.object({ en: v.array(v.string()) })),
	morphologicalTree: v.optional(v.any()),
	lexicalBreakdown: v.optional(v.array(unitShadowProjectionValidator)),
	semanticRelations: v.optional(
		v.union(
			v.object({
				targetKind: v.optional(v.literal("lemma")),
				synonym: v.optional(v.array(readingValueLemmaValidator)),
				nearSynonym: v.optional(v.array(readingValueLemmaValidator)),
				antonym: v.optional(v.array(readingValueLemmaValidator)),
				nearAntonym: v.optional(v.array(readingValueLemmaValidator)),
				hypernym: v.optional(v.array(readingValueLemmaValidator)),
				hyponym: v.optional(v.array(readingValueLemmaValidator)),
				meronym: v.optional(v.array(readingValueLemmaValidator)),
				holonym: v.optional(v.array(readingValueLemmaValidator)),
			}),
			v.object({
				targetKind: v.literal("reading"),
				synonym: v.optional(v.array(readingValueReadingValidator)),
				nearSynonym: v.optional(v.array(readingValueReadingValidator)),
				antonym: v.optional(v.array(readingValueReadingValidator)),
				nearAntonym: v.optional(v.array(readingValueReadingValidator)),
				hypernym: v.optional(v.array(readingValueReadingValidator)),
				hyponym: v.optional(v.array(readingValueReadingValidator)),
				meronym: v.optional(v.array(readingValueReadingValidator)),
				holonym: v.optional(v.array(readingValueReadingValidator)),
			}),
		),
	),
});

export const readingNoteValidator = v.object({
	kind: v.literal("UnitReadingNote"),
	target: v.object({
		kind: v.literal("UnitReadingNote"),
		readingId: v.id("readings"),
	}),
	reading: readingNoteReadingValidator,
	knowledgeState: v.object({
		status: v.union(
			v.literal("Absent"),
			v.literal("Partial"),
			v.literal("Full"),
		),
		activity: v.union(
			v.literal("Idle"),
			v.literal("Loading"),
			v.literal("Failed"),
		),
		failureMessage: v.optional(v.string()),
	}),
	knowledge: readingKnowledgeValidator,
	knowledgeUpdatedAt: v.union(v.null(), v.number()),
	relations: v.array(relationProjectionValidator),
	pendingRelations: v.array(pendingRelationProjectionValidator),
	structuralReferences: v.array(structuralShadowProjectionValidator),
	sourceContexts: v.object({
		page: v.array(
			v.object({
				attestationId: v.id("attestations"),
				textId: v.id("texts"),
				sentencePosition: v.number(),
				sentenceSnippet: v.string(),
				memberSegmentIndices: v.array(v.number()),
				target: v.object({
					kind: v.literal("Text"),
					textId: v.id("texts"),
					focusAttestationId: v.id("attestations"),
				}),
			}),
		),
		continueCursor: v.string(),
		isDone: v.boolean(),
	}),
});

export type SourceContextProjection<
	AttestationId extends string = string,
	TextId extends string = string,
> = {
	readonly attestationId: AttestationId;
	readonly textId: TextId;
	readonly sentencePosition: number;
	readonly sentenceSnippet: string;
	readonly memberSegmentIndices: number[];
	readonly target: {
		readonly kind: "Text";
		readonly textId: TextId;
		readonly focusAttestationId: AttestationId;
	};
};

export async function loadUnitReadingNote(
	ctx: QueryCtx,
	readingIdValue: string,
	contextCursor?: string,
) {
	const readingId = ctx.db.normalizeId("readings", readingIdValue);
	if (!readingId) return null;
	const reading = await ctx.db.get(readingId);
	if (!reading) return null;
	const lemma = await ctx.db.get(reading.lemmaId);
	if (!lemma || !isUnitReadingFamily(lemma.family)) return null;

	const [
		readingKnowledge,
		relationProjections,
		pendingRelations,
		structuralReferences,
		sourceContexts,
		attempts,
	] = await Promise.all([
		ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", reading.readingKey),
			)
			.unique(),
		loadRelationProjections(ctx, reading._id),
		ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_source_reading_key", (q) =>
				q.eq("sourceReadingKey", reading.readingKey),
			)
			.take(MAX_PENDING_RELATIONS_PER_READING_NOTE + 1),
		loadStructuralReferencesForReading(ctx, reading.readingKey),
		loadSourceContextPage(ctx, reading._id, contextCursor),
		ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_owner_reading_key_and_updated_at", (q) =>
				q.eq("ownerReadingKey", reading.readingKey),
			)
			.order("desc")
			.take(20),
	]);
	if (pendingRelations.length > MAX_PENDING_RELATIONS_PER_READING_NOTE) {
		throw new Error(
			`A Unit Reading Note supports at most ${MAX_PENDING_RELATIONS_PER_READING_NOTE} pending Semantic Relations.`,
		);
	}

	const knowledge = projectReadingKnowledge(readingKnowledge?.knowledge);
	const activeAttempt = attempts.find(
		({ state }) => state === "Scheduled" || state === "Running",
	);
	const failedAttempt = attempts.find(({ state }) => state === "Failed");
	const status: "Absent" | "Partial" | "Full" =
		readingKnowledge?.status ?? "Absent";
	const activity: "Idle" | "Loading" | "Failed" =
		status === "Full"
			? "Idle"
			: activeAttempt
				? "Loading"
				: failedAttempt
					? "Failed"
					: "Idle";

	return {
		kind: "UnitReadingNote" as const,
		target: {
			kind: "UnitReadingNote" as const,
			readingId: reading._id,
		},
		reading: projectReadingIdentity(reading, lemma),
		knowledgeState: {
			status,
			activity,
			...(activity === "Failed" && failedAttempt?.failureMessage
				? { failureMessage: failedAttempt.failureMessage }
				: {}),
		},
		knowledge: withResolvedSemanticRelations(
			knowledge,
			relationProjections.knowledge,
		),
		knowledgeUpdatedAt: readingKnowledge?.updatedAt ?? null,
		relations: relationProjections.resolved,
		pendingRelations: projectPendingRelations(pendingRelations),
		structuralReferences,
		sourceContexts,
	};
}

export async function loadSourceContextPage(
	ctx: QueryCtx,
	readingId: Id<"readings">,
	contextCursor?: string,
) {
	const result = await ctx.db
		.query("attestations")
		.withIndex("by_reading_id", (q) => q.eq("readingId", readingId))
		.order("desc")
		.paginate({
			cursor: contextCursor ?? null,
			numItems: SOURCE_CONTEXT_PAGE_SIZE,
		});
	const projected = await Promise.all(
		result.page.map((attestation) =>
			projectSourceContext(ctx, attestation._id),
		),
	);
	const seen = new Set<Id<"attestations">>();
	return {
		page: projected.flatMap((context) => {
			if (!context || seen.has(context.attestationId)) return [];
			seen.add(context.attestationId);
			return [context];
		}),
		continueCursor: result.continueCursor,
		isDone: result.isDone,
	};
}

function projectReadingIdentity(
	reading: {
		readonly _id: Id<"readings">;
		readonly readingKey: string;
		readonly emojiDescription: string;
	},
	lemma: {
		readonly lemmaKey: string;
		readonly language: string;
		readonly family: string;
		readonly kind: string;
		readonly canonicalForm: string;
		readonly coreFeatures: unknown;
	},
) {
	const readingValue = projectReadingValue(reading, lemma);
	return {
		ownerKind: "Reading" as const,
		ownerKey: reading.readingKey,
		readingId: reading._id,
		...readingValue,
		lemma: {
			ownerKind: "Lemma" as const,
			ownerKey: lemma.lemmaKey,
			...readingValue.lemma,
		},
	};
}

function withResolvedSemanticRelations(
	knowledge: ReadingKnowledge<"en">,
	semanticRelations: ProjectedSemanticRelations<
		LemmaReference,
		ReadingReference
	>,
): Omit<ReadingKnowledge<"en">, "semanticRelations"> & {
	semanticRelations?: ProjectedSemanticRelations<
		LemmaReference,
		ReadingReference
	>;
} {
	return Object.keys(semanticRelations).length === 0
		? knowledge
		: { ...knowledge, semanticRelations };
}

async function loadStructuralReferencesForReading(
	ctx: QueryCtx,
	ownerReadingKey: string,
) {
	const rows = await ctx.db
		.query("structuralShadowReferences")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.take(MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE + 1);
	if (rows.length > MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE) {
		throw new Error(
			`A Unit Reading Note supports at most ${MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE} structural Shadow references.`,
		);
	}
	const shadows = await Promise.all(
		rows.map((reference) => ctx.db.get(reference.shadowId)),
	);
	return rows.flatMap((reference, index) => {
		const shadow = shadows[index];
		if (
			!shadow ||
			reference.locatorKey !==
				structuralShadowLocatorKey(
					ownerReadingKey,
					reference.aspect,
					reference.path,
				)
		) {
			return [];
		}
		try {
			const descriptor = descriptorFromStoredShadow(shadow);
			if (!shadowIsCompatible(shadow, descriptor)) return [];
			return [
				{
					aspect: reference.aspect,
					path: reference.path,
					descriptor,
					target: {
						kind: "ShadowNote" as const,
						shadowId: shadow._id,
					},
				},
			];
		} catch {
			return [];
		}
	});
}

async function projectSourceContext(
	ctx: QueryCtx,
	attestationId: Id<"attestations">,
): Promise<SourceContextProjection<Id<"attestations">, Id<"texts">> | null> {
	const members = await loadCompleteOccurrenceMembers(ctx, attestationId);
	if (!members) return null;
	const sentence = await ctx.db.get(members.sentenceId);
	if (!sentence) return null;
	const text = await ctx.db.get(sentence.textId);
	if (!text) return null;
	return {
		attestationId,
		textId: text._id,
		sentencePosition: sentence.position,
		sentenceSnippet: sentence.stitchedText,
		memberSegmentIndices: members.memberSegmentIndices,
		target: {
			kind: "Text",
			textId: text._id,
			focusAttestationId: attestationId,
		},
	};
}
