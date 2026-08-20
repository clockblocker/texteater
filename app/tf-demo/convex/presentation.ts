import { v } from "convex/values";
import { projectSemanticRelations } from "dumdict";
import { readingFingerprint } from "dumling/reading";
import {
	type LemmaReference,
	lemmaReferenceSchema,
	type ProjectedSemanticRelations,
	type ReadingKnowledge,
	type SemanticRelation,
} from "dumrel";
import { semanticRelationValues } from "dumrel/vocabulary";

import { lemmaIdentityKey } from "../server/linguisticIdentity";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { loadRelationInventory } from "./dumdictStorage";
import { loadOccurrenceAttestation } from "./model/occurrenceAttestations";
import {
	loadResolutionNote,
	resolutionNoteValidator,
} from "./model/resolutionSessions";
import {
	collectStructuralShadowReferences,
	descriptorFromStoredShadow,
	pendingShadowDescriptor,
	type ShadowDescriptor,
	shadowIsCompatible,
	structuralShadowLocatorKey,
} from "./model/shadows";
import {
	grammaticalLanguageValidator,
	languageValidator,
	orthographyValidator,
	realizationCoverageValidator,
	segmentKindValidator,
	semanticRelationValidator,
	surfaceKindValidator,
	surfaceSpellingValidator,
} from "./model/validators";
import {
	featureProjectionValidator as featureValidator,
	projectFeaturesForPresentation,
} from "./modules/notes/featurePresentation";
import {
	isUnitReadingFamily,
	projectReadingKnowledge,
	projectReadingValue,
} from "./modules/notes/projections";
import {
	loadRouteNote,
	routeNoteTargetValidator,
	routeNoteValidator,
} from "./modules/notes/routeNotes";

export type { FeatureProjection } from "./modules/notes/featurePresentation";
export { projectFeaturesForPresentation as projectFeatures } from "./modules/notes/featurePresentation";
export { isUnitReadingFamily, projectReadingKnowledge, projectReadingValue };

const MAX_VISITOR_ID_LENGTH = 200;
const MAX_READING_HISTORY = 50;
const MAX_RELATIONS_PER_NOTE = 50;
const MAX_PENDING_RELATIONS_PER_READING_NOTE = 100;
const MAX_STRUCTURAL_REFERENCES_PER_READING_NOTE = 200;
const SHADOW_REFERENCE_PAGE_SIZE = 50;
const MAX_SENTENCES_PER_TEXT = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;
const SOURCE_CONTEXT_PAGE_SIZE = 6;
const MAX_SHADOW_CANDIDATE_LEMMAS = 100;

const textTargetValidator = v.object({
	kind: v.literal("Text"),
	textId: v.string(),
	focusAttestationId: v.optional(v.string()),
});

const unitReadingNoteTargetValidator = v.object({
	kind: v.literal("UnitReadingNote"),
	readingId: v.string(),
});

const noteTargetValidator = v.union(
	unitReadingNoteTargetValidator,
	routeNoteTargetValidator,
	v.object({ kind: v.literal("ShadowNote"), shadowId: v.string() }),
	v.object({ kind: v.literal("Resolution"), requestId: v.string() }),
);

const languageBucketValidator = v.object({
	language: v.string(),
	values: v.array(v.string()),
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
	readingId: v.id("readings"),
	canonicalForm: v.string(),
	emojiDescription: v.string(),
});

const readingValueLemmaValidator = v.object({
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
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

const surfaceProjectionValidator = v.object({
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,
	surfaceKind: surfaceKindValidator,
	surfaceFeatures: v.array(featureValidator),
	inflectionalFeatures: v.array(featureValidator),
});

const attestationProjectionValidator = v.object({
	members: v.array(
		v.object({
			attested: v.string(),
			orthography: orthographyValidator,
		}),
	),
	realizationCoverage: realizationCoverageValidator,
	surface: surfaceProjectionValidator,
});

const unitShadowProjectionValidator = v.object({
	language: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

const relationFingerprintProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetLemmaKey: v.string(),
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
});

const relationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
	target: v.object({
		kind: v.literal("RouteNote"),
		routeKind: v.literal("Lemma"),
		id: v.id("lemmas"),
	}),
});

