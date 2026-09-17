import { v } from "convex/values";
import { createPendingSemanticRelationRecord } from "dumdict/pending";
import { makeSurfaceId } from "dumdict/runtime";
import type { Doc, Id } from "../convex/_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	query,
} from "../convex/_generated/server";
import { ensureInlineDefinitionText } from "../convex/model/definitionTexts";
import { pendingRecordLocatorIndexKey } from "../convex/model/dumdictPendingIndexes";
import { requireRecord } from "../convex/model/readingKnowledge";
import { shadowKeyFor } from "../convex/model/shadows";
import { ensureVisitorEncounter } from "../convex/model/visitorClicks";
import {
	loadUnitReadingNote,
	readingNoteValidator,
} from "../convex/modules/notes/readingNote";
import { persistSubmittedText } from "../convex/modules/text/submission";
import {
	makeUrl,
	NOTE_STUDY_DATABASE,
	NOTE_STUDY_DATABASE_BY_URL,
	NOTE_STUDY_PENDING_RELATIONS,
	NOTE_STUDY_RELATED_DATABASE,
	NOTE_STUDY_RESOLVED_RELATIONS,
	NOTE_STUDY_VISITOR_ID,
	type NoteStudyDatabaseUnit,
	storedRelation,
} from "../shared/notes-study/note-study-dummy-database";
import {
	consolidateExampleTexts,
	proseSegments,
} from "./playground-example-collection";

const listItemValidator = v.object({
	path: v.string(),
	readingKey: v.string(),
	readingId: v.id("readings"),
	canonicalForm: v.string(),
	emojiDescription: v.string(),
	family: v.string(),
	kind: v.string(),
});

const NOTE_STUDY_KNOWLEDGE_UPDATED_AT = Date.UTC(2026, 8, 4);

/**
 * Kinds whose Surfaces carry inflection need the key present even when it
 * is null; Dumling rejects a missing key for them.
 */
function inflectionalFeaturesOf(
	value: NoteStudyDatabaseUnit["citationSurface"],
) {
	return "inflectionalFeatures" in value
		? { inflectionalFeatures: value.inflectionalFeatures ?? null }
		: {};
}

async function ensureInflectionalFeatures(
	ctx: MutationCtx,
	surface: Doc<"surfaces">,
	value: NoteStudyDatabaseUnit["citationSurface"],
) {
	const expected = inflectionalFeaturesOf(value);
	if (
		"inflectionalFeatures" in expected &&
		surface.inflectionalFeatures === undefined
	) {
		await ctx.db.patch(surface._id, expected);
	}
}

