import { sameLemma, sameReading } from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

import { pendingSemanticRelationLocatorKey } from "../core/pending";
import {
	planAddNewNote,
	planApplyGeneratedKnowledge,
	planCleanupRelations,
	planEnsureOwnedSurface,
	planEnsureReadingEntry,
	planReevaluateShadows,
} from "../core/plan-mutation";
import {
	validateCleanupRelationsSlice,
	validateReadingEntryContext,
	validateReevaluateShadowsSlice,
} from "../core/validate-slice";
import {
	ParsingError,
	parseAsLemmaRecord,
	parseKnowledgeChangeForDumdictRuntime,
	parsePendingSemanticRelationForDumdictRuntime,
	pendingTargetsLanguage,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
	ReconcileAttestationLinksRequest,
	RecordOccurrenceRequest,
	ReevaluateShadowsRequest,
	RekeySurfacesRequest,
	RemoveOccurrenceRequest,
} from "../public";
import type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
	OccurrenceSlice,
	OccurrenceSliceRequest,
	RecordOccurrenceContext,
	ReevaluateShadowsSlice,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
} from "../storage";
import { knowledgeChangeUsesLanguage } from "../validation-semantics";
import {
	type ReadingEntryContextLoad,
	storageRequestFor,
} from "./context-request";
import {
	occurrenceSliceRequest,
	reconcileAttestationLinks,
	recordOccurrence,
	rekeySurfaces,
	rekeySurfacesSliceRequest,
	removeOccurrence,
} from "./occurrence-workflows";
import {
	parseAddNewNoteRequest,
	parseEnsureOwnedSurfaceRequest,
	parseEnsureReadingEntryRequest,
	parseParadigmChanges,
} from "./request-parsing";
import {
	type DumdictPlanOutcome,
	type DumdictPlanRejected,
	invalidRequest,
	ok,
	planned,
	rejected,
	run,
	type Workflow,
} from "./workflow";

export type {
	DumdictPlanConflict,
	DumdictPlanned,
	DumdictPlanOutcome,
	DumdictPlanRejected,
} from "./workflow";

/**
 * Synchronous dictionary planning over a host-loaded storage slice.
 *
 * @remarks The host asks `contextRequest` which slice a request needs, loads
 * it from its own store (inside the transaction that will commit the plan),
 * and passes it here. Each workflow checks the request, validates the slice
 * against it, and returns a parsed plan with its preconditions, a rejection,
 * or a conflict; the planner never reads or writes storage. It throws only
 * for malformed input or a slice that breaks the storage contract.
 */
