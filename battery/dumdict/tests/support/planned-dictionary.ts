import type * as Dumling from "dumling/types";

import type { StoreRevision } from "../../src/domain-types";
import type { SerializedDictionaryNote } from "../../src/dto";
import {
	parseAsCommitChangesRequest,
	unwrapDumdictParse,
} from "../../src/parsing/lightweight-parsers";
import type { ReadingEntryContextLoad } from "../../src/planner/context-request";
import {
	createDumdictPlanner,
	type DumdictPlanConflict,
	type DumdictPlanned,
	type DumdictPlanner,
	type DumdictPlanOutcome,
	type DumdictPlanRejected,
} from "../../src/planner/planner";
import type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
} from "../../src/public";
import {
	createInMemoryTestStorage,
	type InMemoryTestStorage,
} from "./in-memory-store";

type DictionaryApplied<L extends Dumling.Language> = Readonly<{
	status: "applied";
	baseRevision: StoreRevision;
	nextRevision: StoreRevision;
	affected: DumdictPlanned<L>["affected"];
	summary: DumdictPlanned<L>["summary"];
}>;

/** A plan the store refused at commit, with the store's latest revision. */
type DictionaryCommitConflict = DumdictPlanConflict &
	Readonly<{ latestRevision?: StoreRevision }>;

type DictionaryOutcome<L extends Dumling.Language> =
	| DictionaryApplied<L>
	| DumdictPlanRejected
	| DictionaryCommitConflict;

export type PlannedDictionaryStore<L extends Dumling.Language> = Pick<
	InMemoryTestStorage<L>,
	"commitChanges" | "loadCleanupRelationsContext" | "loadReadingEntryContext"
>;

type ReadingEntryPlans<L extends Dumling.Language> = {
	addNewNote(request: AddNewNoteRequest<L>): DumdictPlanOutcome<L>;
	applyGeneratedKnowledge(
		request: ApplyGeneratedKnowledgeRequest<L>,
	): DumdictPlanOutcome<L>;
	ensureOwnedSurface(
		request: EnsureOwnedSurfaceRequest<L>,
	): DumdictPlanOutcome<L>;
	ensureReadingEntry(
		request: EnsureReadingEntryRequest<L>,
	): DumdictPlanOutcome<L>;
};

/** What a planner host does per request: load the slice, plan, commit. */
export type PlannedDictionary<L extends Dumling.Language> = {
	readonly planner: DumdictPlanner<L>;
	/** Loads the slice and plans over it without committing. */
	readonly plan: ReadingEntryPlans<L>;
	addNewNote(request: AddNewNoteRequest<L>): DictionaryOutcome<L>;
	applyGeneratedKnowledge(
		request: ApplyGeneratedKnowledgeRequest<L>,
	): DictionaryOutcome<L>;
	ensureOwnedSurface(
		request: EnsureOwnedSurfaceRequest<L>,
	): DictionaryOutcome<L>;
	ensureReadingEntry(
		request: EnsureReadingEntryRequest<L>,
	): DictionaryOutcome<L>;
	cleanupRelations(request: CleanupRelationsRequest<L>): DictionaryOutcome<L>;
};

export function createPlannedDictionary<L extends Dumling.Language>(
	language: L,
	store: PlannedDictionaryStore<L>,
): PlannedDictionary<L> {
	const planner = createDumdictPlanner(language);
	const commit = (outcome: DumdictPlanOutcome<L>): DictionaryOutcome<L> => {
		if (outcome.status !== "planned") return outcome;
		const { plan, affected, summary } = outcome;
		if (plan.changes.length === 0)
			return {
				status: "applied",
				baseRevision: plan.baseRevision,
				nextRevision: plan.baseRevision,
				affected,
				summary,
			};
		const result = store.commitChanges(
			unwrapDumdictParse(parseAsCommitChangesRequest(plan, language)),
		);
		if (result.status === "committed")
			return {
				status: "applied",
				baseRevision: plan.baseRevision,
				nextRevision: result.nextRevision,
				affected,
				summary,
			};
		return {
			status: "conflict",
			code: result.code,
			...(result.latestRevision === undefined
				? {}
				: { latestRevision: result.latestRevision }),
			...(result.message === undefined
				? {}
				: { message: result.message }),
		};
	};
	const planFor =
		<Load extends ReadingEntryContextLoad<L>>(intent: Load["intent"]) =>
		(request: Load["request"]): DumdictPlanOutcome<L> => {
			const context = store.loadReadingEntryContext(
				planner.contextRequest({ intent, request } as Load),
			);
			return (
				planner[intent] as (
					context: unknown,
					request: Load["request"],
				) => DumdictPlanOutcome<L>
			)(context, request);
		};
	const plan: ReadingEntryPlans<L> = {
		addNewNote: planFor("addNewNote"),
		applyGeneratedKnowledge: planFor("applyGeneratedKnowledge"),
		ensureOwnedSurface: planFor("ensureOwnedSurface"),
		ensureReadingEntry: planFor("ensureReadingEntry"),
	};
	return {
		planner,
		plan,
		addNewNote: (request) => commit(plan.addNewNote(request)),
		applyGeneratedKnowledge: (request) =>
			commit(plan.applyGeneratedKnowledge(request)),
		ensureOwnedSurface: (request) =>
			commit(plan.ensureOwnedSurface(request)),
		ensureReadingEntry: (request) =>
			commit(plan.ensureReadingEntry(request)),
		cleanupRelations: (request) =>
			commit(
				planner.cleanupRelations(
					store.loadCleanupRelationsContext({
						resolutions: request.resolutions,
					}),
					request,
				),
			),
	};
}

/** A planner host over a fresh in-memory store seeded with `notes`. */
export function getBootedUpDumdict<L extends Dumling.Language>(
	language: L,
	notes: SerializedDictionaryNote<L>[] = [],
): { dict: PlannedDictionary<L>; storage: InMemoryTestStorage<L> } {
	const storage = createInMemoryTestStorage(language, notes);
	return { dict: createPlannedDictionary(language, storage), storage };
}

/** Narrows a planner outcome to a plan, failing the test otherwise. */
export function plannedOf<L extends Dumling.Language>(
	outcome: DumdictPlanOutcome<L>,
): DumdictPlanned<L> {
	if (outcome.status !== "planned")
		throw new Error(`Expected a plan, got ${JSON.stringify(outcome)}.`);
	return outcome;
}
