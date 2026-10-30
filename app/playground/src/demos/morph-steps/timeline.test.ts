import { describe, expect, test } from "bun:test";
import { wordsOf } from "@/fixtures";
import { cases, lemmaText } from "./cases";
import {
	beatsOf,
	boundariesOf,
	captionRuns,
	clustersOf,
	dwellMs,
	frameText,
	matchByWord,
} from "./timeline";

/** Each case's Surface: the result Syntax rests on. */
const surfaces = {
	hard: "jD mit jM zu tun hatte",
	simple: "Kindern",
} as const;

describe("morph-steps cases", () => {
	for (const morph of cases) {
		test(`${morph.id}: starts on the clicked words and ends on the lemma`, () => {
			const { start, stages } = morph.timeline;
			const last = stages.at(-1)?.frames.at(-1);
			if (!last) throw new Error("no frames");
			expect(frameText(start)).toBe(morph.surface.title);
			expect(frameText(last)).toBe(lemmaText(morph));
			expect(last.words.some((word) => word.kind === "ghost")).toBe(
				false,
			);
		});

		test(`${morph.id}: Syntax rests on the Surface, Inflection on the Lemma`, () => {
			const beats = beatsOf(morph.timeline);
			const [boundary, ...more] = boundariesOf(beats);
			expect(more).toEqual([]);
			const surface =
				boundary === undefined ? undefined : beats[boundary];
			if (!surface) throw new Error("no boundary");
			expect(surface.result).toBe("Surface");
			expect(frameText(surface.frame)).toBe(surfaces[morph.id]);
			expect(beats.at(-1)?.result).toBe("Lemma");
			expect(
				morph.timeline.stages.map((stage) => [
					stage.name,
					stage.result,
				]),
			).toEqual([
				["Syntax", "Surface"],
				["Inflection", "Lemma"],
			]);
		});

		test(`${morph.id}: word and piece ids are unique within a frame`, () => {
			for (const { frame } of beatsOf(morph.timeline)) {
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
		const beat = {
			frame: { words: [], caption: "*Kind* is neuter." },
			stage: 0,
		};
		expect(dwellMs(beat, true)).toBeGreaterThan(dwellMs(beat, false));
		expect(dwellMs({ ...beat, result: "Surface" }, true)).toBeGreaterThan(
			dwellMs(beat, true),
		);
	});

	test("beats run start, then each stage; only inner results are boundaries", () => {
		const frame = (caption: string) => ({ words: [], caption });
		const beats = beatsOf({
			start: frame("a"),
			stages: [
				{
					name: "Syntax",
					result: "Surface",
					frames: [frame("b"), frame("c")],
				},
				{ name: "Inflection", result: "Lemma", frames: [frame("d")] },
			],
		});
		expect(
			beats.map((beat) => [beat.frame.caption, beat.stage, beat.result]),
		).toEqual([
			["a", 0, undefined],
			["b", 0, undefined],
			["c", 0, "Surface"],
			["d", 1, "Lemma"],
		]);
		expect(boundariesOf(beats)).toEqual([2]);
	});
});
