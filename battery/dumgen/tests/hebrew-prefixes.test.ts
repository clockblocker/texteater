import { expect, test } from "bun:test";
import { loadSpecRecords } from "dumspec";
import { Effect } from "effect";
import {
	type HebrewReading,
	readingSpans,
} from "../src/concrete-lang/he/segmentation/prefixes.js";
import {
	type OpenHebrewWord,
	openHebrewWords,
	segmentHebrew,
} from "../src/concrete-lang/he/segmentation/segment.js";
import {
	decodeHebrewWordList,
	encodeHebrewWordList,
	WordClass,
} from "../src/concrete-lang/he/segmentation/word-list.js";
import { choiceAnswers } from "../src/testing.js";
import type {
	OperationTrace,
	SegmentationDecision,
	SegmentKind,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

type GoldFusion = {
	readonly spelling: string;
	readonly components: readonly { span: string; surface: string }[];
};
type Gold = {
	readonly segments: readonly { kind: SegmentKind; text: string }[];
	/** The Fusion of each Fused target member's word, by the word's offset. */
	readonly fusions: ReadonlyMap<number, GoldFusion>;
};

const records = loadSpecRecords().filter((record) =>
	record.id.startsWith("he/"),
);

/**
 * Spec Records carry no Fusion for a non-target word, so only a Fused target
 * member pins its word's hidden ה (#646).
 */
function goldOf(record: (typeof records)[number]): Gold {
	const offsets: number[] = [];
	let offset = 0;
	for (const segment of record.segments) {
		offsets.push(offset);
		offset += segment.text.length;
	}
	const fusions = new Map<number, GoldFusion>();
	for (const target of record.targets) {
		const members = target.attestation.members as readonly {
			readonly orthography: string;
			readonly fusion?: GoldFusion;
			readonly component?: number;
		}[];
		members.forEach((member, position) => {
			if (member.orthography !== "Fused" || !member.fusion) return;
			const index = target.memberSegmentIndices[position] ?? -1;
			const before = member.fusion.components
				.slice(0, member.component ?? 0)
				.reduce((length, { span }) => length + span.length, 0);
			fusions.set((offsets[index] ?? 0) - before, member.fusion);
		});
	}
	return {
		segments: record.segments.map(({ kind, text }) => ({ kind, text })),
		fusions,
	};
}

const gold = new Map(
	records.map((record) => [record.sentence, goldOf(record)]),
);

const components = (reading: HebrewReading) =>
	reading.map(({ span, surface }) => ({ span, surface }));

/** The reading the gold spells: its Fusion for a Fused target member, else its Segments. */
function goldReading(word: OpenHebrewWord, expected: Gold): number {
	const fusion = expected.fusions.get(word.offset);
	const spans: string[] = [];
	let offset = 0;
	for (const { text } of expected.segments) {
		if (offset >= word.offset && offset < word.offset + word.text.length)
			spans.push(text);
		offset += text.length;
	}
	const index = word.readings.findIndex((reading) =>
		fusion
			? JSON.stringify(components(reading)) ===
				JSON.stringify(fusion.components)
			: readingSpans(reading).join("|") === spans.join("|"),
	);
	if (index < 0) throw Error(`No reading of ${word.text} matches the gold`);
	return index;
}

/**
 * Intake that accepts every sentence as Hebrew and answers each prefix Choice
 * from the gold. `reached` records the words each Choice call asked about.
 */
function goldIntake() {
	const traces: OperationTrace[] = [];
	const reached = new Map<string, readonly string[]>();
	const dumgen = createDumgen({
		judge: async (request) => {
			const state = request.state as {
				sourceText?: string;
				sentence?: string;
			};
			if (state.sourceText !== undefined)
				return choiceAnswers(request.questions, (id) =>
					id === "language"
						? "he"
						: id === "validity"
							? "Accepted"
							: "Unchanged",
				);
			const sentence = state.sentence ?? "";
			const expected = gold.get(sentence);
			if (!expected) throw Error(`No gold for ${sentence}`);
			const open = openHebrewWords(sentence);
			reached.set(
				sentence,
				open.map(({ text }) => text),
			);
			return choiceAnswers(request.questions, (id) => {
				const word = open.find(({ offset }) => id === `word_${offset}`);
				if (!word) throw Error(`Unexpected question ${id}`);
				return `r${goldReading(word, expected)}`;
			});
		},
		execute: async () => {
			throw Error("Must not stitch");
		},
		onOperation: (trace) => traces.push(trace),
	});
	return { dumgen, traces, reached };
}

async function intake(
	dumgen: ReturnType<typeof createDumgen>,
	sentence: string,
): Promise<Extract<SegmentationDecision, { language: "he" }>> {
	const [decision] = await Effect.runPromise(
		dumgen.segment({ sourceSentences: [sentence] }),
	);
	if (decision?.decision !== "Accepted" || decision.language !== "he")
		throw Error(`${sentence} was not accepted as Hebrew`);
	return decision;
}

function fusionAt(
	decision: Extract<SegmentationDecision, { language: "he" }>,
	offset: number,
): GoldFusion | undefined {
	const fusion = decision.fusions.find((entry) => entry.offset === offset);
	return (
		fusion && {
			spelling: fusion.form,
			components: fusion.components.map(({ span, surface }) => ({
				span,
				surface,
			})),
		}
	);
}

const texts = (segments: readonly { text: string }[]) =>
	segments.map(({ text }) => text);

test("intake segments every Hebrew Spec Record as its gold does, settling open words in one Choice call", async () => {
	expect(records.length).toBeGreaterThan(40);
	const { dumgen, traces, reached } = goldIntake();
	for (const record of records) {
		const expected = gold.get(record.sentence);
		if (!expected) throw Error("Missing gold");
		const decision = await intake(dumgen, record.sentence);
		expect(
			decision.sentence.segments.map(({ kind, text }) => ({
				kind,
				text,
			})),
			record.id,
		).toEqual([...expected.segments]);
		for (const [offset, fusion] of expected.fusions)
			expect(
				fusionAt(decision, offset),
				`${record.id} @${offset}`,
			).toEqual(fusion);
		const calls = traces.at(-1)?.calls ?? [];
		const open = reached.get(record.sentence) ?? [];
		// The intake judgment, plus one prefix Choice call when a word is open.
		expect(calls, record.id).toHaveLength(open.length > 0 ? 2 : 1);
	}
	// Every sentence reaches the Choice with at most two words.
	expect(Math.max(...[...reached.values()].map(({ length }) => length))).toBe(
		2,
	);
});

test("ברית, בגלל and בקשה stay whole with no Choice; ובבית splits into ו, ב, בית", async () => {
	for (const word of ["ברית", "בגלל", "בקשה"]) {
		expect(openHebrewWords(word), word).toEqual([]);
		expect(texts(segmentHebrew(word).segments), word).toEqual([word]);
	}
	expect(texts(segmentHebrew("ובבית").segments)).toEqual(["ו", "ב", "בית"]);

	let prefixCalls = 0;
	const dumgen = createDumgen({
		judge: async (request) => {
			if ("sourceText" in (request.state as object))
				return choiceAnswers(request.questions, (id) =>
					id === "language"
						? "he"
						: id === "validity"
							? "Accepted"
							: "Unchanged",
				);
			prefixCalls += 1;
			// Only ובבית's hidden article is open; choose the reading with it.
			expect(Object.keys(request.questions)).toEqual(["word_21"]);
			return choiceAnswers(request.questions, () => "r1");
		},
		execute: async () => {
			throw Error("Must not stitch");
		},
	});
	const whole = await intake(dumgen, "ברית בגלל בקשה.");
	expect(texts(whole.sentence.segments)).toEqual([
		"ברית",
		" ",
		"בגלל",
		" ",
		"בקשה",
		".",
	]);
	expect(whole.fusions).toEqual([]);
	expect(prefixCalls).toBe(0);

	const split = await intake(dumgen, "ברית בגלל בקשה ישבנו ובבית.");
	expect(prefixCalls).toBe(1);
	expect(texts(split.sentence.segments).slice(-4)).toEqual([
		"ו",
		"ב",
		"בית",
		".",
	]);
	expect(split.fusions).toEqual([
		{
			offset: 21,
			form: "ובבית",
			components: [
				{ offset: 21, span: "ו", surface: "ו", role: "Conjunction" },
				{ offset: 22, span: "ב", surface: "ב", role: "Adposition" },
				{ offset: 23, span: "", surface: "ה", role: "Article" },
				{ offset: 23, span: "בית", surface: "בית", role: "Host" },
			],
		},
	]);
});

test("an unresolved Choice keeps an open word whole", async () => {
	const dumgen = createDumgen({
		judge: async (request) =>
			choiceAnswers(request.questions, (id) =>
				id === "language"
					? "he"
					: id === "validity"
						? "Accepted"
						: id === "stitching"
							? "Unchanged"
							: "Unresolved",
			),
		execute: async () => {
			throw Error("Must not stitch");
		},
	});
	const decision = await intake(dumgen, "הוא כתב מכתב.");
	expect(texts(decision.sentence.segments)).toEqual([
		"הוא",
		" ",
		"כתב",
		" ",
		"מכתב",
		".",
	]);
	expect(decision.fusions).toEqual([]);
});

test("vowel points decide the hidden article before the word list", () => {
	const pointed = segmentHebrew("בַּבַּיִת");
	expect(texts(pointed.segments)).toEqual(["בַּ", "בַּיִת"]);
	expect(
		pointed.fusions[0]?.components.map(({ span, surface }) => [
			span,
			surface,
		]),
	).toEqual([
		["בַּ", "ב"],
		["", "ה"],
		["בַּיִת", "בַּיִת"],
	]);
	const bare = segmentHebrew("בְּבַיִת");
	expect(texts(bare.segments)).toEqual(["בְּ", "בַיִת"]);
	expect(bare.fusions[0]?.components.map(({ span }) => span)).toEqual([
		"בְּ",
		"בַיִת",
	]);
	// מ with shva is a letter of the word, not the prefix מ.
	expect(texts(segmentHebrew("מְכוֹנִית").segments)).toEqual(["מְכוֹנִית"]);
});

test("prefix stacks, written articles and quoted stems split by the grammar", () => {
	expect(texts(segmentHebrew("מהבית ושהספרים").segments)).toEqual([
		"מ",
		"ה",
		"בית",
		" ",
		"ו",
		"ש",
		"ה",
		"ספרים",
	]);
	expect(texts(segmentHebrew('הדו"ח בצה"ל.').segments)).toEqual([
		"ה",
		'דו"ח',
		" ",
		"ב",
		'צה"ל',
		".",
	]);
	// No reading cuts into a function word: ובגלל is ו and בגלל.
	expect(texts(segmentHebrew("ובגלל").segments)).toEqual(["ו", "בגלל"]);
});

test("segmentation takes an injected word list, and the encoding round-trips", () => {
	const words = decodeHebrewWordList(
		encodeHebrewWordList(
			new Map([
				["בית", WordClass.TakesPreposition | WordClass.TakesArticle],
				["ספר", WordClass.TakesPreposition],
			]),
		),
	);
	expect(words.classesOf("בית")).toBe(
		WordClass.TakesPreposition | WordClass.TakesArticle,
	);
	expect(words.classesOf("בַּיִת")).toBe(
		WordClass.TakesPreposition | WordClass.TakesArticle,
	);
	expect(words.classesOf("בבית")).toBeUndefined();
	// Without TakesHiddenArticle, בבית has one reading and splits with no Choice.
	const split = segmentHebrew("בבית הספר", new Map(), words);
	expect(texts(split.segments)).toEqual(["ב", "בית", " ", "הספר"]);
	expect(openHebrewWords("בבית הספר", words)).toEqual([]);
	// הספר needs a stem that takes the written article; ספר does not here.
	expect(split.fusions.map(({ form }) => form)).toEqual(["בבית"]);
});
