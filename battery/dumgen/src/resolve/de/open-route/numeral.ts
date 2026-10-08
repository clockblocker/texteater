/**
 * A NUM's headword where the Rules settle it, whatever Luna wrote: digits
 * spell their numeral word, a numeral Locution's members spell its
 * headword (Rule de/digits-spell-the-numeral).
 */

import { numeralWord } from "../numeral.js";
import { joinMembers, type Target } from "../target.js";

/**
 * A numeral Locution's headword when Luna wrote it with an open slot: a …
 * in it (von … bis …) cites a dictionary pattern, not this unit, whose
 * headword is its members' words, digits spelled (zehn bis zwölf; Rules
 * de/canonical-form-is-the-headword, de/digits-spell-the-numeral).
 * Undefined keeps Luna's.
 */
export function numeralLocutionHeadword(
	target: Target,
	written: string,
	spelled: readonly string[],
	outsideHeadword: ReadonlySet<number>,
): string | undefined {
	if (
		target.route.family !== "Locution" ||
		target.route.kind !== "NUM" ||
		!written.split(" ").includes("…")
	)
		return undefined;
	return joinMembers(
		spelled.map((word) => numeralWord(word) ?? word),
		target.glued,
		outsideHeadword,
	);
}

/** A NUM Lexeme's one member in digits spells its headword: 12 is zwölf. */
export function digitsHeadword(target: Target): string | undefined {
	const [only] = target.members;
	return target.route.family === "Lexeme" &&
		target.route.kind === "NUM" &&
		target.members.length === 1 &&
		only
		? numeralWord(only.text)
		: undefined;
}
