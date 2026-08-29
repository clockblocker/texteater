import { readingFingerprint } from "dumling/id";
import type { EntityKind, Lemma, SupportedLanguage } from "dumling/types";
import {
	directSemanticRelationValues,
	semanticRelationValues,
} from "dumrel/relations";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
	SurfaceEntry,
} from "../dto";
import { inspectDumlingId, makeSurfaceId } from "../dumling-id";
import {
	parseAsLemmaRecord,
	parseAsPendingSemanticRelationRecord,
	parseAsReadingEntry,
	parseAsSurfaceEntry,
	parsePendingSemanticRelationForDumdictRuntime,
	parseReadingForDumdictRuntime,
	parseReadingKnowledgeForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import { DumdictLanguageMismatchError } from "../public";
import type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../storage";
import { lemmaFingerprint, sameLemma, sameReading } from "./identity";
import {
	assertPendingSemanticRelationRecordIdentity,
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
} from "./pending";

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

function validateLemmaRecord<L extends SupportedLanguage>(
	expected: L,
	record: LemmaRecord<L>,
) {
	unwrapDumdictParse(parseAsLemmaRecord(record, expected));
	assertLanguage(expected, record.lemma.language);
}

function validateReading<L extends SupportedLanguage>(
	expected: L,
	reading: Reading<L>,
) {
	unwrapDumdictParse(parseReadingForDumdictRuntime(reading, expected));
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
	unwrapDumdictParse(parseAsReadingEntry(entry, expected));
	validateReading(expected, entry.reading);
	if (entry.knowledge !== undefined) {
		unwrapDumdictParse(
			parseReadingKnowledgeForDumdictRuntime(entry.knowledge),
		);
		const relations = entry.knowledge.semanticRelations;
		if (relations?.targetKind === "reading") {
			for (const target of relations.synonym ?? []) {
				validateReading(expected, target);
				if (sameReading(entry.reading, target))
					throw new Error(
						"Reading Knowledge contains a direct self relation.",
					);
			}
		} else {
			for (const relation of directSemanticRelationValues) {
				for (const target of relations?.[relation] ?? []) {
					validateLemmaRecord(expected, { lemma: target });
					if (sameLemma(entry.reading.lemma, target))
						throw new Error(
							"Reading Knowledge contains a direct same-Lemma relation.",
						);
				}
			}
		}
	}
}

function validateSurfaceEntry<L extends SupportedLanguage>(
	expected: L,
	entry: SurfaceEntry<L>,
) {
	unwrapDumdictParse(parseAsSurfaceEntry(entry, expected));
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
	const parsedRecord = unwrapDumdictParse(
		parseAsPendingSemanticRelationRecord(record, expected),
	);
	validateReading(expected, parsedRecord.sourceReading);
	assertLanguage(expected, parsedRecord.pending.target.language);
	if (
		parsedRecord.pending.target.language !==
		parsedRecord.sourceReading.lemma.language
	)
		throw new Error(
			"Pending Semantic Relation endpoints must use the same language.",
		);
	if (!semanticRelationValues.includes(parsedRecord.locator.relation))
		throw new Error("Invalid Semantic Relation.");
	assertPendingSemanticRelationRecordIdentity(parsedRecord);
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
	const readingKeys = new Set(
		readings.map(({ reading }) => readingFingerprint(reading)),
	);
	for (const entry of readings) {
		if (!lemmaKeys.has(lemmaFingerprint(entry.reading.lemma)))
			throw new Error(
				"relation Reading inventory references an unstored owner Lemma.",
			);
		const relations = entry.knowledge?.semanticRelations;
		if (relations?.targetKind === "reading") {
			for (const target of relations.synonym ?? [])
				if (!readingKeys.has(readingFingerprint(target)))
					throw new Error(
						"relation Reading inventory references an unstored target Reading.",
					);
		} else {
			for (const relation of directSemanticRelationValues) {
				for (const target of relations?.[relation] ?? []) {
					if (!lemmaKeys.has(lemmaFingerprint(target)))
						throw new Error(
							"relation Reading inventory references an unstored target Lemma.",
						);
				}
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

function validateRevision(value: unknown) {
	if (typeof value !== "string" || value.length === 0)
		throw new Error("Reading Entry context has an invalid revision.");
}

function validateExistingIdentity<L extends SupportedLanguage>(
	expected: L,
	context: {
		existingLemma?: LemmaRecord<L>;
		existingReading?: ReadingEntry<L>;
	},
	reading: Reading<L>,
) {
	if (context.existingLemma) {
		validateLemmaRecord(expected, context.existingLemma);
		if (!sameLemma(context.existingLemma.lemma, reading.lemma))
			throw new Error(
				"existing Lemma does not match the requested Reading identity.",
			);
	}
	if (context.existingReading) {
		validateReadingEntry(expected, context.existingReading);
		if (!sameReading(context.existingReading.reading, reading))
			throw new Error(
				"existing Reading does not match the requested Reading identity.",
			);
	}
}

function validateRequestedSurfaces<L extends SupportedLanguage>(
	expected: L,
	entries: SurfaceEntry<L>[],
	requestedSurfaceIds: Set<string>,
) {
	for (const entry of entries) {
		validateSurfaceEntry(expected, entry);
		if (!requestedSurfaceIds.has(entry.id))
			throw new Error(
				"existing owned Surface was not requested by this workflow.",
			);
	}
	assertNoDuplicates(
		entries.map(({ id }) => id),
		"existing owned Surfaces",
	);
}

function validateExactPendingSelection<L extends SupportedLanguage>(
	expected: L,
	records: PendingSemanticRelationRecord<L>[],
	requestedKeys: Set<string>,
) {
	for (const record of records) {
		validatePendingRecord(expected, record);
		if (
			!requestedKeys.has(
				pendingSemanticRelationLocatorKey(record.locator),
			)
		)
			throw new Error(
				"pending Semantic Relation was not requested by this workflow.",
			);
	}
	assertNoDuplicates(
		records.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
		"exact pending Semantic Relations",
	);
}

function validateAddNewNoteContext<L extends SupportedLanguage>(
	expected: L,
	context: AddNewNoteContext<L>,
	request: Extract<
		LoadReadingEntryContextRequest<L>,
		{ intent: "addNewNote" }
	>,
) {
	validateExistingIdentity(expected, context, request.reading);
	validateRequestedSurfaces(
		expected,
		context.existingOwnedSurfaces,
		new Set(
			request.ownedSurfaces.map((surface) =>
				makeSurfaceId(expected, surface),
			),
		),
	);
	const requestedLemmaKeys = new Set(
		request.relations.flatMap((relation) =>
			relation.target.kind === "existing"
				? [lemmaFingerprint(relation.target.lemma)]
				: [],
		),
	);
	for (const record of context.explicitExistingLemmaTargets) {
		validateLemmaRecord(expected, record);
		if (!requestedLemmaKeys.has(lemmaFingerprint(record.lemma)))
			throw new Error(
				"explicit existing Lemma target was not requested by this workflow.",
			);
	}
	const requestedPendingKeys = new Set(
		request.relations.flatMap((relation) =>
			relation.target.kind === "pending"
				? [
						pendingSemanticRelationLocatorKey(
							derivePendingSemanticRelationLocator(
								request.reading,
								relation.target.pending,
							),
						),
					]
				: [],
		),
	);
	validateExactPendingSelection(
		expected,
		context.exactPendingRelations,
		requestedPendingKeys,
	);
	for (const record of context.pendingRelationsMatchingProposedLemma) {
		validatePendingRecord(expected, record);
		const target = record.pending.target;
		const lemma = request.reading.lemma;
		if (
			target.language !== lemma.language ||
			target.canonicalForm !== lemma.canonicalForm ||
			target.family !== lemma.family ||
			target.kind !== lemma.kind
		)
			throw new Error(
				"pending Semantic Relation does not match the proposed Lemma.",
			);
	}
	validateRelationInventory(
		expected,
		context.relationLemmas,
		context.relationReadings,
	);
}

function validateApplyGeneratedKnowledgeContext<L extends SupportedLanguage>(
	expected: L,
	context: ApplyGeneratedKnowledgeContext<L>,
	request: Extract<
		LoadReadingEntryContextRequest<L>,
		{ intent: "applyGeneratedKnowledge" }
	>,
) {
	if (context.existingReading) {
		validateReadingEntry(expected, context.existingReading);
		if (!sameReading(context.existingReading.reading, request.reading))
			throw new Error(
				"existing Reading does not match the requested Reading identity.",
			);
	}
	validateExactPendingSelection(
		expected,
		context.exactPendingRelations,
		new Set(
			request.pendingRelations.map((pending) =>
				pendingSemanticRelationLocatorKey(
					derivePendingSemanticRelationLocator(
						request.reading,
						pending,
					),
				),
			),
		),
	);
	validateRelationInventory(
		expected,
		context.relationLemmas,
		context.relationReadings,
	);
}

export function validateReadingEntryContext<L extends SupportedLanguage>(
	expected: L,
	context: ReadingEntryContext<L>,
	request: LoadReadingEntryContextRequest<L>,
) {
	if (context.intent !== request.intent)
		throw new Error(
			"Reading Entry context intent does not match the request.",
		);
	validateRevision(context.revision);
	validateReading(expected, request.reading);
	switch (request.intent) {
		case "addNewNote":
			for (const relation of request.relations) {
				if (relation.target.kind === "pending")
					unwrapDumdictParse(
						parsePendingSemanticRelationForDumdictRuntime(
							relation.target.pending,
						),
					);
				else if (
					"relation" in relation &&
					!directSemanticRelationValues.includes(relation.relation)
				)
					throw new Error("Invalid direct Semantic Relation.");
			}
			validateAddNewNoteContext(
				expected,
				context as AddNewNoteContext<L>,
				request,
			);
			return;
		case "applyGeneratedKnowledge":
			validateApplyGeneratedKnowledgeContext(
				expected,
				context as ApplyGeneratedKnowledgeContext<L>,
				request,
			);
			return;
		case "ensureOwnedSurface":
			validateExistingIdentity(
				expected,
				context as EnsureOwnedSurfaceContext<L>,
				request.reading,
			);
			validateRequestedSurfaces(
				expected,
				(context as EnsureOwnedSurfaceContext<L>).existingOwnedSurfaces,
				new Set([makeSurfaceId(expected, request.surface)]),
			);
			return;
		case "ensureReadingEntry":
			validateExistingIdentity(
				expected,
				context as EnsureReadingEntryContext<L>,
				request.reading,
			);
	}
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
		slice.pendingRelations.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
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
		slice.pendingRelations.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
		"pending Semantic Relations",
	);
	validateRelationInventory(
		expected,
		slice.relationLemmas,
		slice.relationReadings,
	);
}