async function ensureUnit(ctx: MutationCtx, unit: NoteStudyDatabaseUnit) {
	let lemma = await ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", unit.lemmaKey))
		.unique();
	if (!lemma) {
		const value = unit.reading.lemma;
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: unit.lemmaKey,
			language: value.language,
			family: value.family,
			kind: value.kind,
			canonicalForm: value.canonicalForm,
			coreFeatures: value.coreFeatures,
		});
		lemma = await ctx.db.get(lemmaId);
		if (!lemma) throw new Error("Failed to create Notes Study Lemma.");
	}
	const dictionaryLemma = await ctx.db
		.query("dictionaryLemmas")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
		.unique();
	if (!dictionaryLemma) {
		await ctx.db.insert("dictionaryLemmas", { lemmaId: lemma._id });
	}

	let reading = await ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) => q.eq("readingKey", unit.readingKey))
		.unique();
	if (!reading) {
		const readingId = await ctx.db.insert("readings", {
			readingKey: unit.readingKey,
			lemmaId: lemma._id,
			emojiDescription: unit.reading.emojiDescription,
		});
		reading = await ctx.db.get(readingId);
		if (!reading) throw new Error("Failed to create Notes Study Reading.");
	}
	const readingEntry = await ctx.db
		.query("readingEntries")
		.withIndex("by_reading_id", (q) => q.eq("readingId", reading._id))
		.unique();
	if (readingEntry) {
		await ctx.db.patch(readingEntry._id, {
			record: {
				attestedTranslations: [],
				notes: "",
				...requireRecord(
					readingEntry.record,
					"Notes Study Reading Entry",
				),
				knowledge: unit.knowledge,
			},
		});
	} else {
		await ctx.db.insert("readingEntries", {
			readingId: reading._id,
			record: {
				attestedTranslations: [],
				notes: "",
				knowledge: unit.knowledge,
			},
		});
	}
	const accumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", unit.readingKey),
		)
		.unique();
	if (accumulated) {
		await ctx.db.patch(accumulated._id, {
			knowledge: unit.knowledge,
			status: "Full",
			coveredTranslationLanguages: ["en", "ru"],
			updatedAt: NOTE_STUDY_KNOWLEDGE_UPDATED_AT,
		});
	} else {
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: unit.readingKey,
			knowledge: unit.knowledge,
			status: "Full",
			coveredTranslationLanguages: ["en", "ru"],
			updatedAt: NOTE_STUDY_KNOWLEDGE_UPDATED_AT,
		});
	}
	await ensureInlineDefinitionText(ctx, {
		ownerReadingKey: unit.readingKey,
		knowledge: unit.knowledge,
		language: "de",
		segment: proseSegments,
	});
	const personalAnnotation = await ctx.db
		.query("personalAnnotations")
		.withIndex("by_visitor_id_and_reading_id", (q) =>
			q
				.eq("visitorId", NOTE_STUDY_VISITOR_ID)
				.eq("readingId", reading._id),
		)
		.unique();
	const personalAnnotationValue = {
		visitorId: NOTE_STUDY_VISITOR_ID,
		readingId: reading._id,
		text: unit.personalAnnotation,
		updatedAt: NOTE_STUDY_KNOWLEDGE_UPDATED_AT,
	};
	if (unit.personalAnnotation && personalAnnotation) {
		await ctx.db.replace(personalAnnotation._id, personalAnnotationValue);
	} else if (unit.personalAnnotation) {
		await ctx.db.insert("personalAnnotations", personalAnnotationValue);
	} else if (personalAnnotation) {
		await ctx.db.delete(personalAnnotation._id);
	}

	const surfaceKey = makeSurfaceId("de", unit.citationSurface);
	let surface = await ctx.db
		.query("surfaces")
		.withIndex("by_surface_key", (q) => q.eq("surfaceKey", surfaceKey))
		.unique();
	if (!surface) {
		const value = unit.citationSurface;
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey,
			lemmaId: lemma._id,
			language: value.language,
			normalizedSurface: value.normalizedSurface,
			spelling: value.spelling,
			surfaceFeatures: value.surfaceFeatures,
			...inflectionalFeaturesOf(value),
		});
		surface = await ctx.db.get(surfaceId);
		if (!surface) throw new Error("Failed to create Notes Study Surface.");
	} else {
		await ensureInflectionalFeatures(ctx, surface, unit.citationSurface);
	}
	const ownedSurface = await ctx.db
		.query("ownedSurfaces")
		.withIndex("by_surface_id", (q) => q.eq("surfaceId", surface._id))
		.unique();
	if (!ownedSurface) {
		await ctx.db.insert("ownedSurfaces", {
			surfaceId: surface._id,
			record: { attestedTranslations: [], notes: "" },
		});
	}
	for (const value of unit.presentationSurfaces) {
		const presentationSurfaceKey = makeSurfaceId("de", value);
		let presentationSurface = await ctx.db
			.query("surfaces")
			.withIndex("by_surface_key", (q) =>
				q.eq("surfaceKey", presentationSurfaceKey),
			)
			.unique();
		if (!presentationSurface) {
			const id = await ctx.db.insert("surfaces", {
				surfaceKey: presentationSurfaceKey,
				lemmaId: lemma._id,
				language: value.language,
				normalizedSurface: value.normalizedSurface,
				spelling: value.spelling,
				surfaceFeatures: value.surfaceFeatures,
				...inflectionalFeaturesOf(value),
			});
			presentationSurface = await ctx.db.get(id);
		} else {
			await ensureInflectionalFeatures(ctx, presentationSurface, value);
		}
		if (!presentationSurface) {
			throw new Error(
				"Failed to create Notes Study presentation Surface.",
			);
		}
		const owned = await ctx.db
			.query("ownedSurfaces")
			.withIndex("by_surface_id", (q) =>
				q.eq("surfaceId", presentationSurface._id),
			)
			.unique();
		if (!owned) {
			await ctx.db.insert("ownedSurfaces", {
				surfaceId: presentationSurface._id,
				record: {
					attestedTranslations: [],
					notes: "",
					presentationRole: "notes-study-form",
				},
			});
		}
	}
	return {
		lemmaId: lemma._id,
		readingId: reading._id,
		surfaceId: surface._id,
	};
}

