import { describe, expect, test } from "bun:test";
import type { ExtractedText } from "dumgen";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
	type PlannedScroll,
	planExtractedText,
	planTextFile,
	scrollBatches,
	type TextFilePlan,
} from "../server/textFileIntake";
import { MAX_SENTENCES_PER_SCROLL } from "../server/textSubmissionLimits";
import {
	MAX_TEXT_FILE_BYTES,
	TEXT_FILE_TOO_LARGE_MESSAGE,
} from "../shared/text-file-limits";
import { createTestConvex, type TestConvexDb } from "./support/convex";

/**
 * A `.txt` Submission (#1191): the file is uploaded to File Storage, read
 * into a Section of Scrolls, and written in batches with every Sentence
 * stored unprocessed, so each Scroll reads as plain text at once.
 */

const VISITOR = "visitor-1";
const encoder = new TextEncoder();

const paragraph = (text: string) => ({
	kind: "Paragraph" as const,
	inlines: [{ kind: "Run" as const, text }],
});
const heading = (text: string) => ({ runs: [{ kind: "Run" as const, text }] });

function planned(extracted: ExtractedText): TextFilePlan {
	const result = planExtractedText(extracted);
	if (result.kind === "Rejected") throw new Error(result.message);
	return result.plan;
}

/** A Gutenberg-like book: a title page, then chapters with a Scene Break. */
function chapteredBook(chapters: number, sentencesPerChapter = 3): string {
	const chapter = (number: number) =>
		[
			`Kapitel ${number.toString()}`,
			Array.from(
				{ length: sentencesPerChapter },
				(_, index) =>
					`Im ${number.toString()}. Kapitel ging Effi zum ${(index + 1).toString()}. Mal an den Strand.`,
			).join(" "),
			"* * *",
			"Danach war es still im Haus.",
		].join("\n\n");
	return [
		"Die lange Reise",
		"Ein Roman in Kapiteln.",
		...Array.from({ length: chapters }, (_, index) => chapter(index + 1)),
	].join("\n\n");
}

async function upload(t: TestConvexDb, text: string | Uint8Array<ArrayBuffer>) {
	const bytes = typeof text === "string" ? encoder.encode(text) : text;
	return t.run((ctx) => ctx.storage.store(new Blob([bytes])));
}

async function submitFile(
	t: TestConvexDb,
	text: string | Uint8Array<ArrayBuffer>,
	fileName = "die_lange_reise.txt",
) {
	const storageId = await upload(t, text);
	const result = await t.action(api.textFileIntake.submitTextFile, {
		visitorId: VISITOR,
		storageId,
		fileName,
	});
	return { storageId, result };
}

function acceptedSection(result: {
	status: string;
	sectionId?: Id<"sections">;
}): Id<"sections"> {
	if (result.status !== "Accepted" || !result.sectionId)
		throw new Error(`Expected an accepted file: ${JSON.stringify(result)}`);
	return result.sectionId;
}

const storedFile = (t: TestConvexDb, storageId: Id<"_storage">) =>
	t.run((ctx) => ctx.db.system.get(storageId));

describe("planExtractedText", () => {
	test("places Sections and Scrolls by index and order, with unprocessed Sentences and Scene Breaks", () => {
		const plan = planned({
			contents: [
				{
					kind: "Section",
					title: "Buch",
					contents: [
						{ kind: "Scroll", blocks: [paragraph("Vorwort.")] },
						{
							kind: "Section",
							title: "Teil 1",
							contents: [
								{
									kind: "Scroll",
									heading: heading("Kapitel 1"),
									blocks: [
										paragraph("Erst eins. Dann zwei."),
										{ kind: "SceneBreak" },
										paragraph("Drei."),
									],
								},
							],
						},
					],
				},
			],
		});
		expect(plan.title).toBe("Buch");
		expect(plan.sections).toEqual([
			{ title: "Buch", parent: null, order: 0 },
			{ title: "Teil 1", parent: 0, order: 1 },
		]);
		const [front, chapter] = plan.scrolls;
		expect(front).toMatchObject({ section: 0, order: 0, sceneBreaks: [] });
		expect(front?.title).toBeUndefined();
		expect(chapter).toMatchObject({
			section: 1,
			order: 0,
			title: "Kapitel 1",
			sceneBreaks: [2],
			sentences: [
				{ position: 0, paragraph: 0, stitchedText: "Kapitel 1" },
				{ position: 1, paragraph: 1, stitchedText: "Erst eins." },
				{ position: 2, paragraph: 1, stitchedText: "Dann zwei." },
				{ position: 3, paragraph: 2, stitchedText: "Drei." },
			],
		});
		expect(chapter?.sourceText).toBe(
			"Kapitel 1\n\nErst eins. Dann zwei.\n\nDrei.",
		);
	});

	test("turns away a file with no text", () => {
		expect(
			planTextFile({ name: "leer.txt", bytes: new Uint8Array() }),
		).toEqual({ kind: "Rejected", message: "This file holds no text." });
	});

	test("turns away a Scroll the reader could not read in one query, but no overlong Sentence", () => {
		const scroll = (sentences: number) => ({
			contents: [
				{
					kind: "Section" as const,
					title: "Buch",
					contents: [
						{
							kind: "Scroll" as const,
							blocks: Array.from(
								{ length: sentences },
								(_, index) =>
									paragraph(`Satz ${index.toString()}.`),
							),
						},
					],
				},
			],
		});
		expect(planExtractedText(scroll(MAX_SENTENCES_PER_SCROLL)).kind).toBe(
			"Planned",
		);
		expect(
			planExtractedText(scroll(MAX_SENTENCES_PER_SCROLL + 1)),
		).toMatchObject({ kind: "Rejected" });
		const overlong = `${"Ein sehr langer Satz ohne Ende ".repeat(200)}.`;
		expect(
			planned({
				contents: [
					{
						kind: "Section",
						title: "Buch",
						contents: [
							{ kind: "Scroll", blocks: [paragraph(overlong)] },
						],
					},
				],
			}).scrolls[0]?.sentences,
		).toHaveLength(1);
	});
});

