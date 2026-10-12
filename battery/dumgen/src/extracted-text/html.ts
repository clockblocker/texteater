/**
 * HTML import for Extracted Text (#1195, rules decided in #1188 and #1182):
 * a web article's HTML (#1196) or an EPUB's XHTML chapter files (#1197)
 * become one Scroll. The mapper reads a parsed tree through `HtmlNode`, a
 * small slice of the DOM, so Dumgen takes no parser: a host parses with
 * linkedom (`text/html` for a page; `text/xml` for EPUB XHTML, whose
 * `<a id="x"/>` an HTML parser would misread) or a browser's `DOMParser`,
 * and passes the Document or any element.
 *
 * The rules follow the Markdown import (`markdown.ts`):
 *
 * - `h1`–`h6` are Headings at the same level, clamped to 2–6. The first
 *   one repeating the given title becomes the Scroll's own Heading, and
 *   Headings left at the end with nothing under them are dropped.
 * - `p`, `li`, `dt`, `dd`, `address`, `caption`, `summary` and a block
 *   quote's paragraphs are Paragraphs, and so is loose text between the
 *   blocks of a `div`, `section`, `blockquote` or other container. Each list
 *   item is its own Paragraph, an ordered one keeping its number (`start`
 *   and `value` honoured); each table row is one, its cells joined with
 *   ` | `. A `pre` is one Paragraph with a Line Break per line.
 * - `br` is a Line Break; two in a row end the Paragraph, and one at a
 *   Paragraph's edge is dropped. In a Heading or a table row it is a space.
 * - `i`, `em`, `cite`, `dfn` and `var` are Italic, `b` and `strong` Bold,
 *   `q` Quotation (adding no marks). Every other inline keeps its text.
 * - `hr`, and a Paragraph that is only a row of stars (`* * *`, `⁂`), is a
 *   Scene Break, as a thematic break is in Markdown; none is kept at the
 *   Scroll's edges, next to another or right before a Heading.
 * - Dropped: `head`, scripts, media, forms, `nav`, `figure` with its
 *   caption, hidden elements, page-break markers, footnote and endnote
 *   references (Wikipedia's, Gutenberg's, EPUB `noteref`) with their bodies
 *   and backlinks, and pull quotes: a `blockquote` or `aside` whose text
 *   recurs outside every quote.
 * - Whitespace collapses as in CSS `white-space: normal` (kept in `pre`),
 *   lines are trimmed, soft hyphens and zero-width spaces go, and the text
 *   is NFC. `lang` and `dir` are ignored, and no Original Location is set.
 *
 * The result is in the canonical form Markdown export reads back
 * unchanged: neighbouring runs merged, no style on the whitespace at a
 * style's edges.
 */
import type {
	Heading,
	InlineStyle,
	LineBreak,
	Paragraph,
	Run,
	SceneBreak,
	Scroll,
} from "./extracted-text.js";

type Block = Heading | Paragraph | SceneBreak;

/**
 * The part of a DOM node the mapper reads: what linkedom's and a browser's
 * Documents, elements and text nodes all have. `nodeName` is a tag name in
 * either case.
 */
type HtmlNode = {
	readonly nodeType: number;
	readonly nodeName: string;
	readonly childNodes: ArrayLike<HtmlNode>;
	readonly textContent: string | null;
	getAttribute?(name: string): string | null;
};

/**
 * One document's share of a Scroll: from the element whose `id` is `from`
 * (from the start without it) up to, not including, the element whose `id`
 * is `to` (to the end without it); an `a` may name the spot with `name`.
 * An EPUB nav entry's Scroll runs from its fragment in one spine file to
 * the next entry's fragment, perhaps files later.
 */
type HtmlSlice = {
	readonly root: HtmlNode;
	readonly from?: string;
	readonly to?: string;
};

