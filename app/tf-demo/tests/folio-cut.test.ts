import { describe, expect, test } from "bun:test";
import { cutFolios, savesOf, windowsOf } from "../server/folios";

/*
 * How a book Scroll is cut into Folios, a Folio's unprocessed Sentences
 * into jev windows, and a processed window into saves (#1193, #1216).
 */

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
			{ start: 0, end: 3 },
			{ start: 3, end: 4 },
			{ start: 4, end: 5 },
			{ start: 5, end: 6 },
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
		expect(cutFolios(sentences)).toEqual([{ start: 0, end: 31 }]);
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
	});
});

describe("saving a processed window", () => {
	const sentence = (sentenceId: string, segments: number) => ({
		sentenceId,
		segments: Array.from({ length: segments }, (_, index) => index),
		language: "de",
	});
	/** Each save as its shares: `id:from+count`, with `!` on a last share. */
	const shape = (saves: ReturnType<typeof savesOf>) =>
		saves.map((save) =>
			save.map(
				({ sentenceId, from, segments, analysis }) =>
					`${sentenceId}:${from}+${segments.length}${analysis ? "!" : ""}`,
			),
		);

	test("packs whole Sentences into saves of at most the size", () => {
		expect(
			shape(
				savesOf(
					[
						sentence("a", 3),
						sentence("b", 2),
						sentence("c", 0),
						sentence("d", 4),
					],
					5,
				),
			),
		).toEqual([["a:0+3!", "b:0+2!", "c:0+0!"], ["d:0+4!"]]);
	});

	test("spreads a Sentence longer than a save over several, marking only its last share", () => {
		expect(
			shape(savesOf([sentence("a", 2), sentence("b", 12)], 5)),
		).toEqual([["a:0+2!"], ["b:0+5"], ["b:5+5"], ["b:10+2!"]]);
		const [, , , last] = savesOf([sentence("a", 2), sentence("b", 12)], 5);
		expect(last?.[0]?.analysis).toEqual({ language: "de" });
		expect(last?.[0]?.segments).toEqual([10, 11]);
	});

	test("a window of plain Sentences is one save", () => {
		expect(shape(savesOf([sentence("a", 0), sentence("b", 0)]))).toEqual([
			["a:0+0!", "b:0+0!"],
		]);
		expect(savesOf([])).toEqual([]);
	});
});