export type DumdictPlanner<L extends Dumling.Language> = {
	readonly language: L;
	/** The storage read a workflow request needs; hosts load exactly this slice. */
	contextRequest(
		load: ReadingEntryContextLoad<L>,
	): LoadReadingEntryContextRequest<L>;
	addNewNote(
		context: AddNewNoteContext<L>,
		request: AddNewNoteRequest<L>,
	): DumdictPlanOutcome<L>;
	applyGeneratedKnowledge(
		context: ApplyGeneratedKnowledgeContext<L>,
		request: ApplyGeneratedKnowledgeRequest<L>,
	): DumdictPlanOutcome<L>;
	ensureOwnedSurface(
		context: EnsureOwnedSurfaceContext<L>,
		request: EnsureOwnedSurfaceRequest<L>,
	): DumdictPlanOutcome<L>;
	ensureReadingEntry(
		context: EnsureReadingEntryContext<L>,
		request: EnsureReadingEntryRequest<L>,
	): DumdictPlanOutcome<L>;
	/**
	 * Retries exact pending locators against the loaded inventory. A Unit
	 * Shadow resolves only when exactly one Lemma matches; zero or multiple
	 * matches stay pending.
	 */
	cleanupRelations(
		slice: CleanupRelationsSlice<L>,
		request: CleanupRelationsRequest<L>,
	): DumdictPlanOutcome<L>;
	/**
	 * Re-evaluates every stored Shadow that matches the request's Shadows or
	 * removed Lemmas (system ADR 0011). A host plans it when Lemmas change
	 * outside `addNewNote` and `ensureReadingEntry`, which re-evaluate the
	 * Lemma they create: when it removes a Lemma, in the commit that removes
	 * it or after, and once over every stored Shadow after a migration. The
	 * host loads the stored records whose Pending Entry ID is one of
	 * `reevaluatedPendingEntryIds(request)` (`dumdict/pending`). Planning it
	 * again after its commit plans nothing.
	 */
	reevaluateShadows(
		slice: ReevaluateShadowsSlice<L>,
		request: ReevaluateShadowsRequest<L>,
	): DumdictPlanOutcome<L>;
	/**
	 * Records one occurrence (system ADR 0049): ensures its Surface and
	 * appends its link. The same ref with the same Surface and Reading plans
	 * nothing; with anything else it is `occurrenceAttestedElsewhere`.
	 */
	recordOccurrence(
		context: RecordOccurrenceContext<L>,
		request: RecordOccurrenceRequest<L>,
	): DumdictPlanOutcome<L>;
	/** The storage read `removeOccurrence` and `reconcileAttestationLinks` need. */
	occurrenceSliceRequest(
		request: RemoveOccurrenceRequest | ReconcileAttestationLinksRequest,
	): OccurrenceSliceRequest;
	/**
	 * Removes one occurrence's links and what they leave behind (system ADR
	 * 0043, ADR 0049): an unlinked Reading, a Surface that lost its last link
	 * and holds no user text, a Lemma with no Reading, and the variants no
	 * remaining Reading licenses. `affected.removed` lists what goes; the
	 * host re-evaluates Shadows with its Lemmas (system ADR 0011).
	 */
	removeOccurrence(
		slice: OccurrenceSlice<L>,
		request: RemoveOccurrenceRequest,
	): DumdictPlanOutcome<L>;
	/**
	 * Merges each requested ref's stored links as a set: the link with the
	 * code-unit-smaller `readingIdentityKey` stays, and every other is
	 * removed as `removeOccurrence` removes it and reported in
	 * `affected.removed.attestationLinks`.
	 */
	reconcileAttestationLinks(
		slice: OccurrenceSlice<L>,
		request: ReconcileAttestationLinksRequest,
	): DumdictPlanOutcome<L>;
	/** The storage read `rekeySurfaces` needs. */
	rekeySurfacesSliceRequest(
		request: RekeySurfacesRequest<L>,
	): RekeySurfacesSliceRequest<L>;
	/**
	 * Re-keys Surface Entries and the links naming them in one plan, after a
	 * Dumling Surface DTO change changes their ids.
	 */
	rekeySurfaces(
		slice: RekeySurfacesSlice<L>,
		request: RekeySurfacesRequest<L>,
	): DumdictPlanOutcome<L>;
};

function addNewNote<L extends Dumling.Language>(
	language: L,
): Workflow<L, AddNewNoteRequest<L>, AddNewNoteContext<L>> {
	return {
		check(request) {
			if (request.draft.reading.lemma.language !== language)
				return invalidRequest(
					"Draft Reading language does not match the dictionary.",
				);
			for (const owned of request.draft.ownedSurfaces ?? []) {
				if (
					owned.surface.lemma.language !== language ||
					!sameLemma(owned.surface.lemma, request.draft.reading.lemma)
				)
					return invalidRequest(
						"Owned Surfaces must belong to the draft Reading's Lemma and dictionary language.",
					);
			}
			const parsed = parseAddNewNoteRequest(language, request);
			if (!parsed)
				return rejected(
					"invalidDraft",
					"Semantic Relation endpoints must use the source Reading language.",
				);
			const links = parsed.draft.note.attestationLinks;
			if (
				links.some(
					(link) =>
						link.surfaceId === null ||
						!sameReading(link.reading, parsed.draft.reading),
				)
			)
				return rejected(
					"invalidDraft",
					"Each Attestation Link of the draft names its Reading and a Surface.",
				);
			return ok(parsed);
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "addNewNote", request }),
			);
			return planned(planAddNewNote(context, request));
		},
	};
}

/** A generated-Knowledge request whose changes and pending relations are not yet parsed. */
export type UncheckedApplyGeneratedKnowledgeRequest<
	L extends Dumling.Language,
> = {
	readonly reading: Dumling.Reading<L>;
	readonly changes: readonly unknown[];
	readonly pendingRelations: readonly unknown[];
	readonly paradigmChanges?: readonly unknown[];
};