type ScrollOptions = {
	/**
	 * The Scroll's title: an article's title, a nav entry's label. The
	 * first Heading that repeats it, ignoring case and punctuation, becomes
	 * the Scroll's own Heading; with none, the title does.
	 */
	readonly title?: string;
};

const elementNode = 1;
const textNode = 3;
const cdataNode = 4;
const documentNode = 9;
const fragmentNode = 11;

const styleTags: Readonly<Record<string, InlineStyle>> = {
	b: "Bold",
	cite: "Italic",
	dfn: "Italic",
	em: "Italic",
	i: "Italic",
	q: "Quotation",
	strong: "Bold",
	var: "Italic",
};

const styleBits: Readonly<Record<InlineStyle, number>> = {
	Italic: 1,
	Bold: 2,
	Quotation: 4,
};

const styleOrder: readonly InlineStyle[] = ["Italic", "Bold", "Quotation"];

const paragraphTags = new Set([
	"address",
	"caption",
	"dd",
	"dt",
	"li",
	"p",
	"summary",
]);

const preTags = new Set(["listing", "plaintext", "pre", "xmp"]);

const containerTags = new Set([
	"article",
	"aside",
	"blockquote",
	"body",
	"center",
	"details",
	"dialog",
	"dir",
	"div",
	"dl",
	"fieldset",
	"footer",
	"header",
	"hgroup",
	"html",
	"legend",
	"main",
	"menu",
	"ol",
	"search",
	"section",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"ul",
]);

/** Dropped with their contents; the first group also ends a Paragraph. */
const droppedBlockTags = new Set([
	"figure",
	"figcaption",
	"form",
	"head",
	"nav",
	"noscript",
	"template",
]);
const droppedInlineTags = new Set([
	"area",
	"audio",
	"button",
	"canvas",
	"embed",
	"iframe",
	"img",
	"input",
	"map",
	"math",
	"object",
	"picture",
	"rp",
	"script",
	"select",
	"source",
	"style",
	"svg",
	"textarea",
	"title",
	"track",
	"video",
]);

/** `id`, `class`, `role` and `epub:type` tokens of a note's body. */
const noteBody =
	/^(?:doc-)?(?:foot|end|rear)notes?$|^(?:references|reflist|mw-references-wrap)$/iu;
/** `role` and `epub:type` tokens of a note reference or its backlink. */
const noteLink = /^(?:doc-)?(?:noteref|backlink|biblioref)$/iu;
/** `class` and `id` tokens of a link that is a note reference. */
const noteLinkName = /^(?:fnref|fnanchor|footnote-?ref|noteref)/iu;
/** The text of a note reference: `1`, `[12]`, `(a)`, `*`, `†`. */
const noteMarker = /^[[(]?(?:\d{1,4}|[a-z]|[*†‡§¶]{1,3})[\])]?$/iu;
const pageBreak = /^(?:doc-)?pagebreak$/iu;
const displayNone = /(?:^|;)\s*display\s*:\s*none\b/iu;

const collapsible = /[\t\n\f\r ]/u;
const invisible = /[\u00AD\u200B]/gu;
const blank = /^\s*$/u;

type Item =
	| {
			readonly kind: "Text";
			readonly text: string;
			readonly mask: number;
			readonly preserved: boolean;
	  }
	| { readonly kind: "Break"; readonly preserved: boolean };

type TextItem = Extract<Item, { kind: "Text" }>;

type Draft =
	| { readonly kind: "Paragraph"; readonly items: Item[] }
	| {
			readonly kind: "Heading";
			readonly level: Heading["level"];
			readonly items: Item[];
	  }
	| { readonly kind: "Row"; readonly cells: Item[][] };

type Mapped = {
	readonly block: Block;
	/** The block quote or aside it came from, numbered in order. */
	readonly quote: number | undefined;
};

