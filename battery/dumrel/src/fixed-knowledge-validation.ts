import type { Lemma, Reading } from "dumling/types";
import { relationTargetWithinFamilySchema } from "./schema.js";
import type { LexemeUnitShadow, ReadingKnowledge } from "./types.js";

type AuthoredReadingKnowledge = ReadingKnowledge<
	string,
	Lemma,
	LexemeUnitShadow,
	Reading
>;

/** Validates every completed authored relation target against its source. */
export function validateAuthoredFixedKnowledge<
	Knowledge extends AuthoredReadingKnowledge,
>(source: Reading, knowledge: Knowledge): Knowledge {
	const relations = knowledge.semanticRelations;
	if (relations === undefined) return knowledge;
	const targetSchema = relationTargetWithinFamilySchema(source.lemma.family);
	const targetKind = relations.targetKind ?? "lemma";
	for (const [relation, targets] of Object.entries(relations)) {
		if (relation === "targetKind" || targets === undefined) continue;
		for (const target of targets as readonly Reading[] | readonly Lemma[]) {
			const lemma: Lemma =
				targetKind === "reading"
					? (target as Reading).lemma
					: (target as Lemma);
			targetSchema.parse({
				language: lemma.language,
				canonicalForm: lemma.canonicalForm,
				family: lemma.family,
				kind: lemma.kind,
			});
		}
	}
	return knowledge;
}
