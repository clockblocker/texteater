import { expect } from "bun:test";
import { sameLemma, sameReading } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";

import type {
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPendingSemanticRelation,
	LemmaRecord,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
} from "../../domain-types";
import {
	parseAsCommitChangesRequest,
	unwrapDumdictParse,
} from "../../parsing/lightweight-parsers";
import type { DumdictPlanOutcome } from "../../planner/planner";
import type {
	CleanupRelationResolution,
	ReevaluateShadowsRequest,
} from "../../public";
import type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	OccurrenceSlice,
	OccurrenceSliceRequest,
	ReadingEntryContext,
	ReevaluateShadowsSlice,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
} from "../../storage";
import {
	gehenReading,
	gehenSurface,
	laufenReading,
	schreitenPending,
} from "./fixtures";

/**
 * The storage operations the conformance suite drives: the commit, and the
 * slice reads the planner plans from. A failing Effect fails the test.
 */
export type ConformanceStorage = {
	commitChanges(
		request: CommitChangesRequest<"de">,
	): Effect.Effect<CommitChangesResult, unknown>;
	loadReadingEntryContext(
		request: LoadReadingEntryContextRequest<"de">,
	): Effect.Effect<ReadingEntryContext<"de">, unknown>;
	/** The slice `cleanupRelations` plans from, for these resolutions. */
	loadCleanupRelationsContext(request: {
		resolutions: CleanupRelationResolution<"de">[];
	}): Effect.Effect<CleanupRelationsSlice<"de">, unknown>;
	/**
	 * The slice `reevaluateShadows` plans from: every stored record whose
	 * Pending Entry ID is one of `reevaluatedPendingEntryIds(request)`, every
	 * stored Reading claiming a removed Lemma or one of its Readings, and
	 * their relation inventory.
	 */
	loadReevaluateShadowsContext(
		request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
	): Effect.Effect<ReevaluateShadowsSlice<"de">, unknown>;
	/**
	 * The slice `removeOccurrence` and `reconcileAttestationLinks` plan
	 * from: each stored Lemma one of whose Readings holds a link with a
	 * requested ref, whole, every other Reading claiming one of them or their
	 * Readings, and every stored Shadow relation one of them matches. A store
	 * that keeps no Attestation Links (`attestationLinks: false`) answers no
	 * Lemma.
	 */
	loadOccurrenceSlice(
		request: OccurrenceSliceRequest,
	): Effect.Effect<OccurrenceSlice<"de">, unknown>;
	/**
	 * The slice `rekeySurfaces` plans from: each stored Surface Entry with a
	 * requested id, without its Surface, and each Reading whose links name
	 * one.
	 */
	loadRekeySurfacesSlice(
		request: RekeySurfacesSliceRequest<"de">,
	): Effect.Effect<RekeySurfacesSlice<"de">, unknown>;
	/**
	 * Removes a Lemma as the host does outside Dumdict's plans, such as when
	 * the user deletes its note: the Lemma, its Readings with their pending
	 * records, and its owned Surfaces. Claims other Readings hold on it stay
	 * until a re-evaluation moves them.
	 */
	removeLemma(lemma: Dumling.Lemma<"de">): Effect.Effect<void, unknown>;
};

export const semanticConflict = {
	status: "conflict",
	code: "semanticPreconditionFailed",
} as const;

export function run<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
	return Effect.runPromise(effect);
}

export async function commit(
	storage: ConformanceStorage,
	changes: PlannedChangeOp<"de">[],
): Promise<CommitChangesResult> {
	const { revision } = await readingContext(storage, gehenReading);
	return run(storage.commitChanges({ baseRevision: revision, changes }));
}

export async function seed(
	storage: ConformanceStorage,
	changes: PlannedChangeOp<"de">[],
): Promise<void> {
	const result = await commit(storage, changes);
	if (result.status !== "committed")
		throw new Error(
			`Expected the seed commit to commit, got ${JSON.stringify(result)}.`,
		);
}

/** Commits a planner's plan as a host does: parsed, at its base revision. */
export async function commitPlan(
	storage: ConformanceStorage,
	outcome: DumdictPlanOutcome<"de">,
): Promise<CommitChangesResult> {
	if (outcome.status !== "planned")
		throw new Error(`Expected a plan, got ${JSON.stringify(outcome)}.`);
	return run(
		storage.commitChanges(
			unwrapDumdictParse(parseAsCommitChangesRequest(outcome.plan, "de")),
		),
	);
}

export async function readingContext(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
) {
	const context = await run(
		storage.loadReadingEntryContext({
			intent: "ensureReadingEntry",
			reading,
		}),
	);
	if (context.intent !== "ensureReadingEntry")
		throw new Error(`Expected an ensureReadingEntry context.`);
	return context;
}

