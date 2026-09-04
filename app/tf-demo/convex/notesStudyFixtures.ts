import { v } from "convex/values";
import { dumling } from "dumling";

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
} from "../src/playground/notes-study/note-study-dummy-database";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx, query } from "./_generated/server";
import { shadowKeyFor } from "./model/shadows";
import { ensureVisitorEncounter } from "./model/visitorClicks";
import {
	loadUnitReadingNote,
	readingNoteValidator,
} from "./modules/notes/readingNote";
import { persistSubmittedText } from "./modules/text/submission";

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
			record: { knowledge: unit.knowledge },
		});
	} else {
		await ctx.db.insert("readingEntries", {
			readingId: reading._id,
			record: { knowledge: unit.knowledge },
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
			updatedAt: NOTE_STUDY_KNOWLEDGE_UPDATED_AT,
		});
	} else {
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: unit.readingKey,
			knowledge: unit.knowledge,
			status: "Full",
			updatedAt: NOTE_STUDY_KNOWLEDGE_UPDATED_AT,
		});
	}

	const surfaceKey = dumling.de.id.encode.asCsv(unit.citationSurface);
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
			surfaceKind: value.surfaceKind,
			surfaceFeatures: value.surfaceFeatures,
		});
		surface = await ctx.db.get(surfaceId);
		if (!surface) throw new Error("Failed to create Notes Study Surface.");
	}
	const ownedSurface = await ctx.db
		.query("ownedSurfaces")
		.withIndex("by_surface_id", (q) => q.eq("surfaceId", surface._id))
		.unique();
	if (!ownedSurface) {
		await ctx.db.insert("ownedSurfaces", {
			surfaceId: surface._id,
			record: {},
		});
	}
	for (const value of unit.presentationSurfaces) {
		const presentationSurfaceKey = dumling.de.id.encode.asCsv(value);
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
				surfaceKind: value.surfaceKind,
				surfaceFeatures: value.surfaceFeatures,
			});
			presentationSurface = await ctx.db.get(id);
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
				record: { presentationRole: "notes-study-form" },
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
		const persisted = await persistSubmittedText(ctx, {
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
			attestationId = await ctx.db.insert("attestations", {
				surfaceId: ids.surfaceId,
				readingId: ids.readingId,
				realizationCoverage: occurrence.attestation.realizationCoverage,
			});
			for (const segment of memberSegments) {
				if (!segment) continue;
				await ctx.db.patch(segment._id, {
					attestationMembership: {
						attestationId,
						orthography: "Standard",
					},
				});
			}
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

		for (const relation of NOTE_STUDY_RESOLVED_RELATIONS) {
			const stored = storedRelation(relation);
			const source = idsByReadingKey.get(stored.sourceReadingKey);
			const targetLemma = await ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", stored.targetLemmaKey),
				)
				.unique();
			if (!source || !targetLemma) continue;
			const existing = await ctx.db
				.query("semanticRelationEdges")
				.withIndex(
					"by_source_reading_id_and_relation_and_target_lemma_id",
					(q) =>
						q
							.eq("sourceReadingId", source.readingId)
							.eq("relation", stored.relation)
							.eq("targetLemmaId", targetLemma._id),
				)
				.unique();
			if (!existing) {
				await ctx.db.insert("semanticRelationEdges", {
					sourceReadingId: source.readingId,
					targetKind: "lemma",
					targetLemmaId: targetLemma._id,
					relation: stored.relation,
				});
			}
		}

		for (const [
			pendingIndex,
			pending,
		] of NOTE_STUDY_PENDING_RELATIONS.entries()) {
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
			const targetPendingId = `notes-study:${pendingIndex}`;
			const locatorKey = JSON.stringify([
				pending.sourceReadingKey,
				pending.relation,
				targetPendingId,
			]);
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
					record: {
						locator: {
							sourceReadingKey: pending.sourceReadingKey,
							relation: pending.relation,
							targetPendingId,
						},
						pending: {
							relation: pending.relation,
							target: pending.target,
						},
					},
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
