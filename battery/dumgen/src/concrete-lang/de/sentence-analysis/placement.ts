/**
 * Segment placement: the input sentence's Segments become offset-keyed
 * analysed Segments, with fused words split by the German fusion table,
 * apostrophe clitics expanded and abbreviations given their expansion as
 * surface (Dumgen ADR 0004). An entry with candidate surfaces places the
 * first; assembly replaces it with the one the Selected identity realizes.
 * Concatenated, the placed Segments give the
 * Stitched Text back: fused components keep the source letters and casing
 * (`Im` places `I` + `m`) while their surface stays the authored one.
 */
import type { SegmentedSentence } from "../../../types.js";
import {
	abbreviationEntry,
	cliticEntry,
	fusedWordPieces,
	fusionEntry,
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
	/** Candidate surfaces per placed offset whose entry authors several ('s: es or das). */
	readonly choices: ReadonlyMap<number, readonly string[]>;
};

const first = (surface: string | readonly string[]) => {
	const value = typeof surface === "string" ? surface : surface[0];
	if (!value) throw Error("A fusion component has a surface");
	return value;
};

export function placeSegments(sentence: SegmentedSentence<"de">): Placement {
	const segments: AnalyzedSegment[] = [];
	const fusions: Fusion[] = [];
	const pieces = new Map<number, AnalyzedSegment[]>();
	const resolvable: number[] = [];
	const choices = new Map<number, readonly string[]>();
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
		if (segment.kind !== "ResolvableText") {
			push(segment.kind, segment.text, segment.text);
			pieces.set(index, own);
			continue;
		}
		resolvable.push(index);
		const fusion = fusionEntry(germanFusionTable, segment.text);
		const entry =
			abbreviationEntry(germanFusionTable, segment.text) ??
			cliticEntry(germanFusionTable, segment.text);
		if (fusion) {
			const start = offset;
			const texts = fusedWordPieces(fusion, segment.text);
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
		} else if (entry) {
			if (typeof entry.surface !== "string")
				choices.set(offset, entry.surface);
			push("ResolvableText", segment.text, first(entry.surface));
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
		choices,
	};
}