/** Where a pass over one slice stands. */
type Walk = {
	readonly from: string | undefined;
	readonly to: string | undefined;
	/** Whether the pass is past `from`. */
	active: boolean;
	/** Whether the pass has reached `to`. */
	done: boolean;
	draft: Draft | undefined;
	readonly blocks: Mapped[];
	mask: number;
	preserved: number;
	quote: number | undefined;
	quotes: number;
	/** Each open list, with its next number when it is ordered. */
	readonly lists: ({ next: number } | undefined)[];
	/** An ordered item's number, waiting for the item's first text. */
	prefix: string | undefined;
};

const attribute = (node: HtmlNode, name: string) =>
	node.getAttribute?.(name) ?? null;

const tokens = (node: HtmlNode, ...names: readonly string[]) =>
	names.flatMap((name) => (attribute(node, name) ?? "").split(/\s+/u));

const childrenOf = (node: HtmlNode): HtmlNode[] => Array.from(node.childNodes);

const tagOf = (node: HtmlNode) => node.nodeName.toLowerCase();

/** A link to a spot in the same document. */
const inPageLink = (node: HtmlNode) =>
	node.nodeType === elementNode &&
	tagOf(node) === "a" &&
	(attribute(node, "href") ?? "").startsWith("#");

/**
 * A footnote reference or backlink: marked so by `role` or `epub:type`, an
 * in-page link named or written as one, or a `sup` holding only in-page
 * links and brackets.
 */
function isNoteReference(node: HtmlNode, tag: string): boolean {
	if (tokens(node, "role", "epub:type").some((token) => noteLink.test(token)))
		return true;
	if (tag === "a" && inPageLink(node))
		return (
			tokens(node, "class", "id").some((token) =>
				noteLinkName.test(token),
			) || noteMarker.test((node.textContent ?? "").trim())
		);
	if (tag !== "sup") return false;
	const children = childrenOf(node);
	return (
		children.some(inPageLink) &&
		children.every(
			(child) =>
				inPageLink(child) ||
				(child.nodeType === textNode &&
					/^[\s[\](),;]*$/u.test(child.textContent ?? "")),
		)
	);
}

function isDropped(node: HtmlNode, tag: string): boolean {
	return (
		droppedBlockTags.has(tag) ||
		droppedInlineTags.has(tag) ||
		attribute(node, "hidden") !== null ||
		displayNone.test(attribute(node, "style") ?? "") ||
		tokens(node, "role", "epub:type").some((token) =>
			pageBreak.test(token),
		) ||
		tokens(node, "id", "class", "role", "epub:type").some((token) =>
			noteBody.test(token),
		) ||
		isNoteReference(node, tag)
	);
}

/** Starts or stops the pass at the slice's `from` and `to` elements. */
function checkAnchor(node: HtmlNode, tag: string, walk: Walk): void {
	const id =
		attribute(node, "id") ?? (tag === "a" ? attribute(node, "name") : null);
	if (id === null) return;
	if (id === walk.to && walk.active) walk.done = true;
	else if (id === walk.from) walk.active = true;
}

/** Looks for `from` and `to` inside a dropped element. */
function scanAnchors(node: HtmlNode, walk: Walk): void {
	for (const child of childrenOf(node)) {
		if (walk.done || child.nodeType !== elementNode) continue;
		checkAnchor(child, tagOf(child), walk);
		scanAnchors(child, walk);
	}
}

/** Whether a block element inside the draft is only a space, not a break. */
const flat = (walk: Walk) =>
	walk.draft !== undefined && walk.draft.kind !== "Paragraph";

function addText(walk: Walk, source: string): void {
	if (!walk.active) return;
	const text = source.replace(invisible, "");
	if (text.length === 0) return;
	walk.draft ??= { kind: "Paragraph", items: [] };
	let items: Item[];
	if (walk.draft.kind !== "Row") items = walk.draft.items;
	else {
		if (walk.draft.cells.length === 0) walk.draft.cells.push([]);
		items = walk.draft.cells.at(-1) as Item[];
	}
	if (walk.prefix !== undefined && !blank.test(text)) {
		items.push({
			kind: "Text",
			text: walk.prefix,
			mask: 0,
			preserved: false,
		});
		walk.prefix = undefined;
	}
	items.push({
		kind: "Text",
		text,
		mask: walk.mask,
		preserved: walk.preserved > 0,
	});
}

