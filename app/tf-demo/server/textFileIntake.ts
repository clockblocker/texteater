import {
	type ExtractedText,
	extractTextFile,
	type Scroll,
	splitScroll,
	stitchedText,
} from "dumgen";
import {
	MAX_SCROLL_TEXT_BYTES,
	MAX_SECTIONS_PER_FILE,
	MAX_SENTENCES_PER_SCROLL,
} from "./textSubmissionLimits";

/**
 * A `.txt` Submission's write plan (#1191): `extractTextFile` reads the file
 * into its Sections and Scrolls (#1190), and each Scroll is split into its
 * Sentences in code and stored unprocessed, so every Scroll reads as plain
 * text at once. Nothing here asks a model: processing follows the reader
 * Folio by Folio (#1193). The host writes the Sections first, then the
 * Scrolls in batches (`scrollBatches`) that keep each mutation inside
 * Convex's limits.
 */

type Contents = ExtractedText["contents"];

/** A Section to write: its parent by index in the plan (`null` for the top) and its Codex order. */
type PlannedSection = {
	readonly title: string;
	readonly parent: number | null;
	readonly order: number;
};

/** One Sentence as stored before processing: no language, no Segments. */
type PlannedSentence = {
	readonly position: number;
	readonly paragraph: number;
	readonly stitchedText: string;
};

/** A Scroll to write, placed in a planned Section, with its Sentences. */
export type PlannedScroll = {
	readonly section: number;
	readonly order: number;
	/** Its own Heading's text; absent for front matter and size-cut pieces. */
	readonly title?: string;
	/** Its paragraphs as running text. */
	readonly sourceText: string;
	readonly extractedText: Scroll;
	/** The paragraphs a Scene Break stands before, in order. */
	readonly sceneBreaks: readonly number[];
	readonly sentences: readonly PlannedSentence[];
	/** What its text and Sentences weigh as Convex arguments, about. */
	readonly bytes: number;
};

export type TextFilePlan = {
	/** The top Section's title: the book's. */
	readonly title: string;
	/** Parent before child; the top Section first. */
	readonly sections: readonly PlannedSection[];
	/** In reading order. */
	readonly scrolls: readonly PlannedScroll[];
};

export type TextFilePlanResult =
	| { readonly kind: "Planned"; readonly plan: TextFilePlan }
	| { readonly kind: "Rejected"; readonly message: string };

const EMPTY_FILE_MESSAGE = "This file holds no text.";
const LONG_SCROLL_MESSAGE =
	"A chapter in this file is too long to open as one text. Files with chapters of more than about 2,000 sentences aren't supported yet.";
const MANY_SECTIONS_MESSAGE =
	"This file has more parts than a book can list. Files with more than 2,000 parts aren't supported yet.";

const encoder = new TextEncoder();
const utf8Bytes = (value: string) => encoder.encode(value).byteLength;

const runsText = (runs: readonly { readonly text: string }[]) =>
	runs
		.map(({ text }) => text)
		.join("")
		.replace(/\s+/gu, " ")
		.trim();

/**
 * A Scroll's paragraphs and Sentences, as `splitScroll` gives them, with
 * the paragraph each Scene Break stands before. Each stretch between Scene
 * Breaks is split on its own, so the indices count the same paragraphs.
 */
function splitWithSceneBreaks(scroll: Scroll) {
	const stretches: Scroll[] = [];
	let blocks: Scroll["blocks"][number][] = [];
	let heading = scroll.heading;
	for (const block of scroll.blocks) {
		if (block.kind !== "SceneBreak") {
			blocks.push(block);
			continue;
		}
		stretches.push({
			kind: "Scroll",
			...(heading ? { heading } : {}),
			blocks,
		});
		heading = undefined;
		blocks = [];
	}
	stretches.push({ kind: "Scroll", ...(heading ? { heading } : {}), blocks });
	const paragraphs: (readonly string[])[] = [];
	const breaks = new Set<number>();
	for (const [index, stretch] of stretches.entries()) {
		if (index > 0) breaks.add(paragraphs.length);
		for (const { sentences } of splitScroll(stretch).paragraphs)
			paragraphs.push(sentences);
	}
	return {
		paragraphs,
		sceneBreaks: [...breaks].filter(
			(paragraph) => paragraph > 0 && paragraph < paragraphs.length,
		),
	};
}

