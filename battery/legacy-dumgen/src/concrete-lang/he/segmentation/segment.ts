import type { Segment, SegmentKind } from "../../../types.js";
import {
	assertStitchedText,
	finalizeSegmentation,
	pushSegment,
	type SourceSegmentation,
	type SourceSegmentationTraceEntry,
} from "../../../universal/segmentation.js";
import {
	type HebrewPiece,
	type HebrewReading,
	hebrewReadings,
	readingSpans,
	sharedCut,
} from "./prefixes.js";
import {
	bundledHebrewWordList,
	type HebrewWordList,
	normalizeHebrewWord,
	WordClass,
} from "./word-list.js";

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

/** The bundled word list, which also knows the recognized abbreviations as names. */
const bundledWords: HebrewWordList = withAbbreviations(bundledHebrewWordList);

function withAbbreviations(words: HebrewWordList): HebrewWordList {
	const abbreviations = new Set([...ABBREVIATIONS].map(normalizeHebrewWord));
	return {
		classesOf: (word) =>
			words.classesOf(word) ??
			(abbreviations.has(normalizeHebrewWord(word))
				? WordClass.TakesPreposition
				: undefined),
	};
}

/**
 * A prefixed word split into Segments (ADR 0035): each prefix is its own
 * Fused Segment, and a hidden article is a component with no letters, never
 * a Segment. Offsets are into the Stitched Text; a hidden article sits at its
 * stem's offset.
 */
type HebrewFusion = {
	readonly offset: number;
	readonly form: string;
	readonly components: readonly {
		readonly offset: number;
		readonly span: string;
		readonly surface: string;
		readonly role: HebrewPiece["role"];
	}[];
};

export type HebrewSegmentation = SourceSegmentation & {
	readonly fusions: readonly HebrewFusion[];
};

/** A written word whose readings its Sentence has to settle. */
export type OpenHebrewWord = {
	readonly offset: number;
	readonly text: string;
	readonly readings: readonly HebrewReading[];
};

/**
 * The words of a Stitched Text that keep more than one reading after the
 * grammar, vowel points and word list (#645). Intake settles them with one
 * Choice call per Sentence; without it they stay whole, or split where every
 * reading cuts them alike.
 */
export function openHebrewWords(
	stitchedText: string,
	words: HebrewWordList = bundledWords,
): readonly OpenHebrewWord[] {
	return hebrewWords(stitchedText, words).flatMap(
		({ offset, segment, readings }) =>
			readings.length > 1
				? [{ offset, text: segment.text, readings }]
				: [],
	);
}

/**
 * Deterministic lightweight Hebrew source segmentation. A prefixed word
 * splits into its prefixes and stem when exactly one reading survives the
 * grammar, the vowel points and the word list, or when every surviving
 * reading cuts it alike (they differ only in a hidden article). A word whose
 * readings disagree stays whole unless `settled`, keyed by the word's offset,
 * names its reading; intake settles those with one Choice call. A word the
 * list does not know, or knows only unsplit, stays whole. Suffixes stay
 * inside their word.
 */
export function segmentHebrew(
	stitchedText: string,
	settled: ReadonlyMap<number, HebrewReading> = new Map(),
	words: HebrewWordList = bundledWords,
): HebrewSegmentation {
	const segments: Segment[] = [];
	const trace: SourceSegmentationTraceEntry[] = [];
	const fusions: HebrewFusion[] = [];

	for (const { offset, segment, rule, readings } of hebrewWords(
		stitchedText,
		words,
	)) {
		const reading =
			settled.get(offset) ??
			(readings.length === 1 ? readings[0] : undefined);
		const cut = reading ? readingSpans(reading) : sharedCut(readings);
		if (!cut || cut.length < 2) {
			pushSegment(segments, trace, segment.kind, segment.text, rule);
			continue;
		}
		for (const [position, span] of cut.entries())
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				span,
				position === cut.length - 1
					? "hebrew-prefixed-stem"
					: "hebrew-prefix",
			);
		if (reading) fusions.push(fusionOf(offset, segment.text, reading));
	}

	return { ...finalizeSegmentation(stitchedText, segments, trace), fusions };
}

function fusionOf(
	offset: number,
	form: string,
	reading: HebrewReading,
): HebrewFusion {
	let position = offset;
	return {
		offset,
		form,
		components: reading.map(({ span, surface, role }) => {
			const component = { offset: position, span, surface, role };
			position += span.length;
			return component;
		}),
	};
}

/** Each guarded Segment with its offset, and a ResolvableText word's readings. */
function hebrewWords(stitchedText: string, words: HebrewWordList) {
	assertStitchedText(stitchedText);
	const guarded = segmentGuarded(stitchedText, words);
	let offset = 0;
	return guarded.segments.map((segment, index) => {
		const rule = guarded.trace[index]?.rule;
		if (!rule) throw new Error("Hebrew trace is misaligned.");
		const start = offset;
		offset += segment.text.length;
		return {
			offset: start,
			segment,
			rule,
			readings:
				segment.kind === "ResolvableText"
					? hebrewReadings(segment.text, words)
					: [],
		};
	});
}

function segmentGuarded(
	stitchedText: string,
	words: HebrewWordList,
): SourceSegmentation {
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
		splitRun(run, segments, trace, words);
	}
	return finalizeSegmentation(stitchedText, segments, trace);
}

function splitRun(
	run: string,
	segments: Segment[],
	trace: SourceSegmentationTraceEntry[],
	words: HebrewWordList,
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
		// A quoted form the word list knows, alone or after prefixes (בצה"ל,
		// הדו"ח), is a word; its trailing punctuation is not.
		const word = run.replace(/[.,!?:;…]+$/u, "");
		if (HEBREW.test(word) && hebrewReadings(word, words).length > 0) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				word,
				"recognized-quoted-form",
			);
			const trailing = [...run.slice(word.length)];
			for (let index = 0; index < trailing.length; ) {
				const [text, next] = takePunctuationRun(trailing, index);
				pushSegment(
					segments,
					trace,
					"Punctuation",
					text,
					"punctuation-run",
				);
				index = next;
			}
			return;
		}
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
