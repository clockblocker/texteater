import { describe, expect, test } from "bun:test";
import { operations, stitchedText } from "dumgen";
import * as Effect from "effect/Effect";
import {
	type FolioWindow,
	type ProcessedSentence,
	processFolio,
} from "../server/folioIntake";
import {
	DETECTION_CHARACTERS,
	detectionSlice,
	joinedSentence,
	PART_CHARACTERS,
	sentenceParts,
} from "../server/longSentences";
import { MAX_SEGMENTS_PER_SENTENCE } from "../server/storedSegments";
import { fakeJev, isLanguageRequest } from "./support/jev";
import { intakeDumgen } from "./support/providers";

/**
 * A long Sentence is still processed (#1193): `language.detect` reads its
 * opening, and `segment.inUnits` reads it whole up to `PART_CHARACTERS`
 * (#1343), a longer one in parts of at most that, joined back into one
 * Sentence.
 */

const CLAUSE =
	"Effi ging langsam an den langen Strand, und sie sah lange auf das graue Meer";

/** About 5,500 characters of German clauses in one Sentence. */
const LONG = `${Array.from({ length: 70 }, () => CLAUSE).join("; ")}.`;

/** About 1,950 characters: long, but within `PART_CHARACTERS`. */
const NEARLY_PART = `${Array.from({ length: 25 }, () => CLAUSE).join("; ")}.`;

describe("sentenceParts", () => {
	test("leaves a Sentence within the bound whole, as written", () => {
		const sentence = "  Er gibt   auf. ";
		expect(sentenceParts(sentence)).toEqual({
			parts: [sentence],
			separators: [],
		});
	});

	test("reads a Sentence of nearly 2,000 characters whole, so no unit is cut at a part's end", () => {
		expect(NEARLY_PART.length).toBeGreaterThan(1_900);
		expect(sentenceParts(NEARLY_PART)).toEqual({
			parts: [NEARLY_PART],
			separators: [],
		});
	});

	test("cuts a longer Sentence at clause ends into parts within the bound", () => {
		const { parts, separators } = sentenceParts(LONG);
		const fewest = Math.ceil(LONG.length / PART_CHARACTERS);
		expect(parts.length).toBeGreaterThanOrEqual(fewest);
		expect(parts.length).toBeLessThanOrEqual(fewest + 1);
		for (const part of parts) {
			expect(part.length).toBeLessThanOrEqual(PART_CHARACTERS);
			expect(part).toMatch(/[,;.]$/u);
		}
		const rejoined = parts
			.map((part, index) => part + (separators[index] ?? ""))
			.join("");
		expect(rejoined).toBe(stitchedText(LONG));
	});

	test("keeps a line break between parts and cuts a word only with no whitespace", () => {
		const lines = sentenceParts(`${"a".repeat(8)}\n${"b".repeat(8)}`, 10);
		expect(lines).toEqual({
			parts: ["aaaaaaaa", "bbbbbbbb"],
			separators: ["\n"],
		});
		expect(sentenceParts("x".repeat(25), 10)).toEqual({
			parts: ["x".repeat(10), "x".repeat(10), "x".repeat(5)],
			separators: ["", ""],
		});
	});
});

test("detectionSlice reads a long Sentence's opening, cut at whitespace", () => {
	expect(detectionSlice("Er gibt auf.")).toBe("Er gibt auf.");
	const slice = detectionSlice(LONG);
	expect(slice.length).toBeLessThanOrEqual(DETECTION_CHARACTERS);
	expect(LONG.startsWith(slice)).toBe(true);
	expect(LONG.charAt(slice.length)).toBe(" ");
});

test("joinedSentence shifts the parts' units and fails with any part", () => {
	const word = (text: string) => ({ kind: "ResolvableText" as const, text });
	const route = { language: "de", family: "Lexeme", kind: "NOUN" } as const;
	const first = {
		text: "Haus",
		segments: [word("Haus")],
		units: [{ segments: [0], route }],
	};
	const second = {
		text: "Hof",
		segments: [word("Hof")],
		units: [{ segments: [0], route }],
	};
	expect(joinedSentence([first, second], { separators: [" "] })).toEqual({
		text: "Haus Hof",
		segments: [
			word("Haus"),
			{ kind: "Whitespace", text: " " },
			word("Hof"),
		],
		units: [
			{ segments: [0], route },
			{ segments: [2], route },
		],
	});
	expect(
		joinedSentence([first, { ...second, units: [], failed: true }], {
			separators: [" "],
		}),
	).toMatchObject({ text: "Haus Hof", units: [], failed: true });
});