function addBreak(walk: Walk, preserved: boolean): void {
	if (!walk.active) return;
	if (walk.draft?.kind === "Paragraph")
		walk.draft.items.push({ kind: "Break", preserved });
	else if (walk.draft === undefined)
		walk.draft = {
			kind: "Paragraph",
			items: [{ kind: "Break", preserved }],
		};
	else addText(walk, " ");
}

function flush(walk: Walk): void {
	const draft = walk.draft;
	walk.draft = undefined;
	if (draft === undefined) return;
	for (const block of finish(draft))
		walk.blocks.push({ block, quote: walk.quote });
}

function addSceneBreak(walk: Walk): void {
	boundary(walk);
	if (walk.active && !flat(walk))
		walk.blocks.push({ block: { kind: "SceneBreak" }, quote: walk.quote });
}

/** A block element's edge: a space inside a Heading or a row, else a break. */
function boundary(walk: Walk): void {
	if (flat(walk)) addText(walk, " ");
	else flush(walk);
}

function visitChildren(node: HtmlNode, walk: Walk): void {
	for (const child of childrenOf(node)) {
		if (walk.done) return;
		visit(child, walk);
	}
}

function visit(node: HtmlNode, walk: Walk): void {
	if (node.nodeType === textNode || node.nodeType === cdataNode) {
		addText(walk, node.textContent ?? "");
		return;
	}
	if (node.nodeType === documentNode || node.nodeType === fragmentNode) {
		visitChildren(node, walk);
		return;
	}
	if (node.nodeType !== elementNode) return;
	const tag = tagOf(node);
	checkAnchor(node, tag, walk);
	if (walk.done) return;
	if (isDropped(node, tag)) {
		if (droppedBlockTags.has(tag)) boundary(walk);
		scanAnchors(node, walk);
		return;
	}
	const style = styleTags[tag];
	if (style !== undefined) visitStyled(node, styleBits[style], walk);
	else if (tag === "br") addBreak(walk, false);
	else if (tag === "hr") addSceneBreak(walk);
	else if (/^h[1-6]$/u.test(tag)) visitHeading(node, tag, walk);
	else if (preTags.has(tag)) visitPre(node, walk);
	else if (tag === "tr") visitRow(node, walk);
	else if ((tag === "td" || tag === "th") && walk.draft?.kind === "Row") {
		walk.draft.cells.push([]);
		visitChildren(node, walk);
	} else if (paragraphTags.has(tag)) visitParagraph(node, tag, walk);
	else if (containerTags.has(tag)) visitContainer(node, tag, walk);
	else visitChildren(node, walk);
}

function visitStyled(node: HtmlNode, bit: number, walk: Walk): void {
	const outer = walk.mask;
	walk.mask |= bit;
	visitChildren(node, walk);
	walk.mask = outer;
}

/** Visits a block that is a draft of its own, or only spaces when flat. */
function visitBlock(node: HtmlNode, walk: Walk, draft: () => Draft): void {
	if (flat(walk)) {
		boundary(walk);
		visitChildren(node, walk);
		boundary(walk);
		return;
	}
	flush(walk);
	walk.draft = draft();
	visitChildren(node, walk);
	flush(walk);
}

function visitHeading(node: HtmlNode, tag: string, walk: Walk): void {
	const level = Math.max(2, Number(tag.slice(1))) as Heading["level"];
	visitBlock(node, walk, () => ({ kind: "Heading", level, items: [] }));
}

function visitRow(node: HtmlNode, walk: Walk): void {
	visitBlock(node, walk, () => ({ kind: "Row", cells: [] }));
}

