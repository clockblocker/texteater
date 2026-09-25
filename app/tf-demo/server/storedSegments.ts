import type { Infer } from "convex/values";
import { isGermanFusedWord, splitGermanFusedWords } from "dumgen/authored";
import type { SegmentedSentence, SentenceAnalysis } from "dumgen/types";
import type {
	storedSegmentInputValidator,
	storedSegmentValidator,
} from "../convex/model/validators";

/**
 * The stored Segment module. It owns what tf-demo stores for a Segment: its
 * shape, the rule that a fused word is stored as its pieces, the per-Sentence
 * bound, and the conversions between a stored Segment, a character offset in
 * the Stitched Text, and an Encounter Segment.
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

/**
 * The word a Segment stands for, for looking Lemmas up: a fusion component's
 * surface, else its text. An Attestation member is attested as the text.
 */
export function spellingOf(segment: {
	readonly text: string;
	readonly surface?: string;
}): string {
	return segment.surface ?? segment.text;
}

/**
 * The Segments to store for one analysed Sentence: intake's analysed
 * Segments, so a fused word arrives split and each component keeps the
 * surface it stands for (Dumgen ADR 0004, ADR 0035): `im` is `i` standing for
 * `in` beside `m` standing for `dem`. Abbreviations and clitics stay as the
 * word they are; only fusion components carry a surface.
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
 * The Segments to store for a Sentence no analysis describes, such as a
 * Definition Text or a German Sentence whose analysis failed: a German fused
 * word is still stored as its pieces, exactly as an analysis would place
 * them.
 */
export function storedSegmentsWithoutAnalysis(
	sentence: Pick<SegmentedSentence, "language" | "segments">,
): readonly StoredSegmentValue[] {
	return sentence.language === "de"
		? splitGermanFusedWords(sentence.segments)
		: sentence.segments.map(({ kind, text }) => ({ kind, text }));
}

/**
 * Fails loudly when a German Sentence would hold a fused word unsplit: every
 * host stores the pieces (ADR 0035), and no bridge reads a whole `im`.
 */
export function assertPiecesStored(sentence: {
	readonly language: string;
	readonly segments: readonly Pick<StoredSegment, "kind" | "text">[];
}): void {
	if (sentence.language !== "de") return;
	const unsplit = sentence.segments.find(
		({ kind, text }) =>
			kind === "ResolvableText" && isGermanFusedWord(text),
	);
	if (unsplit)
		throw new Error(
			`A stored Sentence holds the fused word "${unsplit.text}" unsplit; store its pieces.`,
		);
}

/**
 * Checks that stored Segments form their Sentence: contiguous zero-based
 * indices, non-empty text, texts that concatenate to the Stitched Text, and
 * no unsplit German fused word.
 */
export function assertStoredSentence(stored: {
	readonly language: string;
	readonly stitchedText: string;
	readonly segments: readonly Pick<
		StoredSegment,
		"index" | "kind" | "text"
	>[];
}): void {
	assertPiecesStored(stored);
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

/**
 * The Sentence Dumgen resolves a click against: the stored Segments as they
 * are, so a fused word reaches Dumgen as its pieces (`i` + `m`) and an
 * Encounter index is the stored index. The caller validates the stored
 * Segments.
 */
export function encounterSentenceOf(stored: {
	readonly segmentedSentenceId: string;
	readonly segments: readonly StoredSegment[];
}): SegmentedSentence<"de"> {
	return Object.freeze({
		id: stored.segmentedSentenceId,
		language: "de",
		segments: Object.freeze(
			[...stored.segments]
				.sort((left, right) => left.index - right.index)
				.map(({ kind, text }) => Object.freeze({ kind, text })),
		),
	});
}