async function ensureOccurrence(
	ctx: MutationCtx,
	unit: NoteStudyDatabaseUnit,
	ids: {
		lemmaId: Id<"lemmas">;
		readingId: Id<"readings">;
		surfaceId: Id<"surfaces">;
	},
	visible: boolean,
) {
	for (const [occurrenceIndex, occurrence] of unit.occurrences.entries()) {
		const sourceText = occurrence.segments.map(({ text }) => text).join("");
		const existingSentence = await ctx.db
			.query("sentences")
			.withIndex("by_segmented_sentence_id", (q) =>
				q.eq("segmentedSentenceId", occurrence.segmentedSentenceId),
			)
			.unique();
		if (existingSentence?.heading) continue;
		const persisted = existingSentence
			? {
					textId: existingSentence.textId,
					sentenceIds: [existingSentence._id],
				}
			: await persistSubmittedText(ctx, {
					submissionKey: occurrence.submissionKey,
					sourceText,
					sentences: [
						{
							segmentedSentenceId: occurrence.segmentedSentenceId,
							position: 0,
							language: "de",
							stitchedText: sourceText,
							segments: [...occurrence.segments],
						},
					],
				});
		const sentenceId = persisted.sentenceIds[0];
		if (!sentenceId)
			throw new Error("Notes Study sentence was not persisted.");
		const memberSegments = await Promise.all(
			occurrence.memberSegmentIndices.map((index) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentenceId).eq("index", index),
					)
					.unique(),
			),
		);
		if (memberSegments.some((segment) => !segment)) {
			throw new Error("Notes Study Attestation member is missing.");
		}
		let attestationId =
			memberSegments[0]?.attestationMembership?.attestationId;
		if (!attestationId) {
			const createdAttestationId = await ctx.db.insert("attestations", {
				surfaceId: ids.surfaceId,
				readingId: ids.readingId,
				realizationCoverage: occurrence.attestation.realizationCoverage,
			});
			await Promise.all(
				memberSegments.flatMap((segment) =>
					segment
						? [
								ctx.db.patch(segment._id, {
									attestationMembership: {
										attestationId: createdAttestationId,
										orthography: "Standard",
									},
								}),
							]
						: [],
				),
			);
			attestationId = createdAttestationId;
		}
		if (visible) {
			const clicked = memberSegments[0];
			if (!clicked) continue;
			await ensureVisitorEncounter(ctx, {
				requestId: `${occurrence.submissionKey}:encounter:${occurrenceIndex}`,
				visitorId: NOTE_STUDY_VISITOR_ID,
				textId: persisted.textId,
				sentenceId,
				segmentId: clicked._id,
				attestationId,
			});
		}
	}
}

