import type * as Dumling from "dumling/types";

/** A Foreign Reading is no Unit Reading: it has no Emoji Description (ADR 0045). */
export type UnitReadingFamily = Extract<
	Dumling.Family<"de">,
	"Lexeme" | "Locution" | "Saying" | "Morpheme"
>;

const unitReadingFamilies = new Set<UnitReadingFamily>([
	"Lexeme",
	"Locution",
	"Saying",
	"Morpheme",
]);

/**
 * The Emoji Description of a stored Reading the caller knows is a Unit
 * Reading. Only a Foreign Reading has none (ADR 0045).
 */
export function unitReadingEmojiDescription(reading: {
	readonly emojiDescription?: string;
}): string {
	if (reading.emojiDescription === undefined) {
		throw new Error("A Unit Reading has an Emoji Description.");
	}
	return reading.emojiDescription;
}

export function isUnitReadingFamily(
	family: string,
): family is UnitReadingFamily {
	return unitReadingFamilies.has(family as UnitReadingFamily);
}