const pendingRelationProjectionValidator = v.object({
	locatorKey: v.string(),
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	targetFamily: v.string(),
	targetKind: v.string(),
	target: v.object({
		kind: v.literal("ShadowNote"),
		shadowId: v.id("shadows"),
	}),
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

const knowledgeProjectionValidator = v.object({
	transcription: v.union(v.null(), v.string()),
	definition: v.union(v.null(), v.string()),
	translations: v.array(languageBucketValidator),
	morphologicalTree: v.union(v.null(), v.any()),
	lexicalBreakdown: v.array(unitShadowProjectionValidator),
	knowledgeUpdatedAt: v.union(v.null(), v.number()),
});

const readingKnowledgeValidator = v.object({
	transcription: v.optional(v.string()),
	definition: v.optional(v.string()),
	translations: v.optional(v.object({ en: v.array(v.string()) })),
	morphologicalTree: v.optional(v.any()),
	lexicalBreakdown: v.optional(v.array(unitShadowProjectionValidator)),
	semanticRelations: v.optional(
		v.object({
			synonym: v.optional(v.array(readingValueLemmaValidator)),
			nearSynonym: v.optional(v.array(readingValueLemmaValidator)),
			antonym: v.optional(v.array(readingValueLemmaValidator)),
			nearAntonym: v.optional(v.array(readingValueLemmaValidator)),
			hypernym: v.optional(v.array(readingValueLemmaValidator)),
			hyponym: v.optional(v.array(readingValueLemmaValidator)),
			meronym: v.optional(v.array(readingValueLemmaValidator)),
			holonym: v.optional(v.array(readingValueLemmaValidator)),
		}),
	),
});

const readingNoteValidator = v.object({
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

const shadowNoteValidator = v.object({
	kind: v.literal("ShadowNote"),
	target: v.object({
		kind: v.literal("ShadowNote"),
		shadowId: v.id("shadows"),
	}),
	descriptor: unitShadowProjectionValidator,
	inspection: v.object({
		revision: v.string(),
		candidates: v.array(
			v.object({
				lemmaId: v.id("lemmas"),
				canonicalForm: v.string(),
				family: v.string(),
				kind: v.string(),
				coreFeatures: v.array(featureValidator),
				target: v.object({
					kind: v.literal("RouteNote"),
					routeKind: v.literal("Lemma"),
					id: v.id("lemmas"),
				}),
			}),
		),
	}),
	references: v.object({
		page: v.array(
			v.object({
				reading: v.object({
					readingId: v.id("readings"),
					canonicalForm: v.string(),
					emojiDescription: v.string(),
					target: v.object({
						kind: v.literal("UnitReadingNote"),
						readingId: v.id("readings"),
					}),
				}),
				pendingRelations: v.array(
					v.object({
						locatorKey: v.string(),
						relation: semanticRelationValidator,
					}),
				),
				structuralReferences: v.array(
					v.object({
						aspect: v.union(
							v.literal("morphologicalTree"),
							v.literal("lexicalBreakdown"),
						),
						path: v.string(),
					}),
				),
			}),
		),
		continueCursor: v.string(),
		isDone: v.boolean(),
	}),
});

const textFocusValidator = v.union(
	v.object({ kind: v.literal("None") }),
	v.object({
		kind: v.literal("Missing"),
		requestedAttestationId: v.string(),
	}),
	v.object({
		kind: v.literal("Occurrence"),
		attestationId: v.id("attestations"),
		sentenceId: v.id("sentences"),
		memberSegmentIndices: v.array(v.number()),
	}),
);

const textViewValidator = v.object({
	kind: v.literal("Text"),
	target: v.object({
		kind: v.literal("Text"),
		textId: v.id("texts"),
		focusAttestationId: v.optional(v.string()),
	}),
	textId: v.id("texts"),
	sourceText: v.string(),
	createdAt: v.number(),
	focus: textFocusValidator,
	sentences: v.array(
		v.object({
			sentenceId: v.id("sentences"),
			position: v.number(),
			language: languageValidator,
			stitchedText: v.string(),
			segments: v.array(
				v.object({
					index: v.number(),
					kind: segmentKindValidator,
					text: v.string(),
				}),
			),
		}),
	),
});

const presentationValidator = v.object({
	resolvedAt: v.number(),
	clickedSegmentIndex: v.number(),
	text: v.object({
		textId: v.id("texts"),
		sourceText: v.string(),
	}),
	grammaticalResolution: v.object({
		attestationId: v.id("attestations"),
		language: grammaticalLanguageValidator,
		markedContext: v.string(),
		memberSegmentIndices: v.array(v.number()),
		attestation: attestationProjectionValidator,
	}),
	reading: readingProjectionValidator,
	lemma: lemmaProjectionValidator,
	note: knowledgeProjectionValidator,
	relations: v.array(relationFingerprintProjectionValidator),
	sentence: v.object({
		sentenceId: v.id("sentences"),
		position: v.number(),
		language: languageValidator,
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

export type UnitShadowProjection = {
	readonly language: string;
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

export type RelationFingerprintProjection = {
	readonly relation: SemanticRelation;
	readonly targetLemmaKey: string;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
};

export type RelationProjection<LemmaId extends string = string> = {
	readonly relation: SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
	readonly target: {
		readonly kind: "RouteNote";
		readonly routeKind: "Lemma";
		readonly id: LemmaId;
	};
};

export type PendingRelationProjection = {
	readonly locatorKey: string;
	readonly relation: SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly targetFamily: string;
	readonly targetKind: string;
	readonly target: {
		readonly kind: "ShadowNote";
		readonly shadowId: Id<"shadows">;
	};
};

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

export function projectKnowledge(readingKnowledgeValue: unknown): {
	readonly transcription: string | null;
	readonly definition: string | null;
	readonly translations: LanguageBucketProjection[];
	readonly morphologicalTree: unknown | null;
	readonly lexicalBreakdown: UnitShadowProjection[];
	readonly relations: RelationFingerprintProjection[];
} {
	const readingKnowledge = optionalRecord(readingKnowledgeValue);
	return {
		transcription: optionalNonEmptyString(readingKnowledge?.transcription),
		definition: optionalNonEmptyString(readingKnowledge?.definition),
		translations: flattenLanguageBuckets(readingKnowledge?.translations),
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
): RelationFingerprintProjection[] {
	const semanticRelations = optionalRecord(semanticRelationsValue);
	if (!semanticRelations) return [];

	return semanticRelationValues
		.flatMap((relation) => {
			const targets = semanticRelations[relation];
			if (!Array.isArray(targets)) return [];
			return targets.flatMap(
				(target): RelationFingerprintProjection[] => {
					const lemma = optionalRecord(target);
					const targetCanonicalForm = optionalNonEmptyString(
						lemma?.canonicalForm,
					);
					return targetCanonicalForm && lemma
						? [
								{
									relation,
									targetLemmaKey: lemmaIdentityKey(lemma),
									targetCanonicalForm,
									provenance: "direct",
								},
							]
						: [];
				},
			);
		})
		.slice(0, MAX_RELATIONS_PER_NOTE);
}

export function projectResolvedRelationTargets<LemmaId extends string>(
	relations: readonly RelationFingerprintProjection[],
	targetLemmas: readonly {
		readonly lemmaKey: string;
		readonly lemmaId: LemmaId;
	}[],
): RelationProjection<LemmaId>[] {
	const lemmaIdByKey = new Map(
		targetLemmas.map(({ lemmaKey, lemmaId }) => [lemmaKey, lemmaId]),
	);
	return relations.flatMap(
		({ targetLemmaKey, ...relation }): RelationProjection<LemmaId>[] => {
			const lemmaId = lemmaIdByKey.get(targetLemmaKey);
			return lemmaId
				? [
						{
							...relation,
							target: {
								kind: "RouteNote",
								routeKind: "Lemma",
								id: lemmaId,
							},
						},
					]
				: [];
		},
	);
}

export async function loadRelationProjections(
	ctx: QueryCtx,
	readingId: Id<"readings">,
) {
	const source = await ctx.db.get(readingId);
	if (!source) return { fingerprints: [], knowledge: {}, resolved: [] };
	const inventory = await loadRelationInventory(ctx);
	const projections = projectSemanticRelations<"de">(
		inventory as unknown as Parameters<
			typeof projectSemanticRelations<"de">
		>[0],
	).filter(
		(projection) =>
			readingFingerprint(projection.sourceReading) === source.readingKey,
	);
	if (projections.length > MAX_RELATIONS_PER_NOTE) {
		throw new Error(
			`A Reading Note supports at most ${MAX_RELATIONS_PER_NOTE} Semantic Relations.`,
		);
	}
	const lemmas = await Promise.all(
		projections.map(({ targetLemma }) =>
			ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", lemmaIdentityKey(targetLemma)),
				)
				.unique(),
		),
	);
	const fingerprints = projections.flatMap((projection, index) => {
		const lemma = lemmas[index];
		return lemma
			? [
					{
						relation: projection.relation,
						targetLemmaKey: lemma.lemmaKey,
						targetCanonicalForm: lemma.canonicalForm,
						provenance: projection.provenance,
					},
				]
			: [];
	});
	const knowledge: ProjectedSemanticRelations<LemmaReference> = {};
	for (const [index, projection] of projections.entries()) {
		const lemma = lemmas[index];
		if (!lemma) continue;
		const target = lemmaReferenceSchema.parse({
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		});
		const existingTargets = knowledge[projection.relation];
		if (existingTargets) existingTargets.push(target);
		else knowledge[projection.relation] = [target];
	}
	return {
		fingerprints,
		knowledge,
		resolved: projectResolvedRelationTargets(
			fingerprints,
			lemmas.flatMap((lemma) =>
				lemma ? [{ lemmaKey: lemma.lemmaKey, lemmaId: lemma._id }] : [],
			),
		),
	};
}

function withResolvedSemanticRelations(
	knowledge: ReadingKnowledge<"en">,
	semanticRelations: ProjectedSemanticRelations<LemmaReference>,
): Omit<ReadingKnowledge<"en">, "semanticRelations"> & {
	semanticRelations?: ProjectedSemanticRelations<LemmaReference>;
} {
	return Object.keys(semanticRelations).length === 0
		? knowledge
		: { ...knowledge, semanticRelations };
}

export const forVisitor = query({
	args: { visitorId: v.string() },
	returns: v.union(v.null(), presentationValidator),
	handler: async (ctx, { visitorId }) => {
		assertVisitorId(visitorId);
		const clicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_clicked_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.order("desc")
			.take(MAX_READING_HISTORY);
		const click = clicks.find(({ attestationId }) =>
			Boolean(attestationId),
		);
		if (!click?.attestationId) return null;
		const occurrence = await loadOccurrenceAttestation(
			ctx,
			click.attestationId,
		);
		if (!occurrence) return null;
		const clickedSegment = await ctx.db.get(click.segmentId);
		if (
			!clickedSegment ||
			clickedSegment.sentenceId !== occurrence.sentence._id
		) {
			return null;
		}

		const [text, readingKnowledge, relations] = await Promise.all([
			ctx.db.get(occurrence.sentence.textId),
			ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", occurrence.reading.readingKey),
				)
				.unique(),
			loadRelationProjections(ctx, occurrence.reading._id),
		]);
		if (!text) return null;

		const identities = projectReadingIdentities(
			occurrence.reading,
			occurrence.lemma,
		);
		const projected = projectKnowledge(readingKnowledge?.knowledge);
		const memberIndices = new Set(occurrence.memberSegmentIndices);

		return {
			resolvedAt: click.clickedAt,
			clickedSegmentIndex: clickedSegment.index,
			text: { textId: text._id, sourceText: text.sourceText },
			grammaticalResolution: {
				attestationId: occurrence.attestation._id,
				language: "de" as const,
				markedContext: occurrence.markedContext,
				memberSegmentIndices: occurrence.memberSegmentIndices,
				attestation: projectAttestation(occurrence.publicAttestation),
			},
			reading: identities.reading,
			lemma: identities.lemma,
			note: {
				transcription: projected.transcription,
				definition: projected.definition,
				translations: [...projected.translations],
				morphologicalTree: projected.morphologicalTree,
				lexicalBreakdown: [...projected.lexicalBreakdown],
				knowledgeUpdatedAt: readingKnowledge?.updatedAt ?? null,
			},
			relations: relations.fingerprints,
			sentence: {
				sentenceId: occurrence.sentence._id,
				position: occurrence.sentence.position,
				language: occurrence.sentence.language,
				stitchedText: occurrence.sentence.stitchedText,
				sourceText: text.sourceText,
				segments: occurrence.segments.map(
					({ index, kind, text: segmentText }) => ({
						index,
						kind,
						text: segmentText,
						isClicked: index === clickedSegment.index,
						isResolutionMember: memberIndices.has(index),
					}),
				),
			},
		};
	},
});

export const getTextView = query({
	args: { target: textTargetValidator },
	returns: v.union(v.null(), textViewValidator),
	handler: async (ctx, { target }) => {
		const textId = ctx.db.normalizeId("texts", target.textId);
		if (!textId) return null;
		const text = await ctx.db.get(textId);
		if (!text) return null;
		const focus = await loadTextFocus(
			ctx,
			textId,
			target.focusAttestationId,
		);

		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) => q.eq("textId", textId))
			.take(MAX_SENTENCES_PER_TEXT);
		const segmentsBySentence = await Promise.all(
			sentences.map((sentence) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentence._id),
					)
					.take(MAX_SEGMENTS_PER_SENTENCE),
			),
		);

		return {
			kind: "Text" as const,
			target: {
				kind: "Text" as const,
				textId: text._id,
				...(target.focusAttestationId
					? { focusAttestationId: target.focusAttestationId }
					: {}),
			},
			textId: text._id,
			sourceText: text.sourceText,
			createdAt: text._creationTime,
			focus,
			sentences: sentences.map((sentence, index) => ({
				sentenceId: sentence._id,
				position: sentence.position,
				language: sentence.language,
				stitchedText: sentence.stitchedText,
				segments: (segmentsBySentence[index] ?? []).map((segment) => ({
					index: segment.index,
					kind: segment.kind,
					text: segment.text,
				})),
			})),
		};
	},
});

export const getNote = query({
	args: {
		target: noteTargetValidator,
		contextCursor: v.optional(v.string()),
		visitorId: v.optional(v.string()),
	},
	returns: v.union(
		v.null(),
		readingNoteValidator,
		routeNoteValidator,
		shadowNoteValidator,
		resolutionNoteValidator,
	),
	handler: async (ctx, { target, contextCursor }) => {
		if (target.kind === "UnitReadingNote") {
			return loadUnitReadingNote(ctx, target.readingId, contextCursor);
		}
		if (target.kind === "Resolution") {
			return loadResolutionNote(ctx, target.requestId);
		}
		if (target.kind === "ShadowNote") {
			return loadShadowNote(ctx, target.shadowId, contextCursor);
		}
		return loadRouteNote(ctx, target, contextCursor);
	},
});

export const readingHistoryForVisitor = query({
	args: { visitorId: v.string() },
	returns: v.array(readingProjectionValidator),
	handler: async (ctx, { visitorId }) => {
		assertVisitorId(visitorId);
		const clicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_clicked_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.order("desc")
			.take(MAX_READING_HISTORY);
		const attestations = await Promise.all(
			clicks.map((click) =>
				click.attestationId ? ctx.db.get(click.attestationId) : null,
			),
		);
		const readings = await Promise.all(
			attestations.map((attestation) =>
				attestation ? ctx.db.get(attestation.readingId) : null,
			),
		);
		const lemmas = await Promise.all(
			readings.map((reading) =>
				reading ? ctx.db.get(reading.lemmaId) : null,
			),
		);
		const seen = new Set<string>();
		return readings.flatMap((reading, index) => {
			const lemma = lemmas[index];
			if (!reading || !lemma || seen.has(reading.readingKey)) return [];
			seen.add(reading.readingKey);
			return [projectReadingIdentities(reading, lemma).reading];
		});
	},
});

async function loadUnitReadingNote(
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
	const readingValue = projectReadingValue(reading, lemma);
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
		reading: {
			ownerKind: "Reading" as const,
			ownerKey: reading.readingKey,
			readingId: reading._id,
			...readingValue,
			lemma: {
				ownerKind: "Lemma" as const,
				ownerKey: lemma.lemmaKey,
				...readingValue.lemma,
			},
		},
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

type ShadowReferenceCursor = {
	readonly kind: "pending" | "structural";
	readonly cursor: string | null;
};

function parseShadowReferenceCursor(value?: string): ShadowReferenceCursor {
	if (!value) return { kind: "pending", cursor: null };
	try {
		const parsed = JSON.parse(value) as Record<string, unknown>;
		if (
			(parsed.kind === "pending" || parsed.kind === "structural") &&
			(parsed.cursor === null || typeof parsed.cursor === "string")
		) {
			return { kind: parsed.kind, cursor: parsed.cursor };
		}
	} catch {
		// Fall through to the stable invalid-cursor error.
	}
	throw new Error("Invalid Shadow reference cursor.");
}

function shadowReferenceCursor(value: ShadowReferenceCursor): string {
	return JSON.stringify(value);
}

async function loadShadowInspection(
	ctx: QueryCtx,
	descriptor: ShadowDescriptor,
) {
	if (!isUnitReadingFamily(descriptor.family)) {
		const state = await ctx.db
			.query("dictionaryState")
			.withIndex("by_key", (q) => q.eq("key", "global"))
			.unique();
		return {
			revision: `convex-${state?.revision ?? 0}`,
			candidates: [],
		};
	}
	const [state, lemmas] = await Promise.all([
		ctx.db
			.query("dictionaryState")
			.withIndex("by_key", (q) => q.eq("key", "global"))
			.unique(),
		ctx.db
			.query("lemmas")
			.withIndex("by_shadow_descriptor", (q) =>
				q
					.eq("language", descriptor.language)
					.eq("canonicalForm", descriptor.canonicalForm)
					.eq("family", descriptor.family)
					.eq("kind", descriptor.kind),
			)
			.take(MAX_SHADOW_CANDIDATE_LEMMAS + 1),
	]);
	if (lemmas.length > MAX_SHADOW_CANDIDATE_LEMMAS) {
		throw new Error(
			`Shadow inspection supports at most ${MAX_SHADOW_CANDIDATE_LEMMAS} exactly matching Lemmas.`,
		);
	}

	const candidates: {
		lemmaId: Id<"lemmas">;
		canonicalForm: string;
		family: string;
		kind: string;
		coreFeatures: { name: string; value: string }[];
		target: {
			kind: "RouteNote";
			routeKind: "Lemma";
			id: Id<"lemmas">;
		};
	}[] = [];
	for (const lemma of lemmas) {
		const dictionaryLemma = await ctx.db
			.query("dictionaryLemmas")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.unique();
		if (!dictionaryLemma) continue;
		candidates.push({
			lemmaId: lemma._id,
			canonicalForm: lemma.canonicalForm,
			family: lemma.family,
			kind: lemma.kind,
			coreFeatures: projectFeaturesForPresentation(lemma.coreFeatures),
			target: {
				kind: "RouteNote",
				routeKind: "Lemma",
				id: lemma._id,
			},
		});
	}

	return {
		revision: `convex-${state?.revision ?? 0}`,
		candidates: candidates.sort((left, right) =>
			`${left.canonicalForm}\0${left.family}\0${left.kind}\0${left.lemmaId}`.localeCompare(
				`${right.canonicalForm}\0${right.family}\0${right.kind}\0${right.lemmaId}`,
			),
		),
	};
}

async function loadShadowNote(
	ctx: QueryCtx,
	shadowIdValue: string,
	contextCursor?: string,
) {
	const shadowId = ctx.db.normalizeId("shadows", shadowIdValue);
	if (!shadowId) return null;
	const shadow = await ctx.db.get(shadowId);
	if (!shadow) return null;
	let descriptor: ShadowDescriptor;
	try {
		descriptor = descriptorFromStoredShadow(shadow);
		if (!shadowIsCompatible(shadow, descriptor)) return null;
	} catch {
		return null;
	}

	const [firstPending, firstStructural] = await Promise.all([
		ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.take(1),
		ctx.db
			.query("structuralShadowReferences")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.take(1),
	]);
	if (firstPending.length === 0 && firstStructural.length === 0) return null;

	const cursor = contextCursor
		? parseShadowReferenceCursor(contextCursor)
		: firstPending.length > 0
			? { kind: "pending" as const, cursor: null }
			: { kind: "structural" as const, cursor: null };
	let pendingRows: typeof firstPending = [];
	let structuralRows: typeof firstStructural = [];
	let continueCursor = "";
	let isDone = false;
	if (cursor.kind === "pending") {
		const result = await ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.paginate({
				cursor: cursor.cursor,
				numItems: SHADOW_REFERENCE_PAGE_SIZE,
			});
		pendingRows = result.page;
		if (!result.isDone) {
			continueCursor = shadowReferenceCursor({
				kind: "pending",
				cursor: result.continueCursor,
			});
		} else if (firstStructural.length > 0) {
			continueCursor = shadowReferenceCursor({
				kind: "structural",
				cursor: null,
			});
		} else isDone = true;
	} else {
		const result = await ctx.db
			.query("structuralShadowReferences")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.paginate({
				cursor: cursor.cursor,
				numItems: SHADOW_REFERENCE_PAGE_SIZE,
			});
		structuralRows = result.page;
		isDone = result.isDone;
		continueCursor = result.isDone
			? ""
			: shadowReferenceCursor({
					kind: "structural",
					cursor: result.continueCursor,
				});
	}

	const ownerReadingKeys = [
		...new Set([
			...pendingRows.map(({ sourceReadingKey }) => sourceReadingKey),
			...structuralRows.map(({ ownerReadingKey }) => ownerReadingKey),
		]),
	].sort();
	const readings = await Promise.all(
		ownerReadingKeys.map((ownerReadingKey) =>
			ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", ownerReadingKey),
				)
				.unique(),
		),
	);
	const [lemmas, accumulated] = await Promise.all([
		Promise.all(
			readings.map((reading) =>
				reading ? ctx.db.get(reading.lemmaId) : null,
			),
		),
		Promise.all(
			ownerReadingKeys.map((ownerReadingKey) =>
				ctx.db
					.query("accumulatedKnowledge")
					.withIndex("by_owner_reading_key", (q) =>
						q.eq("ownerReadingKey", ownerReadingKey),
					)
					.unique(),
			),
		),
	]);

	const ownerIndex = new Map(
		ownerReadingKeys.map((ownerReadingKey, index) => [
			ownerReadingKey,
			index,
		]),
	);
	const groups = new Map<
		string,
		{
			reading: {
				readingId: Id<"readings">;
				canonicalForm: string;
				emojiDescription: string;
				target: {
					kind: "UnitReadingNote";
					readingId: Id<"readings">;
				};
			};
			pendingRelations: {
				locatorKey: string;
				relation: SemanticRelation;
			}[];
			structuralReferences: {
				aspect: "morphologicalTree" | "lexicalBreakdown";
				path: string;
			}[];
		}
	>();
	for (const [index, ownerReadingKey] of ownerReadingKeys.entries()) {
		const reading = readings[index];
		const lemma = lemmas[index];
		if (!reading || !lemma || !isUnitReadingFamily(lemma.family))
			return null;
		groups.set(ownerReadingKey, {
			reading: {
				readingId: reading._id,
				canonicalForm: lemma.canonicalForm,
				emojiDescription: reading.emojiDescription,
				target: {
					kind: "UnitReadingNote",
					readingId: reading._id,
				},
			},
			pendingRelations: [],
			structuralReferences: [],
		});
	}

	for (const row of pendingRows) {
		const projected = projectPendingRelations([row]);
		const pending = projected[0];
		const group = groups.get(row.sourceReadingKey);
		let pendingDescriptor: ShadowDescriptor;
		try {
			pendingDescriptor = pendingShadowDescriptor(row.record);
		} catch {
			return null;
		}
		if (
			projected.length !== 1 ||
			!pending ||
			!group ||
			pending.target.shadowId !== shadowId ||
			!shadowIsCompatible(shadow, pendingDescriptor)
		) {
			return null;
		}
		group.pendingRelations.push({
			locatorKey: pending.locatorKey,
			relation: pending.relation,
		});
	}

	for (const row of structuralRows) {
		const group = groups.get(row.ownerReadingKey);
		const index = ownerIndex.get(row.ownerReadingKey);
		const knowledge = index === undefined ? null : accumulated[index];
		if (
			!group ||
			!knowledge ||
			row.locatorKey !==
				structuralShadowLocatorKey(
					row.ownerReadingKey,
					row.aspect,
					row.path,
				)
		) {
			return null;
		}
		let matchingReference: ShadowDescriptor | null;
		try {
			matchingReference = collectStructuralReferenceAt(
				knowledge.knowledge,
				row.aspect,
				row.path,
			);
		} catch {
			return null;
		}
		if (
			!matchingReference ||
			!shadowIsCompatible(shadow, matchingReference)
		) {
			return null;
		}
		group.structuralReferences.push({
			aspect: row.aspect,
			path: row.path,
		});
	}

	return {
		kind: "ShadowNote" as const,
		target: { kind: "ShadowNote" as const, shadowId: shadow._id },
		descriptor,
		inspection: await loadShadowInspection(ctx, descriptor),
		references: {
			page: [...groups.values()].map((group) => ({
				...group,
				pendingRelations: group.pendingRelations.sort((left, right) =>
					left.locatorKey.localeCompare(right.locatorKey),
				),
				structuralReferences: group.structuralReferences.sort(
					(left, right) =>
						`${left.aspect}:${left.path}`.localeCompare(
							`${right.aspect}:${right.path}`,
						),
				),
			})),
			continueCursor,
			isDone,
		},
	};
}

function collectStructuralReferenceAt(
	knowledge: unknown,
	aspect: "morphologicalTree" | "lexicalBreakdown",
	path: string,
) {
	const references = collectStructuralShadowReferences(knowledge);
	return (
		references.find(
			(reference) =>
				reference.aspect === aspect && reference.path === path,
		)?.descriptor ?? null
	);
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

export async function loadTextFocus(
	ctx: QueryCtx,
	textId: Id<"texts">,
	requestedAttestationId?: string,
) {
	if (!requestedAttestationId) return { kind: "None" as const };
	const attestationId = ctx.db.normalizeId(
		"attestations",
		requestedAttestationId,
	);
	if (!attestationId) {
		return {
			kind: "Missing" as const,
			requestedAttestationId,
		};
	}
	const attestation = await ctx.db.get(attestationId);
	if (!attestation) {
		return {
			kind: "Missing" as const,
			requestedAttestationId,
		};
	}
	const members = await loadCompleteOccurrenceMembers(ctx, attestationId);
	if (!members) {
		return {
			kind: "Missing" as const,
			requestedAttestationId,
		};
	}
	const sentence = await ctx.db.get(members.sentenceId);
	if (!sentence || sentence.textId !== textId) {
		return {
			kind: "Missing" as const,
			requestedAttestationId,
		};
	}
	return {
		kind: "Occurrence" as const,
		attestationId,
		sentenceId: sentence._id,
		memberSegmentIndices: members.memberSegmentIndices,
	};
}

async function loadCompleteOccurrenceMembers(
	ctx: QueryCtx,
	attestationId: Id<"attestations">,
): Promise<{
	readonly sentenceId: Id<"sentences">;
	readonly memberSegmentIndices: number[];
} | null> {
	const segments = await ctx.db
		.query("segments")
		.withIndex("by_attestation_id", (q) =>
			q.eq("attestationMembership.attestationId", attestationId),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE + 1);
	if (segments.length === 0) return null;
	if (segments.length > MAX_SEGMENTS_PER_SENTENCE) {
		throw new Error("Occurrence Attestation has too many members.");
	}
	const sentenceId = segments[0]?.sentenceId;
	if (
		!sentenceId ||
		segments.some((segment) => segment.sentenceId !== sentenceId)
	) {
		return null;
	}
	return {
		sentenceId,
		memberSegmentIndices: segments
			.map(({ index }) => index)
			.sort((left, right) => left - right),
	};
}

function projectReadingIdentities(
	reading: {
		_id: Id<"readings">;
		readingKey: string;
		emojiDescription: string;
	},
	lemma: {
		lemmaKey: string;
		language: string;
		family: string;
		kind: string;
		canonicalForm: string;
		coreFeatures: unknown;
	},
) {
	return {
		reading: {
			ownerKind: "Reading" as const,
			ownerKey: reading.readingKey,
			readingId: reading._id,
			canonicalForm: lemma.canonicalForm,
			emojiDescription: reading.emojiDescription,
		},
		lemma: {
			ownerKind: "Lemma" as const,
			ownerKey: lemma.lemmaKey,
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: projectFeaturesForPresentation(lemma.coreFeatures),
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
			surfaceFeatures: projectFeaturesForPresentation(
				surface.surfaceFeatures,
			),
			inflectionalFeatures: projectFeaturesForPresentation(
				surface.inflectionalFeatures,
			),
		},
	};
}

function projectPendingRelations(
	rows: readonly {
		locatorKey: string;
		sourceReadingKey: string;
		targetCanonicalForm: string;
		shadowId?: Id<"shadows">;
		record: unknown;
	}[],
): PendingRelationProjection[] {
	return rows.flatMap((row) => {
		const { locatorKey, shadowId, record: recordValue } = row;
		const record = optionalRecord(recordValue);
		const pending = optionalRecord(record?.pending);
		const locator = optionalRecord(record?.locator);
		const target = optionalRecord(pending?.target);
		const relation = pending?.relation;
		const targetCanonicalForm = optionalNonEmptyString(
			target?.canonicalForm,
		);
		const targetFamily = optionalNonEmptyString(target?.family);
		const targetKind = optionalNonEmptyString(target?.kind);
		return isSemanticRelation(relation) &&
			shadowId &&
			locator?.sourceReadingKey === row.sourceReadingKey &&
			locator.relation === relation &&
			typeof locator.targetPendingId === "string" &&
			locatorKey ===
				JSON.stringify([
					row.sourceReadingKey,
					relation,
					locator.targetPendingId,
				]) &&
			row.targetCanonicalForm === targetCanonicalForm &&
			targetCanonicalForm &&
			targetFamily &&
			targetKind
			? [
					{
						locatorKey,
						relation,
						targetCanonicalForm,
						targetFamily,
						targetKind,
						target: {
							kind: "ShadowNote",
							shadowId,
						},
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
