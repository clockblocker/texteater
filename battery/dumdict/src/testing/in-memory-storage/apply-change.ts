import { applyDumdictKnowledgeChange } from "../../core/apply-reading-knowledge-change";
import { sameReading } from "../../core/identity";
import type { PlannedChangeOp } from "../../core/planned-changes";
import type { PendingSemanticRelationRecord } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { DraftStorageState } from "./preconditions";
import {
	findDraftBundleByLemma,
	findDraftBundleByReading,
} from "./preconditions";

function locatorKey<L extends SupportedLanguage>(
	record: PendingSemanticRelationRecord<L>,
) {
	const { sourceReadingKey, relation, targetPendingId } = record.locator;
	return `${sourceReadingKey}\0${relation}\0${targetPendingId}`;
}

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
			const key = locatorKey(change.record);
			bundle.pendingRelations = bundle.pendingRelations.filter(
				(record) => locatorKey(record) !== key,
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
