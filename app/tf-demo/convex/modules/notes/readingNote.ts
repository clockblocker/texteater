import type { Prettify } from "common-utils";
import { type Infer, v } from "convex/values";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { findDefinitionText } from "../../model/definitionTexts";
import { loadCompleteOccurrenceMembers } from "../../model/occurrenceAttestations";
import {
	descriptorFromStoredShadow,
	shadowIsCompatible,
	structuralShadowLocatorKey,
} from "../../model/shadows";
import { loadPersonalAnnotation } from "../../personalAnnotations";
import {
	projectSentenceView,
	sentenceViewValidator,
} from "../text/sentenceView";
import {
	pendingRelationProjectionValidator,
	projectPendingRelations,
} from "./pendingRelations";
import {
	isUnitReadingFamily,
	projectReadingKnowledge,
	projectReadingValue,
} from "./projections";
import type { PresentedRelations } from "./relations";
import {
	grammaticalAlternativeValidator,
	loadGrammaticalAlternatives,
	loadParticipleLinks,
	loadRelationProjections,
	participleLinkValidator,
	relationProjectionValidator,
} from "./relations";
import { unitShadowProjectionValidator } from "./shadowNote";
import {
	projectOccurrenceSource,
	type SourceOrigin,
	type SourceTarget,
	sourceOriginValidator,
	sourceSegmentValidator,
	sourceTargetValidator,
} from "./sourceContext";
import type { UnitReadingFamily } from "./unitReadingFamilies";

const MAX_PENDING_RELATIONS_PER_READING_NOTE = 100;
const MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE = 200;
const SOURCE_CONTEXT_PAGE_SIZE = 6;

