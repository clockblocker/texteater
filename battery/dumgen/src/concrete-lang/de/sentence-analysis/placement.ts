/**
 * Segment placement: the input sentence's Segments become offset-keyed
 * analysed Segments, with fused words split by the German fusion table,
 * apostrophe clitics expanded and abbreviations given their expansion as
 * surface (Dumgen ADR 0004). Concatenated, the placed Segments give the
 * Stitched Text back: fused components keep the source letters and casing
 * (`Im` places `I` + `m`) while their surface stays the authored one.
 */
import type { SegmentedSentence } from "../../../types.js";
import {
	abbreviationEntry,
	fusionEntry,
	splitClitic,
} from "../../../universal/fusion-table.js";
import { germanFusionTable } from "../fusion-entries.js";
import type { AnalyzedSegment, Fusion } from "./analysis.js";

export type Placement = {
	readonly stitchedText: string;
	readonly segments: readonly AnalyzedSegment[];
	readonly fusions: readonly Fusion[];
	/** Placed Segments per input Segment index. */
	readonly pieces: ReadonlyMap<number, readonly AnalyzedSegment[]>;
	/** Input Segment indices that are ResolvableText, in order. */
	readonly resolvable: readonly number[];
};

const first = (surface: string | readonly string[]) => {
	const value = typeof surface === "string" ? surface : surface[0];
	if (!value) throw Error("A fusion component has a surface");
	return value;
};

/**
 * The source letters of each fusion component, cut by the lengths of the
 * authored spans. The authored spans are NFC; a combining mark stays with the
 * letter before it, so an NFD `fu\u0308rs` still cuts after `für`.
 */
function componentTexts(
	text: string,
	spans: readonly string[],
): readonly string[] {
	const characters = Array.from(text);
	let position = 0;
	return spans.map((span, index) => {
		const start = position;
		if (index === spans.length - 1) position = characters.length;
		else
			for (let letter = 0; letter < Array.from(span).length; letter++) {
				position++;
				while (/^\p{M}$/u.test(characters[position] ?? "")) position++;
			}
		return characters.slice(start, position).join("");
	});
}

export function placeSegments(sentence: SegmentedSentence<"de">): Placement {
	const segments: AnalyzedSegment[] = [];
	const fusions: Fusion[] = [];
	const pieces = new Map<number, AnalyzedSegment[]>();
	const resolvable: number[] = [];
	let offset = 0;
	for (const [index, segment] of sentence.segments.entries()) {
		const own: AnalyzedSegment[] = [];
		const push = (
			kind: AnalyzedSegment["kind"],
			text: string,
			surface: string,
		) => {
			const placed = { offset, kind, text, surface };
			segments.push(placed);
			own.push(placed);
			offset += text.length;
		};
		const previous = sentence.segments[index - 1];
		if (segment.kind !== "ResolvableText") {
			push(segment.kind, segment.text, segment.text);
			pieces.set(index, own);
			continue;
		}
		resolvable.push(index);
		const fusion = fusionEntry(germanFusionTable, segment.text);
		const abbreviation = abbreviationEntry(germanFusionTable, segment.text);
		const clitic =
			previous && /^[’']$/u.test(previous.text)
				? splitClitic(germanFusionTable, `x'${segment.text}`)
				: null;
		if (fusion) {
			const start = offset;
			const texts = componentTexts(
				segment.text,
				fusion.components.map((component) => component.span),
			);
			for (const [position, component] of fusion.components.entries())
				push(
					"ResolvableText",
					texts[position] ?? "",
					first(component.surface),
				);
			fusions.push({
				offset: start,
				form: segment.text,
				components: own.map((piece, position) => {
					const component = fusion.components[position];
					if (!component) throw Error("Fusion components align");
					return {
						offset: piece.offset,
						span: piece.text,
						surface: piece.surface,
						role: component.role,
					};
				}),
			});
		} else if (abbreviation) {
			push("ResolvableText", segment.text, first(abbreviation.surface));
		} else if (clitic) {
			// The segmenter already cut `geht's` into host, apostrophe and `s`.
			push("ResolvableText", segment.text, first(clitic.entry.surface));
		} else {
			push("ResolvableText", segment.text, segment.text);
		}
		pieces.set(index, own);
	}
	return {
		stitchedText: segments.map((segment) => segment.text).join(""),
		segments,
		fusions,
		pieces,
		resolvable,
	};
}
