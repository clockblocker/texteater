import { germanFusionTable } from "../concrete-lang/de/fusion-entries.js";
import { englishFusionTable } from "../concrete-lang/en/fusion-entries.js";
import type { SegmentedSentence } from "../types.js";
import { DumgenFailure } from "./failure.js";
import {
	type FusionTable,
	fusedWordAt,
	fusedWordSegments,
	splitFusedWord,
	unsplitFusedWord,
} from "./fusion-table.js";

/**
 * The fusion table a Language's segmenter cuts by. Hebrew splits by open
 * prefix patterns in its own segmenter, not by a table.
 */
function fusionTableOf(language: string): FusionTable | undefined {
	if (language === "de") return germanFusionTable;
	if (language === "en") return englishFusionTable;
	return undefined;
}

/**
 * A Segment a host stores: a fusion component carries the surface it stands
 * for (`i` stands for `in`); every other Segment keeps its own letters.
 */
export type PieceSegment<Kind extends string = string> = {
	readonly kind: Kind;
	readonly text: string;
	readonly surface?: string;
};

/**
 * Splits every fused word into one Segment per component by the Language's
 * fusion table, exactly as Dumgen's segmentation does (Dumgen ADR 0004,
 * system ADR 0035): German `im` is `i` standing for `in` beside `m` standing
 * for `dem`, English `I'll` is `I` beside `'ll`. Pieces that arrive split
 * already keep their surface, or gain it when they lack one, so Segments from
 * Dumgen's segmenter pass through unchanged. A host that stores a Sentence
 * without an analysis uses this, so it still holds the pieces. A Language
 * without a table keeps its Segments as they are.
 */
export function splitFusedWords<Kind extends string>(
	language: string,
	segments: readonly PieceSegment<Kind>[],
): readonly PieceSegment<Kind>[] {
	const table = fusionTableOf(language);
	if (!table) return [...segments];
	const split: PieceSegment<Kind>[] = [];
	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];
		if (!segment) continue;
		const run = fusedWordAt(table, segments, index);
		const pieces = run
			? fusedWordSegments(
					table,
					run
						.map((position) => segments[position]?.text ?? "")
						.join(""),
				)
			: segment.kind === "ResolvableText"
				? splitFusedWord(table, segment.text)
				: undefined;
		if (!pieces) {
			split.push(segment);
			continue;
		}
		for (const piece of pieces)
			split.push({ kind: segment.kind, ...piece });
		index += (run?.length ?? 1) - 1;
	}
	return split;
}

/**
 * The index of the first Segment that holds a whole fused word (`im`,
 * `won't`, `I'll` as one Segment) by the Language's fusion table, or
 * undefined when every fused word is split.
 */
export function unsplitFusedWordIn(
	language: string,
	segments: readonly { readonly kind: string; readonly text: string }[],
): number | undefined {
	const table = fusionTableOf(language);
	return table && unsplitFusedWord(table, segments);
}

/**
 * A Sentence holds a fused word as one Segment per component (ADR 0035):
 * German `im` is `i` and `m`, English `I'll` is `I` and `'ll`. A whole fused
 * word would leave a piece outside every unit, so an operation rejects it
 * instead of resolving the words beside it without that piece.
 */
export function assertFusedWordsSplit(
	sentence: Pick<SegmentedSentence, "language" | "segments">,
	stage: string,
): void {
	const index = unsplitFusedWordIn(sentence.language, sentence.segments);
	if (index === undefined) return;
	throw new DumgenFailure(
		"InvalidInput",
		stage,
		`Segment ${index} "${sentence.segments[index]?.text}" is a whole fused word; segment the Sentence with Dumgen, which splits it into one Segment per component`,
	);
}