function visitPre(node: HtmlNode, walk: Walk): void {
	walk.preserved += 1;
	if (flat(walk)) visitChildren(node, walk);
	else {
		flush(walk);
		walk.draft = { kind: "Paragraph", items: [] };
		visitChildren(node, walk);
		flush(walk);
	}
	walk.preserved -= 1;
}

function visitParagraph(node: HtmlNode, tag: string, walk: Walk): void {
	const list = walk.lists.at(-1);
	if (tag === "li" && list !== undefined && !flat(walk)) {
		const value = Number.parseInt(attribute(node, "value") ?? "", 10);
		const number = Number.isNaN(value) ? list.next : value;
		list.next = number + 1;
		walk.prefix = `${number}. `;
	}
	visitBlock(node, walk, () => ({ kind: "Paragraph", items: [] }));
	walk.prefix = undefined;
}

function visitContainer(node: HtmlNode, tag: string, walk: Walk): void {
	boundary(walk);
	const list =
		tag === "ol" || tag === "ul" || tag === "menu" || tag === "dir";
	if (list) {
		walk.prefix = undefined;
		const start = Number.parseInt(attribute(node, "start") ?? "", 10);
		walk.lists.push(
			tag === "ol"
				? { next: Number.isNaN(start) ? 1 : start }
				: undefined,
		);
	}
	const quote =
		walk.quote === undefined && (tag === "blockquote" || tag === "aside");
	if (quote) {
		walk.quotes += 1;
		walk.quote = walk.quotes;
	}
	visitChildren(node, walk);
	boundary(walk);
	if (quote) walk.quote = undefined;
	if (list) walk.lists.pop();
}

// Drafts to blocks.

/**
 * A Paragraph draft's items split where two Line Breaks follow each other
 * with nothing but whitespace between.
 */
function splitAtDoubleBreaks(items: readonly Item[]): Item[][] {
	const paragraphs: Item[][] = [];
	let current: Item[] = [];
	let last: Item | undefined;
	let lastIndex = -1;
	for (const item of items) {
		if (item.kind === "Text" && blank.test(item.text)) {
			current.push(item);
			continue;
		}
		if (
			item.kind === "Break" &&
			!item.preserved &&
			last?.kind === "Break" &&
			!last.preserved
		) {
			paragraphs.push(current.slice(0, lastIndex));
			current = [];
			last = undefined;
			continue;
		}
		current.push(item);
		last = item;
		lastIndex = current.length - 1;
	}
	paragraphs.push(current);
	return paragraphs;
}

/** The items of a draft split at its Line Breaks, `pre` newlines included. */
function linesOf(items: readonly Item[]): TextItem[][] {
	const lines: TextItem[][] = [[]];
	for (const item of items) {
		if (item.kind === "Break") {
			lines.push([]);
			continue;
		}
		if (!item.preserved) {
			lines.at(-1)?.push(item);
			continue;
		}
		item.text
			.replace(/\r\n?/gu, "\n")
			.split("\n")
			.forEach((text, index) => {
				if (index > 0) lines.push([]);
				lines.at(-1)?.push({ ...item, text });
			});
	}
	return lines;
}

type Char = { readonly char: string; mask: number };

/** Collapses whitespace across items and trims the line's ends. */
function charsOf(items: readonly TextItem[]): Char[] {
	const chars: Char[] = [];
	let space = true;
	for (const item of items)
		for (const char of item.text.normalize("NFC")) {
			if (!item.preserved && collapsible.test(char)) {
				if (!space) chars.push({ char: " ", mask: item.mask });
				space = true;
			} else {
				chars.push({ char, mask: item.mask });
				space = /\s/u.test(char);
			}
		}
	let start = 0;
	while (/\s/u.test(chars[start]?.char ?? "x")) start += 1;
	let end = chars.length;
	while (end > start && /\s/u.test(chars[end - 1]?.char ?? "x")) end -= 1;
	return chars.slice(start, end);
}

