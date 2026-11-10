/**
 * Gold's answer to Luna's calls on a `resolve.grammar` click: the
 * Canonical Form call's headword and spellings, and, for an Emoji
 * Description asked alone, none, since grammar's gold holds no Reading.
 */

import { isRecord } from "common-utils";
import { foldCase } from "dumling";
import { z } from "zod";
import { storedAs } from "../../stored-json.js";
import type { GrammarCase } from "./cases.js";

type Values = Readonly<Record<string, unknown>>;

export const articleOfGender: Readonly<Record<string, string>> = {
	Masc: "der",
	Fem: "die",
	Neut: "das",
};
/**
 * The articles gold's Core gender takes: its one gender's, or each of a
 * mixed gender's, in catalog order (Rule de/noun-gender-in-free-variation).
 */
export const articlesOf = (gender: unknown): readonly string[] =>
	(isRecord(gender) && Array.isArray(gender.mixed)
		? gender.mixed
		: [gender]
	).flatMap((member) => articleOfGender[String(member)] ?? []);

/**
 * Whether a word is the separable particle of a VERB: its Lexeme's
 * `hasSepPrefix`, or a Locution's verb's first letters (`auf` of `einen
 * Bären aufbinden`).
 */
export function particleOf(lemma: GrammarCase["ideal"]["surface"]["lemma"]) {
	const core: Values = lemma.coreFeatures;
	const prefix = core.hasSepPrefix;
	const verb = foldCase(lemma.canonicalForm.split(" ").at(-1) ?? "", "de");
	return (word: string) =>
		typeof prefix === "string"
			? foldCase(prefix, "de") === word
			: lemma.family === "Locution" &&
				lemma.kind === "VERB" &&
				word.length < verb.length &&
				verb.startsWith(word);
}

/**
 * The base-order word a member realizes, by membership, not order (system
 * ADR 0056): a word it spells, a separable particle joined to its verb
 * (`auf` of `aufsteht`), or the preposition a pronominal adverb holds
 * (`damit` gives `mit`).
 */
export function realizes(
	attested: string,
	token: string,
	particle: (word: string) => boolean,
): "Whole" | "Piece" | "Split" | undefined {
	const word = foldCase(attested, "de");
	const spelled = foldCase(token, "de");
	if (spelled === word) return "Whole";
	if (particle(word) && spelled.startsWith(word)) return "Piece";
	const linker = /^[aeiouäöü]/u.test(spelled) ? "r" : "";
	if (
		[`da${linker}`, `wo${linker}`, "hier"].some(
			(adverb) => word === `${adverb}${spelled}`,
		)
	)
		return "Whole";
	// A piece of a split pronominal adverb (`da … für` of `dafür`).
	const [, adverb, preposition] =
		/^(dar|da|wor|wo|hier)(\p{L}+)$/u.exec(spelled) ?? [];
	return word === preposition ||
		(adverb !== undefined && word.length >= 2 && adverb.startsWith(word))
		? "Split"
		: undefined;
}

/** What the Canonical Form call sends Luna, as gold's answer reads it. */
const canonicalFormInputSchema = z.object({
	members: z.array(
		z.object({
			member: z.string(),
			text: z.string(),
			orthography: z.string(),
		}),
	),
	fixedMembers: z.record(z.string(), z.string()).optional(),
	outsideHeadword: z.array(z.string()).optional(),
});

/**
 * The base-order word left that a member's `text` realizes, searched in
 * `order`, and consumed: a whole word, or a joined particle's letters. A
 * piece of a split pronominal adverb (`da … für` of `dafür`) consumes
 * nothing, so the other piece finds it too. `next` is where the next
 * member's search starts.
 */
function takeWord(
	left: string[],
	order: readonly number[],
	text: string,
	particle: (word: string) => boolean,
): { index: number; word: string; next: number } | undefined {
	for (const index of order) {
		const token = left[index] ?? "";
		const found =
			token === "" ? undefined : realizes(text, token, particle);
		if (found === undefined) continue;
		if (found === "Split")
			return { index, word: foldCase(text, "de"), next: index };
		if (found === "Piece") {
			left[index] = token.slice(text.length);
			return { index, word: token.slice(0, text.length), next: index };
		}
		left[index] = "";
		const word =
			foldCase(token, "de") === foldCase(text, "de")
				? token
				: foldCase(text, "de");
		return { index, word, next: index + 1 };
	}
	return undefined;
}

/**
 * Gold's answer to the Canonical Form call: gold's headword, and each
 * member spelled as gold's Surface spells it, a member outside the
 * headword or fixed by the table as the request has it. A base-order
 * Surface has its own order (system ADR 0056), so members find their words
 * by membership: a Standard member the word it spells, or its piece of a
 * joined word (`auf` of `aufsteht`); a Typo, a Shorthand or a suspended
 * fragment then the words left, in order.
 */
export function goldWritten(goldCase: GrammarCase, input: unknown): unknown {
	// The Emoji Description drafted alone beside jev, where code wrote the
	// headword: gold has none to give.
	if (isRecord(input) && "markedSentence" in input && !("members" in input))
		return undefined;
	const { ideal } = goldCase;
	const request = storedAs(
		canonicalFormInputSchema,
		input,
		"The Canonical Form request's input",
	);
	const outside = new Set(request.outsideHeadword ?? []);
	const { lemma } = ideal.surface;
	const core: Values = lemma.coreFeatures;
	const left = ideal.surface.normalizedSurface.split(" ");
	const particle = particleOf(lemma);
	// From `from` on, then from the start: a Surface in sentence order
	// finds a repeated word in its place.
	const order = (from: number) => [
		...left.keys().filter((index) => index >= from),
		...left.keys().filter((index) => index < from),
	];
	const matched: (number | undefined)[] = [];
	let cursor = 0;
	const written = request.members.map(({ member, text, orthography }, at) => {
		const fixed = request.fixedMembers?.[member];
		if (outside.has(member) || fixed !== undefined) return fixed ?? text;
		const own =
			(orthography === "Standard" || orthography === "Fused") &&
			!/[-\u2010\u2011]$/u.test(text);
		if (!own) return undefined;
		const taken = takeWord(left, order(cursor), text, particle);
		if (taken) {
			matched[at] = taken.index;
			cursor = taken.next;
			return taken.word;
		}
		return orthography === "Standard" ? text : undefined;
	});
	// A Typo, a Shorthand, a suspended fragment or an unmatched Fused piece
	// takes the word left after its nearest matched neighbour before it.
	const last = request.members.length - 1;
	const members = request.members.map(({ text, orthography }, at) => {
		const word = written[at];
		if (word !== undefined) return word;
		const before = matched
			.slice(0, at)
			.findLast((index) => index !== undefined);
		const free = order((before ?? -1) + 1).filter((index) => left[index]);
		if (orthography === "Shorthand" && at === last) {
			const rest = free.map((index) => left[index]).join(" ");
			for (const index of free) left[index] = "";
			return rest || text;
		}
		const [index] = free;
		if (index === undefined) return text;
		const token = left[index] ?? text;
		left[index] = "";
		return token;
	});
	const { gender } = core;
	return {
		canonicalForm: lemma.canonicalForm,
		members,
		...(lemma.family === "Lexeme" && lemma.kind === "NOUN"
			? { article: articlesOf(gender)[0] ?? "none" }
			: {}),
	};
}
