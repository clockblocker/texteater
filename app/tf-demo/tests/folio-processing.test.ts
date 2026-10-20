import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { cutFolios, FOLIOS_AHEAD, windowsOf } from "../server/folios";
import { portOf, runFolios, submitBook, VISITOR } from "./support/books";
import { createTestConvex, type TestConvexDb } from "./support/convex";
import { fakeJev } from "./support/jev";

/**
 * A book is processed from its first Scroll's first Folio, then Folio by
 * Folio from the reader's position, at most `FOLIOS_AHEAD` past it (#1193).
 * The scheduled action stays unrun (fake timers); each test drives a run
 * through the action's own storage port with a fake jev.
 */

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

/** Each Folio of a Scroll: its range and whether its Sentences are processed. */
async function foliosOf(t: TestConvexDb, scrollId: Id<"scrolls">) {
	return t.run(async (ctx) => {
		const folios = await ctx.db
			.query("folios")
			.withIndex("by_scroll_id_and_start", (q) =>
				q.eq("scrollId", scrollId),
			)
			.collect();
		return Promise.all(
			folios.map(async (folio) => {
				const sentences = await ctx.db
					.query("sentences")
					.withIndex("by_scroll_id_and_position", (q) =>
						q
							.eq("scrollId", scrollId)
							.gte("position", folio.start)
							.lt("position", folio.end),
					)
					.collect();
				return {
					start: folio.start,
					done: folio.processedWindows === folio.windows,
					germanSentences: sentences.filter(
						({ language }) => language === "de",
					).length,
					unprocessed: sentences.filter(
						({ units }) => units === undefined,
					).length,
					sentences: sentences.length,
				};
			}),
		);
	});
}

const runOf = (t: TestConvexDb, scrollId: Id<"scrolls">) =>
	t.run((ctx) =>
		ctx.db
			.query("folioRuns")
			.withIndex("by_scroll_id", (q) => q.eq("scrollId", scrollId))
			.unique(),
	);

const scheduledRuns = (t: TestConvexDb) =>
	t.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").collect()).filter(
			({ name }) => name.includes("folioProcessing"),
		),
	);

describe("cutting Folios", () => {
	test("keeps Paragraphs whole at about 3,000 characters, a long one alone", () => {
		const sentence = (
			position: number,
			paragraph: number,
			length: number,
		) => ({
			position,
			paragraph,
			stitchedText: "x".repeat(length),
		});
		expect(
			cutFolios([
				sentence(0, 0, 1_000),
				sentence(1, 0, 1_000),
				sentence(2, 1, 900),
				sentence(3, 2, 500),
				sentence(4, 3, 5_000),
				sentence(5, 4, 10),
			]),
		).toEqual([
			{ start: 0, end: 3, windows: 1 },
			{ start: 3, end: 4, windows: 1 },
			{ start: 4, end: 5, windows: 1 },
			{ start: 5, end: 6, windows: 1 },
		]);
		expect(cutFolios([])).toEqual([]);
	});

	test("reads a Folio in windows of at most 30 Sentences, as even as they come", () => {
		const sentences = Array.from({ length: 31 }, (_, position) => ({
			position,
			paragraph: 0,
			stitchedText: "Ja.",
		}));
		expect(windowsOf(sentences).map((window) => window.length)).toEqual([
			16, 15,
		]);
		expect(cutFolios(sentences)).toEqual([
			{ start: 0, end: 31, windows: 2 },
		]);
	});

	test("cuts a window again where it would pass 15,000 characters", () => {
		const sentences = [6_000, 6_000, 6_000, 9_000, 100].map(
			(length, position) => ({
				position,
				paragraph: position,
				stitchedText: "x".repeat(length),
			}),
		);
		expect(windowsOf(sentences).map((window) => window.length)).toEqual([
			2, 2, 1,
		]);
		expect(cutFolios(sentences).map(({ windows }) => windows)).toEqual([
			1, 1, 1, 1, 1,
		]);
	});
});

