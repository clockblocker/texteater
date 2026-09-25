import type { SegmentedSentence } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import {
	fusedWordAt,
	unsplitFusedWord,
} from "../../../universal/fusion-table.js";
import { germanFusionTable } from "../fusion-entries.js";

/**
 * A German Sentence holds a fused word as one Segment per component (ADR
 * 0035): `im` is `i` and `m`. A whole `im` would leave its article piece
 * outside every unit, so an operation rejects it instead of resolving the
 * noun beside it without its article.
 */
export function assertFusedWordsSplit(
	sentence: Pick<SegmentedSentence, "language" | "segments">,
	stage: string,
): void {
	if (sentence.language !== "de") return;
	const index = unsplitFusedWord(germanFusionTable, sentence.segments);
	if (index === undefined) return;
	throw new DumgenFailure(
		"InvalidInput",
		stage,
		`Segment ${index} "${sentence.segments[index]?.text}" is a whole fused word; segment the Sentence with Dumgen, which splits it into one Segment per component`,
	);
}

/**
 * The Sentence with every split table fusion joined back into one
 * ResolvableText Segment (`i` + `m` is `im`). Intake judges a fused word as
 * the word the reader sees and lets the fusion table split it again; offsets
 * do not move.
 */
export function joinFusedWords(
	sentence: SegmentedSentence<"de">,
): SegmentedSentence<"de"> {
	const segments: SegmentedSentence<"de">["segments"][number][] = [];
	for (let index = 0; index < sentence.segments.length; index += 1) {
		const pieces = fusedWordAt(germanFusionTable, sentence.segments, index);
		const segment = sentence.segments[index];
		if (!segment) continue;
		if (!pieces) {
			segments.push(segment);
			continue;
		}
		segments.push({
			kind: "ResolvableText",
			text: pieces
				.map((piece) => sentence.segments[piece]?.text ?? "")
				.join(""),
		});
		index += pieces.length - 1;
	}
	return { ...sentence, segments };
}
