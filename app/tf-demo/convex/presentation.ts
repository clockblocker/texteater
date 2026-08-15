import { v } from "convex/values";
import type { SemanticRelation } from "dumrel";

import { type QueryCtx, query } from "./_generated/server";
import { readingKeyFor } from "./model/linguisticKeys";
import {
	segmentKindValidator,
	semanticRelationValidator,
} from "./model/validators";

const MAX_SEGMENTS_PER_SENTENCE = 512;
const MAX_VISITOR_ID_LENGTH = 200;
const MAX_READING_HISTORY = 50;
const MAX_RELATIONS_PER_NOTE = 50;

const semanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
] as const satisfies readonly SemanticRelation[];

const languageBucketValidator = v.object({
	language: v.string(),
	values: v.array(v.string()),
});

const featureValidator = v.object({
	name: v.string(),
	value: v.string(),
});

const lemmaProjectionValidator = v.object({
	ownerKind: v.literal("Lemma"),
	ownerKey: v.string(),
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.array(featureValidator),
});

const readingProjectionValidator = v.object({
	ownerKind: v.literal("Reading"),
	ownerKey: v.string(),
	canonicalForm: v.string(),
	emojiDescription: v.string(),
});

const surfaceProjectionValidator = v.object({
	normalizedSurface: v.string(),
	spelling: v.union(v.literal("Canonical"), v.literal("Variant")),
	surfaceKind: v.union(v.literal("Citation"), v.literal("Inflection")),
	surfaceFeatures: v.array(featureValidator),
	inflectionalFeatures: v.array(featureValidator),
});

const attestationProjectionValidator = v.object({
	members: v.array(
		v.object({
			attested: v.string(),
			orthography: v.union(v.literal("Standard"), v.literal("Typo")),
		}),
	),
	realizationCoverage: v.union(v.literal("Full"), v.literal("Partial")),
	surface: surfaceProjectionValidator,
});

const unitShadowProjectionValidator = v.object({
	language: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

const relationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetReadingKey: v.string(),
	targetCanonicalForm: v.string(),
	targetEmojiDescription: v.string(),
});

const pendingRelationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	targetFamily: v.string(),
	targetKind: v.string(),
});

const knowledgeProjectionValidator = v.object({
	definition: v.union(v.null(), v.string()),
	translations: v.array(languageBucketValidator),
	transcriptions: v.array(languageBucketValidator),
	morphologicalTree: v.union(v.null(), v.any()),
	lexicalBreakdown: v.array(unitShadowProjectionValidator),
	readingKnowledgeUpdatedAt: v.union(v.null(), v.number()),
	lemmaKnowledgeUpdatedAt: v.union(v.null(), v.number()),
});

const readingNoteValidator = v.object({
	reading: readingProjectionValidator,
	lemma: lemmaProjectionValidator,
	note: knowledgeProjectionValidator,
	relations: v.array(relationProjectionValidator),
	pendingRelations: v.array(pendingRelationProjectionValidator),
});

const presentationValidator = v.object({
	resolvedAt: v.number(),
	clickedSegmentIndex: v.number(),
	text: v.object({
		textId: v.id("texts"),
		sourceText: v.string(),
	}),
	grammaticalResolution: v.object({
		resolutionId: v.id("grammaticalResolutions"),
		language: v.literal("de"),
		markedContext: v.string(),
		memberSegmentIndices: v.array(v.number()),
		attestation: attestationProjectionValidator,
	}),
	reading: readingProjectionValidator,
	lemma: lemmaProjectionValidator,
	note: knowledgeProjectionValidator,
	relations: v.array(relationProjectionValidator),
	sentence: v.object({
		sentenceId: v.id("sentences"),
		position: v.number(),
		language: v.union(v.literal("de"), v.literal("he")),
		stitchedText: v.string(),
		sourceText: v.string(),
		segments: v.array(
			v.object({
				index: v.number(),
				kind: segmentKindValidator,
				text: v.string(),
				isClicked: v.boolean(),
				isResolutionMember: v.boolean(),
			}),
		),
	}),
});

type UnknownRecord = Record<string, unknown>;

export type LanguageBucketProjection = {
	readonly language: string;
	readonly values: string[];
};

export type FeatureProjection = {
	readonly name: string;
	readonly value: string;
};

