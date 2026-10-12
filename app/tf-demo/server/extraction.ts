import Defuddle from "defuddle";
import {
	type ExtractedText,
	extractPastedText,
	extractTextFile,
	type Scroll,
	scrollFromHtml,
} from "dumgen";
import { parseHTML } from "linkedom";

/**
 * Extraction's front door (#1188, #1196): what a Submission hands in goes
 * to the first Extractor in `EXTRACTORS` that accepts it. A paste is text
 * with no name; a `.txt` file or a fetched plain-text page is read by
 * Dumgen's `.txt` reader; an HTML page goes through defuddle, which finds
 * the article, and Dumgen's HTML mapper, which turns it into a Scroll. A
 * link is not an Extractor: fetching (`linkFetch.ts`) turns it into a
 * `Received` page, which then dispatches like a file.
 */

/** What Extraction reads: pasted text, a file, or a fetched page. */
export type Received = {
	/** The media type without parameters, lower case: `text/html`. */
	readonly mimeType: string;
	/** The `charset` parameter of a page's `Content-Type`, if any. */
	readonly charset?: string;
	/** A file's name; absent for a paste. */
	readonly name?: string;
	/** A fetched page's URL after redirects; absent for a paste or a file. */
	readonly url?: string;
	/** Pasted text, or a file's or a page's bytes. */
	readonly body: string | Uint8Array;
};

type Extractor = {
	readonly id: "paste" | "txt" | "article";
	accepts(received: Received): boolean;
	extract(received: Received): ExtractedText;
};

const encoder = new TextEncoder();

function bytesOf(body: string | Uint8Array): Uint8Array {
	return typeof body === "string" ? encoder.encode(body) : body;
}

/** The last segment of a page's path, the name the `.txt` reader titles by. */
function nameOf(received: Received): string {
	if (received.name !== undefined) return received.name;
	if (received.url === undefined) return "";
	const path = new URL(received.url).pathname;
	return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
}

const isPlainText = ({ mimeType }: Received) => mimeType === "text/plain";

const paste: Extractor = {
	id: "paste",
	accepts: (received) =>
		isPlainText(received) &&
		received.name === undefined &&
		received.url === undefined &&
		typeof received.body === "string",
	extract: ({ body }) => ({
		contents: [
			extractPastedText(
				typeof body === "string"
					? body
					: new TextDecoder().decode(body),
			),
		],
	}),
};

const txt: Extractor = {
	id: "txt",
	accepts: isPlainText,
	extract: (received) =>
		extractTextFile({
			name: nameOf(received),
			bytes: bytesOf(received.body),
		}),
};

const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);

/** A `<meta charset>` or `http-equiv` charset in a page's first bytes. */
function metaCharset(bytes: Uint8Array): string | undefined {
	const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
	return /<meta[^>]+charset\s*=\s*["']?\s*([\w.:-]+)/iu.exec(head)?.[1];
}

/**
 * A page's text, decoded by its `Content-Type` charset, else its
 * `<meta charset>`, else as UTF-8. An unknown label falls back to UTF-8.
 */
function decodedPage(received: Received): string {
	if (typeof received.body === "string") return received.body;
	for (const label of [received.charset, metaCharset(received.body)]) {
		if (label === undefined) continue;
		try {
			return new TextDecoder(label).decode(received.body);
		} catch {}
	}
	return new TextDecoder().decode(received.body);
}

const article: Extractor = {
	id: "article",
	accepts: ({ mimeType }) => HTML_TYPES.has(mimeType),
	extract: (received) => {
		const { document } = parseHTML(decodedPage(received));
		// `standardize: false`: its standardizing puts spaces inside words
		// split by inline tags (#1188); `useAsync: false`: no third-party API.
		const found = new Defuddle(document as unknown as Document, {
			...(received.url === undefined ? {} : { url: received.url }),
			standardize: false,
			useAsync: false,
		}).parse();
		const content = parseHTML(
			`<!doctype html><html><body>${found.content}</body></html>`,
		).document;
		return {
			contents: [scrollFromHtml(content, { title: found.title })],
		};
	},
};

/** In order: the first Extractor that accepts what was received reads it. */
export const EXTRACTORS: readonly Extractor[] = [paste, txt, article];

/** The Extractor that reads `received`, or undefined when none accepts it. */
export function extractorFor(received: Received): Extractor | undefined {
	return EXTRACTORS.find((extractor) => extractor.accepts(received));
}

type Contents = ExtractedText["contents"];

function scrollsIn(
	contents: Contents,
): Array<{ scroll: Scroll; section?: string }> {
	return contents.flatMap((item) =>
		item.kind === "Scroll"
			? [{ scroll: item }]
			: scrollsIn(item.contents).map((found) => ({
					section: item.title,
					...found,
				})),
	);
}

/**
 * The Extracted Text's only Scroll with its title: the text of its own
 * Heading, else the title of the Section around it. Undefined when the
 * text holds several Scrolls, as a book does.
 */
export function loneScroll(
	text: ExtractedText,
): { readonly scroll: Scroll; readonly title?: string } | undefined {
	const [only, ...rest] = scrollsIn(text.contents);
	if (only === undefined || rest.length > 0) return undefined;
	const heading = only.scroll.heading?.runs.map(({ text }) => text).join("");
	const title = heading || only.section;
	return title ? { scroll: only.scroll, title } : { scroll: only.scroll };
}

/** Pasted text's one Scroll, read by the Extractor that accepts a paste. */
export function extractPaste(text: string): Scroll {
	const received: Received = { mimeType: "text/plain", body: text };
	const read = extractorFor(received)?.extract(received);
	const found = read && loneScroll(read);
	if (found === undefined) throw new Error("A paste reads as one Scroll.");
	return found.scroll;
}
