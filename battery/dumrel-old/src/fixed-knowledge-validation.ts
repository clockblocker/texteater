import type { Lemma, Reading } from "dumling-old/types";
import {
	ParsingError,
	parseAsLexicalUnitShadow,
} from "./parsing/lightweight-parsers.js";
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
	const targetKind = relations.targetKind ?? "lemma";
	for (const [relation, targets] of Object.entries(relations)) {
		if (relation === "targetKind" || targets === undefined) continue;
		for (const target of targets as readonly Reading[] | readonly Lemma[]) {
			const lemma: Lemma =
				targetKind === "reading"
					? (target as Reading).lemma
					: (target as Lemma);
			const parsed = parseAsLexicalUnitShadow({
				language: lemma.language,
				canonicalForm: lemma.canonicalForm,
				family: lemma.family,
				kind: lemma.kind,
			});
			if (parsed instanceof ParsingError) throw parsed;
			if (parsed.family !== source.lemma.family)
				throw new ParsingError([
					{
						code: "custom",
						path: ["family"],
						message: `A relation target must use the ${source.lemma.family} Family.`,
					},
				]);
		}
	}
	return knowledge;
}
