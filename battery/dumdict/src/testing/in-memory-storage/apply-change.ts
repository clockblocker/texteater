import type { SupportedLanguage } from "dumling/types";
import { applyDumdictKnowledgeChange } from "../../core/apply-reading-knowledge-change";
import { sameReading } from "../../core/identity";
import { samePendingSemanticRelationLocator } from "../../core/pending";
import type { PlannedChangeOp } from "../../core/planned-changes";
import type { DraftStorageState } from "./preconditions";
import {
	findDraftBundleByLemma,
	findDraftBundleByReading,
} from "./preconditions";

export function applyChange<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: PlannedChangeOp<L>,
): boolean {
	switch (change.type) {
		case "createLemma":
			draft.draftNotes.push({
				schemaVersion: 1,
				lemmaRecord: structuredClone(change.record),
				readingEntries: [],
				ownedSurfaceEntries: [],
				pendingRelations: [],
			});
			return true;
		case "createReading": {
			const bundle = findDraftBundleByLemma(
				draft,
				change.entry.reading.lemma,
			);
			if (!bundle) return false;
			bundle.readingEntries.push(structuredClone(change.entry));
			return true;
		}
		case "createOwnedSurface": {
			const bundle = findDraftBundleByLemma(
				draft,
				change.entry.ownerLemma,
			);
			if (!bundle) return false;
			bundle.ownedSurfaceEntries.push(structuredClone(change.entry));
			return true;
		}
		case "createPendingSemanticRelation": {
			const bundle = findDraftBundleByReading(
				draft,
				change.record.sourceReading,
			);
			if (!bundle) return false;
			bundle.pendingRelations.push(structuredClone(change.record));
			return true;
		}
		case "deletePendingSemanticRelation": {
			const bundle = findDraftBundleByReading(
				draft,
				change.record.sourceReading,
			);
			if (!bundle) return false;
			bundle.pendingRelations = bundle.pendingRelations.filter(
				(record) =>
					!samePendingSemanticRelationLocator(
						record.locator,
						change.record.locator,
					),
			);
			return true;
		}
		case "patchReading":
			return applyReadingPatch(draft, change);
	}
}

function applyReadingPatch<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: Extract<PlannedChangeOp<L>, { type: "patchReading" }>,
) {
	const bundle = findDraftBundleByReading(draft, change.reading);
	const index =
		bundle?.readingEntries.findIndex((entry) =>
			sameReading(entry.reading, change.reading),
		) ?? -1;
	if (!bundle || index < 0) return false;
	let reading = bundle.readingEntries[index];
	if (!reading) return false;
	for (const op of change.ops) {
		if (op.kind === "addAttestation")
			reading = {
				...reading,
				attestations: [...reading.attestations, op.value],
			};
		else reading = applyDumdictKnowledgeChange(reading, op.envelope);
	}
	bundle.readingEntries[index] = reading;
	return true;
}