/** Runs a Folio's processing as its action does, with intake's Dumgen over `jev`. */
const runProcessFolio = (
	jev: ReturnType<typeof fakeJev>,
	options: Parameters<typeof processFolio>[0],
) =>
	Effect.runPromise(
		processFolio(options).pipe(Effect.provide(intakeDumgen(jev))),
	);

test("a Folio processes a Sentence over the bound as one German Sentence", async () => {
	const jev = fakeJev();
	const window = {
		sentences: [
			{ sentenceId: "s0", paragraph: 0, stitchedText: "Er gibt auf." },
			{ sentenceId: "s1", paragraph: 0, stitchedText: LONG },
		],
	} satisfies FolioWindow;
	const windows: FolioWindow[] = [window];
	const stored: ProcessedSentence[] = [];
	const end = await runProcessFolio(jev, {
		dumgen: operations,
		language: "de",
		hasTime: () => true,
		port: {
			nextWindow: async () => windows.shift() ?? null,
			storeWindow: async (sentences) => {
				stored.push(...sentences);
			},
			failed: async () => {},
		},
	});
	expect(end).toEqual({ kind: "Done" });

	for (const request of jev.sent) {
		const sentences = request.state.sentences;
		const [read, bound] = isLanguageRequest(request)
			? [sentences as string[], DETECTION_CHARACTERS]
			: [[String(request.state.sentence ?? "")], PART_CHARACTERS];
		for (const text of read) expect(text.length).toBeLessThanOrEqual(bound);
	}

	const long = stored.find(({ sentenceId }) => sentenceId === "s1");
	expect(long?.language).toBe("de");
	expect(long?.stitchedText).toBe(stitchedText(LONG));
	expect(long?.segments.map(({ text }) => text).join("")).toBe(
		stitchedText(LONG),
	);
	expect(long?.segmentationFailed).toBeUndefined();
	// Every word of every part sits in exactly one unit of the one Sentence.
	const resolvable = (long?.segments ?? []).flatMap((segment, index) =>
		segment.kind === "ResolvableText" ? [index] : [],
	);
	expect(
		(long?.units ?? [])
			.flatMap(({ segments }) => segments)
			.sort((a, b) => a - b),
	).toEqual(resolvable);
});

test("a Folio's Sentence of nearly 2,000 characters reaches segment.inUnits whole, and language.detect its opening", async () => {
	const jev = fakeJev();
	const windows: FolioWindow[] = [
		{
			sentences: [
				{ sentenceId: "s0", paragraph: 0, stitchedText: NEARLY_PART },
			],
		},
	];
	const stored: ProcessedSentence[] = [];
	await runProcessFolio(jev, {
		dumgen: operations,
		language: "de",
		hasTime: () => true,
		port: {
			nextWindow: async () => windows.shift() ?? null,
			storeWindow: async (sentences) => {
				stored.push(...sentences);
			},
			failed: async () => {},
		},
	});
	const segmented = jev.sent.filter((request) => !isLanguageRequest(request));
	expect(segmented.length).toBeGreaterThan(0);
	for (const request of segmented)
		expect(request.state.sentence).toBe(stitchedText(NEARLY_PART));
	const detected = jev.sent.filter(isLanguageRequest);
	expect(detected.length).toBe(1);
	const [read = ""] = (detected[0]?.state.sentences ?? []) as string[];
	expect(read.length).toBeGreaterThan(0);
	expect(read.length).toBeLessThanOrEqual(DETECTION_CHARACTERS);
	expect(stored).toMatchObject([
		{ sentenceId: "s0", language: "de", stitchedText: NEARLY_PART },
	]);
});

test("a Sentence too long to store its Segments stays an undetermined Plain Sentence", async () => {
	const jev = fakeJev();
	const huge = `${Array.from({ length: 120 }, () => CLAUSE).join("; ")}.`;
	expect(huge.length).toBeGreaterThan(MAX_SEGMENTS_PER_SENTENCE);
	const windows: FolioWindow[] = [
		{
			sentences: [
				{
					sentenceId: "s0",
					paragraph: 0,
					stitchedText: "Er gibt auf.",
				},
				{ sentenceId: "s1", paragraph: 1, stitchedText: huge },
			],
		},
	];
	const stored: ProcessedSentence[] = [];
	await runProcessFolio(jev, {
		dumgen: operations,
		language: "de",
		hasTime: () => true,
		port: {
			nextWindow: async () => windows.shift() ?? null,
			storeWindow: async (sentences) => {
				stored.push(...sentences);
			},
			failed: async () => {},
		},
	});
	expect(stored.map(({ language }) => language)).toEqual(["de", undefined]);
	expect(stored[1]).toMatchObject({ segments: [], units: [] });
	expect(
		jev.sent.some(
			(request) =>
				!isLanguageRequest(request) &&
				String(request.state.sentence ?? "").startsWith("Effi"),
		),
	).toBe(false);
});
