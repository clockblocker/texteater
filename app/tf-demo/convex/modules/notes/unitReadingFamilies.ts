import type { LemmaFamilyFor } from "dumling/types";

export type UnitReadingFamily = Extract<
	LemmaFamilyFor<"de">,
	"Lexeme" | "Phraseme" | "Morpheme"
>;

const unitReadingFamilies = new Set<UnitReadingFamily>([
	"Lexeme",
	"Phraseme",
	"Morpheme",
]);

export function isUnitReadingFamily(
	family: string,
): family is UnitReadingFamily {
	return unitReadingFamilies.has(family as UnitReadingFamily);
}
