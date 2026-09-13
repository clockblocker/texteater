import type { Segment, SegmentKind } from "../types";
import {
	assertStitchedText,
	freezeSegmentation,
	pushSegment,
	type SourceSegmentation,
	type SourceSegmentationTraceEntry,
} from "./contracts";

const HEBREW = /\p{Script=Hebrew}/u;
const LATIN = /\p{Script=Latin}/u;
const NUMBER = /^\d+(?:[.,]\d+)*$/u;
const ABBREVIATIONS = new Set(["צה״ל", 'צה"ל', "ג׳ון"]);
const OPAQUE = new Set(["גכצזץ", "אב״ג״"]);
const PUNCTUATION = new Set([
	".",
	",",
	"!",
	"?",
	":",
	";",
	"…",
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	"״",
	'"',
]);
const graphemes = new Intl.Segmenter("he", { granularity: "grapheme" });

/**
 * Pinned word-internal boundaries whose source form is independently
 * sufficient evidence. Additions require a reviewed corpus expectation.
 */
const SURFACE_EVIDENT_SPLITS = new Map<string, readonly string[]>([
	["בַּבַּיִת", ["בַּ", "בַּיִת"]],
]);

/**
 * Deterministic lightweight Hebrew source segmentation.
 *
 * Context-dependent prefix, suffix, and covert morphology intentionally stays
 * inside the whole surface word and is deferred to Click Resolution. Only the
 * pinned, source-evident inventory above can introduce a word-internal split.
 */
export function segmentHebrew(stitchedText: string): SourceSegmentation {
	assertStitchedText(stitchedText);
	const guarded = segmentGuarded(stitchedText);
	const segments: Segment[] = [];
	const trace: SourceSegmentationTraceEntry[] = [];

	for (let index = 0; index < guarded.segments.length; index += 1) {
		const segment = guarded.segments[index];
		const entry = guarded.trace[index];
		if (!segment || !entry) throw new Error("Hebrew trace is misaligned.");
		const parts =
			segment.kind === "ResolvableText"
				? SURFACE_EVIDENT_SPLITS.get(segment.text)
				: undefined;
		if (!parts) {
			pushSegment(
				segments,
				trace,
				segment.kind,
				segment.text,
				entry.rule,
			);
			continue;
		}
		for (const part of parts) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				part,
				"pinned-surface-evident-split",
			);
		}
	}

	return freezeSegmentation(stitchedText, segments, trace);
}

function segmentGuarded(stitchedText: string): SourceSegmentation {
	const segments: Segment[] = [];
	const trace: SourceSegmentationTraceEntry[] = [];
	for (const match of stitchedText.matchAll(/ +|\S+/gu)) {
		const run = match[0];
		if (/^ +$/u.test(run)) {
			pushSegment(segments, trace, "Whitespace", " ", "space-separator");
			continue;
		}
		if (/^https?:\/\//u.test(run)) {
			const trailing = run.match(/([.!?]+)$/u)?.[1] ?? "";
			const entity = trailing ? run.slice(0, -trailing.length) : run;
			pushSegment(segments, trace, "OpaqueText", entity, "url-entity");
			pushSegment(
				segments,
				trace,
				"Punctuation",
				trailing,
				"url-trailing-punctuation",
			);
			continue;
		}
		splitRun(run, segments, trace);
	}
	return freezeSegmentation(stitchedText, segments, trace);
}

function splitRun(
	run: string,
	segments: Segment[],
	trace: SourceSegmentationTraceEntry[],
): void {
	if (ABBREVIATIONS.has(run)) {
		pushSegment(
			segments,
			trace,
			"ResolvableText",
			run,
			"recognized-abbreviation",
		);
		return;
	}
	if (/^\d+%$/u.test(run)) {
		pushSegment(segments, trace, "OpaqueText", run, "percentage-fallback");
		return;
	}
	if (NUMBER.test(run)) {
		pushSegment(segments, trace, "ResolvableText", run, "supported-number");
		return;
	}
	if (/^[₪€$]\d/u.test(run)) {
		pushSegment(
			segments,
			trace,
			"ResolvableText",
			run[0] ?? "",
			"currency-unit",
		);
		pushSegment(
			segments,
			trace,
			"ResolvableText",
			run.slice(1),
			"currency-number",
		);
		return;
	}
	if (/^[#@]/u.test(run)) {
		pushSegment(
			segments,
			trace,
			"Punctuation",
			run[0] ?? "",
			"social-sigil",
		);
		pushSegment(
			segments,
			trace,
			"OpaqueText",
			run.slice(1),
			"social-payload",
		);
		return;
	}
	if (
		(run.includes("׳") || run.includes("״") || run.includes('"')) &&
		!run.startsWith("״")
	) {
		pushSegment(
			segments,
			trace,
			"OpaqueText",
			run,
			"unrecognized-quoted-form",
		);
		return;
	}
	if (run.includes("_") || (HEBREW.test(run) && LATIN.test(run))) {
		pushSegment(
			segments,
			trace,
			"OpaqueText",
			run,
			"mixed-or-identifier-run",
		);
		return;
	}

	const chars = [...graphemes.segment(run)].map(({ segment }) => segment);
	let buffer = "";
	const flush = () => {
		if (!buffer) return;
		const kind = classify(buffer);
		pushSegment(
			segments,
			trace,
			kind,
			buffer,
			kind === "ResolvableText"
				? "hebrew-surface-candidate"
				: "opaque-run",
		);
		buffer = "";
	};
	for (let index = 0; index < chars.length; ) {
		const char = chars[index] ?? "";
		if (!PUNCTUATION.has(char)) {
			buffer += char;
			index += 1;
			continue;
		}
		flush();
		const [text, next] = takePunctuationRun(chars, index);
		pushSegment(segments, trace, "Punctuation", text, "punctuation-run");
		index = next;
	}
	flush();
}

function classify(text: string): SegmentKind {
	if (
		OPAQUE.has(text) ||
		text.includes("_") ||
		(HEBREW.test(text) && LATIN.test(text))
	) {
		return "OpaqueText";
	}
	if (LATIN.test(text)) return "OpaqueText";
	if (HEBREW.test(text) || NUMBER.test(text) || text === "₪") {
		return "ResolvableText";
	}
	return "OpaqueText";
}

function takePunctuationRun(
	chars: readonly string[],
	start: number,
): readonly [string, number] {
	const first = chars[start] ?? "";
	if (first === ".") {
		let end = start;
		while (chars[end] === "." && end < start + 3) end += 1;
		return [chars.slice(start, end).join(""), end];
	}
	if (first === "?" || first === "!") {
		let end = start;
		while (chars[end] === "?" || chars[end] === "!") end += 1;
		return [chars.slice(start, end).join(""), end];
	}
	return [first, start + 1];
}
