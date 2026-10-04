import type * as Dumling from "dumling/types";

import { applyDumdictKnowledgeChange } from "../../core/apply-reading-knowledge-change";
import { readingLemma, sameReading } from "../../core/identity";
import { samePendingSemanticRelationLocator } from "../../core/pending";
import type { PlannedChangeOp } from "../../domain-types";
import type { DraftStorageState } from "./preconditions";
import {
	findDraftBundleByLemma,
	findDraftBundleByReading,
} from "./preconditions";

export function applyChange<L extends Dumling.Language>(
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
				readingLemma(change.entry.reading),
			);
			if (!bundle) return false;
			const relations = change.entry.knowledge?.semanticRelations;
			if (relations)
				for (const [relation, targets] of Object.entries(relations))
					if (relation !== "targetKind" && Array.isArray(targets))
						assertRelationTargetsStored(
							draft,
							relations.targetKind,
							targets,
						);
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

function applyReadingPatch<L extends Dumling.Language>(
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
		if (op.kind === "addAttestation") {
			reading = {
				...reading,
				attestations: [...reading.attestations, op.value],
			};
			continue;
		}
		const knowledgeChange = op.envelope.change;
		if (
			knowledgeChange.aspect === "semanticRelations" &&
			"value" in knowledgeChange
		)
			assertRelationTargetsStored(
				draft,
				knowledgeChange.targetKind,
				knowledgeChange.value,
			);
		reading = applyDumdictKnowledgeChange(reading, op.envelope);
	}
	bundle.readingEntries[index] = reading;
	return true;
}

/**
 * A direct Semantic Relation names a stored Lemma or Reading; a target the
 * dictionary does not hold is a pending relation. Naming a missing target is
 * an invalid Knowledge Change, so the commit throws and writes nothing.
 */
function assertRelationTargetsStored<L extends Dumling.Language>(
	draft: DraftStorageState<L>,
	targetKind: unknown,
	targets: readonly unknown[],
) {
	for (const target of targets) {
		if (
			targetKind === "reading"
				? !findDraftBundleByReading(draft, target as Dumling.Reading<L>)
				: !findDraftBundleByLemma(draft, target as Dumling.Lemma<L>)
		)
			throw new Error(
				`A Semantic Relation target ${targetKind === "reading" ? "Reading" : "Lemma"} is missing.`,
			);
	}
}
