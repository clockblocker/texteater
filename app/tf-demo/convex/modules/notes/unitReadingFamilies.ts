import type * as Dumling from "dumling/types";

export type UnitReadingFamily = Extract<
	Dumling.Family<"de">,
	"Lexeme" | "Phraseme" | "Morpheme" | "Construction"
>;

const unitReadingFamilies = new Set<UnitReadingFamily>([
	"Lexeme",
	"Phraseme",
	"Morpheme",
	"Construction",
]);

export function isUnitReadingFamily(
	family: string,
): family is UnitReadingFamily {
	return unitReadingFamilies.has(family as UnitReadingFamily);
}
