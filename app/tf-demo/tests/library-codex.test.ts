import { expect, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { insertSection, placeScroll } from "../convex/model/codex";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

const VISITOR = "visitor-1";

/** The fixture book: Die lange Reise › Teil 1 › Kapitel 1, 2; Teil 2 › Abschnitt A › Kapitel 3, then Kapitel 4; Nachwort. */
async function seededBook(t: TestConvexDb) {
	const bookId = await t.mutation(
		internal.libraryFixtures.seedNestedBook,
		{},
	);
	const codex = (sectionId: string) =>
		t.query(api.library.codex, { sectionId, visitorId: VISITOR });
	const book = await codex(bookId);
	if (!book) throw new Error("The seeded book has no Codex.");
	const entry = (
		entries: NonNullable<typeof book>["entries"],
		title: string,
	) => {
		const found = entries.find((item) => item.title === title);
		if (!found) throw new Error(`No Codex entry ${title}`);
		return found;
	};
	const sectionIdOf = (item: ReturnType<typeof entry>) => {
		if (item.kind !== "Section")
			throw new Error(`${item.title} is a Scroll`);
		return item.sectionId;
	};
	const scrollIdOf = (item: ReturnType<typeof entry>) => {
		if (item.kind !== "Scroll")
			throw new Error(`${item.title} is a Section`);
		return item.scrollId;
	};
	const part1 = await codex(sectionIdOf(entry(book.entries, "Teil 1")));
	const part2 = await codex(sectionIdOf(entry(book.entries, "Teil 2")));
	if (!part1 || !part2) throw new Error("The seeded parts have no Codex.");
	const sectionA = await codex(
		sectionIdOf(entry(part2.entries, "Abschnitt A")),
	);
	if (!sectionA) throw new Error("Abschnitt A has no Codex.");
	return {
		bookId,
		codex,
		sections: {
			part1: part1.sectionId,
			part2: part2.sectionId,
			sectionA: sectionA.sectionId,
		},
		scrolls: {
			chapter1: scrollIdOf(entry(part1.entries, "Kapitel 1")),
			chapter2: scrollIdOf(entry(part1.entries, "Kapitel 2")),
			chapter3: scrollIdOf(entry(sectionA.entries, "Kapitel 3")),
			chapter4: scrollIdOf(entry(part2.entries, "Kapitel 4")),
			afterword: scrollIdOf(entry(book.entries, "Nachwort")),
		},
	};
}

function statuses(entries: readonly { title: string; status: string }[]) {
	return entries.map(({ title, status }) => `${title}: ${status}`);
}

test("the Library lists top-level Sections, numbers in order, then loose Scrolls, newest first", async () => {
	const t = createTestConvex();
	const older = await submitText(t, [["Haus", "."]], {
		submissionKey: "text:v1:Haus.",
	});
	const fixture = await submitText(t, [["Baum", "."]], {
		submissionKey: "e2e:unit-hover",
	});
	await t.run(async (ctx) => {
		const book10 = await insertSection(ctx, { title: "Band 10" });
		await insertSection(ctx, { title: "Band 2" });
		// A placed Scroll is in its Section's Codex, not loose in the Library.
		await placeScroll(ctx, older.scrollId, { sectionId: book10, order: 0 });
	});
	const listed = await t.query(api.library.list, { visitorId: VISITOR });
	expect(
		listed.map((entry) =>
			entry.kind === "Section"
				? `Section ${entry.title}`
				: `Scroll ${entry.title}${entry.fixture ? " (fixture)" : ""}`,
		),
	).toEqual(["Section Band 2", "Section Band 10", "Scroll Baum. (fixture)"]);
	expect(listed.at(-1)).toMatchObject({ scrollId: fixture.scrollId });
	// An ordinary entry carries no flag at all, not a false one.
	expect(listed[0]).not.toHaveProperty("fixture");
});

test("a Codex lists child Sections and Scrolls in order, and a Section is done when everything under it is", async () => {
	const t = createTestConvex();
	const { bookId, codex, sections, scrolls } = await seededBook(t);

	const book = await codex(bookId);
	expect(book?.title).toBe("Die lange Reise");
	expect(statuses(book?.entries ?? [])).toEqual([
		"Teil 1: NotStarted",
		"Teil 2: NotStarted",
		"Nachwort: NotStarted",
	]);
	expect(book?.lastRead).toBeNull();
	expect(
		(await t.query(api.library.list, { visitorId: VISITOR }))[0],
	).toMatchObject({
		kind: "Section",
		title: "Die lange Reise",
		fixture: true,
	});

	// Opening a Scroll puts it, and every Section above it, in progress.
	await t.mutation(api.library.open, {
		scrollId: scrolls.chapter3,
		visitorId: VISITOR,
	});
	expect(statuses((await codex(sections.part2))?.entries ?? [])).toEqual([
		"Abschnitt A: InProgress",
		"Kapitel 4: NotStarted",
	]);
	expect(statuses((await codex(sections.sectionA))?.entries ?? [])).toEqual([
		"Kapitel 3: InProgress",
	]);
	// The Section remembers it as the last Scroll read, with the Sections between.
	expect((await codex(bookId))?.lastRead).toEqual({
		scrollId: scrolls.chapter3,
		title: "Kapitel 3",
		sections: [
			{ sectionId: sections.part2, title: "Teil 2" },
			{ sectionId: sections.sectionA, title: "Abschnitt A" },
		],
	});

	// Done when every Scroll under it is, at every level.
	await t.mutation(api.library.setDone, {
		scrollId: scrolls.chapter3,
		visitorId: VISITOR,
		done: true,
	});
	expect(statuses((await codex(sections.part2))?.entries ?? [])).toEqual([
		"Abschnitt A: Done",
		"Kapitel 4: NotStarted",
	]);
	expect((await codex(sections.part2))?.status).toBe("InProgress");
	await t.mutation(api.library.setDone, {
		scrollId: scrolls.chapter4,
		visitorId: VISITOR,
		done: true,
	});
	expect((await codex(sections.part2))?.status).toBe("Done");
	expect((await codex(bookId))?.status).toBe("InProgress");

	// Marked back, the Sections above it are no longer done.
	await t.mutation(api.library.setDone, {
		scrollId: scrolls.chapter4,
		visitorId: VISITOR,
		done: false,
	});
	expect((await codex(sections.part2))?.status).toBe("InProgress");
	expect(
		await t.query(api.library.progress, {
			scrollId: scrolls.chapter4,
			visitorId: VISITOR,
		}),
	).toEqual({ status: "InProgress", position: 0 });

	// Status is the Visitor's own.
	expect(
		statuses(
			(
				await t.query(api.library.codex, {
					sectionId: sections.part2,
					visitorId: "visitor-2",
				})
			)?.entries ?? [],
		),
	).toEqual(["Abschnitt A: NotStarted", "Kapitel 4: NotStarted"]);
});

test("next follows Codex order depth-first across Section boundaries, and stops at the end of the book", async () => {
	const t = createTestConvex();
	const { sections, scrolls } = await seededBook(t);
	const next = (scrollId: Id<"scrolls">) =>
		t.query(api.library.next, { scrollId });

	expect(await next(scrolls.chapter1)).toMatchObject({
		scrollId: scrolls.chapter2,
		title: "Kapitel 2",
	});
	// Out of Teil 1, into Teil 2 and down into Abschnitt A.
	expect(await next(scrolls.chapter2)).toMatchObject({
		scrollId: scrolls.chapter3,
		sections: [
			{ title: "Die lange Reise" },
			{ sectionId: sections.part2, title: "Teil 2" },
			{ sectionId: sections.sectionA, title: "Abschnitt A" },
		],
	});
	// Back up out of Abschnitt A.
	expect(await next(scrolls.chapter3)).toMatchObject({
		scrollId: scrolls.chapter4,
		sections: [{ title: "Die lange Reise" }, { title: "Teil 2" }],
	});
	expect(await next(scrolls.chapter4)).toMatchObject({
		scrollId: scrolls.afterword,
		sections: [{ title: "Die lange Reise" }],
	});
	expect(await next(scrolls.afterword)).toBeNull();
});

test("next skips an empty Section, and a loose Scroll has none", async () => {
	const t = createTestConvex();
	const first = await submitText(t, [["Eins", "."]], {
		submissionKey: "text:v1:Eins.",
	});
	const last = await submitText(t, [["Zwei", "."]], {
		submissionKey: "text:v1:Zwei.",
	});
	const loose = await submitText(t, [["Drei", "."]], {
		submissionKey: "text:v1:Drei.",
	});
	await t.run(async (ctx) => {
		const book = await insertSection(ctx, { title: "Buch" });
		await placeScroll(ctx, first.scrollId, { sectionId: book, order: 0 });
		await insertSection(ctx, {
			title: "Leer",
			placement: { sectionId: book, order: 1 },
		});
		await placeScroll(ctx, last.scrollId, { sectionId: book, order: 2 });
	});
	expect(
		await t.query(api.library.next, { scrollId: first.scrollId }),
	).toMatchObject({ scrollId: last.scrollId });
	expect(
		await t.query(api.library.next, { scrollId: loose.scrollId }),
	).toBeNull();
});

test("the reading position is remembered per Scroll, and reseeding changes nothing", async () => {
	const t = createTestConvex();
	const { bookId, scrolls } = await seededBook(t);
	await t.mutation(api.library.savePosition, {
		scrollId: scrolls.chapter1,
		visitorId: VISITOR,
		position: 12,
	});
	expect(
		await t.query(api.library.progress, {
			scrollId: scrolls.chapter1,
			visitorId: VISITOR,
		}),
	).toEqual({ status: "InProgress", position: 12 });
	expect(await t.mutation(internal.libraryFixtures.seedNestedBook, {})).toBe(
		bookId,
	);
	expect(
		await t.run(async (ctx) => (await ctx.db.get(bookId))?.scrollCount),
	).toBe(5);
});
