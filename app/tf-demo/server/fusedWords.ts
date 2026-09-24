import type {
	Segment,
	SegmentedSentence,
	SentenceAnalysis,
} from "dumgen/types";

/**
 * A Segment as tf-demo stores it. A fused word is one stored Segment per
 * component (Dumgen ADR 0004): `im` is `i` standing for `in` beside `m`
 * standing for `dem`. `surface` is present exactly on those components.
 */
export type StoredSegmentValue = {
	readonly kind: Segment["kind"];
	readonly text: string;
	readonly surface?: string;
};

export type StoredSegment = {
	readonly index: number;
	readonly kind: string;
	readonly text: string;
	readonly surface?: string;
};

/**
 * The Segments to store for one analysed Sentence: intake's analysed
 * Segments, so a fused word arrives split and each component keeps the
 * surface it stands for. Abbreviations and clitics stay as the word they
 * are; only fusion components carry a surface.
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
			Object.freeze({
				kind: segment.kind as Segment["kind"],
				text: segment.surface ?? segment.text,
			}),
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
