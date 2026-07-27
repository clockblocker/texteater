import type {
	DumdictEntryDraft,
	LemmaEntry,
	PendingLemmaRef,
	PendingLemmaRelation,
	SurfaceEntry,
} from "../dto";
import {
	type DumlingId,
	type EntityKind,
	getLanguageApi,
	inspectId,
	type Lemma,
	makeDumlingIdFor,
	type SupportedLanguage,
} from "../dumling";
import type { LemmaDescription } from "../public";
import { DumdictLanguageMismatchError } from "../public";
import type {
	CleanupRelationsSlice,
	LemmaPatchSlice,
	NewNoteSlice,
	RelationsCleanupInfoSlice,
	StoredLemmaSensesSlice,
} from "../storage";
import {
	derivePendingLemmaId,
	makePendingLemmaRef,
	samePendingLemmaIdentity,
} from "./pending/identity";
import { relationFamilyFor } from "./relations/family";

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
	id: DumlingId | string,
	context: string,
) {
	const inspected = inspectId(id);
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

function assertNoDuplicates(
	values: string[],
	context: string,
) {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			throw new Error(`${context} contains duplicates.`);
		}
		seen.add(value);
	}
}

function validateLemmaEntry<L extends SupportedLanguage>(
	expectedLanguage: L,
	entry: LemmaEntry<L>,
) {
	assertLanguage(expectedLanguage, entry.lemma.language);
	assertDumlingId(expectedLanguage, "Lemma", entry.id, "lemma entry id");
	assertEqualId(
		entry.id,
		makeDumlingIdFor(expectedLanguage, entry.lemma),
		"lemma entry id",
	);
	for (const targetIds of Object.values(entry.lexicalRelations)) {
		for (const targetId of targetIds ?? []) {
			assertDumlingId(
				expectedLanguage,
				"Lemma",
				targetId,
				"lexical relation target id",
			);
		}
	}
	for (const targetIds of Object.values(entry.morphologicalRelations)) {
		for (const targetId of targetIds ?? []) {
			assertDumlingId(
				expectedLanguage,
				"Lemma",
				targetId,
				"morphological relation target id",
			);
		}
	}
}

function validateSurfaceEntry<L extends SupportedLanguage>(
	expectedLanguage: L,
	entry: SurfaceEntry<L>,
) {
	const languageApi = getLanguageApi(expectedLanguage);
	assertLanguage(expectedLanguage, entry.surface.language);
	assertLanguage(expectedLanguage, entry.surface.lemma.language);
	assertDumlingId(expectedLanguage, "Surface", entry.id, "surface entry id");
	assertDumlingId(
		expectedLanguage,
		"Lemma",
		entry.ownerLemmaId,
		"surface owner lemma id",
	);
	assertEqualId(
		entry.id,
		makeDumlingIdFor(expectedLanguage, entry.surface),
		"surface entry id",
	);
	assertEqualId(
		entry.ownerLemmaId,
		makeDumlingIdFor(
			expectedLanguage,
			languageApi.extract.lemma(entry.surface),
		),
		"surface owner lemma id",
	);
}

function validatePendingRef<L extends SupportedLanguage>(
	expectedLanguage: L,
	ref: PendingLemmaRef<L>,
) {
	assertLanguage(expectedLanguage, ref.language);
	assertEqualId(ref.pendingId, derivePendingLemmaId(ref), "pending ref id");
}

function validatePendingRelation<L extends SupportedLanguage>(
	expectedLanguage: L,
	relation: PendingLemmaRelation<L>,
) {
	assertDumlingId(
		expectedLanguage,
		"Lemma",
		relation.sourceLemmaId,
		"pending relation source lemma id",
	);
	if (relation.relationFamily !== relationFamilyFor(relation.relation)) {
		throw new Error("pending relation family does not match its relation.");
	}
}

function lemmaMatchesDescription<L extends SupportedLanguage>(
	lemma: Lemma<L>,
	description: LemmaDescription<L>,
) {
	return (
		lemma.language === description.language &&
		lemma.canonicalLemma === description.canonicalLemma &&
		lemma.lemmaKind === description.lemmaKind &&
		lemma.lemmaSubKind === description.lemmaSubKind
	);
}

export function validateStoredLemmaSensesSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: StoredLemmaSensesSlice<L>,
	requestedDescription?: LemmaDescription<L>,
) {
	for (const candidate of slice.candidates) {
		validateLemmaEntry(expectedLanguage, candidate.entry);
		if (
			requestedDescription &&
			!lemmaMatchesDescription(candidate.entry.lemma, requestedDescription)
		) {
			throw new Error(
				"stored lemma sense candidate does not match the requested lemma description.",
			);
		}
	}
}

export function validateLemmaPatchSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: LemmaPatchSlice<L>,
	requestedLemmaId?: DumlingId<"Lemma", L>,
) {
	if (slice.lemma) {
		validateLemmaEntry(expectedLanguage, slice.lemma);
		if (requestedLemmaId && slice.lemma.id !== requestedLemmaId) {
			throw new Error(
				"lemma patch slice lemma id does not match the requested lemma id.",
			);
		}
	}
}

export function validateNewNoteSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: NewNoteSlice<L>,
	draft?: DumdictEntryDraft<L>,
) {
	const draftLemmaId = draft
		? makeDumlingIdFor(expectedLanguage, draft.lemma)
		: undefined;
	const draftOwnedSurfaceIds = new Set(
		draft?.ownedSurfaces?.map(({ surface }) =>
			makeDumlingIdFor(expectedLanguage, surface),
		) ?? [],
	);
	const proposedPendingTargetIds = new Set(
		draft?.relations
			?.filter((relation) => relation.target.kind === "pending")
			.map((relation) =>
				relation.target.kind === "pending"
					? makePendingLemmaRef({
							language: expectedLanguage,
							canonicalLemma: relation.target.ref.canonicalLemma,
							lemmaKind: relation.target.ref.lemmaKind,
							lemmaSubKind: relation.target.ref.lemmaSubKind,
						}).pendingId
					: undefined,
			)
			.filter((pendingId) => pendingId !== undefined) ?? [],
	);
	const matchingPendingIdForNewLemma = draft
		? derivePendingLemmaId({
				language: expectedLanguage,
				canonicalLemma: draft.lemma.canonicalLemma,
				lemmaKind: draft.lemma.lemmaKind,
				lemmaSubKind: draft.lemma.lemmaSubKind,
			})
		: undefined;

	if (slice.existingLemma) {
		validateLemmaEntry(expectedLanguage, slice.existingLemma);
		if (draftLemmaId && slice.existingLemma.id !== draftLemmaId) {
			throw new Error(
				"existing lemma does not match the requested draft lemma.",
			);
		}
	}
	for (const entry of slice.existingOwnedSurfaces) {
		validateSurfaceEntry(expectedLanguage, entry);
		if (draft && !draftOwnedSurfaceIds.has(entry.id)) {
			throw new Error(
				"existing owned surface does not match a requested draft owned surface.",
			);
		}
	}
	for (const entry of slice.explicitExistingRelationTargets) {
		validateLemmaEntry(expectedLanguage, entry);
	}
	for (const ref of slice.existingPendingRefsForProposedPendingTargets) {
		validatePendingRef(expectedLanguage, ref);
		if (draft && !proposedPendingTargetIds.has(ref.pendingId)) {
			throw new Error(
				"existing pending ref does not match a requested pending relation target.",
			);
		}
	}
	for (const ref of slice.matchingPendingRefsForNewLemma) {
		validatePendingRef(expectedLanguage, ref);
	}
	for (const relation of slice.incomingPendingRelationsForNewLemma) {
		validatePendingRelation(expectedLanguage, relation);
	}
	for (const entry of slice.incomingPendingSourceLemmas) {
		validateLemmaEntry(expectedLanguage, entry);
	}

	const incomingSourceLemmaIds = new Set(
		slice.incomingPendingSourceLemmas.map(({ id }) => id),
	);
	for (const relation of slice.incomingPendingRelationsForNewLemma) {
		if (!incomingSourceLemmaIds.has(relation.sourceLemmaId)) {
			throw new Error(
				"incoming pending relation source lemma is missing from the slice.",
			);
		}
	}

	const matchingPendingIds = new Set(
		slice.matchingPendingRefsForNewLemma
			.filter(
				({ pendingId }) =>
					!matchingPendingIdForNewLemma ||
					pendingId === matchingPendingIdForNewLemma,
			)
			.map(({ pendingId }) => pendingId),
	);
	for (const relation of slice.incomingPendingRelationsForNewLemma) {
		if (!matchingPendingIds.has(relation.targetPendingId)) {
			throw new Error(
				"incoming pending relation target pending ref is missing from the slice.",
			);
		}
	}

	for (const ref of slice.matchingPendingRefsForNewLemma) {
		if (
			matchingPendingIdForNewLemma &&
			ref.pendingId !== matchingPendingIdForNewLemma
		) {
			throw new Error(
				"matching pending ref does not match the draft lemma identity.",
			);
		}
	}
}

