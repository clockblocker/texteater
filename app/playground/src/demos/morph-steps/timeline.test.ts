import { describe, expect, test } from "bun:test";
import { wordsOf } from "@/fixtures";
import { cases, lemmaText } from "./cases";
import {
	captionRuns,
	clustersOf,
	dwellMs,
	frameText,
	matchByWord,
} from "./timeline";

describe("morph-steps cases", () => {
	for (const morph of cases) {
		test(`${morph.id}: starts on the clicked words and ends on the lemma`, () => {
			const first = morph.frames[0];
			const last = morph.frames.at(-1);
			if (!first || !last) throw new Error("no frames");
			expect(frameText(first)).toBe(morph.surface.title);
			expect(frameText(last)).toBe(lemmaText(morph));
			expect(last.words.some((word) => word.kind === "ghost")).toBe(
				false,
			);
		});

		test(`${morph.id}: word and piece ids are unique within a frame`, () => {
			for (const frame of morph.frames) {
				const ids = frame.words.map((word) => word.id);
				expect(new Set(ids).size).toBe(ids.length);
				for (const word of frame.words) {
					const pieces = word.pieces.map((piece) => piece.id);
					expect(new Set(pieces).size).toBe(pieces.length);
				}
			}
		});

		test(`${morph.id}: the clicked word is a member of the unit`, () => {
			const clicked = wordsOf(morph.text).find(
				(word) => word.text === morph.clickWord,
			);
			expect(clicked?.unitId).toBe(morph.unitId);
		});
	}

	test("the hard case's unit is hatte es damit zu tun", () => {
		const hard = cases.find((morph) => morph.id === "hard");
		if (!hard) throw new Error("no hard case");
		const members = wordsOf(hard.text)
			.filter((word) => word.unitId === hard.unitId)
			.map((word) => word.text)
			.join(" ");
		expect(members).toBe(hard.surface.title);
	});
});

describe("timeline helpers", () => {
	const da = { id: "da", pieces: [{ id: "da", text: "da" }] };
	const mit = { id: "mit", pieces: [{ id: "mit", text: "mit" }], glue: true };

	test("glued words share a run, keyed by its first word", () => {
		expect(clustersOf([da, mit]).map((cluster) => cluster.key)).toEqual([
			"da",
		]);
		expect(
			clustersOf([da, { ...mit, glue: false }]).map(
				(cluster) => cluster.key,
			),
		).toEqual(["da", "mit"]);
	});

	test("matching by word makes a changed word a new piece", () => {
		const hatte = {
			id: "hatte",
			pieces: [
				{ id: "ha", text: "ha" },
				{ id: "tte", text: "tte", focus: true },
			],
		};
		expect(matchByWord(hatte).pieces).toEqual([
			{ id: "hatte", text: "hatte", focus: true },
		]);
	});

	test("captions split into English and German runs", () => {
		expect(captionRuns("*hatte* is *haben*.")).toEqual([
			{ text: "hatte", german: true },
			{ text: " is ", german: false },
			{ text: "haben", german: true },
			{ text: ".", german: false },
		]);
	});

	test("a caption adds reading time unless captions are off", () => {
		const frame = { words: [], caption: "*Kind* is neuter." };
		expect(dwellMs(frame, true)).toBeGreaterThan(dwellMs(frame, false));
	});
});
