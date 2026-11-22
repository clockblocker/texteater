import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initEpubFile } from "@lingo-reader/epub-parser";
import { initFb2File } from "@lingo-reader/fb2-parser";
import { initKf8File, initMobiFile } from "@lingo-reader/mobi-parser";
import {
	type ExtractedText,
	extractedTextFromMarkdown,
	extractTextFile,
	type Scroll,
	scrollFromHtml,
} from "dumgen";
import { parseHTML } from "linkedom";
import { SUPPORTED_FILE_FORMATS_LABEL } from "../shared/text-file-limits";

/**
 * Multi-format book and document extraction for file Submissions:
 * `.txt`, `.epub`, `.mobi`, `.prc`, `.azw`, `.azw3`, `.kf8`, `.fb2`,
 * `.md`/`.markdown`, and `.html`/`.htm`/`.xhtml`. Every format produces one
 * `ExtractedText` rooted at a single top `Section`, ready for
 * `planExtractedText` to turn into Codex Sections, Scrolls and Folios.
 */

export type FileExtractionResult =
	| { readonly kind: "Extracted"; readonly extracted: ExtractedText }
	| { readonly kind: "Rejected"; readonly message: string };

type UploadedFile = {
	readonly name: string;
	readonly bytes: Uint8Array;
};

type ScrollBlock = Scroll["blocks"][number];

const UNSUPPORTED_FORMAT_MESSAGE = `Unsupported file format. Supported formats: ${SUPPORTED_FILE_FORMATS_LABEL}.`;
const DRM_PROTECTED_MESSAGE = "This ebook is DRM-protected and can't be read.";
const CORRUPT_BOOK_MESSAGE =
	"This file couldn't be read. Make sure it is a valid, DRM-free book or text file.";