export function validateRelationsCleanupInfoSlice<L extends SupportedLanguage>(
	expectedLanguage: L,
	slice: RelationsCleanupInfoSlice<L>,
	requestedCanonicalLemma?: string,
) {
	if (
		requestedCanonicalLemma !== undefined &&
		slice.canonicalLemma !== requestedCanonicalLemma
	) {
		throw new Error(
			"relations cleanup slice canonical lemma does not match the request.",
		);
	}

	for (const entry of slice.candidateLemmas) {
		validateLemmaEntry(expectedLanguage, entry);
		if (
			requestedCanonicalLemma !== undefined &&
			!samePendingLemmaIdentity(
				{
					language: expectedLanguage,
					canonicalLemma: entry.lemma.canonicalLemma,
					lemmaKind: entry.lemma.lemmaKind,
					lemmaSubKind: entry.lemma.lemmaSubKind,
				},
				{
					language: expectedLanguage,
					canonicalLemma: requestedCanonicalLemma,
					lemmaKind: entry.lemma.lemmaKind,
					lemmaSubKind: entry.lemma.lemmaSubKind,
				},
			)
		) {
			throw new Error(
				"relations cleanup candidate lemma does not match the requested canonical lemma.",
			);
		}
	}

	for (const ref of slice.pendingRefs) {
		validatePendingRef(expectedLanguage, ref);
		if (
			requestedCanonicalLemma !== undefined &&
			!samePendingLemmaIdentity(ref, {
				language: expectedLanguage,
				canonicalLemma: requestedCanonicalLemma,
				lemmaKind: ref.lemmaKind,
				lemmaSubKind: ref.lemmaSubKind,
			})
		) {
			throw new Error(
				"relations cleanup pending ref does not match the requested canonical lemma.",
			);
		}
	}

	assertNoDuplicates(
		slice.pendingRefs.map(({ pendingId }) => pendingId),
		"relations cleanup pending refs",
	);

	for (const relation of slice.pendingRelations) {
		validatePendingRelation(expectedLanguage, relation);
	}

	const pendingIds = new Set(slice.pendingRefs.map(({ pendingId }) => pendingId));
	for (const relation of slice.pendingRelations) {
		if (!pendingIds.has(relation.targetPendingId)) {
			throw new Error(
				"relations cleanup pending relation target pending ref is missing from the slice.",
			);
		}
	}

	assertNoDuplicates(
		slice.pendingRelations.map(
			(relation) =>
				`${relation.sourceLemmaId}:${relation.relation}:${relation.targetPendingId}`,
		),
		"relations cleanup pending relations",
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

	for (const relation of slice.pendingRelations) {
		validatePendingRelation(expectedLanguage, relation);
	}
	assertNoDuplicates(
		slice.pendingRelations.map(
			(relation) =>
				`${relation.sourceLemmaId}:${relation.relation}:${relation.targetPendingId}`,
		),
		"cleanup pending relations",
	);

	for (const entry of slice.targetLemmas) {
		validateLemmaEntry(expectedLanguage, entry);
	}
	assertNoDuplicates(
		slice.targetLemmas.map(({ id }) => id),
		"cleanup target lemmas",
	);

	const pendingIds = new Set(slice.pendingRefs.map(({ pendingId }) => pendingId));
	for (const relation of slice.pendingRelations) {
		if (!pendingIds.has(relation.targetPendingId)) {
			throw new Error(
				"cleanup pending relation target pending ref is missing from the slice.",
			);
		}
	}
}
