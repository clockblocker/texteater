import type { SupportedLanguage } from "../../dumling";
import type { CommitChangesRequest, CommitChangesResult } from "../../storage";
import type { SerializedDictionaryNote } from "../serialized-note";
import { applyChange } from "./apply-change";
import {
	type DraftStorageState,
	draftPreconditionFails,
} from "./preconditions";
import type { InMemoryStorageState } from "./state";

export function commitChanges<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: CommitChangesRequest<L>,
): CommitChangesResult {
	if (request.baseRevision !== state.currentRevision()) {
		return {
			status: "conflict",
			code: "revisionConflict",
			latestRevision: state.currentRevision(),
		};
	}

	const draft: DraftStorageState<L> = {
		currentRevision: () => state.currentRevision(),
		draftNotes: structuredClone(
			state.storedNotes,
		) as SerializedDictionaryNote<L>[],
		draftPendingRefs: structuredClone(state.storedPendingRefs),
	};

	for (const change of request.changes) {
		if (
			change.preconditions.some((precondition) =>
				draftPreconditionFails(draft, precondition),
			)
		) {
			return semanticConflict(state);
		}
		if (!applyChange(draft, change)) {
			return semanticConflict(state);
		}
	}

	state.storedNotes = draft.draftNotes;
	state.storedPendingRefs = draft.draftPendingRefs ?? [];
	state.revisionNumber += 1;
	return {
		status: "committed",
		nextRevision: state.currentRevision(),
	};
}

function semanticConflict<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
) {
	return {
		status: "conflict" as const,
		code: "semanticPreconditionFailed" as const,
		latestRevision: state.currentRevision(),
	};
}