const MAX_SCROLL_CHARS = 25_000;
const TITLE_SENTENCE_END = /[.,;:!?…]["'”’»«)\]]*$/u;
const TITLE_SPEECH_OPENING = /^["'„“‚‘»«›‹([—–-]/u;

const oneLine = (value: string) => value.replace(/\s+/gu, " ").trim();

function extensionOf(name: string): string {
	const base = name.split(/[/\\]/u).at(-1) ?? name;
	const dot = base.lastIndexOf(".");
	return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

function titleFromFileName(name: string): string {
	const base = name.split(/[/\\]/u).at(-1) ?? name;
	const withoutExt = base.replace(/\.[^.]+$/u, "");
	return oneLine(withoutExt.replace(/[_]+/gu, " ")) || "Text";
}

function decodeUtf8OrLatin1(bytes: Uint8Array): string {
	if (bytes.length >= 2) {
		if (bytes[0] === 0xff && bytes[1] === 0xfe)
			return new TextDecoder("utf-16le").decode(bytes);
		if (bytes[0] === 0xfe && bytes[1] === 0xff)
			return new TextDecoder("utf-16be").decode(bytes);
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder("windows-1252").decode(bytes);
	}
}

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
	const dir = mkdtempSync(join(tmpdir(), "tf-book-"));
	try {
		return await run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function blockCharLength(block: ScrollBlock): number {
	if (block.kind === "SceneBreak") return 0;
	if (block.kind === "Heading")
		return block.runs.reduce((sum, run) => sum + run.text.length, 0);
	return block.inlines.reduce(
		(sum, inline) => sum + (inline.kind === "Run" ? inline.text.length : 1),
		0,
	);
}

/** Splits an oversized unchaptered Scroll into readable ~25k-char parts. */
function splitOversizedScroll(scroll: Scroll): Scroll[] {
	const total = scroll.blocks.reduce(
		(sum, block) => sum + blockCharLength(block),
		0,
	);
	if (total <= MAX_SCROLL_CHARS * 2) return [scroll];
	const parts: Scroll[] = [];
	let current: ScrollBlock[] = [];
	let size = 0;
	for (const block of scroll.blocks) {
		const weight = blockCharLength(block);
		if (current.length > 0 && size + weight > MAX_SCROLL_CHARS) {
			parts.push({
				kind: "Scroll",
				...(parts.length === 0 && scroll.heading
					? { heading: scroll.heading }
					: {}),
				blocks: current,
			});
			current = [];
			size = 0;
		}
		current.push(block);
		size += weight;
	}
	if (current.length > 0) {
		parts.push({
			kind: "Scroll",
			...(parts.length === 0 && scroll.heading
				? { heading: scroll.heading }
				: {}),
			blocks: current,
		});
	}
	return parts;
}

const isShortTitleLine = (text: string) =>
	text.length > 0 &&
	text.length <= 80 &&
	/\p{L}/u.test(text) &&
	!TITLE_SENTENCE_END.test(text) &&
	!TITLE_SPEECH_OPENING.test(text);

/**
 * When a chapter Scroll has no explicit heading (common in MOBI HTML where
 * chapter headers are `<p>` instead of `<h1>`), promotes its opening heading
 * or standalone short title line into `scroll.heading`.
 */
function promoteChapterHeading(scroll: Scroll): Scroll {
	if (scroll.heading || scroll.blocks.length < 2) return scroll;
	const [first, ...rest] = scroll.blocks;
	if (!first) return scroll;
	if (first.kind === "Heading") {
		return {
			kind: "Scroll",
			heading: { runs: first.runs },
			blocks: rest,
		};
	}
	if (
		first.kind === "Paragraph" &&
		!first.inlines.some((inline) => inline.kind === "LineBreak")
	) {
		const text = oneLine(
			first.inlines
				.map((inline) => (inline.kind === "Run" ? inline.text : ""))
				.join(""),
		);
		if (isShortTitleLine(text)) {
			return {
				kind: "Scroll",
				heading: { runs: [{ kind: "Run", text }] },
				blocks: rest,
			};
		}
	}
	return scroll;
}

function htmlToScroll(html: string, title?: string): Scroll {
	const cleaned = html.replace(/\r\n?/gu, "\n");
	const wrapped = /<html[\s>]/iu.test(cleaned)
		? cleaned
		: `<!doctype html><html><body>${cleaned}</body></html>`;
	const { document } = parseHTML(wrapped);
	const raw = scrollFromHtml(
		document as unknown as Parameters<typeof scrollFromHtml>[0],
		title ? { title } : {},
	);
	return promoteChapterHeading(raw);
}

function wrapInTopSection(
	title: string,
	scrolls: readonly Scroll[],
): ExtractedText {
	const nonEmpty = scrolls
		.filter(
			(scroll) =>
				scroll.blocks.length > 0 || scroll.heading !== undefined,
		)
		.flatMap(splitOversizedScroll);
	return {
		contents: [
			{
				kind: "Section",
				title: oneLine(title) || "Text",
				contents:
					nonEmpty.length > 0
						? nonEmpty
						: [{ kind: "Scroll", blocks: [] }],
			},
		],
	};
}

type TocNode = {
	readonly label: string;
	readonly href: string;
	readonly children?: readonly TocNode[];
};

function tocLabelsByChapterId(
	toc: readonly TocNode[],
	resolveHref: (href: string) => { readonly id: string } | undefined,
): Map<string, string> {
	const labels = new Map<string, string>();
	const walk = (items: readonly TocNode[]) => {
		for (const item of items) {
			const label = oneLine(item.label);
			if (label.length > 0 && item.href) {
				const resolved = resolveHref(item.href);
				if (resolved && !labels.has(resolved.id))
					labels.set(resolved.id, label);
			}
			if (item.children) walk(item.children);
		}
	};
	walk(toc);
	return labels;
}

async function extractEpub(file: UploadedFile): Promise<ExtractedText> {
	return withTempDir(async (dir) => {
		const epub = await initEpubFile(file.bytes, dir);
		try {
			const title =
				oneLine(epub.getMetadata().title || "") ||
				titleFromFileName(file.name);
			const labels = tocLabelsByChapterId(epub.getToc(), (href) =>
				epub.resolveHref(href),
			);
			const scrolls: Scroll[] = [];
			for (const item of epub.getSpine()) {
				const chapter = await epub.loadChapter(item.id);
				if (!chapter?.html) continue;
				const scroll = htmlToScroll(chapter.html, labels.get(item.id));
				if (scroll.blocks.length > 0) scrolls.push(scroll);
			}
			return wrapInTopSection(title, scrolls);
		} finally {
			epub.destroy();
		}
	});
}

async function extractFb2(file: UploadedFile): Promise<ExtractedText> {
	return withTempDir(async (dir) => {
		const bookPath = join(dir, "book.fb2");
		writeFileSync(bookPath, file.bytes);
		const fb2 = await initFb2File(bookPath, dir);
		try {
			const meta = fb2.getMetadata();
			const title =
				oneLine(meta.title || meta.bookName || "") ||
				titleFromFileName(file.name);
			const labels = tocLabelsByChapterId(fb2.getToc(), (href) =>
				fb2.resolveHref(href),
			);
			const scrolls: Scroll[] = [];
			for (const item of fb2.getSpine()) {
				const chapter = fb2.loadChapter(item.id);
				if (!chapter?.html) continue;
				const scroll = htmlToScroll(chapter.html, labels.get(item.id));
				if (scroll.blocks.length > 0) scrolls.push(scroll);
			}
			return wrapInTopSection(title, scrolls);
		} finally {
			fb2.destroy();
		}
	});
}

type MobiHeaderInfo = {
	readonly compression: number;
	readonly textRecordCount: number;
	readonly encryption: number;
	readonly mobiVersion: number;
	readonly encoding: number;
	readonly extraFlags: number;
	readonly title: string;
	readonly offsets: readonly number[];
	readonly hasKf8Boundary: boolean;
};

/** Inspects a PalmDB/MOBI header to detect DRM, KF8/AZW3, and PalmDOC fields. */
function inspectMobiHeader(bytes: Uint8Array): MobiHeaderInfo | undefined {
	if (bytes.length < 86) return undefined;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const numRecords = view.getUint16(76);
	if (numRecords < 2 || 78 + numRecords * 8 > bytes.length) return undefined;
	const offsets: number[] = [];
	for (let index = 0; index < numRecords; index++) {
		offsets.push(view.getUint32(78 + index * 8));
	}
	offsets.push(bytes.length);
	const rec0 = offsets[0] ?? 0;
	if (rec0 + 132 > bytes.length) return undefined;
	const magic = new TextDecoder("ascii").decode(
		bytes.subarray(rec0 + 16, rec0 + 20),
	);
	if (magic !== "MOBI") return undefined;
	const compression = view.getUint16(rec0);
	const textRecordCount = view.getUint16(rec0 + 8);
	const encryption = view.getUint16(rec0 + 12);
	const headerLength = view.getUint32(rec0 + 20);
	const encoding = view.getUint32(rec0 + 28);
	const mobiVersion = view.getUint32(rec0 + 36);
	const fullNameOff = view.getUint32(rec0 + 84);
	const fullNameLen = view.getUint32(rec0 + 88);
	const extraFlags =
		headerLength >= 228 && rec0 + 244 <= bytes.length
			? view.getUint16(rec0 + 242)
			: 0;
	const title =
		fullNameLen > 0 && rec0 + fullNameOff + fullNameLen <= bytes.length
			? new TextDecoder(encoding === 65001 ? "utf-8" : "windows-1252")
					.decode(
						bytes.subarray(
							rec0 + fullNameOff,
							rec0 + fullNameOff + fullNameLen,
						),
					)
					.replace(/\0+$/gu, "")
			: "";
	// Dual MOBI+KF8 files contain an EXTH 121 boundary record starting with "BOUNDARY".
	const hasKf8Boundary = offsets.some((offset, index) => {
		const end = offsets[index + 1] ?? offset;
		return (
			end - offset >= 8 &&
			bytes[offset] === 0x42 &&
			new TextDecoder("ascii").decode(
				bytes.subarray(offset, offset + 8),
			) === "BOUNDARY"
		);
	});
	return {
		compression,
		textRecordCount,
		encryption,
		mobiVersion,
		encoding,
		extraFlags,
		title,
		offsets,
		hasKf8Boundary,
	};
}

function trimMobiTrailingEntries(rec: Uint8Array, flags: number): Uint8Array {
	let end = rec.length;
	for (let bit = 1; bit < 16; bit++) {
		if ((flags & (1 << bit)) === 0 || end <= 0) continue;
		let size = 0;
		let shift = 0;
		let pos = end - 1;
		while (pos >= 0) {
			const byte = rec[pos] ?? 0;
			size |= (byte & 0x7f) << shift;
			shift += 7;
			if (byte & 0x80) break;
			pos--;
		}
		end -= size;
	}
	if ((flags & 1) !== 0 && end > 0) {
		const overlap = ((rec[end - 1] ?? 0) & 0x03) + 1;
		end -= overlap;
	}
	return rec.subarray(0, Math.max(0, end));
}

function decompressPalmDoc(src: Uint8Array): Uint8Array {
	const out: number[] = [];
	let index = 0;
	while (index < src.length) {
		const byte = src[index++] ?? 0;
		if (byte === 0 || (byte >= 0x09 && byte <= 0x7f)) {
			out.push(byte);
		} else if (byte >= 0x01 && byte <= 0x08) {
			for (let k = 0; k < byte && index < src.length; k++)
				out.push(src[index++] ?? 0);
		} else if (byte >= 0x80 && byte <= 0xbf) {
			const next = src[index++] ?? 0;
			const pair = ((byte << 8) | next) & 0x3fff;
			const distance = pair >> 3;
			const length = (pair & 0x07) + 3;
			for (let k = 0; k < length; k++) {
				out.push(out[out.length - distance] ?? 0);
			}
		} else {
			out.push(0x20, byte ^ 0x80);
		}
	}
	return new Uint8Array(out);
}

/**
 * Direct PalmDOC/uncompressed MOBI6 HTML unpacker: handles HTML4 MOBI files
 * whose non-XHTML TOC crashes strict XML parsers (such as sax).
 */
function extractMobi6PalmDoc(
	file: UploadedFile,
	header: MobiHeaderInfo,
): ExtractedText {
	const chunks: Uint8Array[] = [];
	let total = 0;
	const maxRecord = Math.min(
		header.textRecordCount,
		header.offsets.length - 2,
	);
	for (let record = 1; record <= maxRecord; record++) {
		const start = header.offsets[record] ?? 0;
		const end = header.offsets[record + 1] ?? start;
		if (end <= start) continue;
		const trimmed = trimMobiTrailingEntries(
			file.bytes.subarray(start, end),
			header.extraFlags,
		);
		const decoded =
			header.compression === 2 ? decompressPalmDoc(trimmed) : trimmed;
		chunks.push(decoded);
		total += decoded.length;
	}
	const combined = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}
	const charset = header.encoding === 65001 ? "utf-8" : "windows-1252";
	const rawHtml = new TextDecoder(charset).decode(combined);
	const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/iu.exec(rawHtml);
	const bodyHtml = bodyMatch?.[1] ?? rawHtml;
	const parts = bodyHtml.split(/<mbp:pagebreak\b[^>]*\/?>/giu);
	const scrolls: Scroll[] = [];
	for (const part of parts) {
		const scroll = htmlToScroll(part);
		if (scroll.blocks.length > 0) scrolls.push(scroll);
	}
	const title = oneLine(header.title) || titleFromFileName(file.name);
	return wrapInTopSection(title, scrolls);
}

async function extractMobiViaLingo(
	file: UploadedFile,
	kf8: boolean,
): Promise<ExtractedText> {
	return withTempDir(async (dir) => {
		const book = kf8
			? await initKf8File(file.bytes, dir)
			: await initMobiFile(file.bytes, dir);
		try {
			const title =
				oneLine(book.getMetadata().title || "") ||
				titleFromFileName(file.name);
			const labels = tocLabelsByChapterId(book.getToc(), (href) =>
				book.resolveHref(href),
			);
			const scrolls: Scroll[] = [];
			for (const item of book.getSpine()) {
				const chapter = book.loadChapter(item.id);
				if (!chapter?.html) continue;
				const scroll = htmlToScroll(chapter.html, labels.get(item.id));
				if (scroll.blocks.length > 0) scrolls.push(scroll);
			}
			return wrapInTopSection(title, scrolls);
		} finally {
			book.destroy();
		}
	});
}

async function extractMobiOrKf8(
	file: UploadedFile,
	ext: string,
): Promise<FileExtractionResult> {
	const header = inspectMobiHeader(file.bytes);
	if (!header) return { kind: "Rejected", message: CORRUPT_BOOK_MESSAGE };
	if (header.encryption !== 0)
		return { kind: "Rejected", message: DRM_PROTECTED_MESSAGE };

	const preferKf8 =
		ext === "azw3" ||
		ext === "kf8" ||
		header.mobiVersion >= 8 ||
		header.hasKf8Boundary;
	if (preferKf8) {
		try {
			return {
				kind: "Extracted",
				extracted: await extractMobiViaLingo(file, true),
			};
		} catch {
			// Fall through to MOBI6 extraction if a dual-format file's KF8 stream fails.
		}
	}
	try {
		return {
			kind: "Extracted",
			extracted: await extractMobiViaLingo(file, false),
		};
	} catch {
		if (header.compression === 1 || header.compression === 2) {
			return {
				kind: "Extracted",
				extracted: extractMobi6PalmDoc(file, header),
			};
		}
		return { kind: "Rejected", message: CORRUPT_BOOK_MESSAGE };
	}
}

function extractMarkdownFile(file: UploadedFile): ExtractedText {
	const text = decodeUtf8OrLatin1(file.bytes);
	const parsed = extractedTextFromMarkdown(text);
	const [only, ...rest] = parsed.contents;
	if (only?.kind === "Section" && rest.length === 0) return parsed;
	const firstScrollHeading =
		only?.kind === "Scroll"
			? oneLine(only.heading?.runs.map(({ text }) => text).join("") ?? "")
			: "";
	const title =
		rest.length === 0 && firstScrollHeading
			? firstScrollHeading
			: titleFromFileName(file.name);
	return {
		contents: [
			{
				kind: "Section",
				title,
				contents: parsed.contents,
			},
		],
	};
}

function extractHtmlFile(file: UploadedFile): ExtractedText {
	const html = decodeUtf8OrLatin1(file.bytes);
	const { document } = parseHTML(html.replace(/\r\n?/gu, "\n"));
	const docTitle = oneLine(
		document.querySelector("title")?.textContent ?? "",
	);
	const title = docTitle || titleFromFileName(file.name);
	const scroll = scrollFromHtml(
		document as unknown as Parameters<typeof scrollFromHtml>[0],
		{ title },
	);
	return wrapInTopSection(title, [scroll]);
}

/**
 * Extracts an uploaded book or text file into a single-top-Section
 * `ExtractedText`, or returns a visitor-facing rejection when the format is
 * unsupported, DRM-protected, or unreadable.
 */
export async function extractUploadedFile(
	file: UploadedFile,
): Promise<FileExtractionResult> {
	const ext = extensionOf(file.name);
	try {
		switch (ext) {
			case "":
			case "txt":
				return { kind: "Extracted", extracted: extractTextFile(file) };
			case "md":
			case "markdown":
				return {
					kind: "Extracted",
					extracted: extractMarkdownFile(file),
				};
			case "html":
			case "htm":
			case "xhtml":
				return { kind: "Extracted", extracted: extractHtmlFile(file) };
			case "epub":
				return {
					kind: "Extracted",
					extracted: await extractEpub(file),
				};
			case "fb2":
				return {
					kind: "Extracted",
					extracted: await extractFb2(file),
				};
			case "mobi":
			case "prc":
			case "azw":
			case "azw3":
			case "kf8":
				return await extractMobiOrKf8(file, ext);
			default:
				return {
					kind: "Rejected",
					message: UNSUPPORTED_FORMAT_MESSAGE,
				};
		}
	} catch {
		return { kind: "Rejected", message: CORRUPT_BOOK_MESSAGE };
	}
}