const readingValueLemmaValidator = v.object({
	unitKind: v.literal("Lemma"),
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

const readingValueReadingValidator = v.object({
	unitKind: v.literal("Reading"),
	lemma: readingValueLemmaValidator,
	emojiDescription: v.string(),
});

const readingNoteLemmaValidator = v.object({
	unitKind: v.literal("Lemma"),
	ownerKind: v.literal("Lemma"),
	ownerKey: v.string(),
	lemmaId: v.id("lemmas"),
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

const readingNoteReadingValidator = v.object({
	unitKind: v.literal("Reading"),
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
		kind: v.literal("Shadow"),
		shadowId: v.id("shadows"),
	}),
});

const readingKnowledgeValidator = v.object({
	transcription: v.optional(v.string()),
	definition: v.optional(v.string()),
	translations: v.optional(
		v.object({
			en: v.optional(v.array(v.string())),
			ru: v.optional(v.array(v.string())),
		}),
	),
	morphologicalTree: v.optional(v.any()),
	lexicalBreakdown: v.optional(v.array(unitShadowProjectionValidator)),
	/** The Valency Frame is stored Knowledge the Note does not render yet. */
	valency: v.optional(v.any()),
	participleSource: v.optional(readingValueLemmaValidator),
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

/** One page of a Reading's Source Contexts, loaded apart from the Note body. */
export const sourceContextPageValidator = v.object({
	page: v.array(
		v.object({
			attestationId: v.id("attestations"),
			textId: v.id("texts"),
			sentencePosition: v.number(),
			sentenceSnippet: v.string(),
			segments: v.array(sourceSegmentValidator),
			memberSegmentIndices: v.array(v.number()),
			memberTexts: v.array(v.string()),
			origin: sourceOriginValidator,
			target: sourceTargetValidator,
		}),
	),
	continueCursor: v.string(),
	isDone: v.boolean(),
});

export const readingNoteValidator = v.object({
	kind: v.literal("Reading"),
	target: v.object({
		kind: v.literal("Reading"),
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
	personalAnnotation: v.string(),
	knowledgeUpdatedAt: v.union(v.null(), v.number()),
	relations: v.array(relationProjectionValidator),
	/** The relation neighbourhood passed a cap; more relations exist. */
	relationsTruncated: v.boolean(),
	grammaticalAlternatives: v.array(grammaticalAlternativeValidator),
	/** Participle Source links, stored on the ADJ and projected on its verb. */
	participleLinks: v.optional(v.array(participleLinkValidator)),
	pendingRelations: v.array(pendingRelationProjectionValidator),
	structuralReferences: v.array(structuralShadowProjectionValidator),
	definitionText: v.union(
		v.object({ state: v.literal("Absent") }),
		v.object({ state: v.literal("Pending") }),
		v.object({ state: v.literal("Plain") }),
		v.object({
			state: v.literal("Failed"),
			failureMessage: v.optional(v.string()),
		}),
		v.object({
			state: v.literal("Ready"),
			sentence: sentenceViewValidator,
		}),
	),
	sourceContexts: sourceContextPageValidator,
});

export type SourceContextProjection = {
	readonly attestationId: Id<"attestations">;
	readonly textId: Id<"texts">;
	readonly sentencePosition: number;
	readonly sentenceSnippet: string;
	/** Every Segment of the source Sentence, in order, so members render by index. */
	readonly segments: Infer<typeof sourceSegmentValidator>[];
	readonly memberSegmentIndices: number[];
	/** Attested text of each member Segment, in sentence order. */
	readonly memberTexts: string[];
	readonly origin: SourceOrigin;
	readonly target: SourceTarget;
};

async function loadUnitReading(ctx: QueryCtx, readingIdValue: string) {
	const readingId = ctx.db.normalizeId("readings", readingIdValue);
	if (!readingId) return null;
	const reading = await ctx.db.get(readingId);
	if (!reading) return null;
	const lemma = await ctx.db.get(reading.lemmaId);
	if (!lemma || !isUnitReadingFamily(lemma.family)) return null;
	return { reading, lemma };
}

/** The Reading Note body with the first page of its Source Contexts. */
export async function loadUnitReadingNote(
	ctx: QueryCtx,
	readingIdValue: string,
	visitorId: string,
) {
	const unit = await loadUnitReading(ctx, readingIdValue);
	if (!unit) return null;
	const { reading, lemma } = unit;

	const [
		readingKnowledge,
		relationProjections,
		grammaticalAlternatives,
		pendingRelations,
		structuralReferences,
		sourceContexts,
		attempts,
		personalAnnotation,
		definitionTextRow,
	] = await Promise.all([
		ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", reading.readingKey),
			)
			.unique(),
		loadRelationProjections(ctx, reading._id),
		loadGrammaticalAlternatives(ctx, reading._id),
		ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_source_reading_key", (q) =>
				q.eq("sourceReadingKey", reading.readingKey),
			)
			.take(MAX_PENDING_RELATIONS_PER_READING_NOTE + 1),
		loadStructuralReferencesForReading(ctx, reading.readingKey),
		loadSourceContextPage(ctx, reading._id, reading.readingKey, visitorId),
		ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_owner_reading_key_and_updated_at", (q) =>
				q.eq("ownerReadingKey", reading.readingKey),
			)
			.order("desc")
			.take(20),
		loadPersonalAnnotation(ctx, visitorId, reading._id),
		findDefinitionText(ctx, reading.readingKey),
	]);
	if (pendingRelations.length > MAX_PENDING_RELATIONS_PER_READING_NOTE) {
		throw new Error(
			`A Reading Note supports at most ${MAX_PENDING_RELATIONS_PER_READING_NOTE} pending Semantic Relations.`,
		);
	}

	const knowledge = projectReadingKnowledge(
		projectReadingValue(reading, lemma),
		readingKnowledge?.knowledge,
	);
	const participleLinks = await loadParticipleLinks(
		ctx,
		reading,
		lemma,
		knowledge.participleSource,
	);
	const activeAttempt = attempts.find(
		({ state }) =>
			state === "Waiting" || state === "Scheduled" || state === "Running",
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
		kind: "Reading" as const,
		target: {
			kind: "Reading" as const,
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
		personalAnnotation,
		definitionText: await projectDefinitionText(
			ctx,
			knowledge.definition,
			definitionTextRow,
			visitorId,
		),
		knowledgeUpdatedAt: readingKnowledge?.updatedAt ?? null,
		relations: relationProjections.resolved,
		relationsTruncated: relationProjections.truncated,
		grammaticalAlternatives,
		participleLinks,
		pendingRelations: projectPendingRelations(pendingRelations),
		structuralReferences,
		sourceContexts,
	};
}

/**
 * The Definition block's data: the definition as a clickable Sentence once
 * its Definition Text exists, a pending state while it is generated or
 * segmented, and the bare string when segmentation failed or never ran.
 */
async function projectDefinitionText(
	ctx: QueryCtx,
	definition: string | undefined,
	row: Awaited<ReturnType<typeof findDefinitionText>>,
	visitorId: string,
) {
	if (definition === undefined) return { state: "Absent" as const };
	if (!row) return { state: "Plain" as const };
	if (row.state === "Failed") {
		return {
			state: "Failed" as const,
			...(row.failureMessage
				? { failureMessage: row.failureMessage }
				: {}),
		};
	}
	if (
		row.state !== "Ready" ||
		row.materializedDefinition !== definition.trim().normalize("NFC") ||
		!row.sentenceId
	) {
		return { state: "Pending" as const };
	}
	const sentence = await ctx.db.get(row.sentenceId);
	if (!sentence) return { state: "Pending" as const };
	return {
		state: "Ready" as const,
		sentence: await projectSentenceView(ctx, sentence, visitorId),
	};
}

/** A later page of a Reading's Source Contexts; the body is not recomputed. */
export async function loadReadingSourceContexts(
	ctx: QueryCtx,
	readingIdValue: string,
	visitorId: string,
	cursor: string,
) {
	const unit = await loadUnitReading(ctx, readingIdValue);
	if (!unit) return null;
	return loadSourceContextPage(
		ctx,
		unit.reading._id,
		unit.reading.readingKey,
		visitorId,
		cursor,
	);
}

/**
 * One page of the Source Contexts this Visitor has encountered, newest
 * Encounter first. It pages the Visitor's own Encounters of the Reading, so
 * other Visitors' occurrences never leave a page empty.
 */
export async function loadSourceContextPage(
	ctx: QueryCtx,
	readingId: Id<"readings">,
	readingKey: string,
	visitorId: string,
	contextCursor?: string,
) {
	const result = await ctx.db
		.query("visitorClicks")
		.withIndex("by_visitor_id_and_reading_id", (q) =>
			q.eq("visitorId", visitorId).eq("readingId", readingId),
		)
		.order("desc")
		.paginate({
			cursor: contextCursor ?? null,
			numItems: SOURCE_CONTEXT_PAGE_SIZE,
		});
	// Encounters of several members of one occurrence quote it once.
	const attestationIds = [
		...new Set(
			result.page.flatMap(({ attestationId }) =>
				attestationId ? [attestationId] : [],
			),
		),
	];
	const projected = await Promise.all(
		attestationIds.map((attestationId) =>
			projectSourceContext(ctx, attestationId, visitorId, readingKey),
		),
	);
	return {
		page: projected.filter((context) => context !== null),
		continueCursor: result.continueCursor,
		isDone: result.isDone,
	};
}

type GermanUnitReading = Extract<
	Dumling.Reading<"de">,
	{ lemma: { family: UnitReadingFamily } }
>;

type ReadingNoteIdentity<Value extends Dumling.Reading<"de">> =
	Value extends unknown
		? Prettify<{
				lemma: Prettify<{
					unitKind: "Lemma";
					language: Value["lemma"]["language"];
					family: Value["lemma"]["family"];
					kind: Value["lemma"]["kind"];
					canonicalForm: Value["lemma"]["canonicalForm"];
					coreFeatures: Value["lemma"]["coreFeatures"];
					ownerKind: "Lemma";
					ownerKey: string;
					lemmaId: Id<"lemmas">;
				}>;
				unitKind: "Reading";
				emojiDescription: Value["emojiDescription"];
				ownerKind: "Reading";
				ownerKey: string;
				readingId: Id<"readings">;
			}>
		: never;

function withReadingNoteIdentity<Value extends Dumling.Reading<"de">>(
	value: Value,
	identity: {
		readonly readingId: Id<"readings">;
		readonly readingKey: string;
		readonly lemmaKey: string;
		readonly lemmaId: Id<"lemmas">;
	},
): ReadingNoteIdentity<Value> {
	return {
		ownerKind: "Reading",
		ownerKey: identity.readingKey,
		readingId: identity.readingId,
		...value,
		lemma: {
			ownerKind: "Lemma",
			ownerKey: identity.lemmaKey,
			lemmaId: identity.lemmaId,
			...value.lemma,
		},
	} as unknown as ReadingNoteIdentity<Value>;
}

function projectReadingIdentity(
	reading: {
		readonly _id: Id<"readings">;
		readonly readingKey: string;
		readonly emojiDescription: string;
	},
	lemma: {
		readonly _id: Id<"lemmas">;
		readonly lemmaKey: string;
		readonly language: string;
		readonly family: string;
		readonly kind: string;
		readonly canonicalForm: string;
		readonly coreFeatures: unknown;
	},
): ReadingNoteIdentity<GermanUnitReading> {
	if (!isUnitReadingFamily(lemma.family)) {
		throw new Error(`Unsupported Unit Reading family: ${lemma.family}.`);
	}
	const readingValue = projectReadingValue(reading, lemma);
	return withReadingNoteIdentity(readingValue as GermanUnitReading, {
		readingId: reading._id,
		readingKey: reading.readingKey,
		lemmaKey: lemma.lemmaKey,
		lemmaId: lemma._id,
	});
}

function withResolvedSemanticRelations(
	knowledge: Dumrel.ReadingKnowledge,
	semanticRelations: PresentedRelations,
): Omit<Dumrel.ReadingKnowledge, "semanticRelations"> & {
	semanticRelations?: PresentedRelations;
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
			`A Reading Note supports at most ${MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE} structural Shadow references.`,
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
						kind: "Shadow" as const,
						shadowId: shadow._id,
					},
				},
			];
		} catch {
			return [];
		}
	});
}

/**
 * One occurrence inside its source Sentence. A Reading's own Definition
 * Text never counts as a Source Context for that Reading, so a definition
 * that mentions its headword does not cite itself.
 */
async function projectSourceContext(
	ctx: QueryCtx,
	attestationId: Id<"attestations">,
	visitorId: string,
	ownerReadingKey: string,
): Promise<SourceContextProjection | null> {
	const members = await loadCompleteOccurrenceMembers(ctx, attestationId);
	if (!members) return null;
	const sentence = await ctx.db.get(members.sentenceId);
	if (!sentence) return null;
	const text = await ctx.db.get(sentence.textId);
	if (!text) return null;
	if (text.origin?.readingKey === ownerReadingKey) return null;
	const source = await projectOccurrenceSource(
		ctx,
		{
			attestationId,
			sentence,
			text,
			memberSegmentIndices: members.memberSegmentIndices,
		},
		visitorId,
	);
	return source
		? { attestationId, ...source, memberTexts: members.memberTexts }
		: null;
}