describe("processing a book ahead of the reader", () => {
	test("processes the first Scroll's first Folio first and leaves the rest plain", async () => {
		const t = createTestConvex();
		const [front, chapter1, chapter2] = await submitBook(t);
		if (!front || !chapter1 || !chapter2) throw new Error("Three Scrolls.");
		expect(await scheduledRuns(t)).toHaveLength(1);
		expect((await runOf(t, front))?.heartbeat).toBeNumber();

		expect(await runFolios(t, front)).toEqual({ kind: "Done" });
		const [first] = await foliosOf(t, front);
		expect(first).toMatchObject({ done: true, unprocessed: 0 });
		expect(first?.germanSentences).toBeGreaterThan(0);
		// The run ended: the next move starts a fresh one.
		expect((await runOf(t, front))?.heartbeat).toBeUndefined();
		for (const scrollId of [chapter1, chapter2]) {
			const folios = await foliosOf(t, scrollId);
			expect(folios.length).toBeGreaterThan(FOLIOS_AHEAD + 1);
			expect(folios.every(({ done }) => !done)).toBe(true);
			expect(await runOf(t, scrollId)).toBeNull();
		}
	});

	test("follows the reader a few Folios ahead, and moves when they jump", async () => {
		const t = createTestConvex();
		const [, chapter1, chapter2] = await submitBook(t);
		if (!chapter1 || !chapter2) throw new Error("Three Scrolls.");

		await t.mutation(api.library.open, {
			scrollId: chapter1,
			visitorId: VISITOR,
		});
		expect(await runFolios(t, chapter1)).toEqual({ kind: "Done" });
		const ahead = await foliosOf(t, chapter1);
		expect(ahead.map(({ done }) => done)).toEqual(
			ahead.map((_, folio) => folio <= FOLIOS_AHEAD),
		);
		expect(ahead.at(-1)?.unprocessed).toBe(ahead.at(-1)?.sentences);

		// A jump into another Scroll, past its first Folios.
		await t.mutation(api.library.open, {
			scrollId: chapter2,
			visitorId: VISITOR,
		});
		const last = (await foliosOf(t, chapter2)).at(-1);
		if (!last) throw new Error("Chapter 2 has Folios.");
		await t.mutation(api.library.savePosition, {
			scrollId: chapter2,
			visitorId: VISITOR,
			position: last.start + 1,
		});
		expect(await runFolios(t, chapter2)).toEqual({ kind: "Done" });
		const jumped = await foliosOf(t, chapter2);
		expect(jumped.at(-1)).toMatchObject({ done: true, unprocessed: 0 });
		// The reader left the start before it was processed; it stays plain.
		expect(jumped[0]?.done).toBe(false);
		expect(jumped[0]?.unprocessed).toBe(jumped[0]?.sentences);
	});

	test("retries a failed window with the same Sentences and fails only it", async () => {
		const t = createTestConvex();
		const [front] = await submitBook(t);
		if (!front) throw new Error("A front matter Scroll.");
		const down = fakeJev({ fail: () => true });
		const failed = await runFolios(t, front, down);
		expect(failed).toEqual({ kind: "Retry", afterMs: 2_000 });
		expect(await foliosOf(t, front)).toMatchObject([
			{ done: false, germanSentences: 0 },
		]);
		const waiting = await runOf(t, front);
		expect(waiting?.failures).toBe(1);
		expect(waiting?.heartbeat).toBeGreaterThan(Date.now());

		const asked: string[] = [];
		const port = portOf(t, front);
		const window = await port.nextWindow();
		for (const { sentenceId } of window?.sentences ?? [])
			asked.push(sentenceId);
		expect(window?.window).toBe(0);
		expect(await runFolios(t, front)).toEqual({ kind: "Done" });
		const stored = await t.run((ctx) =>
			ctx.db
				.query("sentences")
				.withIndex("by_scroll_id_and_position", (q) =>
					q.eq("scrollId", front),
				)
				.collect(),
		);
		expect(stored.map(({ _id }) => _id)).toEqual(
			asked as Id<"sentences">[],
		);
		expect(stored.every(({ units }) => units !== undefined)).toBe(true);
		expect((await runOf(t, front))?.failures).toBe(0);
	});

	test("a paste has no Folios, so reading it starts no processing", async () => {
		const t = createTestConvex();
		const scrollId = await t.run((ctx) =>
			ctx.db.insert("scrolls", {
				submissionKey: "paste",
				sourceText: "Ja.",
			}),
		);
		await t.mutation(api.library.open, { scrollId, visitorId: VISITOR });
		expect(await runOf(t, scrollId)).toBeNull();
		expect(await scheduledRuns(t)).toHaveLength(0);
		expect(
			await t.mutation(internal.folios.nextWindow, { scrollId }),
		).toBeNull();
	});
});
