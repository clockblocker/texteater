import { describe, expect, test } from "bun:test";
import { wordsOf } from "@/fixtures";
import { cases, lineText } from "./cases";
import {
	beatsOf,
	captionRuns,
	clustersOf,
	dwellMs,
	frameText,
	matchByWord,
} from "./timeline";

/** Each case's Surface line: what Syntax ends on and the Surface Card heads. */
const surfaces = {
	hard: "jD mit jM zu tun hatte",
	simple: "Kindern",
} as const;

describe("morph-steps cases", () => {
	for (const morph of cases) {
		const { syntax } = morph.attestation;
		const { inflection } = morph.surface;

		test(`${morph.id}: the Surface Card heads its line and Inflection runs it to the lemma`, () => {
			expect(lineText(morph.surface.line)).toBe(surfaces[morph.id]);
			expect(frameText(inflection.start)).toBe(surfaces[morph.id]);
			const last = inflection.frames.at(-1);
			if (!last) throw new Error("no frames");
			expect(frameText(last)).toBe(lineText(morph.lemma.runs));
			expect(last.words.some((word) => word.kind === "ghost")).toBe(
				false,
			);
			expect([inflection.name, inflection.result]).toEqual([
				"Inflection",
				"Lemma",
			]);
		});

		test(`${morph.id}: Syntax starts on the clicked words and ends on the Surface`, () => {
			if (syntax.kind === "still") {
				expect(syntax.line).toContain("*");
				return;
			}
			const { track } = syntax;
			const members = wordsOf(morph.text)
				.filter((word) => word.unitId === morph.unitId)
				.map((word) => word.text)
				.join(" ");
			expect(frameText(track.start)).toBe(members);
			const last = track.frames.at(-1);
			if (!last) throw new Error("no frames");
			expect(frameText(last)).toBe(surfaces[morph.id]);
			expect(last.words).toEqual(inflection.start.words);
			expect([track.name, track.result]).toEqual(["Syntax", "Surface"]);
		});

		test(`${morph.id}: word and piece ids are unique within a frame`, () => {
			const tracks = [
				inflection,
				...(syntax.kind === "track" ? [syntax.track] : []),
			];
			for (const { frame } of tracks.flatMap(beatsOf)) {
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

	test("the hard case's unit is hatte es damit zu tun, and only it animates Syntax", () => {
		const hard = cases.find((morph) => morph.id === "hard");
		if (!hard) throw new Error("no hard case");
		const members = wordsOf(hard.text)
			.filter((word) => word.unitId === hard.unitId)
			.map((word) => word.text)
			.join(" ");
		expect(members).toBe("hatte es damit zu tun");
		expect(
			cases.map((morph) => [morph.id, morph.attestation.syntax.kind]),
		).toEqual([
			["hard", "track"],
			["simple", "still"],
		]);
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
		};
		expect(dwellMs(beat, true)).toBeGreaterThan(dwellMs(beat, false));
		expect(dwellMs({ ...beat, result: "Surface" }, true)).toBeGreaterThan(
			dwellMs(beat, true),
		);
	});

	test("beats run the start, then the frames; the last is the result", () => {
		const frame = (caption: string) => ({ words: [], caption });
		const beats = beatsOf({
			name: "Syntax",
			result: "Surface",
			start: frame("a"),
			frames: [frame("b"), frame("c")],
		});
		expect(beats.map((beat) => [beat.frame.caption, beat.result])).toEqual([
			["a", undefined],
			["b", undefined],
			["c", "Surface"],
		]);
	});
});
