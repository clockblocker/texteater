import { governedPrepositionsAt } from "dumgen/authored";
import type { GovernedPrepositionDraft } from "dumgen/types";
import {
	fromStoredSentenceAnalysis,
	type StoredSentenceAnalysis,
} from "./sentenceAnalysisStorage";

type StoredSentence = {
	readonly stitchedText: string;
	readonly segments: readonly {
		readonly index: number;
		readonly text: string;
	}[];
};

/**
 * Each stored Segment's `[start, end)` range in the Stitched Text, the bridge
 * from index-keyed stored Segments to offset-keyed analysed ones. Null when
 * the stored Segments do not concatenate to the Stitched Text.
 */
export function storedSegmentRanges(
	stored: StoredSentence,
): Map<number, { start: number; end: number }> | null {
	const ranges = new Map<number, { start: number; end: number }>();
	let cursor = 0;
	for (const segment of [...stored.segments].sort(
		(left, right) => left.index - right.index,
	)) {
		ranges.set(segment.index, {
			start: cursor,
			end: cursor + segment.text.length,
		});
		cursor += segment.text.length;
	}
	return cursor === stored.stitchedText.length ? ranges : null;
}

/**
 * The governed prepositions one stored occurrence attests (ADR 0030): intake
 * government whose governor has a member inside the occurrence's Segments.
 * Empty without an analysis, before intake resolved government, or when the
 * analysis no longer matches the stored Sentence.
 */
export function attestedGovernment(
	analysis: StoredSentenceAnalysis | null,
	stored: StoredSentence,
	memberSegmentIndices: readonly number[],
): GovernedPrepositionDraft[] {
	if (
		!analysis?.government?.length ||
		analysis.stitchedText !== stored.stitchedText
	)
		return [];
	const ranges = storedSegmentRanges(stored);
	if (!ranges) return [];
	const members = memberSegmentIndices.flatMap((index) => {
		const range = ranges.get(index);
		return range ? [range] : [];
	});
	const offsets = analysis.segments
		.filter((segment) =>
			members.some(
				(range) =>
					segment.offset >= range.start && segment.offset < range.end,
			),
		)
		.map((segment) => segment.offset);
	return governedPrepositionsAt(
		fromStoredSentenceAnalysis(analysis),
		offsets,
	);
}

/** The attested government a Reading's Knowledge does not store yet. */
export function uncoveredGovernment(
	attested: readonly GovernedPrepositionDraft[],
	knowledge: unknown,
): GovernedPrepositionDraft[] {
	const stored =
		knowledge && typeof knowledge === "object"
			? Reflect.get(knowledge, "governedPrepositions")
			: undefined;
	const covered = new Set(
		(Array.isArray(stored) ? stored : []).map(
			(entry: {
				preposition?: { canonicalForm?: string };
				case?: string;
			}) => `${entry.preposition?.canonicalForm}/${entry.case}`,
		),
	);
	return attested.filter(
		(entry) => !covered.has(`${entry.preposition}/${entry.case}`),
	);
}