/** Drops each style from the whitespace at the edges of its stretches. */
function unstyleEdges(chars: readonly Char[]): void {
	for (const bit of Object.values(styleBits)) {
		let index = 0;
		while (index < chars.length) {
			if (((chars[index]?.mask ?? 0) & bit) === 0) {
				index += 1;
				continue;
			}
			let stop = index;
			while (((chars[stop]?.mask ?? 0) & bit) !== 0) stop += 1;
			for (let at = index; at < stop; at += 1) {
				const char = chars[at] as Char;
				if (!/\s/u.test(char.char)) break;
				char.mask &= ~bit;
			}
			for (let at = stop - 1; at >= index; at -= 1) {
				const char = chars[at] as Char;
				if (!/\s/u.test(char.char)) break;
				char.mask &= ~bit;
			}
			index = stop;
		}
	}
}

/** One line's runs in canonical form, or none for a blank line. */
function runsOf(items: readonly TextItem[]): Run[] {
	const chars = charsOf(items);
	unstyleEdges(chars);
	const runs: { text: string; mask: number }[] = [];
	for (const { char, mask } of chars) {
		const last = runs.at(-1);
		if (last?.mask === mask) last.text += char;
		else runs.push({ text: char, mask });
	}
	return runs.map(({ text, mask }) => {
		const styles = styleOrder.filter((style) => mask & styleBits[style]);
		const normalized = text.normalize("NFC");
		return styles.length > 0
			? { kind: "Run", text: normalized, styles }
			: { kind: "Run", text: normalized };
	});
}

const spaceFor = (items: readonly Item[]): TextItem[] =>
	items.map((item) =>
		item.kind === "Text"
			? item
			: { kind: "Text", text: " ", mask: 0, preserved: false },
	);

function paragraphOf(items: readonly Item[]): Paragraph | undefined {
	const inlines: (Run | LineBreak)[] = [];
	for (const line of linesOf(items)) {
		const runs = runsOf(line);
		if (runs.length === 0) continue;
		if (inlines.length > 0) inlines.push({ kind: "LineBreak" });
		inlines.push(...runs);
	}
	return inlines.length > 0 ? { kind: "Paragraph", inlines } : undefined;
}

/** A row of stars or an asterism standing for a Scene Break. */
const sceneBreak = /^(?:⁂|[*✱✻·•~](?:\s*[*✱✻·•~]){2,})$/u;

function finish(draft: Draft): Block[] {
	if (draft.kind === "Paragraph")
		return splitAtDoubleBreaks(draft.items).flatMap((items): Block[] => {
			const paragraph = paragraphOf(items);
			if (paragraph === undefined) return [];
			return sceneBreak.test(textOf(paragraph))
				? [{ kind: "SceneBreak" }]
				: [paragraph];
		});
	if (draft.kind === "Heading") {
		const runs = runsOf(spaceFor(draft.items));
		return runs.length > 0
			? [{ kind: "Heading", level: draft.level, runs }]
			: [];
	}
	const cells = draft.cells.map(spaceFor);
	if (cells.every((cell) => runsOf(cell).length === 0)) return [];
	const separator: TextItem = {
		kind: "Text",
		text: " | ",
		mask: 0,
		preserved: false,
	};
	const runs = runsOf(
		cells.flatMap((cell, index) =>
			(index > 0 ? [separator] : []).concat(cell),
		),
	);
	return [{ kind: "Paragraph", inlines: runs }];
}

// The Scroll.

function textOf(block: Block): string {
	if (block.kind === "SceneBreak") return "";
	return (block.kind === "Heading" ? block.runs : block.inlines)
		.map((inline) => (inline.kind === "Run" ? inline.text : " "))
		.join("");
}

/** Text with case, punctuation and spacing folded away, for comparing. */
const fold = (text: string) =>
	text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[\p{P}\p{S}]/gu, " ")
		.replace(/\s+/gu, " ")
		.trim();

