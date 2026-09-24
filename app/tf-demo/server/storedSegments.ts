import type { Infer } from "convex/values";
import type {
	Segment,
	SegmentedSentence,
	SentenceAnalysis,
} from "dumgen/types";
import type {
	storedSegmentInputValidator,
	storedSegmentValidator,
} from "../convex/model/validators";

/**
 * The stored Segment module. It owns what tf-demo stores for a Segment: its
 * shape, the spelling rule for fusion components, the per-Sentence bound,
 * and every conversion between a stored Segment, a character offset in the
 * Stitched Text, and an Encounter Segment.
 *
 * Stored rows are keyed by `index`. Dumgen ADR 0004 makes the character
 * offset the persisted coordinate and leaves migrating the hosts to the
 * production effort, so `index` is the current storage key, not the
 * Segment's identity. Code that needs an offset derives it here with
 * `storedSegmentRanges`. Reading the stored rows is the Convex layer's
 * `loadStoredSegments`.
 */

/** A Segment to store; `surface` marks a fusion component. */
export type StoredSegmentValue = Infer<typeof storedSegmentInputValidator>;

/** A stored Segment at its storage key. */
export type StoredSegment = Infer<typeof storedSegmentValidator>;

/** Intake stores at most this many Segments in one Sentence. */
export const MAX_SEGMENTS_PER_SENTENCE = 512;

/** The word a Segment stands for: a fusion component's surface, else its text. */
export function spellingOf(segment: {
	readonly text: string;
	readonly surface?: string;
}): string {
	return segment.surface ?? segment.text;
}

/**
 * The Segments to store for one analysed Sentence: intake's analysed
 * Segments, so a fused word arrives split and each component keeps the
 * surface it stands for (Dumgen ADR 0004): `im` is `i` standing for `in`
 * beside `m` standing for `dem`. Abbreviations and clitics stay as the word
 * they are; only fusion components carry a surface.
 */
export function storedSegmentsOf(
	analysis: SentenceAnalysis,
): readonly StoredSegmentValue[] {
	const fused = new Set(
		analysis.fusions.flatMap(({ components }) =>
			components.map(({ offset }) => offset),
		),
	);
	return [...analysis.segments]
		.sort((left, right) => left.offset - right.offset)
		.map(({ offset, kind, text, surface }) =>
			fused.has(offset) ? { kind, text, surface } : { kind, text },
		);
}

/**
 * Checks that stored Segments form their Sentence: contiguous zero-based
 * indices, non-empty text, and texts that concatenate to the Stitched Text.
 */
export function assertStoredSentence(stored: {
	readonly stitchedText: string;
	readonly segments: readonly Pick<StoredSegment, "index" | "text">[];
}): void {
	const ordered = [...stored.segments].sort(
		(left, right) => left.index - right.index,
	);
	for (const [expectedIndex, { index, text }] of ordered.entries()) {
		if (index !== expectedIndex) {
			throw new Error(
				"Persisted Segment indices must be contiguous and zero-based.",
			);
		}
		if (text.length === 0) {
			throw new Error("Persisted Segment data is invalid.");
		}
	}
	if (ordered.map(({ text }) => text).join("") !== stored.stitchedText) {
		throw new Error(
			"Persisted Segments do not reconstruct the Stitched Text.",
		);
	}
}

/**
 * Each stored Segment's `[start, end)` range in the Stitched Text, the bridge
 * from index-keyed stored Segments to offset-keyed analysed ones. Null when
 * the stored Segments do not concatenate to the Stitched Text.
 */
export function storedSegmentRanges(stored: {
	readonly stitchedText: string;
	readonly segments: readonly Pick<StoredSegment, "index" | "text">[];
}): Map<number, { start: number; end: number }> | null {
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

export type EncounterSentence = {
	readonly sentence: SegmentedSentence<"de">;
	/** The Encounter index of a stored Segment. */
	readonly encounterIndex: (storedIndex: number) => number;
	/** The stored index of an Encounter Segment; undefined for a space between fusion components. */
	readonly storedIndex: (encounterIndex: number) => number | undefined;
};

/**
 * The Sentence dumgen resolves a click against. Dumgen's click-time
 * operations read whole words, so each fusion component reads as the word it
 * stands for and a space parts it from the next component: stored `i` + `m`
 * reads `in dem`. A Sentence without fused words passes through unchanged,
 * and its Encounter indices are its stored indices. The caller validates the
 * stored Segments.
 */
export function encounterSentenceOf(stored: {
	readonly segmentedSentenceId: string;
	readonly segments: readonly StoredSegment[];
}): EncounterSentence {
	const segments: Segment[] = [];
	const encounterIndices = new Map<number, number>();
	const storedIndices = new Map<number, number>();
	let previous: StoredSegment | undefined;
	for (const segment of [...stored.segments].sort(
		(left, right) => left.index - right.index,
	)) {
		if (previous?.surface !== undefined && segment.surface !== undefined)
			segments.push(Object.freeze({ kind: "Whitespace", text: " " }));
		encounterIndices.set(segment.index, segments.length);
		storedIndices.set(segments.length, segment.index);
		segments.push(
			Object.freeze({ kind: segment.kind, text: spellingOf(segment) }),
		);
		previous = segment;
	}
	return {
		sentence: Object.freeze({
			id: stored.segmentedSentenceId,
			language: "de",
			segments: Object.freeze(segments),
		}),
		encounterIndex: (storedIndex) => {
			const index = encounterIndices.get(storedIndex);
			if (index === undefined)
				throw new Error(`No stored Segment ${storedIndex}.`);
			return index;
		},
		storedIndex: (encounterIndex) => storedIndices.get(encounterIndex),
	};
}