/** One Scroll as stored, or the reason it cannot be. */
function plannedScroll(
	scroll: Scroll,
	section: number,
	order: number,
): PlannedScroll | string {
	const { paragraphs, sceneBreaks } = splitWithSceneBreaks(scroll);
	const sentences: PlannedSentence[] = [];
	for (const [paragraph, texts] of paragraphs.entries())
		for (const text of texts) {
			const stitched = stitchedText(text);
			if (stitched.length > 0)
				sentences.push({
					position: sentences.length,
					paragraph,
					stitchedText: stitched,
				});
		}
	if (sentences.length > MAX_SENTENCES_PER_SCROLL) return LONG_SCROLL_MESSAGE;
	const sourceText = paragraphs.map((texts) => texts.join(" ")).join("\n\n");
	const textBytes = utf8Bytes(sourceText) + utf8Bytes(JSON.stringify(scroll));
	if (textBytes > MAX_SCROLL_TEXT_BYTES) return LONG_SCROLL_MESSAGE;
	const title = scroll.heading ? runsText(scroll.heading.runs) : "";
	return {
		section,
		order,
		...(title ? { title } : {}),
		sourceText,
		extractedText: scroll,
		sceneBreaks,
		sentences,
		bytes:
			textBytes +
			sentences.reduce(
				(sum, { stitchedText }) => sum + utf8Bytes(stitchedText) + 64,
				0,
			),
	};
}

/**
 * The write plan of an Extracted Text whose contents are one Section, as
 * `extractTextFile` gives it, or why it is turned away: no Sentence at
 * all, a Scroll over a per-Scroll limit, or too many Sections.
 */
export function planExtractedText(
	extracted: ExtractedText,
): TextFilePlanResult {
	const [top] = extracted.contents;
	if (top?.kind !== "Section" || extracted.contents.length !== 1)
		throw new Error("A .txt file reads into exactly one Section.");
	const sections: PlannedSection[] = [];
	const scrolls: PlannedScroll[] = [];
	let rejection: string | undefined;
	const visit = (contents: Contents, section: number) => {
		for (const [order, item] of contents.entries()) {
			if (rejection !== undefined) return;
			if (item.kind === "Section") {
				sections.push({ title: item.title, parent: section, order });
				if (sections.length > MAX_SECTIONS_PER_FILE) {
					rejection = MANY_SECTIONS_MESSAGE;
					return;
				}
				visit(item.contents, sections.length - 1);
				continue;
			}
			const planned = plannedScroll(item, section, order);
			if (typeof planned === "string") rejection = planned;
			else scrolls.push(planned);
		}
	};
	sections.push({ title: top.title, parent: null, order: 0 });
	visit(top.contents, 0);
	if (rejection !== undefined)
		return { kind: "Rejected", message: rejection };
	if (scrolls.every(({ sentences }) => sentences.length === 0))
		return { kind: "Rejected", message: EMPTY_FILE_MESSAGE };
	return {
		kind: "Planned",
		plan: { title: top.title, sections, scrolls },
	};
}

/** The write plan of a `.txt` file, read with Dumgen's `extractTextFile`. */
export function planTextFile(file: {
	readonly name: string;
	readonly bytes: Uint8Array;
}): TextFilePlanResult {
	return planExtractedText(extractTextFile(file));
}

/**
 * What one Scroll-writing mutation may carry. Convex lets a mutation write
 * 16,000 documents and 16 MiB, but a deployment only about 4 MiB a second,
 * and a Scroll's stored documents and indexes weigh a few times its
 * arguments; a batch stays far inside both, and the host retries one the
 * write rate turns away.
 */
const SCROLL_BATCH_LIMITS = {
	sentences: 4_000,
	bytes: 1024 * 1024,
} as const;

/**
 * The Scrolls in reading order, cut into batches within
 * `SCROLL_BATCH_LIMITS`. A Scroll is never split; one over a limit alone
 * makes its own batch, which the per-Scroll limits keep writable.
 */
export function scrollBatches(
	scrolls: readonly PlannedScroll[],
	limits: {
		readonly sentences: number;
		readonly bytes: number;
	} = SCROLL_BATCH_LIMITS,
): PlannedScroll[][] {
	const batches: PlannedScroll[][] = [];
	let batch: PlannedScroll[] = [];
	let sentences = 0;
	let bytes = 0;
	for (const scroll of scrolls) {
		const weight = scroll.sentences.length + 1;
		if (
			batch.length > 0 &&
			(sentences + weight > limits.sentences ||
				bytes + scroll.bytes > limits.bytes)
		) {
			batches.push(batch);
			batch = [];
			sentences = 0;
			bytes = 0;
		}
		batch.push(scroll);
		sentences += weight;
		bytes += scroll.bytes;
	}
	if (batch.length > 0) batches.push(batch);
	return batches;
}
