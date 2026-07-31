import type {
	DumdictReadingDraft,
	LemmaRecord,
	PendingEntryRef,
	PendingEntryRelation,
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
import type {
	CleanupRelationsSlice,
	NewNoteSlice,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../storage";
import { lemmaKey, readingKey, sameLemma, sameReading } from "./identity";
import { derivePendingEntryId, makePendingEntryRef } from "./pending/identity";
import { relationFamilyFor } from "./relations/rules";

function assertLanguage(
	expectedLanguage: SupportedLanguage,
	actualLanguage: SupportedLanguage | undefined,
) {
	if (actualLanguage !== expectedLanguage) {
		throw new DumdictLanguageMismatchError({
			expectedLanguage,
			actualLanguage,
		});
	}
}

function assertDumlingId(
	expectedLanguage: SupportedLanguage,
	expectedKind: EntityKind,
	id: string,
	context: string,
) {
	const inspected = inspectDumlingId(id);
	assertLanguage(expectedLanguage, inspected?.language);
	if (inspected?.kind !== expectedKind) {
		throw new Error(`${context} must be a ${expectedKind} id.`);
	}
}

function assertEqualId(actual: string, expected: string, context: string) {
	if (actual !== expected) {
		throw new Error(`${context} does not match its derived id.`);
	}
}

function assertNoDuplicates(values: string[], context: string) {
	if (new Set(values).size !== values.length) {
		throw new Error(`${context} contains duplicates.`);
	}
}

function validateLemma(
	expectedLanguage: SupportedLanguage,
	lemma: { language: SupportedLanguage },
) {
	assertLanguage(expectedLanguage, lemma.language);
}

function validateLemmaRecord<L extends SupportedLanguage>(
	expectedLanguage: L,
	record: LemmaRecord<L>,
) {
	validateLemma(expectedLanguage, record.lemma);
	for (const targets of Object.values(record.morphologicalRelations)) {
		for (const target of targets ?? []) {
			validateLemma(expectedLanguage, target);
		}
	}
}

function validateReading<L extends SupportedLanguage>(
	expectedLanguage: L,
	reading: Reading<L>,
) {
	validateLemma(expectedLanguage, reading.lemma);
	if (!reading.emojiDescription.trim()) {
		throw new Error("Reading emoji description must not be empty.");
	}
	if (
		reading.emojiDescription.normalize("NFC") !== reading.emojiDescription
	) {
		throw new Error(
			"Reading emoji description must use NFC normalization.",
		);
	}
}

function validateReadingEntry<L extends SupportedLanguage>(
	expectedLanguage: L,
	entry: ReadingEntry<L>,
) {
	validateReading(expectedLanguage, entry.reading);
	for (const targets of Object.values(entry.lexicalRelations)) {
		for (const target of targets ?? []) {
			validateReading(expectedLanguage, target);
		}
	}
}

function validateSurfaceEntry<L extends SupportedLanguage>(
	expectedLanguage: L,
	entry: SurfaceEntry<L>,
) {
	assertLanguage(expectedLanguage, entry.surface.language);
	validateLemma(expectedLanguage, entry.surface.lemma);
	assertDumlingId(expectedLanguage, "Surface", entry.id, "surface entry id");
	assertEqualId(
		entry.id,
		makeSurfaceId(expectedLanguage, entry.surface),
		"surface entry id",
	);
	if (!sameLemma(entry.ownerLemma, entry.surface.lemma)) {
		throw new Error(
			"surface owner Lemma does not match the realized Lemma.",
		);
	}
}

function validatePendingRef<L extends SupportedLanguage>(
	expectedLanguage: L,
	ref: PendingEntryRef<L>,
) {
	assertLanguage(expectedLanguage, ref.language);
	assertEqualId(ref.pendingId, derivePendingEntryId(ref), "pending ref id");
}

function pendingRelationSourceKey<L extends SupportedLanguage>(
	relation: PendingEntryRelation<L>,
) {
	return relation.relationFamily === "lexical"
		? readingKey(relation.sourceReading)
		: lemmaKey(relation.sourceLemma);
}

function validatePendingRelation<L extends SupportedLanguage>(
	expectedLanguage: L,
	relation: PendingEntryRelation<L>,
) {
	if (relation.relationFamily === "lexical") {
		validateReading(expectedLanguage, relation.sourceReading);
	} else {
		validateLemma(expectedLanguage, relation.sourceLemma);
	}
	if (relation.relationFamily !== relationFamilyFor(relation.relation)) {
		throw new Error("pending relation family does not match its relation.");
	}
}

export function validateStoredReadingsSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: StoredReadingsSlice<L>,
	requestedLemma?: Lemma<L>,
) {
	for (const candidate of slice.candidates) {
		validateReadingEntry(expectedLanguage, candidate.reading);
		validateLemmaRecord(expectedLanguage, candidate.lemma);
		if (
			!sameLemma(candidate.reading.reading.lemma, candidate.lemma.lemma)
		) {
			throw new Error(
				"stored Reading does not reference its candidate Lemma.",
			);
		}
		if (
			requestedLemma &&
			!sameLemma(candidate.lemma.lemma, requestedLemma)
		) {
			throw new Error(
				"stored Reading candidate does not match the requested Lemma identity.",
			);
		}
	}
}

export function validateReadingPatchSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: ReadingPatchSlice<L>,
	requestedReading?: Reading<L>,
) {
	if (slice.reading) {
		validateReadingEntry(expectedLanguage, slice.reading);
		if (
			requestedReading &&
			!sameReading(slice.reading.reading, requestedReading)
		) {
			throw new Error(
				"reading patch slice does not match the requested Reading.",
			);
		}
	}
}

