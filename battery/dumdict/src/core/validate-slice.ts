import {
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	SurfaceEntry,
} from "../domain-types";
import { makeSurfaceId } from "../dumling-id";
import {
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type { DanglingRelationClaim } from "../public";
import type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
	ReevaluateShadowsSlice,
} from "../storage";
import { shadowMatchesLemma } from "./identity";
import {
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
	reevaluatedPendingEntryIds,
} from "./pending";
import {
	validateLemmaReadings,
	validateLinksWithRefs,
} from "./validate-occurrence-slice";
import {
	assertNoDuplicates,
	validateLemmaRecord,
	validatePendingRecord,
	validateReading,
	validateReadingEntry,
	validateRevision,
	validateSurfaceEntry,
} from "./validate-records";

/**
 * A relation inventory: each record parses, each once, and each Reading's
 * Lemma is in it. A claim whose target it doesn't hold is reported, not
 * thrown, so data an earlier removal left can't block planning; claims on
 * `removed` Lemmas and their Readings are expected, since the plan moves
 * them.
 */
function validateRelationInventory<L extends Dumling.Language>(
	expected: L,
	lemmas: LemmaRecord<L>[],
	readings: ReadingEntry<L>[],
	/** Lemmas a removal took away, which stored claims may still name. */
	removed: readonly Dumling.Lemma<L>[] = [],
): DanglingRelationClaim<L>[] {
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
	for (const entry of readings)
		if (!lemmaKeys.has(lemmaIdentityKey(entry.reading.lemma)))
			throw new Error(
				"relation Reading inventory references an unstored owner Lemma.",
			);
	return danglingClaims(readings, lemmaKeys, removed);
}

function danglingClaims<L extends Dumling.Language>(
	readings: readonly ReadingEntry<L>[],
	lemmaKeys: ReadonlySet<string>,
	removed: readonly Dumling.Lemma<L>[],
): DanglingRelationClaim<L>[] {
	const removedKeys = new Set(
		removed.map((lemma) => lemmaIdentityKey(lemma)),
	);
	const readingKeys = new Set(
		readings.map(({ reading }) => readingIdentityKey(reading)),
	);
	return readings.flatMap(({ reading, knowledge }) => {
		const relations = knowledge?.semanticRelations;
		if (relations?.targetKind === "reading")
			return (relations.synonym ?? []).flatMap(
				(target): DanglingRelationClaim<L>[] =>
					readingKeys.has(readingIdentityKey(target)) ||
					removedKeys.has(lemmaIdentityKey(target.lemma))
						? []
						: [
								{
									kind: "danglingRelationClaim",
									reading,
									relation: "synonym",
									target: {
										kind: "reading",
										reading: target,
									},
								},
							],
			);
		return directSemanticRelationValues.flatMap((relation) =>
			(relations?.[relation] ?? []).flatMap(
				(target): DanglingRelationClaim<L>[] => {
					const key = lemmaIdentityKey(target);
					return lemmaKeys.has(key) || removedKeys.has(key)
						? []
						: [
								{
									kind: "danglingRelationClaim",
									reading,
									relation,
									target: { kind: "lemma", lemma: target },
								},
							];
				},
			),
		);
	});
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
): DanglingRelationClaim<L>[] {
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
	validateMatchingPendingRecords(
		expected,
		context.pendingRelationsMatchingProposedLemma,
		request.reading.lemma,
	);
	const issues = validateRelationInventory(
		expected,
		context.relationLemmas,
		context.relationReadings,
	);
	validateLemmaReadings(
		expected,
		request.reading.lemma,
		context.lemmaReadings,
		context.existingLemma,
	);
	validateLinksWithRefs(
		expected,
		context.attestationLinksWithRefs,
		request.attestationRefs,
	);
	return issues;
}

function validateMatchingPendingRecords<L extends Dumling.Language>(
	expected: L,
	records: PendingSemanticRelationRecord<L>[],
	lemma: Dumling.Lemma<L>,
) {
	for (const record of records) {
		validatePendingRecord(expected, record);
		if (!shadowMatchesLemma(record.pending.target, lemma))
			throw new Error(
				"pending Semantic Relation does not match the proposed Lemma.",
			);
	}
}

