import {
	headOf,
	resolvedUnitAt,
	resolvedWordAt,
	selectIdentity,
	targetOf,
} from "dumgen";
import type { SentenceAnalysis } from "dumgen/types";
import { type StoredSegment, storedSegmentRanges } from "./storedSegments";

/** Selection reads offsets, which a stored Segment's text alone determines. */
export type StoredSegmentForSelection = Pick<
	StoredSegment,
	"index" | "kind" | "text"
>;

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
 * Stored Segments are index-keyed and analysed Segments offset-keyed, but
 * they are the same Segments: a fused word is stored as its pieces
 * (ADR 0035), so each stored Segment starts where one analysed Segment does
 * and spells it. The Stitched Text is the bridge: stored Segments concatenate
 * to it, so each owns the offset `start`. A stored Sentence that does not
 * match its analysis this way is broken, and the selector throws. The largest
 * resolved unit at the clicked Segment is the target, and its members are the
 * stored Segments at its offsets.
 *
 * A lone word whose selected identity is AUX is classified: ADR 0026 forbids
 * AUX as a target, and texteater#523 decides what the selector should do
 * instead. Every classified outcome names its reason.
 *
 * The `word` layer skips any Phraseme over the click: the clicked word is
 * what a host resolves once grammar refuses the Phraseme.
 */
export function selectAnalysisTarget(
	analysis: SentenceAnalysis | null | undefined,
	stored: {
		readonly stitchedText: string;
		readonly segments: readonly StoredSegmentForSelection[];
	},
	clickedSegmentIndex: number,
	layer: "largest" | "word" = "largest",
): AnalysisSelection {
	if (!analysis) return { target: null, reason: "noAnalysis" };
	if (analysis.stitchedText !== stored.stitchedText)
		return { target: null, reason: "stitchedMismatch" };
	const ranges = storedSegmentRanges(stored);
	if (!ranges) return { target: null, reason: "lengthMismatch" };
	const analysed = new Map(
		analysis.segments.map((segment) => [segment.offset, segment]),
	);
	const offsets = new Map<number, number>();
	for (const segment of stored.segments) {
		const range = ranges.get(segment.index);
		const match = range && analysed.get(range.start);
		if (!range || match?.text !== segment.text)
			throw new Error(
				`Stored Segment ${segment.index} ("${segment.text}") is not an analysed Segment; a fused word must be stored as its pieces.`,
			);
		offsets.set(segment.index, range.start);
	}
	const clicked = offsets.get(clickedSegmentIndex);
	const anchor = clicked === undefined ? undefined : analysed.get(clicked);
	if (anchor?.kind !== "ResolvableText")
		return { target: null, reason: "noAnchor" };
	const unit =
		layer === "word"
			? resolvedWordAt(analysis, anchor.offset)
			: resolvedUnitAt(analysis, anchor.offset);
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
	const memberSegmentIndices = [...stored.segments]
		.sort((left, right) => left.index - right.index)
		.flatMap(({ index }) =>
			covered.has(offsets.get(index) ?? -1) ? [index] : [],
		);
	return {
		target: { family: unit.family, kind: unit.kind, memberSegmentIndices },
	};
}
