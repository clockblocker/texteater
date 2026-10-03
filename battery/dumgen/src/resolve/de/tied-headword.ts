/**
 * The Canonical Form of a Locution or Saying, assembled by code from words
 * Luna ties to the unit's members (#876). Luna lists the headword's words
 * in the dictionary's order: each is a member, kept as Luna spells it or,
 * for a Locution, cited in another form (the infinitive of an inflected
 * verb), or a fixed word the sentence lacks, which counts only where the
 * unit was judged Partial (a Locution may also add its article). Code
 * joins them: pieces of one written word glue, an open slot is … where
 * the members leave a gap in an adpositional, adverbial or conjunctional
 * Locution (Rule de/canonical-form-is-the-headword), never in a verbal
 * one, whose slots are left out (de/idiom). So Luna cannot reword a
 * Saying's fixed words, cut it short, or add a placeholder such as
 * jemandem.
 */
import { foldCase } from "dumling";
import { InvalidModelOutput } from "../../errors.js";
import type { Target } from "./target.js";

/** One word of the headword as Luna ties it. */
export type TiedWord = {
	/** `m3` for a member, empty for a fixed word the sentence lacks. */
	readonly member: string;
	/** The member cited in another form, or the missing word; empty keeps the member. */
	readonly text: string;
	/** A comma follows the word in the dictionary wording. */
	readonly comma: boolean;
};

/** Whether a route's Canonical Form is assembled from tied words. */
export const tiedRoute = (target: Target) =>
	target.route.family === "Locution" || target.route.family === "Saying";

/** The output schema's `words`. */
export const tiedWordsSchema = {
	type: "array",
	minItems: 1,
	items: {
		type: "object",
		properties: {
			member: { type: "string" },
			text: { type: "string" },
			comma: { type: "boolean" },
		},
		required: ["member", "text", "comma"],
		additionalProperties: false,
	},
} as const;

/** Kinds whose open slots are … in the Canonical Form (um … willen). */
const slotted = new Set(["ADP", "ADV", "CCONJ", "SCONJ"]);

/** Articles a Locution's dictionary wording may hold where the sentence has none or another. */
const articles = new Set(
	"der die das den dem des ein eine einen einem einer eines".split(" "),
);

/** Placeholders a dictionary prints for an open slot, never part of a Canonical Form. */
const placeholder = /^(jemand(e[mns]?)?|etwas|irgendwer|irgendwas)$/u;

const fold = (text: string) => foldCase(text, "de");

/** Whether text other than whitespace and punctuation lies between two Segments. */
function gapBetween(target: Target, left: number, right: number): boolean {
	return target.segments
		.slice(left + 1, right)
		.some((segment) => segment.kind === "ResolvableText");
}

/**
 * The Canonical Form the tied words give, from the members' spellings
 * Luna wrote; a Saying that leaves out or reorders a member it holds is no
 * answer.
 */
export function assembleTied(
	target: Target,
	words: readonly unknown[],
	spelled: readonly string[],
	options: {
		readonly coverage: "Full" | "Partial";
		/** Members no part of the headword: owned article, governed preposition, auxiliary. */
		readonly outside: ReadonlySet<number>;
	},
): string | InvalidModelOutput {
	const unusable = (message: string) =>
		new InvalidModelOutput({ stage: "canonical", message });
	const saying = target.route.family === "Saying";
	type Piece = { position?: number; text: string; comma: boolean };
	const pieces: Piece[] = [];
	const used = new Set<number>();
	for (const raw of words) {
		const word = raw as Partial<TiedWord> | null;
		if (!word || typeof word !== "object") continue;
		const text = typeof word.text === "string" ? word.text.trim() : "";
		const comma = word.comma === true;
		const reference = /^m(\d+)$/u.exec(
			typeof word.member === "string" ? word.member : "",
		);
		if (reference) {
			const position = Number(reference[1]);
			const own = spelled[position];
			if (own === undefined || used.has(position)) continue;
			if (options.outside.has(position)) continue;
			used.add(position);
			// A Saying keeps its members as written unless judged Partial (a
			// word deliberately changed); a Locution may cite one in its
			// dictionary form.
			pieces.push({
				position,
				text:
					!text ||
					placeholder.test(fold(text)) ||
					(saying && options.coverage !== "Partial")
						? own
						: text,
				comma,
			});
			continue;
		}
		if (!text || placeholder.test(fold(text))) continue;
		const allowed =
			options.coverage === "Partial" ||
			(!saying && articles.has(fold(text)));
		if (allowed) pieces.push({ text, comma });
	}
	const held = target.members
		.map(({ position }) => position)
		.filter((position) => !options.outside.has(position));
	if (saying) {
		const order = pieces.flatMap(({ position }) =>
			position === undefined ? [] : [position],
		);
		if (order.join() !== held.join())
			return unusable(
				"Luna's Saying left out or reordered the members it holds",
			);
	}
	if (pieces.length === 0)
		return unusable("Luna tied no word to the headword");
	const slots = !saying && slotted.has(target.route.kind);
	let form = "";
	let previous: Piece | undefined;
	for (const piece of pieces) {
		const before = previous?.position;
		const glued =
			piece.position !== undefined &&
			before !== undefined &&
			piece.position === before + 1 &&
			target.glued.has(piece.position);
		const gap =
			slots &&
			piece.position !== undefined &&
			before !== undefined &&
			(gapBetween(
				target,
				target.members[before]?.segment ?? 0,
				target.members[piece.position]?.segment ?? 0,
			) ||
				(target.route.kind === "SCONJ" && fold(piece.text) === "zu"));
		form +=
			form === ""
				? piece.text
				: glued
					? piece.text
					: `${gap ? " …" : ""} ${piece.text}`;
		if (piece.comma) form += ",";
		previous = piece;
	}
	form = form.replace(/,$/u, "").trim();
	return saying
		? form.charAt(0).toLocaleUpperCase("de") + form.slice(1)
		: form;
}
