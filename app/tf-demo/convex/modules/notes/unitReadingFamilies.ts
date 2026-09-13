import type * as Dumling from "dumling/types";

export type UnitReadingFamily = Extract<
	Dumling.Family<"de">,
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