export type UnitShadowProjection = {
	readonly language: string;
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

export type RelationProjection = {
	readonly relation: SemanticRelation;
	readonly targetReadingKey: string;
	readonly targetCanonicalForm: string;
	readonly targetEmojiDescription: string;
};

export type PendingRelationProjection = {
	readonly relation: SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly targetFamily: string;
	readonly targetKind: string;
};

export function projectKnowledge(
	readingKnowledgeValue: unknown,
	lemmaKnowledgeValue: unknown,
): {
	readonly definition: string | null;
	readonly translations: LanguageBucketProjection[];
	readonly transcriptions: LanguageBucketProjection[];
	readonly morphologicalTree: unknown | null;
	readonly lexicalBreakdown: UnitShadowProjection[];
	readonly relations: RelationProjection[];
} {
	const readingKnowledge = optionalRecord(readingKnowledgeValue);
	const lemmaKnowledge = optionalRecord(lemmaKnowledgeValue);
	return {
		definition: optionalNonEmptyString(readingKnowledge?.definition),
		translations: flattenLanguageBuckets(readingKnowledge?.translations),
		transcriptions: flattenLanguageBuckets(lemmaKnowledge?.transcriptions),
		morphologicalTree: readingKnowledge?.morphologicalTree ?? null,
		lexicalBreakdown: projectUnitShadows(
			readingKnowledge?.lexicalBreakdown,
		),
		relations: flattenDirectSemanticRelations(
			readingKnowledge?.semanticRelations,
		),
	};
}

export function flattenDirectSemanticRelations(
	semanticRelationsValue: unknown,
): RelationProjection[] {
	const semanticRelations = optionalRecord(semanticRelationsValue);
	if (!semanticRelations) return [];

	return semanticRelationValues
		.flatMap((relation) => {
			const targets = semanticRelations[relation];
			if (!Array.isArray(targets)) return [];
			return targets.flatMap((target): RelationProjection[] => {
				const targetRecord = optionalRecord(target);
				const lemma = optionalRecord(targetRecord?.lemma);
				const targetCanonicalForm = optionalNonEmptyString(
					lemma?.canonicalForm,
				);
				const targetEmojiDescription = optionalNonEmptyString(
					targetRecord?.emojiDescription,
				);
				return targetCanonicalForm && targetEmojiDescription && lemma
					? [
							{
								relation,
								targetReadingKey: readingKeyFor({
									lemma,
									emojiDescription: targetEmojiDescription,
								}),
								targetCanonicalForm,
								targetEmojiDescription,
							},
						]
					: [];
			});
		})
		.slice(0, MAX_RELATIONS_PER_NOTE);
}

export function projectFeatures(value: unknown): FeatureProjection[] {
	const record = optionalRecord(value);
	if (!record) return [];
	return Object.entries(record)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([name, member]) => ({ name, value: formatFeatureValue(member) }));
}

export const forVisitor = query({
	args: { visitorId: v.string() },
	returns: v.union(v.null(), presentationValidator),
	handler: async (ctx, { visitorId }) => {
		assertVisitorId(visitorId);
		const context = await ctx.db
			.query("visitorResolvedContexts")
			.withIndex("by_visitor_id_and_resolved_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.order("desc")
			.first();
		if (!context) return null;

		const [reading, resolution, sentence] = await Promise.all([
			ctx.db.get(context.readingId),
			ctx.db.get(context.resolutionId),
			ctx.db.get(context.sentenceId),
		]);
		if (!reading || !resolution || !sentence) {
			throw new Error("The selected visitor context is incomplete.");
		}

		const [segments, text, readingKnowledge, lemmaKnowledge] =
			await Promise.all([
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentence._id),
					)
					.take(MAX_SEGMENTS_PER_SENTENCE),
				ctx.db.get(sentence.textId),
				ctx.db
					.query("accumulatedKnowledge")
					.withIndex("by_owner_kind_and_owner_key", (q) =>
						q
							.eq("ownerKind", "Reading")
							.eq("ownerKey", reading.readingKey),
					)
					.unique(),
				ctx.db
					.query("accumulatedKnowledge")
					.withIndex("by_owner_kind_and_owner_key", (q) =>
						q
							.eq("ownerKind", "Lemma")
							.eq("ownerKey", reading.lemmaKey),
					)
					.unique(),
			]);
		if (!text) throw new Error("The selected source Text is missing.");

		const identities = projectReadingIdentities(reading);
		const projected = projectKnowledge(
			readingKnowledge?.knowledge,
			lemmaKnowledge?.knowledge,
		);
		const memberIndices = new Set(resolution.memberSegmentIndices);

		return {
			resolvedAt: context.resolvedAt,
			clickedSegmentIndex: context.clickedSegmentIndex,
			text: { textId: text._id, sourceText: text.sourceText },
			grammaticalResolution: {
				resolutionId: resolution._id,
				language: resolution.language,
				markedContext: resolution.markedContext,
				memberSegmentIndices: [...resolution.memberSegmentIndices],
				attestation: projectAttestation(resolution.attestation),
			},
			reading: identities.reading,
			lemma: identities.lemma,
			note: {
				definition: projected.definition,
				translations: [...projected.translations],
				transcriptions: [...projected.transcriptions],
				morphologicalTree: projected.morphologicalTree,
				lexicalBreakdown: [...projected.lexicalBreakdown],
				readingKnowledgeUpdatedAt: readingKnowledge?.updatedAt ?? null,
				lemmaKnowledgeUpdatedAt: lemmaKnowledge?.updatedAt ?? null,
			},
			relations: [...projected.relations],
			sentence: {
				sentenceId: sentence._id,
				position: sentence.position,
				language: sentence.language,
				stitchedText: sentence.stitchedText,
				sourceText: text.sourceText,
				segments: segments.map(
					({ index, kind, text: segmentText }) => ({
						index,
						kind,
						text: segmentText,
						isClicked: index === context.clickedSegmentIndex,
						isResolutionMember: memberIndices.has(index),
					}),
				),
			},
		};
	},
});

