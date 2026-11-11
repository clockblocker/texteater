import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answers, Ask } from "../../../src/segment/ask.js";
import {
	prepareGermanSegments,
	resolveGermanSegments,
	segmentGermanSentence,
} from "../../../src/segment/de/segments.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, picked, route } from "./fake-judge.js";

/** The Segments of `text` when jev picks `plan` for every written word it is asked about. */
function cut(text: string, plan = "Fusion", probability = 1): Segment[] {
	const prepared = prepareGermanSegments(text);
	const answers: Answers = Object.fromEntries(
		Object.keys(prepared.questions).map((id) => [
			id,
			{
				type: "choice",
				choice: plan,
				confidence: probability,
				probabilities: { [plan]: probability },
			},
		]),
	);
	return [...resolveGermanSegments(prepared, answers).segments];
}

const resolvable = (segments: readonly Segment[]) =>
	segments.filter(({ kind }) => kind === "ResolvableText");

test("a spoken verb + du fusion is cut into the verb and du, each piece standing for its word (#1338)", () => {
	expect(resolvable(cut("Biste gut angekommen?")).slice(0, 2)).toEqual([
		{ kind: "ResolvableText", text: "Bis", surface: "bist" },
		{ kind: "ResolvableText", text: "te", surface: "du" },
	]);
	expect(resolvable(cut("Kannste mir helfen?")).slice(0, 2)).toEqual([
		{ kind: "ResolvableText", text: "Kanns", surface: "kannst" },
		{ kind: "ResolvableText", text: "te", surface: "du" },
	]);
	expect(resolvable(cut("Na, hörste mich?")).slice(1, 3)).toEqual([
		{ kind: "ResolvableText", text: "hörs", surface: "hörst" },
		{ kind: "ResolvableText", text: "te", surface: "du" },
	]);
	// A weak answer falls back to the cut, as for im.
	expect(resolvable(cut("Siehste?", "AsWritten", 0.5))).toEqual([
		{ kind: "ResolvableText", text: "Siehs", surface: "siehst" },
		{ kind: "ResolvableText", text: "te", surface: "du" },
	]);
	// jev keeps the word whole only when it is confident.
	expect(resolvable(cut("Biste!", "AsWritten"))).toEqual([
		{ kind: "ResolvableText", text: "Biste" },
	]);
});

test("the question names a verb and du for a verb fusion, and keeps im's wording (#1338)", () => {
	const plans = (text: string) =>
		JSON.stringify(prepareGermanSegments(text).questions);
	expect(plans("Biste gut angekommen?")).toContain(
		"holds a finite verb and the pronoun du after it",
	);
	expect(plans("Im Wald.")).toContain(
		'"use":"The German written word holds a preposition and its article"',
	);
});

test("haste is hast du unless a subject of its own stands beside it (#1338)", () => {
	expect(resolvable(cut("Haste das gesehen?")).slice(0, 2)).toEqual([
		{ kind: "ResolvableText", text: "Has", surface: "hast" },
		{ kind: "ResolvableText", text: "te", surface: "du" },
	]);
	// sie may be the object, so it does not keep the word whole.
	expect(resolvable(cut("Haste sie gesehen?"))[1]).toEqual({
		kind: "ResolvableText",
		text: "te",
		surface: "du",
	});
	for (const text of ["Ich haste nach Hause.", "Dann haste ich los."]) {
		expect(prepareGermanSegments(text).questions).toEqual({});
		expect(resolvable(cut(text)).map(({ text }) => text)).toContain(
			"haste",
		);
	}
});

const noCall: Ask = () =>
	Effect.die(Error("No written word here should be asked about"));

test("a past tense in -ste or -te, weißte, and haste beside its own subject are no fusion: they are never asked about and stay whole (#1338)", async () => {
	const text =
		"Er musste gehen, sie sollte bleiben, er hasste und küsste sie, sie reiste ab und wusste es, er weißte die Wand, ich haste nach Hause.";
	const sentence = await Effect.runPromise(
		segmentGermanSentence(text, noCall),
	);
	expect(
		sentence.segments.every(({ surface }) => surface === undefined),
	).toBe(true);
	for (const word of [
		"musste",
		"sollte",
		"hasste",
		"küsste",
		"reiste",
		"wusste",
		"weißte",
		"haste",
	])
		expect(resolvable(sentence.segments).map(({ text }) => text)).toContain(
			word,
		);
});

test("the unit stage reads a fused verb and du as the words they stand for (#1338)", async () => {
	const fused = cut("Biste gut angekommen?");
	const pieces = sentenceOf({ segments: fused }).pieces;
	expect(pieces.slice(0, 2).map(({ text, word }) => [text, word])).toEqual([
		["Bis", "bist"],
		["te", "du"],
	]);
	// A fused preposition or article piece keeps its letters.
	expect(
		sentenceOf({ segments: cut("Im Wald.") })
			.pieces.slice(0, 2)
			.map(({ word }) => word),
	).toEqual(["I", "m"]);

	// Fused and written apart, the Sentence asks the same questions: the
	// auxiliary slot of bist, the perfect-or-state Choice and du's identity.
	const questionIds = async (segments: readonly Segment[]) => {
		const judge = fakeJudge();
		await Effect.runPromise(germanUnits({ segments }, judge.ask));
		return judge.requests.flatMap(({ questions }) =>
			Object.keys(questions),
		);
	};
	const apart = segmentsOf("Bist du gut angekommen?");
	expect(await questionIds(fused)).toEqual(await questionIds(apart));
	expect(await questionIds(fused)).toContain("s_auxiliary_1");
	expect(await questionIds(fused)).toContain("i_2");

	// The auxiliary piece joins its participle into the perfect, and du is a
	// pronoun of its own.
	const judge = fakeJudge({
		s_auxiliary_1: picked("p4"),
		v_state_1_4: picked("perfect"),
		"v_perfect-auxiliary_1_4": picked("sein"),
		r_1_4: picked("Lexeme/VERB"),
		i_2: picked("c0"),
		r_2: picked("Lexeme/PRON"),
		r_3: picked("Lexeme/ADJ"),
	});
	const units = await Effect.runPromise(
		germanUnits({ segments: fused }, judge.ask),
	);
	expect(units.find(({ segments }) => segments.includes(0))).toEqual({
		segments: [0, 5],
		route: route("Lexeme", "VERB"),
	});
	expect(units.find(({ segments }) => segments.includes(1))).toMatchObject({
		segments: [1],
		route: route("Lexeme", "PRON"),
	});
});