/**
 * Checks a generated-Knowledge request the way `applyGeneratedKnowledge`
 * does, so a host whose changes arrive untyped can parse them once at its
 * edge. It parses every change, Paradigm Change and pending relation,
 * throwing `ParsingError` for a malformed one, and refuses a Reading, change or pending target in
 * another language as `invalidRequest`.
 */
export function checkApplyGeneratedKnowledgeRequest<L extends Dumling.Language>(
	language: L,
	request: UncheckedApplyGeneratedKnowledgeRequest<L>,
):
	| {
			readonly status: "ok";
			readonly request: ApplyGeneratedKnowledgeRequest<L>;
	  }
	| DumdictPlanRejected {
	if (request.reading.lemma.language !== language)
		return invalidRequest(
			"Reading language does not match the dictionary.",
		);
	const changes = request.changes.map((change) =>
		unwrapDumdictParse(parseKnowledgeChangeForDumdictRuntime(change)),
	);
	const pendingRelations = request.pendingRelations.map((pending) =>
		unwrapDumdictParse(
			parsePendingSemanticRelationForDumdictRuntime(pending),
		),
	);
	if (
		!changes.every((change) =>
			knowledgeChangeUsesLanguage(change, language),
		)
	)
		return invalidRequest(
			"Knowledge Change language does not match the dictionary.",
		);
	if (
		!pendingRelations.every((pending) =>
			pendingTargetsLanguage(pending, language),
		)
	)
		return invalidRequest(
			"Pending Relation target language does not match the dictionary.",
		);
	return {
		status: "ok",
		request: {
			reading: request.reading,
			changes,
			pendingRelations,
			...(request.paradigmChanges && {
				paradigmChanges: parseParadigmChanges(request.paradigmChanges),
			}),
		},
	};
}

function applyGeneratedKnowledge<L extends Dumling.Language>(
	language: L,
): Workflow<
	L,
	ApplyGeneratedKnowledgeRequest<L>,
	ApplyGeneratedKnowledgeContext<L>
> {
	return {
		check: (request) =>
			checkApplyGeneratedKnowledgeRequest(language, request),
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({
					intent: "applyGeneratedKnowledge",
					request,
				}),
			);
			// Its check parsed the changes and pending relations, and the slice
			// validation parsed the Reading and every stored entry.
			return planned(planApplyGeneratedKnowledge(context, request));
		},
	};
}

function ensureOwnedSurface<L extends Dumling.Language>(
	language: L,
): Workflow<L, EnsureOwnedSurfaceRequest<L>, EnsureOwnedSurfaceContext<L>> {
	return {
		check(request) {
			if (
				request.reading.lemma.language !== language ||
				request.ownedSurface.surface.lemma.language !== language
			)
				return invalidRequest(
					"Reading and owned Surface language must match the dictionary.",
				);
			if (
				!sameLemma(
					request.ownedSurface.surface.lemma,
					request.reading.lemma,
				)
			)
				return rejected(
					"invalidDraft",
					"The owned Surface must realize the Reading's Lemma.",
				);
			return ok(parseEnsureOwnedSurfaceRequest(language, request));
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "ensureOwnedSurface", request }),
			);
			return planned(planEnsureOwnedSurface(context, request));
		},
	};
}

function ensureReadingEntry<L extends Dumling.Language>(
	language: L,
): Workflow<L, EnsureReadingEntryRequest<L>, EnsureReadingEntryContext<L>> {
	return {
		check(request) {
			if (request.entry.reading.lemma.language !== language)
				return invalidRequest(
					"Reading language does not match the dictionary.",
				);
			if (request.entry.knowledge?.semanticRelations !== undefined)
				return invalidRequest(
					"ensureReadingEntry does not accept Semantic Relations; use a relation-aware Dumdict workflow.",
				);
			return ok(parseEnsureReadingEntryRequest(language, request));
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "ensureReadingEntry", request }),
			);
			return planned(planEnsureReadingEntry(context, request));
		},
	};
}

