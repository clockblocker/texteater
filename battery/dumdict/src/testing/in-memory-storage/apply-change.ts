import {
	lemmaKey,
	readingKey,
	sameLemma,
	sameReading,
} from "../../core/identity";
import type { PlannedChangeOp } from "../../core/planned-changes";
import type { PendingEntryRelation } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { DraftStorageState } from "./preconditions";
import {
	findDraftBundleByLemma,
	findDraftBundleByReading,
} from "./preconditions";

function sourceKeyFor<L extends SupportedLanguage>(
	relation: PendingEntryRelation<L>,
) {
	return relation.relationFamily === "lexical"
		? readingKey(relation.sourceReading)
		: lemmaKey(relation.sourceLemma);
}

function bundleForPendingRelation<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	relation: PendingEntryRelation<L>,
) {
	return relation.relationFamily === "lexical"
		? findDraftBundleByReading(draft, relation.sourceReading)
		: findDraftBundleByLemma(draft, relation.sourceLemma);
}

export function applyChange<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: PlannedChangeOp<L>,
): boolean {
	switch (change.type) {
		case "createLemma":
			draft.draftNotes.push({
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
			if (!bundle) {
				return false;
			}
			bundle.readingEntries.push(structuredClone(change.entry));
			return true;
		}
		case "createOwnedSurface": {
			const bundle = findDraftBundleByLemma(
				draft,
				change.entry.ownerLemma,
			);
			if (!bundle) {
				return false;
			}
			bundle.ownedSurfaceEntries.push(structuredClone(change.entry));
			return true;
		}
		case "createPendingRef":
			draft.draftPendingRefs?.push(structuredClone(change.ref));
			return true;
		case "createPendingRelation": {
			const bundle = bundleForPendingRelation(draft, change.relation);
			if (!bundle) {
				return false;
			}
			bundle.pendingRelations.push(structuredClone(change.relation));
			return true;
		}
		case "deletePendingRelation": {
			const bundle = bundleForPendingRelation(draft, change.relation);
			if (!bundle) {
				return false;
			}
			bundle.pendingRelations = bundle.pendingRelations.filter(
				(relation) =>
					!(
						sourceKeyFor(relation) ===
							sourceKeyFor(change.relation) &&
						relation.relationFamily ===
							change.relation.relationFamily &&
						relation.relation === change.relation.relation &&
						relation.targetPendingId ===
							change.relation.targetPendingId
					),
			);
			return true;
		}
		case "deletePendingRef": {
			const refIndex =
				draft.draftPendingRefs?.findIndex(
					({ pendingId }) => pendingId === change.pendingId,
				) ?? -1;
			if (refIndex >= 0) {
				draft.draftPendingRefs?.splice(refIndex, 1);
			}
			return true;
		}
		case "patchReading":
			return applyReadingPatch(draft, change);
		case "patchLemma":
			return applyLemmaPatch(draft, change);
	}
}

function applyReadingPatch<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: Extract<PlannedChangeOp<L>, { type: "patchReading" }>,
) {
	const bundle = findDraftBundleByReading(draft, change.reading);
	const reading = bundle?.readingEntries.find((entry) =>
		sameReading(entry.reading, change.reading),
	);
	if (!reading) {
		return false;
	}

	for (const op of change.ops) {
		if (op.kind === "addAttestation") {
			reading.attestations.push(op.value);
		} else {
			const existingTargets = reading.lexicalRelations[op.relation] ?? [];
			if (
				!existingTargets.some((target) =>
					sameReading(target, op.targetReading),
				)
			) {
				reading.lexicalRelations[op.relation] = [
					...existingTargets,
					op.targetReading,
				];
			}
		}
	}
	return true;
}

function applyLemmaPatch<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: Extract<PlannedChangeOp<L>, { type: "patchLemma" }>,
) {
	const record = findDraftBundleByLemma(draft, change.lemma)?.lemmaRecord;
	if (!record) {
		return false;
	}
	for (const op of change.ops) {
		const existingTargets =
			record.morphologicalRelations[op.relation] ?? [];
		if (
			!existingTargets.some((target) => sameLemma(target, op.targetLemma))
		) {
			record.morphologicalRelations[op.relation] = [
				...existingTargets,
				op.targetLemma,
			];
		}
	}
	return true;
}
