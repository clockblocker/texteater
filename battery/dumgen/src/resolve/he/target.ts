/** Source-only Hebrew occurrence members. No model is allowed to rewrite them. */
import type * as Dumling from "dumling/types";
import type {
	SegmentedSentence,
	Unit,
} from "../../segment/segmented-sentence.js";

export function targetMembers(
	sentence: SegmentedSentence<"he">,
	unit: Unit<"he">,
): readonly Dumling.Attestation<"he">["members"][number][] {
	if (sentence.failed)
		throw Error("The Sentence's segmentation failed; segment it again");
	if (
		sentence.segments.map((segment) => segment.text).join("") !==
		sentence.text
	)
		throw Error("Segments do not reconstruct their Sentence");
	if (
		!sentence.units.some(
			(stored) =>
				stored.segments.length === unit.segments.length &&
				stored.segments.every(
					(index, at) => index === unit.segments[at],
				) &&
				JSON.stringify(stored.route) === JSON.stringify(unit.route),
		)
	)
		throw Error("The unit is not stored in its Sentence");
	if (unit.segments.length === 0) throw Error("A unit has a Segment");
	return unit.segments.map((index, position) => {
		const segment = sentence.segments[index];
		if (
			segment?.kind !== "ResolvableText" ||
			index <= (unit.segments[position - 1] ?? -1)
		)
			throw Error(
				"A unit's Segments are ascending ResolvableText Segments",
			);
		let start = index;
		let end = index;
		while (sentence.segments[start - 1]?.kind === "ResolvableText") start--;
		while (sentence.segments[end + 1]?.kind === "ResolvableText") end++;
		const pieces = sentence.segments.slice(start, end + 1);
		if (pieces.length === 1)
			return { attested: segment.text, orthography: "Standard" };
		const [first, second, ...rest] = pieces.map((piece) => ({
			span: piece.text,
			surface: piece.surface ?? piece.text,
		}));
		if (!first || !second) throw Error("A Fusion has two components");
		return {
			attested: segment.text,
			orthography: "Fused",
			fusion: {
				spelling: pieces.map((piece) => piece.text).join(""),
				components: [first, second, ...rest],
			},
			component: index - start,
		};
	});
}

export function markedHebrewSentence(
	sentence: SegmentedSentence<"he">,
	unit: Unit<"he">,
): string {
	const indices = new Set(unit.segments);
	return sentence.segments
		.map(({ text }, index) => (indices.has(index) ? `⟦${text}⟧` : text))
		.join("");
}

export function ownedArticle(
	sentence: SegmentedSentence<"he">,
	unit: Unit<"he">,
): number | undefined {
	if (
		unit.route === "Unresolved" ||
		unit.route.family !== "Lexeme" ||
		!["NOUN", "ADJ", "PROPN"].includes(unit.route.kind)
	)
		return undefined;
	return unit.segments.findIndex(
		(index, position) =>
			/^ה\p{M}*$/u.test(sentence.segments[index]?.text ?? "") &&
			unit.segments[position + 1] === index + 1,
	);
}
