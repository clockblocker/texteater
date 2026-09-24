import type * as Dumling from "dumling/types";

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
				pendingRelations: [...load.request.pendingRelations],
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
