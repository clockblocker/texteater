import {
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	SurfaceEntry,
} from "../domain-types";
import { makeSurfaceId } from "../dumling-id";
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
import type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "../storage";
import { shadowMatchesLemma } from "./identity";
import {
	assertPendingSemanticRelationRecordIdentity,
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
} from "./pending";

function assertNoDuplicates(values: string[], context: string) {
	if (new Set(values).size !== values.length)
		throw new Error(`${context} contains duplicates.`);
}

function validateLemmaRecord<L extends Dumling.Language>(
	expected: L,
	record: LemmaRecord<L>,
) {
	unwrapDumdictParse(parseAsLemmaRecord(record, expected));
}

/**
 * Throws unless parsing kept a Reading's Emoji Description: Dumdict takes it
 * already normalized. A Foreign Reading has none (ADR 0045).
 */
export function assertEmojiDescriptionNormalized(
	reading: Dumling.Reading,
	parsed: Dumling.Reading,
) {
	if (
		"emojiDescription" in parsed &&
		"emojiDescription" in reading &&
		parsed.emojiDescription !== reading.emojiDescription
	)
		throw new Error("Reading emoji description must be normalized.");
}

function validateReading<L extends Dumling.Language>(
	expected: L,
	reading: Dumling.Reading<L>,
) {
	assertEmojiDescriptionNormalized(
		reading,
		unwrapDumdictParse(parseReadingForDumdictRuntime(reading, expected)),
	);
}

function validateReadingEntry<L extends Dumling.Language>(
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

function validateSurfaceEntry<L extends Dumling.Language>(
	expected: L,
	entry: SurfaceEntry<L>,
) {
	unwrapDumdictParse(parseAsSurfaceEntry(entry, expected));
	// The parse checks id and owner on normalized forms and is discarded;
	// these check the raw entry that planning reads.
	if (entry.id !== makeSurfaceId(expected, entry.surface))
		throw new Error("surface entry id does not match its derived id.");
	if (!sameLemma(entry.ownerLemma, entry.surface.lemma))
		throw new Error(
			"surface owner Lemma does not match the realized Lemma.",
		);
}

function validatePendingRecord<L extends Dumling.Language>(
	expected: L,
	record: PendingSemanticRelationRecord<L>,
) {
	const parsedRecord = unwrapDumdictParse(
		parseAsPendingSemanticRelationRecord(record, expected),
	);
	validateReading(expected, parsedRecord.sourceReading);
	assertPendingSemanticRelationRecordIdentity(parsedRecord);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function validateRelationInventory<L extends Dumling.Language>(
	expected: L,
	lemmas: LemmaRecord<L>[],
	readings: ReadingEntry<L>[],
) {
	for (const record of lemmas) validateLemmaRecord(expected, record);
	for (const entry of readings) validateReadingEntry(expected, entry);
	assertNoDuplicates(
		lemmas.map(({ lemma }) => lemmaIdentityKey(lemma)),
		"relation Lemma inventory",
	);
	assertNoDuplicates(
		readings.map(({ reading }) => readingIdentityKey(reading)),
		"relation Reading inventory",
	);
	const lemmaKeys = new Set(
		lemmas.map(({ lemma }) => lemmaIdentityKey(lemma)),
	);
	const readingKeys = new Set(
		readings.map(({ reading }) => readingIdentityKey(reading)),
	);
	for (const entry of readings) {
		if (!lemmaKeys.has(lemmaIdentityKey(entry.reading.lemma)))
			throw new Error(
				"relation Reading inventory references an unstored owner Lemma.",
			);
		const relations = entry.knowledge?.semanticRelations;
		if (relations?.targetKind === "reading") {
			for (const target of relations.synonym ?? [])
				if (!readingKeys.has(readingIdentityKey(target)))
					throw new Error(
						"relation Reading inventory references an unstored target Reading.",
					);
		} else {
			for (const relation of directSemanticRelationValues) {
				for (const target of relations?.[relation] ?? []) {
					if (!lemmaKeys.has(lemmaIdentityKey(target)))
						throw new Error(
							"relation Reading inventory references an unstored target Lemma.",
						);
				}
			}
		}
	}
}

function validateRevision(value: unknown) {
	if (typeof value !== "string" || value.length === 0)
		throw new Error("Reading Entry context has an invalid revision.");
}

function validateExistingIdentity<L extends Dumling.Language>(
	expected: L,
	context: {
		existingLemma?: LemmaRecord<L>;
		existingReading?: ReadingEntry<L>;
	},
	reading: Dumling.Reading<L>,
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

function validateRequestedSurfaces<L extends Dumling.Language>(
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

function validateExactPendingSelection<L extends Dumling.Language>(
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

function validateAddNewNoteContext<L extends Dumling.Language>(
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
				? [lemmaIdentityKey(relation.target.lemma)]
				: [],
		),
	);
	for (const record of context.explicitExistingLemmaTargets) {
		validateLemmaRecord(expected, record);
		if (!requestedLemmaKeys.has(lemmaIdentityKey(record.lemma)))
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
		if (!shadowMatchesLemma(record.pending.target, request.reading.lemma))
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

function validateApplyGeneratedKnowledgeContext<L extends Dumling.Language>(
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

export function validateReadingEntryContext<L extends Dumling.Language>(
	expected: L,
	context: ReadingEntryContext<L>,
	request: LoadReadingEntryContextRequest<L>,
) {
	if (context.intent !== request.intent) intentMismatch();
	validateRevision(context.revision);
	validateReading(expected, request.reading);
	// Each case re-checks the context's intent, which narrows it to the
	// request's; the check above has already thrown on a mismatch.
	switch (request.intent) {
		case "addNewNote":
			if (context.intent !== "addNewNote") return intentMismatch();
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
			validateAddNewNoteContext(expected, context, request);
			return;
		case "applyGeneratedKnowledge":
			if (context.intent !== "applyGeneratedKnowledge")
				return intentMismatch();
			validateApplyGeneratedKnowledgeContext(expected, context, request);
			return;
		case "ensureOwnedSurface":
			if (context.intent !== "ensureOwnedSurface")
				return intentMismatch();
			validateExistingIdentity(expected, context, request.reading);
			validateRequestedSurfaces(
				expected,
				context.existingOwnedSurfaces,
				new Set([makeSurfaceId(expected, request.surface)]),
			);
			return;
		case "ensureReadingEntry":
			if (context.intent !== "ensureReadingEntry")
				return intentMismatch();
			validateExistingIdentity(expected, context, request.reading);
	}
}

function intentMismatch(): never {
	throw new Error("Reading Entry context intent does not match the request.");
}

export function validateCleanupRelationsSlice<L extends Dumling.Language>(
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
