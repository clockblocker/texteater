import { readingFingerprint } from "dumling";
import { readingSchema } from "dumling/schema";
import {
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticRelationSchema,
} from "dumrel";
import type {
	DumdictReadingDraft,
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
	SurfaceEntry,
} from "../dto";
import {
	type EntityKind,
	inspectDumlingId,
	type Lemma,
	makeSurfaceId,
	type SupportedLanguage,
} from "../dumling";
import { DumdictLanguageMismatchError } from "../public";
import { getDumdictSchemasFor } from "../schema";
import type {
	CleanupRelationsSlice,
	NewNoteSlice,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../storage";
import { lemmaFingerprint, sameLemma, sameReading } from "./identity";

function assertLanguage(
	expected: SupportedLanguage,
	actual: SupportedLanguage | undefined,
) {
	if (actual !== expected)
		throw new DumdictLanguageMismatchError({
			expectedLanguage: expected,
			actualLanguage: actual,
		});
}

function assertNoDuplicates(values: string[], context: string) {
	if (new Set(values).size !== values.length)
		throw new Error(`${context} contains duplicates.`);
}

function locatorKey<L extends SupportedLanguage>(
	record: PendingSemanticRelationRecord<L>,
) {
	const { sourceReadingKey, relation, targetPendingId } = record.locator;
	return `${sourceReadingKey}\0${relation}\0${targetPendingId}`;
}

function validateLemmaRecord<L extends SupportedLanguage>(
	expected: L,
	record: LemmaRecord<L>,
) {
	getDumdictSchemasFor(expected).lemmaRecordSchema.parse(record);
	assertLanguage(expected, record.lemma.language);
}

function validateReading<L extends SupportedLanguage>(
	expected: L,
	reading: Reading<L>,
) {
	readingSchema.parse(reading);
	assertLanguage(expected, reading.lemma.language);
	if (
		reading.emojiDescription.trim().normalize("NFC") !==
		reading.emojiDescription
	)
		throw new Error(
			"Reading emoji description must use NFC normalization.",
		);
}

function validateReadingEntry<L extends SupportedLanguage>(
	expected: L,
	entry: ReadingEntry<L>,
) {
	getDumdictSchemasFor(expected).readingEntrySchema.parse(entry);
	validateReading(expected, entry.reading);
	if (entry.knowledge !== undefined) {
		readingKnowledgeSchema.parse(entry.knowledge);
		for (const targets of Object.values(
			entry.knowledge.semanticRelations ?? {},
		)) {
			for (const target of targets ?? []) {
				validateLemmaRecord(expected, { lemma: target });
				if (sameLemma(entry.reading.lemma, target))
					throw new Error(
						"Reading Knowledge contains a direct same-Lemma relation.",
					);
			}
		}
	}
}

function validateSurfaceEntry<L extends SupportedLanguage>(
	expected: L,
	entry: SurfaceEntry<L>,
) {
	getDumdictSchemasFor(expected).surfaceEntrySchema.parse(entry);
	assertLanguage(expected, entry.surface.language);
	assertLanguage(expected, entry.surface.lemma.language);
	const inspected = inspectDumlingId(entry.id);
	assertLanguage(expected, inspected?.language);
	if (inspected?.kind !== ("Surface" satisfies EntityKind))
		throw new Error("surface entry id must be a Surface id.");
	if (entry.id !== makeSurfaceId(expected, entry.surface))
		throw new Error("surface entry id does not match its derived id.");
	if (!sameLemma(entry.ownerLemma, entry.surface.lemma))
		throw new Error(
			"surface owner Lemma does not match the realized Lemma.",
		);
}

function validatePendingRecord<L extends SupportedLanguage>(
	expected: L,
	record: PendingSemanticRelationRecord<L>,
) {
	getDumdictSchemasFor(expected).pendingSemanticRelationRecordSchema.parse(
		record,
	);
	validateReading(expected, record.sourceReading);
	const parsed = pendingSemanticRelationSchema.parse(record.pending);
	assertLanguage(expected, parsed.target.language);
	if (parsed.target.language !== record.sourceReading.lemma.language)
		throw new Error(
			"Pending Semantic Relation endpoints must use the same language.",
		);
	semanticRelationSchema.parse(record.locator.relation);
	if (
		record.locator.sourceReadingKey !==
		readingFingerprint(record.sourceReading)
	)
		throw new Error(
			"Pending Semantic Relation locator has the wrong source Reading key.",
		);
	if (record.locator.relation !== parsed.relation)
		throw new Error(
			"Pending Semantic Relation locator has the wrong relation.",
		);
}

function validateRelationInventory<L extends SupportedLanguage>(
	expected: L,
	lemmas: LemmaRecord<L>[],
	readings: ReadingEntry<L>[],
) {
	for (const record of lemmas) validateLemmaRecord(expected, record);
	for (const entry of readings) validateReadingEntry(expected, entry);
	assertNoDuplicates(
		lemmas.map(({ lemma }) => lemmaFingerprint(lemma)),
		"relation Lemma inventory",
	);
	assertNoDuplicates(
		readings.map(({ reading }) => readingFingerprint(reading)),
		"relation Reading inventory",
	);
	const lemmaKeys = new Set(
		lemmas.map(({ lemma }) => lemmaFingerprint(lemma)),
	);
	for (const entry of readings) {
		if (!lemmaKeys.has(lemmaFingerprint(entry.reading.lemma)))
			throw new Error(
				"relation Reading inventory references an unstored owner Lemma.",
			);
		for (const targets of Object.values(
			entry.knowledge?.semanticRelations ?? {},
		)) {
			for (const target of targets ?? []) {
				if (!lemmaKeys.has(lemmaFingerprint(target)))
					throw new Error(
						"relation Reading inventory references an unstored target Lemma.",
					);
			}
		}
	}
}

export function validateStoredReadingsSlice<L extends SupportedLanguage>(
	expected: L,
	slice: StoredReadingsSlice<L>,
	requestedLemma?: Lemma<L>,
) {
	for (const candidate of slice.candidates) {
		validateReadingEntry(expected, candidate.reading);
		validateLemmaRecord(expected, candidate.lemma);
		if (!sameLemma(candidate.reading.reading.lemma, candidate.lemma.lemma))
			throw new Error(
				"stored Reading does not reference its candidate Lemma.",
			);
		if (requestedLemma && !sameLemma(candidate.lemma.lemma, requestedLemma))
			throw new Error(
				"stored Reading candidate does not match the requested Lemma identity.",
			);
	}
}

export function validateReadingPatchSlice<L extends SupportedLanguage>(
	expected: L,
	slice: ReadingPatchSlice<L>,
	requested?: Reading<L>,
) {
	if (!slice.reading) return;
	validateReadingEntry(expected, slice.reading);
	if (requested && !sameReading(slice.reading.reading, requested))
		throw new Error(
			"reading patch slice does not match the requested Reading.",
		);
}

export function validateNewNoteSlice<L extends SupportedLanguage>(
	expected: L,
	slice: NewNoteSlice<L>,
	draft?: DumdictReadingDraft<L>,
) {
	if (draft) {
		validateReading(expected, draft.reading);
		for (const relation of draft.relations ?? []) {
			if (relation.target.kind === "pending")
				pendingSemanticRelationSchema.parse(relation.target.pending);
			else if ("relation" in relation)
				semanticRelationSchema.parse(relation.relation);
		}
	}
	if (slice.existingLemma) {
		validateLemmaRecord(expected, slice.existingLemma);
		if (draft && !sameLemma(slice.existingLemma.lemma, draft.reading.lemma))
			throw new Error(
				"existing Lemma does not match the draft identity.",
			);
	}
	if (slice.existingReading) {
		validateReadingEntry(expected, slice.existingReading);
		if (draft && !sameReading(slice.existingReading.reading, draft.reading))
			throw new Error(
				"existing Reading does not match the draft identity.",
			);
	}
	for (const entry of slice.existingOwnedSurfaces)
		validateSurfaceEntry(expected, entry);
	for (const entry of slice.explicitExistingLemmaTargets)
		validateLemmaRecord(expected, entry);
	for (const record of slice.existingPendingRelationsForProposedPendingTargets)
		validatePendingRecord(expected, record);
	for (const record of slice.pendingRelationsMatchingProposedLemma)
		validatePendingRecord(expected, record);
	validateRelationInventory(
		expected,
		slice.relationLemmas,
		slice.relationReadings,
	);
}

export function validateRelationsCleanupInfoSlice<L extends SupportedLanguage>(
	expected: L,
	slice: RelationsCleanupInfoSlice<L>,
	requestedCanonicalForm?: string,
) {
	if (
		requestedCanonicalForm !== undefined &&
		slice.canonicalForm !== requestedCanonicalForm
	)
		throw new Error(
			"relations cleanup slice canonical form does not match the request.",
		);
	for (const record of slice.candidateLemmas) {
		validateLemmaRecord(expected, record);
		if (
			requestedCanonicalForm !== undefined &&
			record.lemma.canonicalForm !== requestedCanonicalForm
		)
			throw new Error(
				"relations cleanup candidate Lemma has a different canonical form.",
			);
	}
	for (const record of slice.pendingRelations) {
		validatePendingRecord(expected, record);
		if (
			requestedCanonicalForm !== undefined &&
			record.pending.target.canonicalForm !== requestedCanonicalForm
		)
			throw new Error(
				"pending Unit Shadow has a different canonical form.",
			);
	}
	assertNoDuplicates(
		slice.pendingRelations.map(locatorKey),
		"pending Semantic Relations",
	);
}

export function validateCleanupRelationsSlice<L extends SupportedLanguage>(
	expected: L,
	slice: CleanupRelationsSlice<L>,
) {
	for (const record of slice.pendingRelations)
		validatePendingRecord(expected, record);
	assertNoDuplicates(
		slice.pendingRelations.map(locatorKey),
		"pending Semantic Relations",
	);
	validateRelationInventory(
		expected,
		slice.relationLemmas,
		slice.relationReadings,
	);
}
