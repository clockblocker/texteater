import { describe, expect, test } from "bun:test";
import { createDumgen, stitchedText } from "dumgen";
import {
	type FolioWindow,
	type ProcessedSentence,
	processFolios,
} from "../server/folioIntake";
import {
	detectionSlice,
	joinedSentence,
	PART_CHARACTERS,
	sentenceParts,
} from "../server/longSentences";
import { MAX_SEGMENTS_PER_SENTENCE } from "../server/storedSegments";
import { fakeJev, isLanguageRequest } from "./support/jev";

/**
 * A long Sentence is still processed (#1193): `language.detect` reads its
 * opening, and `segment.inUnits` reads it in parts of at most
 * `PART_CHARACTERS`, joined back into one Sentence.
 */

const CLAUSE =
	"Effi ging langsam an den langen Strand, und sie sah lange auf das graue Meer";

/** About 5,600 characters of German clauses in one Sentence. */
const LONG = `${Array.from({ length: 70 }, () => CLAUSE).join("; ")}.`;

describe("sentenceParts", () => {
	test("leaves a Sentence within the bound whole, as written", () => {
		const sentence = "  Er gibt   auf. ";
		expect(sentenceParts(sentence)).toEqual({
			parts: [sentence],
			separators: [],
		});
	});

	test("cuts a long Sentence at clause ends into parts within the bound", () => {
		const { parts, separators } = sentenceParts(LONG);
		expect(parts.length).toBe(Math.ceil(LONG.length / PART_CHARACTERS) + 1);
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
	expect(slice.length).toBeLessThanOrEqual(PART_CHARACTERS);
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

test("a Folio processes a Sentence over the bound as one German Sentence", async () => {
	const jev = fakeJev();
	const window = {
		window: 0,
		sentences: [
			{ sentenceId: "s0", paragraph: 0, stitchedText: "Er gibt auf." },
			{ sentenceId: "s1", paragraph: 0, stitchedText: LONG },
		],
	} satisfies FolioWindow;
	const windows: FolioWindow[] = [window];
	const stored: ProcessedSentence[] = [];
	const end = await processFolios({
		dumgen: createDumgen({
			jev: jev.ask,
			luna: async () => {
				throw Error("intake asked Luna");
			},
		}),
		language: "de",
		hasTime: () => true,
		port: {
			nextWindow: async () => windows.shift() ?? null,
			storeWindow: async (_, sentences) => {
				stored.push(...sentences);
			},
			windowFailed: async () => null,
		},
	});
	expect(end).toEqual({ kind: "Done" });

	for (const request of jev.sent) {
		const sentences = request.state.sentences;
		const read = isLanguageRequest(request)
			? (sentences as string[])
			: [String(request.state.sentence ?? "")];
		for (const text of read)
			expect(text.length).toBeLessThanOrEqual(PART_CHARACTERS);
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

test("a Sentence too long to store its Segments stays an undetermined Plain Sentence", async () => {
	const jev = fakeJev();
	const huge = `${Array.from({ length: 120 }, () => CLAUSE).join("; ")}.`;
	expect(huge.length).toBeGreaterThan(MAX_SEGMENTS_PER_SENTENCE);
	const windows: FolioWindow[] = [
		{
			window: 0,
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
	await processFolios({
		dumgen: createDumgen({
			jev: jev.ask,
			luna: async () => {
				throw Error("intake asked Luna");
			},
		}),
		language: "de",
		hasTime: () => true,
		port: {
			nextWindow: async () => windows.shift() ?? null,
			storeWindow: async (_, sentences) => {
				stored.push(...sentences);
			},
			windowFailed: async () => null,
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