function cleanupRelations<L extends Dumling.Language>(
	language: L,
): Workflow<L, CleanupRelationsRequest<L>, CleanupRelationsSlice<L>> {
	return {
		check(request) {
			const keys = request.resolutions.map(({ locator }) =>
				pendingSemanticRelationLocatorKey(locator),
			);
			if (
				new Set(keys).size !== keys.length ||
				request.resolutions.some(
					({ locator }) =>
						!directSemanticRelationValues.includes(
							locator.relation,
						),
				)
			)
				return invalidRequest(
					"Cleanup resolution is invalid or duplicated.",
				);
			return ok(request);
		},
		plan(slice, request) {
			validateCleanupRelationsSlice(language, slice);
			if (slice.revision !== request.baseRevision)
				return {
					status: "conflict",
					code: "revisionConflict",
					message: "Cleanup workset is stale.",
				};
			const pendingKeys = new Set(
				slice.pendingRelations.map(({ locator }) =>
					pendingSemanticRelationLocatorKey(locator),
				),
			);
			if (
				request.resolutions.some(
					({ locator }) =>
						!pendingKeys.has(
							pendingSemanticRelationLocatorKey(locator),
						),
				)
			)
				return {
					status: "conflict",
					code: "semanticPreconditionFailed",
					message: "Cleanup pending relation no longer exists.",
				};
			// The plan holds only slice values the validation parsed: a
			// resolution's locator only selects a stored pending record.
			return planned(planCleanupRelations(slice, request));
		},
	};
}

function reevaluateShadows<L extends Dumling.Language>(
	language: L,
): Workflow<L, ReevaluateShadowsRequest<L>, ReevaluateShadowsSlice<L>> {
	return {
		check(request) {
			for (const shadow of request.shadows ?? []) {
				// A Shadow parses as a pending relation's target; the relation
				// is only the envelope that parser reads.
				const parsed = parsePendingSemanticRelationForDumdictRuntime({
					relation: "synonym",
					target: shadow,
				});
				if (
					parsed instanceof ParsingError ||
					!pendingTargetsLanguage(parsed, language)
				)
					return invalidRequest(
						"A re-evaluated Shadow is malformed or in another language.",
					);
			}
			for (const lemma of request.removedLemmas ?? [])
				if (
					parseAsLemmaRecord({ lemma }, language) instanceof
					ParsingError
				)
					return invalidRequest(
						"A removed Lemma is malformed or in another language.",
					);
			return ok(request);
		},
		plan(slice, request) {
			validateReevaluateShadowsSlice(language, slice, request);
			if (slice.revision !== request.baseRevision)
				return {
					status: "conflict",
					code: "revisionConflict",
					message: "Shadow re-evaluation slice is stale.",
				};
			return planned(planReevaluateShadows(slice, request));
		},
	};
}

export function createDumdictPlanner<L extends Dumling.Language>(
	language: L,
): DumdictPlanner<L> {
	const workflows = {
		addNewNote: addNewNote(language),
		applyGeneratedKnowledge: applyGeneratedKnowledge(language),
		ensureOwnedSurface: ensureOwnedSurface(language),
		ensureReadingEntry: ensureReadingEntry(language),
		cleanupRelations: cleanupRelations(language),
		reevaluateShadows: reevaluateShadows(language),
		recordOccurrence: recordOccurrence(language),
		removeOccurrence: removeOccurrence(language),
		reconcileAttestationLinks: reconcileAttestationLinks(language),
		rekeySurfaces: rekeySurfaces(language),
	};
	return {
		language,
		contextRequest: storageRequestFor,
		addNewNote: (context, request) =>
			run(workflows.addNewNote, context, request),
		applyGeneratedKnowledge: (context, request) =>
			run(workflows.applyGeneratedKnowledge, context, request),
		ensureOwnedSurface: (context, request) =>
			run(workflows.ensureOwnedSurface, context, request),
		ensureReadingEntry: (context, request) =>
			run(workflows.ensureReadingEntry, context, request),
		cleanupRelations: (slice, request) =>
			run(workflows.cleanupRelations, slice, request),
		reevaluateShadows: (slice, request) =>
			run(workflows.reevaluateShadows, slice, request),
		recordOccurrence: (context, request) =>
			run(workflows.recordOccurrence, context, request),
		occurrenceSliceRequest,
		removeOccurrence: (slice, request) =>
			run(workflows.removeOccurrence, slice, request),
		reconcileAttestationLinks: (slice, request) =>
			run(workflows.reconcileAttestationLinks, slice, request),
		rekeySurfacesSliceRequest,
		rekeySurfaces: (slice, request) =>
			run(workflows.rekeySurfaces, slice, request),
	};
}