function validateEnsureReadingEntryContext<L extends Dumling.Language>(
	expected: L,
	context: EnsureReadingEntryContext<L>,
	reading: Dumling.Reading<L>,
): DanglingRelationClaim<L>[] {
	validateExistingIdentity(expected, context, reading);
	validateMatchingPendingRecords(
		expected,
		context.pendingRelationsMatchingProposedLemma,
		reading.lemma,
	);
	return validateRelationInventory(
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
): DanglingRelationClaim<L>[] {
	validateExistingIdentity(expected, context, request.reading);
	if (
		context.existingReading &&
		(!context.existingLemma ||
			!context.lemmaReadings.some((reading) =>
				sameReading(reading, request.reading),
			))
	)
		throw new Error(
			"existing Reading's Lemma and Readings are missing from the context.",
		);
	validateLemmaReadings(
		expected,
		request.reading.lemma,
		context.lemmaReadings,
		context.existingLemma,
	);
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
	return validateRelationInventory(
		expected,
		context.relationLemmas,
		context.relationReadings,
	);
}

export function validateReadingEntryContext<L extends Dumling.Language>(
	expected: L,
	context: ReadingEntryContext<L>,
	request: LoadReadingEntryContextRequest<L>,
): DanglingRelationClaim<L>[] {
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
			return validateAddNewNoteContext(expected, context, request);
		case "applyGeneratedKnowledge":
			if (context.intent !== "applyGeneratedKnowledge")
				return intentMismatch();
			return validateApplyGeneratedKnowledgeContext(
				expected,
				context,
				request,
			);
		case "ensureOwnedSurface":
			if (context.intent !== "ensureOwnedSurface")
				return intentMismatch();
			validateExistingIdentity(expected, context, request.reading);
			validateRequestedSurfaces(
				expected,
				context.existingOwnedSurfaces,
				new Set([makeSurfaceId(expected, request.surface)]),
			);
			return [];
		case "ensureReadingEntry":
			if (context.intent !== "ensureReadingEntry")
				return intentMismatch();
			return validateEnsureReadingEntryContext(
				expected,
				context,
				request.reading,
			);
		case "recordOccurrence":
			if (context.intent !== "recordOccurrence") return intentMismatch();
			validateExistingIdentity(expected, context, request.reading);
			validateRequestedSurfaces(
				expected,
				context.existingOwnedSurfaces,
				new Set([makeSurfaceId(expected, request.surface)]),
			);
			validateLinksWithRefs(expected, context.attestationLinksWithRefs, [
				request.ref,
			]);
			return [];
	}
}

function intentMismatch(): never {
	throw new Error("Reading Entry context intent does not match the request.");
}

export function validateCleanupRelationsSlice<L extends Dumling.Language>(
	expected: L,
	slice: CleanupRelationsSlice<L>,
): DanglingRelationClaim<L>[] {
	for (const record of slice.pendingRelations)
		validatePendingRecord(expected, record);
	assertNoDuplicates(
		slice.pendingRelations.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
		"pending Semantic Relations",
	);
	return validateRelationInventory(
		expected,
		slice.relationLemmas,
		slice.relationReadings,
	);
}

/**
 * A `reevaluateShadows` slice holds only records the request names, each
 * once, and a relation inventory whose claims may still name the removed
 * Lemmas.
 */
export function validateReevaluateShadowsSlice<L extends Dumling.Language>(
	expected: L,
	slice: ReevaluateShadowsSlice<L>,
	request: {
		readonly shadows?: readonly (Dumrel.UnitShadow & { language: L })[];
		readonly removedLemmas?: readonly Dumling.Lemma<L>[];
	},
): DanglingRelationClaim<L>[] {
	validateRevision(slice.revision);
	const requested = new Set<string>(reevaluatedPendingEntryIds(request));
	for (const record of slice.pendingRelations) {
		validatePendingRecord(expected, record);
		if (!requested.has(record.locator.targetPendingId))
			throw new Error(
				"pending Semantic Relation was not requested by this re-evaluation.",
			);
	}
	assertNoDuplicates(
		slice.pendingRelations.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
		"pending Semantic Relations",
	);
	return validateRelationInventory(
		expected,
		slice.relationLemmas,
		slice.relationReadings,
		request.removedLemmas,
	);
}