export const load = internalMutation({
	args: {},
	returns: v.object({
		primaryReadings: v.number(),
		relatedReadings: v.number(),
		resolvedRelations: v.number(),
		pendingRelations: v.number(),
	}),
	handler: async (ctx) => {
		const idsByReadingKey = new Map<
			string,
			Awaited<ReturnType<typeof ensureUnit>>
		>();
		for (const unit of [
			...NOTE_STUDY_DATABASE,
			...NOTE_STUDY_RELATED_DATABASE,
		]) {
			const ids = await ensureUnit(ctx, unit);
			idsByReadingKey.set(unit.readingKey, ids);
			await ensureOccurrence(
				ctx,
				unit,
				ids,
				NOTE_STUDY_DATABASE.includes(unit),
			);
		}

		const storedRelations = NOTE_STUDY_RESOLVED_RELATIONS.map(
			(relation) => ({
				stored: storedRelation(relation),
			}),
		);
		const targetLemmas = await Promise.all(
			storedRelations.map(({ stored }) =>
				ctx.db
					.query("lemmas")
					.withIndex("by_lemma_key", (q) =>
						q.eq("lemmaKey", stored.targetLemmaKey),
					)
					.unique(),
			),
		);
		const resolvedRelations = storedRelations.flatMap(
			({ stored }, index) => {
				const source = idsByReadingKey.get(stored.sourceReadingKey);
				const targetLemma = targetLemmas[index];
				return source && targetLemma
					? [{ stored, source, targetLemma }]
					: [];
			},
		);
		const existingEdges = await Promise.all(
			resolvedRelations.map(({ stored, source, targetLemma }) =>
				ctx.db
					.query("semanticRelationEdges")
					.withIndex(
						"by_source_reading_id_and_relation_and_target_lemma_id",
						(q) =>
							q
								.eq("sourceReadingId", source.readingId)
								.eq("relation", stored.relation)
								.eq("targetLemmaId", targetLemma._id),
					)
					.unique(),
			),
		);
		await Promise.all(
			resolvedRelations.flatMap(
				({ stored, source, targetLemma }, index) =>
					existingEdges[index]
						? []
						: [
								ctx.db.insert("semanticRelationEdges", {
									sourceReadingId: source.readingId,
									targetKind: "lemma",
									targetLemmaId: targetLemma._id,
									relation: stored.relation,
								}),
							],
			),
		);

		for (const pending of NOTE_STUDY_PENDING_RELATIONS) {
			if (pending.target.language !== "de")
				throw new Error("Expected German fixture target.");
			const shadowKey = shadowKeyFor(pending.target);
			let shadow = await ctx.db
				.query("shadows")
				.withIndex("by_shadow_key", (q) => q.eq("shadowKey", shadowKey))
				.unique();
			if (!shadow) {
				const shadowId = await ctx.db.insert("shadows", {
					shadowKey,
					...pending.target,
				});
				shadow = await ctx.db.get(shadowId);
			}
			if (!shadow)
				throw new Error("Failed to create Notes Study Shadow.");
			const source = NOTE_STUDY_DATABASE.find(
				(unit) => unit.readingKey === pending.sourceReadingKey,
			);
			if (!source)
				throw new Error("Missing Notes Study pending relation source.");
			const record = createPendingSemanticRelationRecord(source.reading, {
				relation: pending.relation,
				target: { ...pending.target, language: "de" },
			});
			const locatorKey = pendingRecordLocatorIndexKey(record);
			const existing = await ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_locator_key", (q) =>
					q.eq("locatorKey", locatorKey),
				)
				.unique();
			if (!existing) {
				await ctx.db.insert("pendingSemanticRelations", {
					locatorKey,
					sourceReadingKey: pending.sourceReadingKey,
					targetCanonicalForm: pending.target.canonicalForm,
					shadowId: shadow._id,
					record,
				});
			}
		}

		return {
			primaryReadings: NOTE_STUDY_DATABASE.length,
			relatedReadings: NOTE_STUDY_RELATED_DATABASE.length,
			resolvedRelations: NOTE_STUDY_RESOLVED_RELATIONS.length,
			pendingRelations: NOTE_STUDY_PENDING_RELATIONS.length,
		};
	},
});