export function validateNewNoteSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: NewNoteSlice<L>,
	draft?: DumdictReadingDraft<L>,
) {
	if (draft) {
		validateReading(expectedLanguage, draft.reading);
	}
	const draftOwnedSurfaceIds = new Set(
		draft?.ownedSurfaces?.map(({ surface }) =>
			makeSurfaceId(expectedLanguage, surface),
		) ?? [],
	);
	const proposedPendingTargetIds = new Set(
		(draft?.relations ?? [])
			.filter((relation) => relation.target.kind === "pending")
			.map((relation) =>
				relation.target.kind === "pending"
					? makePendingEntryRef({
							language: expectedLanguage,
							...relation.target.ref,
						}).pendingId
					: undefined,
			)
			.filter((id) => id !== undefined),
	);
	const matchingPendingId = draft
		? derivePendingEntryId({
				language: expectedLanguage,
				canonicalForm: draft.reading.lemma.canonicalForm,
				family: draft.reading.lemma.family,
				kind: draft.reading.lemma.kind,
			})
		: undefined;

	if (slice.existingLemma) {
		validateLemmaRecord(expectedLanguage, slice.existingLemma);
		if (
			draft &&
			!sameLemma(slice.existingLemma.lemma, draft.reading.lemma)
		) {
			throw new Error(
				"existing Lemma does not match the draft identity.",
			);
		}
	}
	if (slice.existingReading) {
		validateReadingEntry(expectedLanguage, slice.existingReading);
		if (
			draft &&
			!sameReading(slice.existingReading.reading, draft.reading)
		) {
			throw new Error(
				"existing Reading does not match the draft identity.",
			);
		}
	}
	for (const entry of slice.existingOwnedSurfaces) {
		validateSurfaceEntry(expectedLanguage, entry);
		if (draft && !draftOwnedSurfaceIds.has(entry.id)) {
			throw new Error(
				"existing owned Surface does not match a requested draft Surface.",
			);
		}
	}
	for (const reading of slice.explicitExistingReadingTargets) {
		validateReadingEntry(expectedLanguage, reading);
	}
	for (const record of slice.explicitExistingLemmaTargets) {
		validateLemmaRecord(expectedLanguage, record);
	}
	for (const ref of slice.existingPendingRefsForProposedPendingTargets) {
		validatePendingRef(expectedLanguage, ref);
		if (draft && !proposedPendingTargetIds.has(ref.pendingId)) {
			throw new Error(
				"existing pending ref does not match a proposed relation target.",
			);
		}
	}
	for (const ref of slice.matchingPendingRefsForNewEntry) {
		validatePendingRef(expectedLanguage, ref);
		if (matchingPendingId && ref.pendingId !== matchingPendingId) {
			throw new Error(
				"matching pending ref does not match the draft Lemma description.",
			);
		}
	}
	for (const relation of slice.incomingPendingRelationsForNewEntry) {
		validatePendingRelation(expectedLanguage, relation);
	}

	const sourceReadings = new Set(
		slice.incomingPendingSourceReadings.map(({ reading }) =>
			readingKey(reading),
		),
	);
	const sourceLemmas = new Set(
		slice.incomingPendingSourceLemmas.map(({ lemma }) => lemmaKey(lemma)),
	);
	for (const relation of slice.incomingPendingRelationsForNewEntry) {
		if (
			(relation.relationFamily === "lexical" &&
				!sourceReadings.has(readingKey(relation.sourceReading))) ||
			(relation.relationFamily === "morphological" &&
				!sourceLemmas.has(lemmaKey(relation.sourceLemma)))
		) {
			throw new Error(
				"incoming pending relation source is missing from the slice.",
			);
		}
	}
	const matchingPendingIds = new Set(
		slice.matchingPendingRefsForNewEntry.map(({ pendingId }) => pendingId),
	);
	for (const relation of slice.incomingPendingRelationsForNewEntry) {
		if (!matchingPendingIds.has(relation.targetPendingId)) {
			throw new Error(
				"incoming pending relation target ref is missing from the slice.",
			);
		}
	}
}

export function validateRelationsCleanupInfoSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: RelationsCleanupInfoSlice<L>,
	requestedCanonicalForm?: string,
) {
	if (
		requestedCanonicalForm !== undefined &&
		slice.canonicalForm !== requestedCanonicalForm
	) {
		throw new Error(
			"relations cleanup slice canonical form does not match the request.",
		);
	}
	for (const record of slice.candidateLemmas) {
		validateLemmaRecord(expectedLanguage, record);
		if (
			requestedCanonicalForm !== undefined &&
			record.lemma.canonicalForm !== requestedCanonicalForm
		) {
			throw new Error(
				"relations cleanup candidate Lemma has a different canonical form.",
			);
		}
	}
	for (const ref of slice.pendingRefs) {
		validatePendingRef(expectedLanguage, ref);
		if (
			requestedCanonicalForm !== undefined &&
			ref.canonicalForm !== requestedCanonicalForm
		) {
			throw new Error(
				"relations cleanup pending ref has a different canonical form.",
			);
		}
	}
	assertNoDuplicates(
		slice.pendingRefs.map(({ pendingId }) => pendingId),
		"relations cleanup pending refs",
	);
	validatePendingRelations(
		expectedLanguage,
		slice.pendingRefs,
		slice.pendingRelations,
	);
}

function validatePendingRelations<L extends SupportedLanguage>(
	expectedLanguage: L,
	refs: PendingEntryRef<L>[],
	relations: PendingEntryRelation<L>[],
) {
	const pendingIds = new Set(refs.map(({ pendingId }) => pendingId));
	for (const relation of relations) {
		validatePendingRelation(expectedLanguage, relation);
		if (!pendingIds.has(relation.targetPendingId)) {
			throw new Error(
				"pending relation target ref is missing from the slice.",
			);
		}
	}
	assertNoDuplicates(
		relations.map(
			(relation) =>
				`${relation.relationFamily}:${pendingRelationSourceKey(relation)}:${relation.relation}:${relation.targetPendingId}`,
		),
		"pending relations",
	);
}

export function validateCleanupRelationsSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: CleanupRelationsSlice<L>,
) {
	for (const ref of slice.pendingRefs) {
		validatePendingRef(expectedLanguage, ref);
	}
	assertNoDuplicates(
		slice.pendingRefs.map(({ pendingId }) => pendingId),
		"cleanup pending refs",
	);
	validatePendingRelations(
		expectedLanguage,
		slice.pendingRefs,
		slice.pendingRelations,
	);

	for (const target of slice.targetReadings) {
		validateReadingEntry(expectedLanguage, target.reading);
		validateLemmaRecord(expectedLanguage, target.lemma);
		if (!sameLemma(target.reading.reading.lemma, target.lemma.lemma)) {
			throw new Error(
				"cleanup target Reading does not reference its Lemma.",
			);
		}
	}
	assertNoDuplicates(
		slice.targetReadings.map(({ reading }) => readingKey(reading.reading)),
		"cleanup target Readings",
	);
	for (const record of slice.targetLemmas) {
		validateLemmaRecord(expectedLanguage, record);
	}
	assertNoDuplicates(
		slice.targetLemmas.map(({ lemma }) => lemmaKey(lemma)),
		"cleanup target Lemmas",
	);
}