describe("scrollBatches", () => {
	const scroll = (sentences: number, bytes: number) =>
		({
			sentences: Array.from({ length: sentences }, (_, position) => ({
				position,
				paragraph: 0,
				stitchedText: "x",
			})),
			bytes,
		}) as unknown as PlannedScroll;

	test("cuts Scrolls into batches under the sentence and byte limits, in order", () => {
		const scrolls = [
			scroll(4, 10),
			scroll(4, 10),
			scroll(4, 10),
			scroll(1, 91),
		];
		const batches = scrollBatches(scrolls, { sentences: 10, bytes: 100 });
		expect(
			batches.map((batch) => batch.map((item) => scrolls.indexOf(item))),
		).toEqual([[0, 1], [2], [3]]);
	});

	test("gives a Scroll over a limit a batch of its own", () => {
		const scrolls = [scroll(1, 10), scroll(50, 10), scroll(1, 10)];
		expect(
			scrollBatches(scrolls, { sentences: 10, bytes: 100 }).map(
				(batch) => batch.length,
			),
		).toEqual([1, 1, 1]);
	});
});

describe("submitTextFile", () => {
	test("puts the book in the Library with a Codex, every Scroll readable as plain text", async () => {
		const t = createTestConvex();
		const { storageId, result } = await submitFile(t, chapteredBook(3));
		const sectionId = acceptedSection(result);
		expect(result).toMatchObject({ title: "die lange reise" });

		const library = await t.query(api.library.list, { visitorId: VISITOR });
		expect(library).toEqual([
			expect.objectContaining({ kind: "Section", sectionId }),
		]);
		const codex = await t.query(api.library.codex, {
			sectionId,
			visitorId: VISITOR,
		});
		expect(codex?.entries.map(({ kind, title }) => [kind, title])).toEqual([
			["Scroll", "Front matter"],
			["Scroll", "Kapitel 1"],
			["Scroll", "Kapitel 2"],
			["Scroll", "Kapitel 3"],
		]);
		const chapter = codex?.entries[1];
		if (chapter?.kind !== "Scroll") throw new Error("No chapter Scroll");
		const view = await t.query(api.scrollViews.get, {
			scrollId: chapter.scrollId,
			visitorId: VISITOR,
		});
		expect(view?.sentences.map(({ stitchedText }) => stitchedText)).toEqual(
			[
				"Kapitel 1",
				"Im 1. Kapitel ging Effi zum 1. Mal an den Strand.",
				"Im 1. Kapitel ging Effi zum 2. Mal an den Strand.",
				"Im 1. Kapitel ging Effi zum 3. Mal an den Strand.",
				"Danach war es still im Haus.",
			],
		);
		expect(view?.sentences.every((sentence) => sentence.plain)).toBe(true);
		expect(
			view?.sentences.every(({ segments }) => segments.length === 0),
		).toBe(true);
		expect(view?.sceneBreaks).toEqual([2]);

		// The file stays as the Original, on the top Section.
		const top = await t.run((ctx) => ctx.db.get(sectionId));
		expect(top).toMatchObject({ originalId: storageId, scrollCount: 4 });
		expect(await storedFile(t, storageId)).not.toBeNull();
	});

	test("labels a book cut by size Part 1, Part 2, …", async () => {
		const t = createTestConvex();
		const text = Array.from(
			{ length: 400 },
			(_, index) =>
				`Der ${(index + 1).toString()}. Absatz erzählt, wie der Wind über die Dünen ging und die Möwen über dem Wasser kreisten, bis es Abend wurde und die Lichter im Dorf angingen, eins nach dem anderen, langsam und ohne Eile.`,
		).join("\n\n");
		const sectionId = acceptedSection((await submitFile(t, text)).result);
		const codex = await t.query(api.library.codex, {
			sectionId,
			visitorId: VISITOR,
		});
		const titles = codex?.entries.map(({ title }) => title) ?? [];
		expect(titles.length).toBeGreaterThan(1);
		expect(titles).toEqual(
			titles.map((_, index) => `Part ${(index + 1).toString()}`),
		);
		const first = codex?.entries[0];
		if (first?.kind !== "Scroll") throw new Error("No first Scroll");
		expect(
			await t.query(api.library.next, { scrollId: first.scrollId }),
		).toMatchObject({ title: "Part 2" });
	});

	test("finds the same file stored before, writing nothing and dropping the new upload", async () => {
		const t = createTestConvex();
		const first = acceptedSection(
			(await submitFile(t, chapteredBook(2))).result,
		);
		const count = () =>
			t.run(async (ctx) => ({
				sections: (await ctx.db.query("sections").collect()).length,
				scrolls: (await ctx.db.query("scrolls").collect()).length,
				sentences: (await ctx.db.query("sentences").collect()).length,
			}));
		const before = await count();
		const again = await submitFile(t, chapteredBook(2), "copy.txt");
		expect(acceptedSection(again.result)).toBe(first);
		expect(await count()).toEqual(before);
		expect(await storedFile(t, again.storageId)).toBeNull();
	});

	test("turns away a file over 16 MB and drops it", async () => {
		const t = createTestConvex();
		const { storageId, result } = await submitFile(
			t,
			new Uint8Array(MAX_TEXT_FILE_BYTES + 1).fill(0x61),
		);
		expect(result).toEqual({
			status: "Rejected",
			message: TEXT_FILE_TOO_LARGE_MESSAGE,
		});
		expect(await storedFile(t, storageId)).toBeNull();
		expect(
			await t.run((ctx) => ctx.db.query("sections").collect()),
		).toEqual([]);
	});

	test("writes a long book in batches inside Convex's transaction limits", async () => {
		const t = createTestConvex({ transactionLimits: true });
		const chapters = 120;
		const text = chapteredBook(chapters, 60);
		const plan = planTextFile({
			name: "x.txt",
			bytes: encoder.encode(text),
		});
		if (plan.kind === "Rejected") throw new Error(plan.message);
		const sentences = plan.plan.scrolls.reduce(
			(sum, scroll) => sum + scroll.sentences.length,
			0,
		);
		expect(scrollBatches(plan.plan.scrolls).length).toBeGreaterThan(1);
		const sectionId = acceptedSection((await submitFile(t, text)).result);
		const stored = await t.run(async (ctx) => ({
			section: await ctx.db.get(sectionId),
			sentences: (await ctx.db.query("sentences").collect()).length,
		}));
		expect(stored.sentences).toBe(sentences);
		expect(stored.section?.scrollCount).toBe(chapters + 1);
		const codex = await t.query(api.library.codex, {
			sectionId,
			visitorId: VISITOR,
		});
		expect(codex?.entries).toHaveLength(chapters + 1);
	}, 60_000);
});

test("a run that fails leaves no half-written book and drops the Original", async () => {
	const t = createTestConvex({
		transactionLimits: { documentsWritten: 100 },
	});
	const storageId = await upload(t, chapteredBook(3, 60));
	await expect(
		t.action(api.textFileIntake.submitTextFile, {
			visitorId: VISITOR,
			storageId,
			fileName: "book.txt",
		}),
	).rejects.toThrow();
	const left = await t.run(async (ctx) => [
		...(await ctx.db.query("sections").collect()),
		...(await ctx.db.query("scrolls").collect()),
		...(await ctx.db.query("sentences").collect()),
	]);
	expect(left).toEqual([]);
	expect(await storedFile(t, storageId)).toBeNull();
});

test("the demo reset drops a book's Original", async () => {
	const t = createTestConvex();
	const { storageId } = await submitFile(t, chapteredBook(1));
	for (let tableIndex: number | undefined; ; ) {
		const batch = await t.mutation(
			internal.demoReset.clearSharedDataBatch,
			{
				...(tableIndex === undefined ? {} : { tableIndex }),
			},
		);
		tableIndex = batch.nextTableIndex;
		if (!batch.hasMore) break;
	}
	expect(await storedFile(t, storageId)).toBeNull();
});
