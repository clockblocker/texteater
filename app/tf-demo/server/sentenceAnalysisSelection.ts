import { resolvedUnitAt } from "dumgen";
import type { SentenceAnalysis } from "dumgen/types";

export type StoredSegmentForSelection = {
	readonly index: number;
	readonly kind: string;
	readonly text: string;
};

export type SelectedAnalysisTarget = {
	readonly family: "Lexeme" | "Phraseme";
	readonly kind: string;
	readonly memberSegmentIndices: readonly number[];
};

/**
 * Reads the stored Sentence Analysis for one click instead of classifying.
 *
 * Stored Segments are index-keyed and hold the unsplit word; analysed
 * Segments are offset-keyed and a fused word is one Segment per component.
 * The bridge is the Stitched Text: stored Segments concatenate to it, so each
 * stored Segment owns the offset range `[start, start + text.length)`. The
 * click lands on the first analysed ResolvableText Segment in the clicked
 * range (the first component of a fused word), and the largest resolved unit
 * there is the target.
 *
 * A stored Segment is a member iff every analysed Segment inside its range is
 * in the unit. The `r` of `zur` may serve a NOUN as Article while `zu` stays
 * a separate ADP; that NOUN does not cover the stored `zur`, but a Collocation
 * over both does. When the clicked Segment itself is not a member the unit
 * cannot be expressed at stored granularity and the caller classifies.
 */
export function selectAnalysisTarget(
	analysis: SentenceAnalysis,
	stored: {
		readonly stitchedText: string;
		readonly segments: readonly StoredSegmentForSelection[];
	},
	clickedSegmentIndex: number,
): SelectedAnalysisTarget | null {
	if (analysis.stitchedText !== stored.stitchedText) return null;
	const ordered = [...stored.segments].sort(
		(left, right) => left.index - right.index,
	);
	const ranges = new Map<number, { start: number; end: number }>();
	let cursor = 0;
	for (const segment of ordered) {
		ranges.set(segment.index, {
			start: cursor,
			end: cursor + segment.text.length,
		});
		cursor += segment.text.length;
	}
	if (cursor !== stored.stitchedText.length) return null;
	const clicked = ranges.get(clickedSegmentIndex);
	if (!clicked) return null;
	const analysed = [...analysis.segments].sort(
		(left, right) => left.offset - right.offset,
	);
	const within = (range: { start: number; end: number }) =>
		analysed.filter(
			(segment) =>
				segment.offset >= range.start && segment.offset < range.end,
		);
	const anchor = within(clicked).find(
		(segment) => segment.kind === "ResolvableText",
	);
	if (!anchor) return null;
	const unit = resolvedUnitAt(analysis, anchor.offset);
	if (!unit) return null;
	const covered = new Set(unit.offsets);
	const memberSegmentIndices = ordered.flatMap((segment) => {
		const range = ranges.get(segment.index);
		if (!range) return [];
		const inside = within(range);
		return inside.length > 0 &&
			inside.every((entry) => covered.has(entry.offset))
			? [segment.index]
			: [];
	});
	if (!memberSegmentIndices.includes(clickedSegmentIndex)) return null;
	return { family: unit.family, kind: unit.kind, memberSegmentIndices };
}
