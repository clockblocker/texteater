import { headOf, resolvedUnitAt, selectIdentity, targetOf } from "dumgen";
import type { SentenceAnalysis } from "dumgen/types";
import { storedSegmentRanges } from "./attestedGovernment";

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
 * Why a click was classified instead of read from the analysis. The selector
 * reports all but `invalidEncounter`, which the caller names when the
 * selected target fails Encounter validation.
 */
export type ClassificationReason =
	| "noAnalysis"
	| "stitchedMismatch"
	| "lengthMismatch"
	| "noAnchor"
	| "noResolvedUnit"
	| "identityMiss"
	| "auxSingleton"
	| "clickedNotMember"
	| "invalidEncounter";

export type AnalysisSelection =
	| { readonly target: SelectedAnalysisTarget }
	| {
			readonly target: null;
			readonly reason: Exclude<ClassificationReason, "invalidEncounter">;
	  };

/**
 * Reads the stored Sentence Analysis for one click instead of classifying.
 *
 * Stored Segments are index-keyed; analysed Segments are offset-keyed and a
 * fused word is one Segment per component. Sentences stored since intake
 * split fused words match the analysed Segments one to one; older ones hold
 * the unsplit word. The bridge is the Stitched Text: stored Segments
 * concatenate to it, so each stored Segment owns the offset range
 * `[start, start + text.length)`. The click lands on the first analysed
 * ResolvableText Segment in the clicked range, and the largest resolved unit
 * there is the target.
 *
 * A stored Segment is a member iff every analysed Segment inside its range is
 * in the unit. In an older Sentence the `r` of `zur` may serve a NOUN as
 * Article while `zu` stays a separate ADP; that NOUN does not cover the
 * stored `zur`, but a Collocation over both does. When the clicked Segment
 * itself is not a member the unit cannot be expressed at stored granularity
 * and the caller classifies.
 *
 * A lone word whose selected identity is AUX is classified as well: ADR 0026
 * forbids AUX as a target, and texteater#523 decides what the selector should
 * do instead. Every classified outcome names its reason.
 */
export function selectAnalysisTarget(
	analysis: SentenceAnalysis | null | undefined,
	stored: {
		readonly stitchedText: string;
		readonly segments: readonly StoredSegmentForSelection[];
	},
	clickedSegmentIndex: number,
): AnalysisSelection {
	if (!analysis) return { target: null, reason: "noAnalysis" };
	if (analysis.stitchedText !== stored.stitchedText)
		return { target: null, reason: "stitchedMismatch" };
	const ordered = [...stored.segments].sort(
		(left, right) => left.index - right.index,
	);
	const ranges = storedSegmentRanges(stored);
	if (!ranges) return { target: null, reason: "lengthMismatch" };
	const clicked = ranges.get(clickedSegmentIndex);
	if (!clicked) return { target: null, reason: "noAnchor" };
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
	if (!anchor) return { target: null, reason: "noAnchor" };
	const unit = resolvedUnitAt(analysis, anchor.offset);
	// Without a resolved Phraseme the unit is the anchor's word.
	const word = targetOf(analysis, anchor.offset);
	const identity = word ? selectIdentity(word, headOf(word)) : null;
	if (!unit)
		return {
			target: null,
			reason:
				identity?.state === "Miss" ? "identityMiss" : "noResolvedUnit",
		};
	if (
		unit.family === "Lexeme" &&
		word?.members.length === 1 &&
		identity?.state === "Selected" &&
		identity.candidate.kind === "AUX"
	)
		return { target: null, reason: "auxSingleton" };
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
	if (!memberSegmentIndices.includes(clickedSegmentIndex))
		return { target: null, reason: "clickedNotMember" };
	return {
		target: { family: unit.family, kind: unit.kind, memberSegmentIndices },
	};
}