export async function knowledgeOf(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
): Promise<ReadingEntry<"de">["knowledge"]> {
	return (await readingContext(storage, reading)).existingReading?.knowledge;
}

export async function exactPending(
	storage: ConformanceStorage,
	pendingRelations: DumdictPendingSemanticRelation<"de">[],
	reading: Dumling.Reading<"de"> = gehenReading,
) {
	const context = await run(
		storage.loadReadingEntryContext({
			intent: "applyGeneratedKnowledge",
			reading,
			pendingRelations,
			relationTargetLemmas: [],
			relationTargetReadings: [],
		}),
	);
	if (context.intent !== "applyGeneratedKnowledge")
		throw new Error(`Expected an applyGeneratedKnowledge context.`);
	return context.exactPendingRelations;
}

export async function pendingMatchingLemma(
	storage: ConformanceStorage,
	lemma: Dumling.Lemma<"de", "Lexeme", "VERB">,
) {
	const context = await run(
		storage.loadReadingEntryContext({
			intent: "addNewNote",
			reading: { unitKind: "Reading", lemma, emojiDescription: "🦶" },
			ownedSurfaces: [],
			relations: [],
			attestationRefs: [],
		}),
	);
	if (context.intent !== "addNewNote")
		throw new Error(`Expected an addNewNote context.`);
	return context.pendingRelationsMatchingProposedLemma;
}

/** Every fixture value a refused commit must leave as it was. */
export async function snapshot(storage: ConformanceStorage) {
	const surfaces = await run(
		storage.loadReadingEntryContext({
			intent: "ensureOwnedSurface",
			reading: gehenReading,
			surface: gehenSurface,
		}),
	);
	return {
		surfaces,
		laufen: await readingContext(storage, laufenReading),
		pending: await exactPending(storage, [schreitenPending]),
	};
}

export type RelationInventory = {
	readonly relationLemmas: readonly LemmaRecord<"de">[];
	readonly relationReadings: readonly ReadingEntry<"de">[];
};

/**
 * The records the store holds among these Lemmas and Readings, as its own
 * single-record reads return them.
 */
export async function storedInventory(
	storage: ConformanceStorage,
	lemmas: readonly Dumling.Lemma<"de">[],
	readings: readonly Dumling.Reading<"de">[],
): Promise<RelationInventory> {
	const lemmaReads = await Promise.all(
		lemmas.map(async (lemma) => {
			const probe = {
				unitKind: "Reading",
				lemma,
				emojiDescription: "🔎",
			};
			return (
				await readingContext(storage, probe as Dumling.Reading<"de">)
			).existingLemma;
		}),
	);
	const readingReads = await Promise.all(
		readings.map(
			async (reading) =>
				(await readingContext(storage, reading)).existingReading,
		),
	);
	return {
		relationLemmas: lemmaReads.filter((record) => record !== undefined),
		relationReadings: readingReads.filter((entry) => entry !== undefined),
	};
}

/**
 * Checks a relation inventory a host may bound to a neighbourhood of its
 * dictionary. The inventory must hold the stored record of every `required`
 * Lemma and Reading, and every record it holds must equal a `stored` one. A
 * host that loads more than the neighbourhood passes; one that drops a
 * needed record, returns it stale, or invents one fails.
 */
export function expectBoundedInventory(
	inventory: RelationInventory,
	stored: RelationInventory,
	required: {
		readonly lemmas: readonly Dumling.Lemma<"de">[];
		readonly readings: readonly Dumling.Reading<"de">[];
	},
): void {
	for (const lemma of required.lemmas) {
		const record = stored.relationLemmas.find((value) =>
			sameLemma(value.lemma, lemma),
		);
		if (!record) throw new Error("A required Lemma is not stored.");
		expect(inventory.relationLemmas).toContainEqual(record);
	}
	for (const reading of required.readings) {
		const entry = stored.relationReadings.find((value) =>
			sameReading(value.reading, reading),
		);
		if (!entry) throw new Error("A required Reading is not stored.");
		expect(inventory.relationReadings).toContainEqual(entry);
	}
	for (const record of inventory.relationLemmas)
		expect(stored.relationLemmas).toContainEqual(record);
	for (const entry of inventory.relationReadings)
		expect(stored.relationReadings).toContainEqual(entry);
}

/** A stored pending record once its Shadow resolves to `lemma`. */
export function resolvedTo(
	record: PendingSemanticRelationRecord<"de">,
	lemma: Dumling.Lemma<"de">,
): PendingSemanticRelationRecord<"de"> {
	return { ...record, resolvedLemma: lemma };
}

/** The same records, in any order: a store may list them in its own. */
export function expectSameRecords(
	actual: readonly PendingSemanticRelationRecord<"de">[],
	expected: readonly PendingSemanticRelationRecord<"de">[],
): void {
	expect(actual).toHaveLength(expected.length);
	expect(actual).toEqual(expect.arrayContaining([...expected]));
}
