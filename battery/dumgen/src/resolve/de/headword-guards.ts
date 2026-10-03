/**
 * Code's checks on the Canonical Form Luna writes for a Locution or an
 * interjection, where the Rules settle what it may hold (#876):
 *
 * - no placeholder a dictionary prints for an open slot (jemandem, etwas)
 *   unless a member spells it: a verbal Locution leaves its slots out
 *   (Rule de/idiom);
 * - no member outside the headword, such as the preposition the head
 *   governs, nor the slot after it (vielen Dank für is vielen Dank; Rules
 *   de/governed-preposition-joins-its-governor, de/routine-formula-is-intj);
 * - in an adpositional, adverbial or conjunctional Locution, … exactly
 *   where the members leave a gap, as gold has it (um … willen, oder
 *   Ähnliches; de/canonical-form-is-the-headword), a trailing zu always
 *   after one (ohne … zu).
 */
import { foldCase } from "dumling";
import type { Target } from "./target.js";

const fold = (text: string) => foldCase(text, "de");
const placeholder = /^(jemand(e[mns]?)?|etwas)$/u;
const slotted = new Set(["ADP", "ADV", "CCONJ", "SCONJ"]);

/** Whether text other than whitespace and punctuation lies between two of the unit's members. */
function gapAfter(target: Target, position: number): boolean {
	const left = target.members[position];
	const right = target.members[position + 1];
	if (!left || !right) return false;
	return target.segments
		.slice(left.segment + 1, right.segment)
		.some((segment) => segment.kind === "ResolvableText");
}

export function guardedHeadword(
	target: Target,
	form: string,
	outside: ReadonlySet<number>,
): string {
	const { family, kind } = target.route;
	const locution = family === "Locution";
	if (!locution && !(family === "Lexeme" && kind === "INTJ")) return form;
	const spelled = new Set(
		target.members
			.filter(({ position }) => !outside.has(position))
			.map(({ text }) => fold(text)),
	);
	const dropped = new Set(
		target.members
			.filter(({ position }) => outside.has(position))
			.map(({ text }) => fold(text))
			.filter((word) => !spelled.has(word)),
	);
	let tokens = form.split(" ").filter(Boolean);
	const kept: string[] = [];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index] ?? "";
		const word = fold(token.replace(/[,.!?]$/u, ""));
		if (dropped.has(word)) {
			if (tokens[index + 1] === "…") index++;
			continue;
		}
		if (locution && placeholder.test(word) && !spelled.has(word)) continue;
		kept.push(token);
	}
	tokens = kept;
	if (locution && slotted.has(kind)) {
		const held = target.members.filter(
			({ position }) => !outside.has(position),
		);
		const gaps = held
			.slice(0, -1)
			.map(({ position }) => gapAfter(target, position));
		const last = held[held.length - 1];
		const zu =
			kind === "SCONJ" && last !== undefined && fold(last.text) === "zu";
		if (zu) gaps[gaps.length - 1] = true;
		const words = tokens.filter((token) => token !== "…");
		if (!gaps.includes(true)) tokens = words;
		else if (words.length === held.length)
			tokens = words.flatMap((token, index) =>
				gaps[index] ? [token, "…"] : [token],
			);
	}
	return tokens.join(" ").replace(/\s+…$/u, "").trim() || form;
}