export const list = query({
	args: {},
	returns: v.array(listItemValidator),
	handler: async (ctx) => {
		const rows = await Promise.all(
			NOTE_STUDY_DATABASE.map(async (unit) => {
				const reading = await ctx.db
					.query("readings")
					.withIndex("by_reading_key", (q) =>
						q.eq("readingKey", unit.readingKey),
					)
					.unique();
				const lemma = reading
					? await ctx.db.get(reading.lemmaId)
					: null;
				return reading && lemma
					? {
							path: makeUrl(unit.reading),
							readingKey: unit.readingKey,
							readingId: reading._id,
							canonicalForm: lemma.canonicalForm,
							emojiDescription: reading.emojiDescription,
							family: lemma.family,
							kind: lemma.kind,
						}
					: null;
			}),
		);
		return rows.flatMap((row) => (row ? [row] : []));
	},
});

export const get = query({
	args: { path: v.string() },
	returns: v.union(v.null(), readingNoteValidator),
	handler: async (ctx, { path }) => {
		const unit = NOTE_STUDY_DATABASE_BY_URL.get(path);
		if (!unit) return null;
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", unit.readingKey),
			)
			.unique();
		return reading
			? loadUnitReadingNote(ctx, reading._id, NOTE_STUDY_VISITOR_ID)
			: null;
	},
});

const playgroundEntryValidator = v.object({
	readingKey: v.string(),
	canonicalForm: v.string(),
	emojiDescription: v.string(),
	family: v.string(),
	kind: v.string(),
	readingId: v.id("readings"),
	lemmaId: v.id("lemmas"),
	normalizedSurface: v.string(),
	attestationId: v.union(v.null(), v.id("attestations")),
});

const playgroundShadowValidator = v.object({
	shadowId: v.id("shadows"),
	canonicalForm: v.string(),
});

/** Dev-only: every Note target the Notes Study fake db can open. */
export const playground = query({
	args: {},
	returns: v.object({
		visitorId: v.string(),
		entries: v.array(playgroundEntryValidator),
		shadows: v.array(playgroundShadowValidator),
	}),
	handler: async (ctx) => {
		const entries = await Promise.all(
			NOTE_STUDY_DATABASE.map(async (unit) => {
				const reading = await ctx.db
					.query("readings")
					.withIndex("by_reading_key", (q) =>
						q.eq("readingKey", unit.readingKey),
					)
					.unique();
				if (!reading) return null;
				const lemma = await ctx.db.get(reading.lemmaId);
				if (!lemma) return null;
				const attestation = await ctx.db
					.query("attestations")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", reading._id),
					)
					.first();
				return {
					readingKey: unit.readingKey,
					canonicalForm: lemma.canonicalForm,
					emojiDescription: reading.emojiDescription,
					family: lemma.family,
					kind: lemma.kind,
					readingId: reading._id,
					lemmaId: lemma._id,
					normalizedSurface: unit.citationSurface.normalizedSurface,
					attestationId: attestation?._id ?? null,
				};
			}),
		);
		const shadowKeys = [
			...new Set(
				NOTE_STUDY_PENDING_RELATIONS.map((pending) =>
					shadowKeyFor(pending.target),
				),
			),
		];
		const shadows = await Promise.all(
			shadowKeys.map((shadowKey) =>
				ctx.db
					.query("shadows")
					.withIndex("by_shadow_key", (q) =>
						q.eq("shadowKey", shadowKey),
					)
					.unique(),
			),
		);
		return {
			visitorId: NOTE_STUDY_VISITOR_ID,
			entries: entries.flatMap((entry) => (entry ? [entry] : [])),
			shadows: shadows.flatMap((shadow) =>
				shadow
					? [
							{
								shadowId: shadow._id,
								canonicalForm: shadow.canonicalForm,
							},
						]
					: [],
			),
		};
	},
});

export const consolidateExamples = internalMutation({
	args: {},
	returns: v.object({
		textId: v.id("texts"),
		cases: v.number(),
		movedTexts: v.number(),
	}),
	handler: (ctx) => consolidateExampleTexts(ctx),
});
