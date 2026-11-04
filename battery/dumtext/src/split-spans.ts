/**
 * The span API (#1294): `splitText`'s paragraphs and Sentences, each
 * Sentence with where it stands in the string the host passed in. Offsets
 * are UTF-16 code units into that input, as `String.prototype.slice` takes
 * them, never into a stored Extracted Text: a Segment still carries no
 * character offset (Dumgen ADR 0004), and a host that keeps its own text,
 * such as an editor's note, maps each Sentence back onto it.
 */
import { required } from "common-utils";
import { titledParagraphs } from "./split-text.js";

/** One Sentence and the stretch of the input it was read from. */
export type SentenceSpan = {
	/** The Sentence as `splitText` or `splitScroll` gives it: trimmed, NFC. */
	readonly text: string;
	/** Offset of the Sentence's first character in the input. */
	readonly start: number;
	/** Offset just past the Sentence's last character in the input. */
	readonly end: number;
};

/**
 * A paragraph's kind. A Markdown Heading, a Scroll's own Heading included,
 * is a `Heading`, and so is a title line `splitText` sets apart in plain
 * text. Everything else is a `Paragraph`.
 */
type ParagraphKind = "Heading" | "Paragraph";

/** A text's paragraphs, each with its kind and its Sentences in order. */
export type SplitSpans = {
	readonly paragraphs: readonly {
		readonly kind: ParagraphKind;
		readonly sentences: readonly SentenceSpan[];
	}[];
};

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

/**
 * An input's NFC form, with each of its code units' source in the input:
 * `from[i]` to `to[i]` is the input stretch that NFC code unit `i` came
 * from. Composition never crosses a grapheme cluster, so each cluster is
 * normalized alone. Text already NFC maps to itself.
 */
export type Normalized = {
	readonly text: string;
	readonly from: (index: number) => number;
	readonly to: (index: number) => number;
};

export function normalized(input: string): Normalized {
	const text = input.normalize("NFC");
	if (text === input)
		return { text, from: (index) => index, to: (index) => index + 1 };
	const from: number[] = [];
	const to: number[] = [];
	let rebuilt = "";
	for (const { segment, index } of graphemes.segment(input)) {
		const cluster = segment.normalize("NFC");
		for (let unit = 0; unit < cluster.length; unit++) {
			from.push(index);
			to.push(index + segment.length);
		}
		rebuilt += cluster;
	}
	if (rebuilt !== text) throw Error("NFC composed across a grapheme cluster");
	return {
		text,
		from: (index) => from[index] ?? input.length,
		to: (index) => to[index] ?? input.length,
	};
}

const whitespace = /\s/u;

/**
 * Where each Sentence stands in `text`, the string it was split from, as
 * the index of its first visible code unit and one past its last. The
 * splitter only drops, inserts and trims whitespace, so the Sentences'
 * visible code units, in order, are exactly the text's.
 */
export function locate(
	text: string,
	sentences: readonly string[],
): { readonly first: number; readonly last: number }[] {
	let at = 0;
	const skip = () => {
		while (at < text.length && whitespace.test(text[at] ?? "")) at++;
	};
	return sentences.map((sentence) => {
		let first = -1;
		let last = -1;
		for (let unit = 0; unit < sentence.length; unit++) {
			const code = sentence[unit] ?? "";
			if (whitespace.test(code)) continue;
			skip();
			if (text[at] !== code)
				throw Error(
					`Sentence ${JSON.stringify(sentence)} is not in its text at ${at}`,
				);
			if (first === -1) first = at;
			last = at;
			at++;
		}
		return { first, last: last + 1 };
	});
}

/**
 * `splitText`'s paragraphs and Sentences of a text, read as NFC, each
 * Sentence with its offsets into `text` itself. Its slice equals the
 * Sentence apart from whitespace and NFC: a hard wrap's line break, for
 * one, is a space in the Sentence. A title line is a `Heading`.
 */
export function splitTextSpans(text: string): SplitSpans {
	const nfc = normalized(text);
	const paragraphs = titledParagraphs(nfc.text);
	const located = locate(
		nfc.text,
		paragraphs.flatMap(({ sentences }) => sentences),
	);
	let next = 0;
	return {
		paragraphs: paragraphs.map(({ title, sentences }) => ({
			kind: title ? "Heading" : "Paragraph",
			sentences: sentences.map((sentence) => {
				const { first, last } = required(
					located[next++],
					"Every Sentence is located",
				);
				return {
					text: sentence,
					start: nfc.from(first),
					end: nfc.to(last - 1),
				};
			}),
		})),
	};
}