export const forReading = query({
	args: { readingKey: v.string() },
	returns: v.union(v.null(), readingNoteValidator),
	handler: async (ctx, { readingKey }) => {
		assertOwnerKey(readingKey);
		return loadReadingNote(ctx, readingKey);
	},
});

export const readingHistoryForVisitor = query({
	args: { visitorId: v.string() },
	returns: v.array(readingProjectionValidator),
	handler: async (ctx, { visitorId }) => {
		assertVisitorId(visitorId);
		const contexts = await ctx.db
			.query("visitorResolvedContexts")
			.withIndex("by_visitor_id_and_resolved_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.order("desc")
			.take(MAX_READING_HISTORY);
		const rows = await Promise.all(
			contexts.map(({ readingId }) => ctx.db.get(readingId)),
		);
		const seen = new Set<string>();
		return rows.flatMap((row) => {
			if (!row || seen.has(row.readingKey)) return [];
			seen.add(row.readingKey);
			return [projectReadingIdentities(row).reading];
		});
	},
});

async function loadReadingNote(ctx: QueryCtx, readingKey: string) {
	const reading = await ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) => q.eq("readingKey", readingKey))
		.unique();
	if (!reading) return null;
	const [readingKnowledge, lemmaKnowledge, pendingRelations] =
		await Promise.all([
			ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q
						.eq("ownerKind", "Reading")
						.eq("ownerKey", reading.readingKey),
				)
				.unique(),
			ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Lemma").eq("ownerKey", reading.lemmaKey),
				)
				.unique(),
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_source_reading_key", (q) =>
					q.eq("sourceReadingKey", reading.readingKey),
				)
				.take(MAX_RELATIONS_PER_NOTE),
		]);
	const identities = projectReadingIdentities(reading);
	const projected = projectKnowledge(
		readingKnowledge?.knowledge,
		lemmaKnowledge?.knowledge,
	);
	return {
		reading: identities.reading,
		lemma: identities.lemma,
		note: {
			definition: projected.definition,
			translations: [...projected.translations],
			transcriptions: [...projected.transcriptions],
			morphologicalTree: projected.morphologicalTree,
			lexicalBreakdown: [...projected.lexicalBreakdown],
			readingKnowledgeUpdatedAt: readingKnowledge?.updatedAt ?? null,
			lemmaKnowledgeUpdatedAt: lemmaKnowledge?.updatedAt ?? null,
		},
		relations: [...projected.relations],
		pendingRelations: projectPendingRelations(pendingRelations),
	};
}

function projectReadingIdentities(reading: {
	readingKey: string;
	lemmaKey: string;
	emojiDescription: string;
	entry: unknown;
}) {
	const entry = requireRecord(reading.entry, "Reading entry");
	const readingReference = requireRecord(entry.reading, "Reading reference");
	const lemmaReference = requireRecord(
		readingReference.lemma,
		"Reading Lemma",
	);
	const canonicalForm = requireNonEmptyString(
		lemmaReference.canonicalForm,
		"Reading Lemma canonicalForm",
	);
	return {
		reading: {
			ownerKind: "Reading" as const,
			ownerKey: reading.readingKey,
			canonicalForm,
			emojiDescription: reading.emojiDescription,
		},
		lemma: {
			ownerKind: "Lemma" as const,
			ownerKey: reading.lemmaKey,
			language: requireNonEmptyString(
				lemmaReference.language,
				"Lemma language",
			),
			family: requireNonEmptyString(
				lemmaReference.family,
				"Lemma family",
			),
			kind: requireNonEmptyString(lemmaReference.kind, "Lemma kind"),
			canonicalForm,
			coreFeatures: projectFeatures(lemmaReference.coreFeatures),
		},
	};
}

