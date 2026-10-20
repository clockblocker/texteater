import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api } from "../convex/_generated/api";
import { FOLIOS_AHEAD, PAGE_SENTENCES, readerPages } from "../server/folios";
import { runFolios, submitBook, VISITOR } from "./support/books";
import { createTestConvex } from "./support/convex";

/**
 * A book Scroll's reader loads it a page at a time (#1212): `get` lists
 * the pages, its Folios, and `page` reads one page's Sentences, so a long
 * chapter is never read whole. The processing run stays unrun (fake
 * timers) until a test drives it.
 */

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("a page is a Folio, and a Folio over the page size reads in runs of it", () => {
	expect(PAGE_SENTENCES).toBe(60);
	expect(
		readerPages([
			{ start: 0, end: 40 },
			{ start: 40, end: 170 },
			{ start: 170, end: 175 },
		]),
	).toEqual([
		{ start: 0, end: 40 },
		{ start: 40, end: 100 },
		{ start: 100, end: 160 },
		{ start: 160, end: 170 },
		{ start: 170, end: 175 },
	]);
});

test("a book Scroll lists its pages and reads a page's Sentences, processed ones clickable", async () => {
	const t = createTestConvex();
	const [, chapter] = await submitBook(t);
	if (!chapter) throw new Error("A chapter Scroll.");
	const view = await t.query(api.scrollViews.get, {
		scrollId: chapter,
		visitorId: VISITOR,
	});
	const pages = view?.pages ?? [];
	expect(view?.sentences).toEqual([]);
	expect(pages.length).toBeGreaterThan(FOLIOS_AHEAD + 1);
	// The pages cover the Scroll in order, with no gap.
	expect(pages[0]?.start).toBe(0);
	for (const [index, page] of pages.entries())
		expect(page.start).toBe(index === 0 ? 0 : pages[index - 1]?.end);
	const sentenceCount = await t.run(
		async (ctx) =>
			(
				await ctx.db
					.query("sentences")
					.withIndex("by_scroll_id_and_position", (q) =>
						q.eq("scrollId", chapter),
					)
					.collect()
			).length,
	);
	expect(pages.at(-1)?.end).toBe(sentenceCount);

	await t.mutation(api.library.open, {
		scrollId: chapter,
		visitorId: VISITOR,
	});
	await runFolios(t, chapter);
	const read = async (index: number) => {
		const page = pages[index];
		if (!page) throw new Error(`No page ${index.toString()}.`);
		return (
			(await t.query(api.scrollViews.page, {
				scrollId: chapter,
				visitorId: VISITOR,
				...page,
			})) ?? []
		);
	};
	const opened = await read(0);
	expect(opened.map(({ position }) => position)).toEqual(
		Array.from({ length: (pages[0]?.end ?? 0) - 0 }, (_, index) => index),
	);
	expect(
		opened.some(({ plain, segments }) => !plain && segments.length > 0),
	).toBe(true);
	const beyond = await read(FOLIOS_AHEAD + 1);
	expect(beyond.length).toBeGreaterThan(0);
	expect(beyond.every(({ plain }) => plain)).toBe(true);
});

test("a page reads at most the page size, and no empty run", async () => {
	const t = createTestConvex();
	const [, chapter] = await submitBook(t);
	if (!chapter) throw new Error("A chapter Scroll.");
	for (const [start, end] of [
		[0, PAGE_SENTENCES + 1],
		[5, 5],
		[-1, 3],
	] as const)
		await expect(
			t.query(api.scrollViews.page, {
				scrollId: chapter,
				visitorId: VISITOR,
				start,
				end,
			}),
		).rejects.toThrow("A page is a run of 1 to 60 Sentence positions.");
});

test("a paste lists no pages and comes whole", async () => {
	const t = createTestConvex();
	const scrollId = await t.run((ctx) =>
		ctx.db.insert("scrolls", { submissionKey: "paste", sourceText: "Ja." }),
	);
	const view = await t.query(api.scrollViews.get, {
		scrollId,
		visitorId: VISITOR,
	});
	expect(view?.pages).toBeUndefined();
});