/** A pull quote has at least this many words; a shorter quote stays. */
const pullQuoteWords = 3;

/**
 * The blocks without the pull quotes: block quotes and asides whose text
 * recurs in the blocks outside every quote.
 */
function withoutPullQuotes(mapped: readonly Mapped[]): Block[] {
	const outside = ` ${mapped
		.filter(({ quote }) => quote === undefined)
		.map(({ block }) => fold(textOf(block)))
		.join(" ")} `;
	const pulled = new Set<number>();
	const quotes = new Map<number, string[]>();
	for (const { block, quote } of mapped)
		if (quote !== undefined)
			quotes.set(quote, [
				...(quotes.get(quote) ?? []),
				fold(textOf(block)),
			]);
	for (const [quote, texts] of quotes) {
		const text = texts.join(" ");
		if (text.split(" ").length >= pullQuoteWords && outside.includes(text))
			pulled.add(quote);
	}
	return mapped
		.filter(({ quote }) => quote === undefined || !pulled.has(quote))
		.map(({ block }) => block);
}

/** One slice's blocks, its quotes numbered on from `quotes`. */
function mapSlice(slice: HtmlSlice, quotes: number): Walk {
	const walk: Walk = {
		from: slice.from,
		to: slice.to,
		active: slice.from === undefined,
		done: false,
		draft: undefined,
		blocks: [],
		mask: 0,
		preserved: 0,
		quote: undefined,
		quotes,
		lists: [],
		prefix: undefined,
	};
	visit(slice.root, walk);
	flush(walk);
	return walk;
}

/**
 * The Scroll an HTML or XHTML tree holds, or the slices of several in
 * reading order, as the rules above map it. A slice whose `from` is
 * missing adds nothing.
 */
export function scrollFromHtml(
	html: HtmlNode | readonly HtmlSlice[],
	options: ScrollOptions = {},
): Scroll {
	const slices: readonly HtmlSlice[] = Array.isArray(html)
		? html
		: [{ root: html as HtmlNode }];
	let quotes = 0;
	const mapped = slices.flatMap((slice) => {
		const walk = mapSlice(slice, quotes);
		quotes = walk.quotes;
		return walk.blocks;
	});
	const blocks = withoutPullQuotes(mapped);
	const title = (options.title ?? "")
		.replace(invisible, "")
		.normalize("NFC")
		.replace(/\s+/gu, " ")
		.trim();
	if (title.length === 0) return { kind: "Scroll", blocks: tidy(blocks) };
	const index = blocks.findIndex(
		(block) =>
			block.kind === "Heading" && fold(textOf(block)) === fold(title),
	);
	const repeated = blocks[index];
	if (repeated?.kind !== "Heading")
		return {
			kind: "Scroll",
			heading: { runs: [{ kind: "Run", text: title }] },
			blocks: tidy(blocks),
		};
	return {
		kind: "Scroll",
		heading: { runs: repeated.runs },
		blocks: tidy(blocks.filter((_, at) => at !== index)),
	};
}

/**
 * The blocks without a Scene Break at either end, after another or right
 * before a Heading, and without Headings left at the end with nothing
 * under them, such as a references section whose notes were dropped.
 */
function tidy(blocks: readonly Block[]): Block[] {
	const kept: Block[] = [];
	for (const block of blocks) {
		const last = kept.at(-1);
		if (block.kind === "SceneBreak" && last?.kind !== "SceneBreak") {
			if (last !== undefined) kept.push(block);
			continue;
		}
		if (block.kind === "SceneBreak") continue;
		if (block.kind === "Heading" && last?.kind === "SceneBreak") kept.pop();
		kept.push(block);
	}
	while (
		kept.at(-1)?.kind === "SceneBreak" ||
		kept.at(-1)?.kind === "Heading"
	)
		kept.pop();
	return kept;
}
