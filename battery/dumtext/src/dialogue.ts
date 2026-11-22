/**
 * Deterministic quotation tracking and flattened-paragraph helpers: pure,
 * language-neutral code that runs before any model sees the text.
 *
 * When text arrives with its paragraph breaks stripped (such as a Kindle or
 * PDF copy-paste), `needsStructureRecovery` spots the flattened paragraphs,
 * `analyzeQuotationFlow` tells which boundaries sit inside an unclosed
 * quotation (never split) and which are direct quote-to-quote speaker turns
 * (always split), `recoverParagraphsDeterministic` splits those turns in
 * code alone, and `rebuildScrollParagraphs` writes recovered paragraphs
 * back into a Scroll's Extracted Text without disturbing headings, scene
 * breaks or untouched paragraphs.
 */
import type {
	Heading,
	Paragraph,
	SceneBreak,
	Scroll,
} from "./extracted-text/extracted-text.js";
import { type SplitText, splitText } from "./split-text.js";

/** Primary quotation mark pairs: each opener with its matching closing marks. */
const closingMarks: Readonly<Record<string, string>> = {
	"„": "“”",
	"“": "”",
	"»": "«",
	"«": "»",
};

const primaryOpener = /[„“»«"]/u;
const dialogueDash = /^[—–]\s+\S/u;

/** Per-Sentence quotation state across one paragraph's Sentences. */
export type QuoteFlow = {
	/** Starts with the paragraph's opening quotation mark (or a dialogue dash). */
	readonly opensQuote: boolean;
	/** Ends with a matching closing quotation mark, leaving no quote open. */
	readonly closesQuote: boolean;
	/** Contains quoted speech (a primary quotation mark, or a dialogue dash). */
	readonly hasQuote: boolean;
	/** Leaves a quotation still open at the end of this Sentence. */
	readonly endsInsideQuote: boolean;
	/**
	 * Immediately follows a closed quotation with a new opening quotation
	 * (`...« »...`), with no intervening narration or tag: a deterministic
	 * speaker switch.
	 */
	readonly directSpeakerSwitchBefore: boolean;
};

/** Advances quotation nesting depth across one Sentence and reports whether it contains a primary quote mark. */
function advanceQuoteDepth(
	text: string,
	opener: string | undefined,
	closers: string,
	depth: number,
): { readonly depth: number; readonly quoted: boolean } {
	if (opener === undefined) return { depth, quoted: false };
	let next = depth;
	let quoted = false;
	if (opener === '"') {
		for (const char of text) {
			if (char !== '"') continue;
			quoted = true;
			next = next === 0 ? 1 : 0;
		}
		return { depth: next, quoted };
	}
	for (const char of text) {
		if (closers.includes(char) && next > 0) {
			quoted = true;
			next--;
		} else if (char === opener) {
			quoted = true;
			next++;
		}
	}
	return { depth: next, quoted };
}

/** Whether `text` closes the paragraph's quotation convention at its end. */
function closesAtEnd(
	text: string,
	opener: string | undefined,
	closers: string,
	depth: number,
): boolean {
	if (depth !== 0 || opener === undefined) return false;
	const last = text.at(-1) ?? "";
	return opener === '"' ? last === '"' : closers.includes(last);
}

/**
 * Tracks quotation depth across a paragraph's Sentences in order. The
 * paragraph's first primary quotation mark decides the convention (`»…«`,
 * `„…“`, `“…”`, `«…»` or straight `"…"`), matching `size-cut.ts`.
 */
export function analyzeQuotationFlow(
	sentences: readonly string[],
): readonly QuoteFlow[] {
	const opener = primaryOpener.exec(sentences.join(" "))?.[0];
	const closers =
		opener !== undefined && opener !== '"'
			? (closingMarks[opener] ?? "")
			: "";
	let depth = 0;
	const flow: QuoteFlow[] = [];
	for (let index = 0; index < sentences.length; index++) {
		const trimmed = (sentences[index] ?? "").trim();
		const dash = dialogueDash.test(trimmed);
		const opensQuote =
			(opener !== undefined && trimmed.startsWith(opener)) || dash;
		const stepped = advanceQuoteDepth(trimmed, opener, closers, depth);
		depth = stepped.depth;
		const closesQuote = closesAtEnd(trimmed, opener, closers, depth);
		const previous = flow[index - 1];
		const directSpeakerSwitchBefore =
			previous !== undefined &&
			!previous.endsInsideQuote &&
			previous.closesQuote &&
			opensQuote;
		flow.push({
			opensQuote,
			closesQuote,
			hasQuote: dash || stepped.quoted,
			endsInsideQuote: depth > 0,
			directSpeakerSwitchBefore,
		});
	}
	return flow;
}

/** Counts distinct top-level closed quotation spans inside a Sentence list. */
function closedQuoteSpans(
	sentences: readonly string[],
	flow: readonly QuoteFlow[],
): number {
	let spans = 0;
	let inSpan = false;
	for (let index = 0; index < sentences.length; index++) {
		const item = flow[index];
		if (!item) continue;
		if (item.hasQuote) inSpan = true;
		if (inSpan && !item.endsInsideQuote) {
			spans++;
			inSpan = false;
		}
	}
	return spans;
}

/**
 * Whether a single paragraph of Sentences looks flattened (paragraph or
 * dialogue breaks stripped, such as a Kindle or PDF paste) and should go
 * through paragraph structure recovery.
 *
 * Normal, well-formatted paragraphs stay untouched:
 * - fewer than 3 Sentences never trigger unless two quotes directly abut
 *   (`...« »...`),
 * - any direct quote-to-quote speaker switch (`...« »...`) triggers,
 * - 3 or more separate closed-quote turns in one paragraph trigger,
 * - mixed dialogue and narration of at least 5 Sentences and 450 characters
 *   triggers,
 * - a prose wall of at least 8 Sentences and 900 characters triggers.
 */
export function needsParagraphRecovery(sentences: readonly string[]): boolean {
	if (sentences.length < 2) return false;
	const flow = analyzeQuotationFlow(sentences);
	if (flow.some(({ directSpeakerSwitchBefore }) => directSpeakerSwitchBefore))
		return true;
	if (sentences.length < 3) return false;
	const spans = closedQuoteSpans(sentences, flow);
	if (spans >= 3) return true;
	const chars = sentences.reduce(
		(sum, sentence) => sum + sentence.length + 1,
		0,
	);
	if (spans >= 1 && sentences.length >= 5 && chars >= 450) return true;
	return sentences.length >= 8 && chars >= 900;
}

/** Whether any paragraph in the split text looks flattened. */
export function needsStructureRecovery(
	paragraphs: readonly { readonly sentences: readonly string[] }[],
): boolean {
	return paragraphs.some(({ sentences }) =>
		needsParagraphRecovery(sentences),
	);
}

/**
 * Deterministic fallback recovery in pure code: splits flattened paragraphs
 * at unambiguous direct quote-to-quote speaker switches (`...« »...`) while
 * leaving every Sentence verbatim and in order.
 */
export function recoverParagraphsDeterministic(
	paragraphs: readonly { readonly sentences: readonly string[] }[],
): SplitText {
	const out: { readonly sentences: readonly string[] }[] = [];
	for (const { sentences } of paragraphs) {
		if (!needsParagraphRecovery(sentences)) {
			out.push({ sentences });
			continue;
		}
		const flow = analyzeQuotationFlow(sentences);
		let current: string[] = [];
		for (let index = 0; index < sentences.length; index++) {
			const sentence = sentences[index];
			if (sentence === undefined) continue;
			if (
				current.length > 0 &&
				flow[index]?.directSpeakerSwitchBefore === true
			) {
				out.push({ sentences: current });
				current = [];
			}
			current.push(sentence);
		}
		if (current.length > 0) out.push({ sentences: current });
	}
	return { paragraphs: out };
}

const blockText = (block: Paragraph) =>
	block.inlines
		.map((inline) => (inline.kind === "LineBreak" ? "\n" : inline.text))
		.join("");

/**
 * Rebuilds a Scroll's `blocks` to reflect recovered paragraphs while keeping
 * its Heading, inner Headings, Scene Breaks and any untouched Paragraphs
 * (with their Inline Styles, Line Breaks and Original Locations) verbatim.
 *
 * When `recovered` does not match the Scroll's Sentences 1:1, returns the
 * original Scroll unchanged.
 */
export function rebuildScrollParagraphs(
	scroll: Scroll,
	recovered: readonly { readonly sentences: readonly string[] }[],
): Scroll {
	const originalSentences: string[] = [];
	const headingSentences = scroll.heading
		? splitText(
				scroll.heading.runs.map(({ text }) => text).join(""),
			).paragraphs.flatMap(({ sentences }) => sentences)
		: [];
	originalSentences.push(...headingSentences);

	type BlockSpan = {
		readonly block: Heading | Paragraph | SceneBreak;
		readonly start: number;
		readonly end: number;
		readonly splitCount: number;
	};
	const spans: BlockSpan[] = [];
	for (const block of scroll.blocks) {
		const start = originalSentences.length;
		if (block.kind === "SceneBreak") {
			spans.push({ block, start, end: start, splitCount: 0 });
			continue;
		}
		const text =
			block.kind === "Heading"
				? block.runs.map(({ text }) => text).join("")
				: blockText(block);
		const paragraphs = splitText(text).paragraphs;
		for (const paragraph of paragraphs)
			originalSentences.push(...paragraph.sentences);
		spans.push({
			block,
			start,
			end: originalSentences.length,
			splitCount: paragraphs.length,
		});
	}

	const recoveredFlat = recovered.flatMap(({ sentences }) => sentences);
	if (
		recoveredFlat.length !== originalSentences.length ||
		recoveredFlat.some(
			(sentence, index) => sentence !== originalSentences[index],
		)
	)
		return scroll;

	// Map each Sentence index to the recovered paragraph that holds it.
	const paraRanges: {
		readonly start: number;
		readonly end: number;
		readonly sentences: readonly string[];
	}[] = [];
	let cursor = 0;
	for (const { sentences } of recovered) {
		paraRanges.push({
			start: cursor,
			end: cursor + sentences.length,
			sentences,
		});
		cursor += sentences.length;
	}

	let changed = false;
	const blocks: (Heading | Paragraph | SceneBreak)[] = [];
	for (const span of spans) {
		if (span.block.kind !== "Paragraph" || span.start === span.end) {
			blocks.push(span.block);
			continue;
		}
		const covering = paraRanges.filter(
			(range) => range.start >= span.start && range.end <= span.end,
		);
		const coversAll =
			covering.length > 0 &&
			covering[0]?.start === span.start &&
			covering.at(-1)?.end === span.end;
		if (!coversAll || covering.length <= span.splitCount) {
			blocks.push(span.block);
			continue;
		}
		changed = true;
		for (const range of covering) {
			blocks.push({
				kind: "Paragraph",
				inlines: [{ kind: "Run", text: range.sentences.join(" ") }],
				...(span.block.locations
					? { locations: span.block.locations }
					: {}),
			});
		}
	}
	return changed ? { ...scroll, blocks } : scroll;
}