function projectAttestation(value: unknown) {
	const attestation = requireRecord(value, "Grammatical Attestation");
	const surface = requireRecord(attestation.surface, "Attestation Surface");
	const membersValue = Array.isArray(attestation.members)
		? attestation.members
		: [];
	const members = membersValue.map((memberValue) => {
		const member = requireRecord(memberValue, "Attestation member");
		const orthography = requireNonEmptyString(
			member.orthography,
			"Attestation member orthography",
		);
		if (orthography !== "Standard" && orthography !== "Typo") {
			throw new Error("Attestation orthography is unsupported.");
		}
		return {
			attested: requireNonEmptyString(
				member.attested,
				"Attestation member text",
			),
			orthography: orthography as "Standard" | "Typo",
		};
	});
	const spelling = requireNonEmptyString(
		surface.spelling,
		"Surface spelling",
	);
	if (spelling !== "Canonical" && spelling !== "Variant") {
		throw new Error("Surface spelling is unsupported.");
	}
	const surfaceKind = requireNonEmptyString(
		surface.surfaceKind,
		"Surface kind",
	);
	if (surfaceKind !== "Citation" && surfaceKind !== "Inflection") {
		throw new Error("Surface kind is unsupported.");
	}
	const realizationCoverage = requireNonEmptyString(
		attestation.realizationCoverage,
		"Attestation realization coverage",
	);
	if (realizationCoverage !== "Full" && realizationCoverage !== "Partial") {
		throw new Error("Attestation realization coverage is unsupported.");
	}
	return {
		members,
		realizationCoverage: realizationCoverage as "Full" | "Partial",
		surface: {
			normalizedSurface: requireNonEmptyString(
				surface.normalizedSurface,
				"Surface normalizedSurface",
			),
			spelling: spelling as "Canonical" | "Variant",
			surfaceKind: surfaceKind as "Citation" | "Inflection",
			surfaceFeatures: projectFeatures(surface.surfaceFeatures),
			inflectionalFeatures: projectFeatures(surface.inflectionalFeatures),
		},
	};
}

function projectPendingRelations(
	rows: readonly { record: unknown }[],
): PendingRelationProjection[] {
	return rows.flatMap(({ record: recordValue }) => {
		const record = optionalRecord(recordValue);
		const pending = optionalRecord(record?.pending);
		const target = optionalRecord(pending?.target);
		const relation = pending?.relation;
		const targetCanonicalForm = optionalNonEmptyString(
			target?.canonicalForm,
		);
		const targetFamily = optionalNonEmptyString(target?.family);
		const targetKind = optionalNonEmptyString(target?.kind);
		return isSemanticRelation(relation) &&
			targetCanonicalForm &&
			targetFamily &&
			targetKind
			? [
					{
						relation,
						targetCanonicalForm,
						targetFamily,
						targetKind,
					},
				]
			: [];
	});
}

function projectUnitShadows(value: unknown): UnitShadowProjection[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item): UnitShadowProjection[] => {
		const shadow = optionalRecord(item);
		const language = optionalNonEmptyString(shadow?.language);
		const canonicalForm = optionalNonEmptyString(shadow?.canonicalForm);
		const family = optionalNonEmptyString(shadow?.family);
		const kind = optionalNonEmptyString(shadow?.kind);
		return language && canonicalForm && family && kind
			? [{ language, canonicalForm, family, kind }]
			: [];
	});
}

function flattenLanguageBuckets(
	bucketsValue: unknown,
): LanguageBucketProjection[] {
	const buckets = optionalRecord(bucketsValue);
	if (!buckets) return [];
	return Object.entries(buckets)
		.sort(([left], [right]) => left.localeCompare(right))
		.flatMap(([language, values]) => {
			if (!Array.isArray(values)) return [];
			const strings = values.flatMap((value) => {
				const normalized = optionalNonEmptyString(value);
				return normalized ? [normalized] : [];
			});
			return strings.length > 0 ? [{ language, values: strings }] : [];
		});
}

function formatFeatureValue(value: unknown): string {
	if (value === null) return "—";
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return String(value);
	}
	return JSON.stringify(value);
}

function isSemanticRelation(value: unknown): value is SemanticRelation {
	return semanticRelationValues.some((relation) => relation === value);
}

function optionalRecord(value: unknown): UnknownRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function requireRecord(value: unknown, name: string): UnknownRecord {
	const record = optionalRecord(value);
	if (!record) throw new Error(`${name} must be an object.`);
	return record;
}

function optionalNonEmptyString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

function requireNonEmptyString(value: unknown, name: string): string {
	const normalized = optionalNonEmptyString(value);
	if (!normalized) throw new Error(`${name} must be a non-empty string.`);
	return normalized;
}

function assertVisitorId(visitorId: string): void {
	if (
		visitorId.trim().length === 0 ||
		visitorId.length > MAX_VISITOR_ID_LENGTH
	) {
		throw new Error("visitorId must contain 1 to 200 characters.");
	}
}

function assertOwnerKey(ownerKey: string): void {
	if (ownerKey.trim().length === 0 || ownerKey.length > 20_000) {
		throw new Error("readingKey must contain 1 to 20000 characters.");
	}
}
