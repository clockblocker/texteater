import type { PendingLemmaRef, PendingLemmaRelation } from "../../dto";
import type { DumlingId, SupportedLanguage } from "../../dumling";
import type { NewNoteSlice } from "../../storage";
import { makePendingLemmaRef } from "../pending/identity";
import { pendingRelationKey, uniqueBy } from "./dedupe";
import type { AddNewNoteIntent } from "./result";

export function planPendingRelationsAndRefs<L extends SupportedLanguage>({
	slice,
	intent,
	language,
	lemmaId,
}: {
	slice: NewNoteSlice<L>;
	intent: AddNewNoteIntent<L>;
	language: L;
	lemmaId: DumlingId<"Lemma", L>;
}): {
	pendingRefsToCreateById: Map<string, PendingLemmaRef<L>>;
	pendingRelationEntries: PendingLemmaRelation<L>[];
} {
	const pendingRelations =
		intent.draft.relations?.filter(
			(relation) => relation.target.kind === "pending",
		) ?? [];
	const existingPendingRefIds = new Set(
		slice.existingPendingRefsForProposedPendingTargets.map(
			({ pendingId }) => pendingId,
		),
	);
	const pendingRefsToCreateById = new Map<string, PendingLemmaRef<L>>();
	const pendingRelationEntries: PendingLemmaRelation<L>[] = uniqueBy(
		pendingRelations.map((relation) => {
			if (relation.target.kind !== "pending") {
				throw new Error("Unexpected existing relation target");
			}

			const pendingRef = makePendingLemmaRef({
				language,
				canonicalLemma: relation.target.ref.canonicalLemma,
				lemmaKind: relation.target.ref.lemmaKind,
				lemmaSubKind: relation.target.ref.lemmaSubKind,
			});
			if (!existingPendingRefIds.has(pendingRef.pendingId)) {
				pendingRefsToCreateById.set(pendingRef.pendingId, pendingRef);
			}

			if (relation.relationFamily === "lexical") {
				return {
					sourceLemmaId: lemmaId,
					relationFamily: "lexical",
					relation: relation.relation,
					targetPendingId: pendingRef.pendingId,
				};
			}

			return {
				sourceLemmaId: lemmaId,
				relationFamily: "morphological",
				relation: relation.relation,
				targetPendingId: pendingRef.pendingId,
			};
		}),
		pendingRelationKey,
	);

	return { pendingRefsToCreateById, pendingRelationEntries };
}
