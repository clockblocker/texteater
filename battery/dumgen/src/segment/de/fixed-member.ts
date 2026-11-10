/**
 * de/fixed-member-test as the unit stage asks it of one unit beside the
 * rest of a multiword expression: is it a fixed part of that expression, a
 * free part the expression only takes, meant literally, or joined by no
 * expression at all? The Locution Choice (`locution-choice.ts`) asks it of
 * the two units a merge would join, and the member check
 * (`member-check.ts`) of every member of a Locution membership assembled.
 * The Rules keep some one-word units out of any Locution whatever the
 * judge reads (`keptApart`), so neither asks about them.
 */
import { closedVerbForms, modalVerbs } from "dumcorpus/inventories";
import { choice } from "../ask.js";
import { foldedText, reflexiveForms } from "./candidates.js";
import type { Nomination } from "./nomination.js";
import { joinRefs } from "./sentence.js";

/** Every form of the six modal verbs. */
export const modalForms: ReadonlySet<string> = new Set(
	modalVerbs.flatMap((modal) => closedVerbForms[modal] ?? []),
);

/**
 * A unit of one word the Rules keep out of any Locution the judge
 * proposes: nicht (de/nicht-is-part), a modal (de/modal-is-a-verb), and a
 * pronoun or determiner other than a reflexive, since a pronoun joins a
 * Locution only as its lexical reflexive
 * (de/verb-owns-its-scattered-members) or an object es that das cannot
 * replace (de/fixed-member-test), which nomination's own links decide.
 */
export function keptApart(
	nomination: Pick<Nomination, "sentence" | "inventory">,
	group: readonly number[],
): boolean {
	const [only] = group;
	const piece =
		group.length === 1 && only !== undefined
			? nomination.sentence.pieces[only - 1]
			: undefined;
	if (!piece) return false;
	const word = piece.text.toLowerCase();
	return (
		word === "nicht" ||
		modalForms.has(word) ||
		(!reflexiveForms.has(foldedText(piece)) &&
			nomination.inventory.identityCandidates(piece.text).length > 0)
	);
}

/** The pieces as written, with … where pieces outside them stand between. */
export function wordingOf(
	nomination: Pick<Nomination, "sentence">,
	ids: readonly number[],
): string {
	const { pieces, segments } = nomination.sentence;
	const sorted = [...ids].sort((a, b) => a - b);
	let text = "";
	for (const [position, id] of sorted.entries()) {
		const piece = pieces[id - 1];
		if (!piece) continue;
		const previous = pieces[(sorted[position - 1] ?? 0) - 1];
		if (previous && previous.id === piece.id - 1)
			text += segments
				.slice(previous.segment + 1, piece.segment)
				.map((segment) => segment.text)
				.join("");
		else if (previous) text += " … ";
		text += piece.text;
	}
	return text;
}

const criteria = {
	fixed: "A fixed part of one established expression with the other words, an idiom, support-verb collocation, fixed phrase or routine formula: the expression needs this very word, and an ordinary synonym or another word of its kind would break it (Kauf in nahm … in Kauf; Holzweg in war auf dem Holzweg)",
	free: "A free part: a subject, object, complement or modifier that the expression only takes, where another word of its kind could stand in the same sense, das for es included (die Kosten in nahm die Kosten in Kauf)",
	literal:
		"The words are meant literally here, so no expression joins them (Holzweg in ging auf dem Holzweg durch den Wald)",
	none: "No established expression joins these words (Hut in kaufte einen Hut)",
};

/**
 * The options in the order each asker lists them: last the answer that
 * leaves membership as it is, `none` for a merge the Locution Choice
 * weighs and `fixed` for a member the member check weighs, which is also
 * what a judge that cannot tell picks in the tests' fakes.
 */
const orders = {
	merge: criteria,
	member: {
		free: criteria.free,
		literal: criteria.literal,
		none: criteria.none,
		fixed: criteria.fixed,
	},
};

/**
 * de/fixed-member-test of `unit` beside `other`, the rest of the wording
 * `whole`: a Choice of `fixed`, `free`, `literal` or `none`, listed in the
 * order of `asker`.
 */
export function fixedMemberQuestion(
	nomination: Pick<Nomination, "sentence" | "ref">,
	unit: readonly number[],
	other: readonly number[],
	whole: readonly number[],
	asker: keyof typeof orders,
) {
	const { sentence, ref } = nomination;
	const wording = wordingOf(nomination, unit);
	return choice(
		`In \`sentence\`, ${joinRefs(sentence, ref, unit)} ("${wording}") may belong with ${joinRefs(sentence, ref, other)} ("${wordingOf(nomination, other)}") to one established multiword expression, "${wordingOf(nomination, whole)}". What is "${wording}" there? A word's article, auxiliary, particle or reflexive counts with that word.`,
		orders[asker],
	);
}
