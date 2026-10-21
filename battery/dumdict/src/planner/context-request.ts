import type * as Dumling from "dumling/types";
import { unitShadowOf } from "../core/pending";
import type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
} from "../public";
import type { LoadReadingEntryContextRequest } from "../storage";

export type ReadingEntryContextLoad<L extends Dumling.Language> =
	| { intent: "addNewNote"; request: AddNewNoteRequest<L> }
	| {
			intent: "applyGeneratedKnowledge";
			request: ApplyGeneratedKnowledgeRequest<L>;
	  }
	| {
			intent: "ensureOwnedSurface";
			request: EnsureOwnedSurfaceRequest<L>;
	  }
	| {
			intent: "ensureReadingEntry";
			request: EnsureReadingEntryRequest<L>;
	  };

/** Translates a workflow request into the operation-shaped storage read it needs. */
export function storageRequestFor<L extends Dumling.Language>(
	load: ReadingEntryContextLoad<L>,
): LoadReadingEntryContextRequest<L> {
	switch (load.intent) {
		case "addNewNote":
			return {
				intent: load.intent,
				reading: load.request.draft.reading,
				ownedSurfaces:
					load.request.draft.ownedSurfaces?.map(
						({ surface }) => surface,
					) ?? [],
				relations: [...(load.request.draft.relations ?? [])],
			};
		case "applyGeneratedKnowledge":
			return {
				intent: load.intent,
				reading: load.request.reading,
				// Beside its proposals, the records a Lemma the changes name
				// may resolve to, which that exact naming absorbs.
				pendingRelations: [
					...load.request.pendingRelations,
					...namedLemmaShadows(load.request.changes),
				],
				relationTargetLemmas: load.request.changes.flatMap((change) =>
					change.aspect === "semanticRelations" &&
					"value" in change &&
					change.targetKind !== "reading"
						? [...change.value]
						: [],
				),
				relationTargetReadings: load.request.changes.flatMap(
					(change) =>
						change.aspect === "semanticRelations" &&
						"value" in change &&
						change.targetKind === "reading"
							? [...change.value]
							: [],
				),
			};
		case "ensureOwnedSurface":
			return {
				intent: load.intent,
				reading: load.request.reading,
				surface: load.request.ownedSurface.surface,
			};
		case "ensureReadingEntry":
			return {
				intent: load.intent,
				reading: load.request.entry.reading,
			};
	}
}

/**
 * The pending relation, from the changed Reading, of every Lemma a Knowledge
 * Change names as a Semantic Relation target: the Shadows whose resolved
 * records that naming would absorb.
 */
function namedLemmaShadows<L extends Dumling.Language>(
	changes: ApplyGeneratedKnowledgeRequest<L>["changes"],
): ApplyGeneratedKnowledgeRequest<L>["pendingRelations"][number][] {
	return changes.flatMap((change) =>
		change.aspect === "semanticRelations" &&
		"value" in change &&
		change.targetKind !== "reading"
			? change.value.map((lemma) => ({
					relation: change.relation,
					target: unitShadowOf(lemma),
				}))
			: [],
	);
}
