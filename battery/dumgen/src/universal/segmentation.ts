import type { DumgenLanguage, Segment, SegmentKind } from "../types.js";

export type SourceSegmentationTraceEntry = Readonly<{
	readonly kind: SegmentKind;
	readonly text: string;
	readonly rule: string;
}>;

export type SourceSegmentation = Readonly<{
	readonly segments: readonly Segment[];
	readonly trace: readonly SourceSegmentationTraceEntry[];
}>;

export type SourceSegmenter = (stitchedText: string) => SourceSegmentation;

export type SourceSegmentationTrace = Readonly<{
	readonly phase: "source-segmentation";
	readonly itemIndex: number;
	readonly language: DumgenLanguage;
	readonly stitchedText: string;
	readonly segments: readonly Segment[];
	readonly rules: readonly string[];
}>;

export function isStitchedText(text: string): boolean {
	return (
		text.length > 0 &&
		text.trim() === text &&
		!/[^\S ]/u.test(text) &&
		!text.includes("  ")
	);
}

export function assertStitchedText(text: string): void {
	if (!isStitchedText(text)) {
		throw new Error(
			"Source Segmentation requires non-empty, trimmed Stitched Text with single ASCII spaces.",
		);
	}
}

export function finalizeSegmentation(
	stitchedText: string,
	segments: readonly Segment[],
	trace: readonly SourceSegmentationTraceEntry[],
): SourceSegmentation {
	if (
		segments.length === 0 ||
		segments.some(({ text }) => text.length === 0)
	) {
		throw new Error("Source Segmentation emitted an empty Segment.");
	}
	if (segments.map(({ text }) => text).join("") !== stitchedText) {
		throw new Error("Source Segmentation must be lossless.");
	}
	if (
		segments.some(
			(segment) => segment.kind === "Whitespace" && segment.text !== " ",
		)
	) {
		throw new Error(
			"Whitespace Segments must contain exactly one ASCII space.",
		);
	}
	if (segments.length !== trace.length) {
		throw new Error("Every Segment must have exactly one trace rule.");
	}

	return {
		segments: [...segments],
		trace: [...trace],
	};
}

export function pushSegment(
	segments: Segment[],
	trace: SourceSegmentationTraceEntry[],
	kind: SegmentKind,
	text: string,
	rule: string,
): void {
	if (text.length === 0) return;
	segments.push({ kind, text } as Segment);
	trace.push({ kind, text, rule });
}
