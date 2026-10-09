/**
 * Code's checks on the Canonical Form Luna writes for a Locution or an
 * interjection, where the Rules settle what it may hold (#876):
 *
 * - no placeholder a dictionary prints for an open slot (jemandem, etwas)
 *   unless a member spells it: a verbal Locution leaves its slots out
 *   (Rule de/idiom);
 * - no governed preposition: a member preposition left at the end of the
 *   headword (vielen Dank für, Rücksicht nehmen auf …), or one judged
 *   outside the headword with the slot after it (Rücksicht auf … nehmen),
 *   is dropped (Rules de/governed-preposition-joins-its-governor,
 *   de/routine-formula-is-intj); a fixed preposition inside the wording
 *   stays (mit den Wölfen heulen);
 * - no final exclamation or question mark (de/canonical-form-is-the-headword);
 * - in an adpositional, adverbial or conjunctional Locution, … exactly
 *   where the members leave a gap, as gold has it (um … willen, oder
 *   Ähnliches), a final zu of a conjunctional one always after one (ohne … zu).
 */

import { germanAdpositionEntry } from "dumcorpus/inventories";
import { foldCase } from "dumling";
import type { Target } from "./target.js";

const fold = (text: string) => foldCase(text, "de");
const placeholder = /^(jemand(e[mns]?)?|etwas)$/u;
const slotted = new Set(["ADP", "ADV", "CCONJ", "SCONJ"]);
const isPreposition = (word: string) =>
	germanAdpositionEntry({ family: "Lexeme", canonicalForm: word }) !== null;

/** Whether text other than whitespace and punctuation lies between two of the unit's members. */
function gapAfter(target: Target, position: number): boolean {
	const left = target.members[position];
	const right = target.members[position + 1];
	if (!left || !right) return false;
	return target.segments
		.slice(left.segment + 1, right.segment)
		.some((segment) => segment.kind === "ResolvableText");
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function guardedHeadword(
	target: Target,
	form: string,
	outside: ReadonlySet<number>,
): string {
	const { family, kind } = target.route;
	const locution = family === "Locution";
	if (!locution && !(family === "Lexeme" && kind === "INTJ")) return form;
	const words = (positions: (position: number) => boolean) =>
		new Set(
			target.members
				.filter(({ position }) => positions(position))
				.map(({ text }) => fold(text)),
		);
	const held = words((position) => !outside.has(position));
	const outsideWords = words((position) => outside.has(position));
	const memberWords = words(() => true);
	let tokens = form
		.replace(/\s*[!?]+$/u, "")
		.split(" ")
		.filter(Boolean);
	const kept: string[] = [];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index] ?? "";
		const word = fold(token.replace(/[,.]$/u, ""));
		if (
			outsideWords.has(word) &&
			!held.has(word) &&
			tokens[index + 1] === "…"
		) {
			index++;
			continue;
		}
		if (locution && placeholder.test(word) && !memberWords.has(word))
			continue;
		kept.push(token);
	}
	tokens = kept;
	// A member preposition the headword ends on is the one its head governs.
	// One lowercase preposition only (a capitalized Dank is the noun). A
	// verbal or nominal Locution never ends on one; an interjection drops
	// it only when judged governed or followed by a slot (o je keeps je).
	if (!locution || !slotted.has(kind)) {
		const slot = tokens.length > 1 && tokens[tokens.length - 1] === "…";
		if (slot) tokens.pop();
		const last = tokens[tokens.length - 1] ?? "";
		const word = fold(last);
		const verbal = locution && (kind === "VERB" || kind === "NOUN");
		if (
			tokens.length > 1 &&
			last === last.toLocaleLowerCase("de") &&
			memberWords.has(word) &&
			isPreposition(word) &&
			(verbal || slot || (outsideWords.has(word) && !held.has(word)))
		)
			tokens.pop();
	}
	if (locution && slotted.has(kind)) {
		const kept = target.members.filter(
			({ position }) => !outside.has(position),
		);
		const gaps = kept
			.slice(0, -1)
			.map(({ position }) => gapAfter(target, position));
		const bare = tokens.filter((token) => token !== "…");
		const zu =
			kind === "SCONJ" && fold(bare[bare.length - 1] ?? "") === "zu";
		if (zu && bare.length > 1) gaps[bare.length - 2] = true;
		if (!gaps.includes(true)) tokens = bare;
		else if (bare.length === kept.length || zu)
			tokens = bare.flatMap((token, index) =>
				gaps[index] ? [token, "…"] : [token],
			);
	}
	return tokens.join(" ").replace(/\s+…$/u, "").trim() || form;
}
