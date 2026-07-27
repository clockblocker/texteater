import type {
	LexicalRelation,
	LexicalRelations,
	MorphologicalRelation,
	MorphologicalRelations,
} from "../../dto";
import type { DumlingId, SupportedLanguage } from "../../dumling";
import type { NewNoteSlice } from "../../storage";
import type { PlannedChangeOp } from "../planned-changes";
import { inverseRelationFor } from "../relations/inverse-rules";
import type { AddNewNoteIntent } from "./result";

export function appendLexicalRelation<L extends SupportedLanguage>(
	relations: LexicalRelations<L>,
	relation: LexicalRelation,
	targetLemmaId: DumlingId<"Lemma", L>,
) {
	const existing = relations[relation] ?? [];
	if (!existing.includes(targetLemmaId)) {
		relations[relation] = [...existing, targetLemmaId];
	}
}

export function appendMorphologicalRelation<L extends SupportedLanguage>(
	relations: MorphologicalRelations<L>,
	relation: MorphologicalRelation,
	targetLemmaId: DumlingId<"Lemma", L>,
) {
	const existing = relations[relation] ?? [];
	if (!existing.includes(targetLemmaId)) {
		relations[relation] = [...existing, targetLemmaId];
	}
}

export function planPickupRelationPatches<L extends SupportedLanguage>({
	slice,
	lemmaId,
	lexicalRelations,
	morphologicalRelations,
}: {
	slice: NewNoteSlice<L>;
	lemmaId: DumlingId<"Lemma", L>;
	lexicalRelations: LexicalRelations<L>;
	morphologicalRelations: MorphologicalRelations<L>;
}): PlannedChangeOp<L>[] {
	return slice.incomingPendingRelationsForNewLemma.map((relation) => {
		if (relation.relationFamily === "lexical") {
			appendLexicalRelation(
				lexicalRelations,
				inverseRelationFor(relation.relationFamily, relation.relation),
				relation.sourceLemmaId,
			);
			return {
				type: "patchLemma",
				lemmaId: relation.sourceLemmaId,
				ops: [
					{
						kind: "addRelation",
						family: "lexical",
						relation: relation.relation,
						targetLemmaId: lemmaId,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId: relation.sourceLemmaId },
				],
			};
		}

		appendMorphologicalRelation(
			morphologicalRelations,
			inverseRelationFor(relation.relationFamily, relation.relation),
			relation.sourceLemmaId,
		);
		return {
			type: "patchLemma",
			lemmaId: relation.sourceLemmaId,
			ops: [
				{
					kind: "addRelation",
					family: "morphological",
					relation: relation.relation,
					targetLemmaId: lemmaId,
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaExists", lemmaId: relation.sourceLemmaId },
			],
		};
	});
}

export function planExplicitExistingRelationPatches<
	L extends SupportedLanguage,
>({
	slice,
	intent,
	lemmaId,
	lexicalRelations,
	morphologicalRelations,
}: {
	slice: NewNoteSlice<L>;
	intent: AddNewNoteIntent<L>;
	lemmaId: DumlingId<"Lemma", L>;
	lexicalRelations: LexicalRelations<L>;
	morphologicalRelations: MorphologicalRelations<L>;
}): PlannedChangeOp<L>[] {
	const explicitExistingRelations =
		intent.draft.relations?.filter(
			(relation) => relation.target.kind === "existing",
		) ?? [];

	return explicitExistingRelations.map((relation) => {
		if (relation.target.kind !== "existing") {
			throw new Error("Unexpected pending relation target");
		}

		if (relation.relationFamily === "lexical") {
			appendLexicalRelation(
				lexicalRelations,
				relation.relation,
				relation.target.lemmaId,
			);
			return {
				type: "patchLemma",
				lemmaId: relation.target.lemmaId,
				ops: [
					{
						kind: "addRelation",
						family: "lexical",
						relation: inverseRelationFor(
							relation.relationFamily,
							relation.relation,
						),
						targetLemmaId: lemmaId,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId: relation.target.lemmaId },
				],
			};
		}

		appendMorphologicalRelation(
			morphologicalRelations,
			relation.relation,
			relation.target.lemmaId,
		);
		return {
			type: "patchLemma",
			lemmaId: relation.target.lemmaId,
			ops: [
				{
					kind: "addRelation",
					family: "morphological",
					relation: inverseRelationFor(
						relation.relationFamily,
						relation.relation,
					),
					targetLemmaId: lemmaId,
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaExists", lemmaId: relation.target.lemmaId },
			],
		};
	});
}
