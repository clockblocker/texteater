import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { wordAnalyses } from "../../../src/segment/de/breakdown/word-analyses.js";
import { noneOption } from "../../../src/segment/de/breakdown/word-prompts.js";
import { input, senseJudge, shown } from "./breakdown-support.js";

// The round-9 fixes (#1241), each shown on a word that is no Breakdown
// Record.

const run = async (reading: BreakdownInput, ask: Ask) => {
	const result = await Effect.runPromise(germanConstituents(reading, ask));
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

/** Every option label the analysis question offered. */
const offeredAnalyses = (judge: ReturnType<typeof senseJudge>) =>
	judge
		.requests()
		.filter(({ stage }) => stage === "breakdown-analysis")
		.flatMap(({ questions }) => {
			const question = questions.analysis as Question | undefined;
			return question?.type === "choice"
				? Object.values(question.criteria).map(String)
				: [];
		});

test("a proper name's umlaut before a suffix is undone, as a form the headword question may pick", async () => {
	const judge = senseJudge(
		{ "röm + -isch (suffix)": 0.9 },
		{},
		"Rom",
		"r_0=Lexeme/PROPN",
	);
	expect(
		await run(input("Lexeme", "ADJ", "römisch", "🏛"), judge.ask),
	).toEqual(["röm→Lexeme/PROPN:Rom", "isch→Morpheme/Suffix:-isch"]);
	expect(
		judge
			.requests()
			.filter(({ stage }) => stage === "breakdown-forms")
			.flatMap(({ questions }) => Object.keys(questions)),
	).toEqual(["f_0"]);
});

test("an adverb's last word that is a particle and a preposition links to its ADP, unasked", async () => {
	const judge = senseJudge(
		{ "eben + zu": 0.9 },
		{},
		"eben",
		"r_0=Lexeme/ADV",
	);
	expect(
		await run(input("Lexeme", "ADV", "ebenzu", "🎯"), judge.ask),
	).toEqual(["eben→Lexeme/ADV:eben", "zu→Lexeme/ADP:zu"]);
});

test("-voll is a suffix with a noun base, and the adjective voll stays a head", async () => {
	const suffixed = senseJudge(
		{ "kraft + -voll (suffix)": 0.9, "kraft + voll": 0.1 },
		{},
		"Kraft",
	);
	expect(
		await run(input("Lexeme", "ADJ", "kraftvoll", "💪"), suffixed.ask),
	).toEqual(["kraft→Lexeme/NOUN:Kraft", "voll→Morpheme/Suffix:-voll"]);
	expect(offeredAnalyses(suffixed)).toContain("kraft + voll");
	const compound = senseJudge(
		{ "kraft + voll": 0.9, "kraft + -voll (suffix)": 0.1 },
		{},
		"Kraft",
		"voll",
		"r_0=Lexeme/NOUN",
		"r_1=Lexeme/ADJ",
	);
	expect(
		await run(input("Lexeme", "ADJ", "kraftvoll", "💪"), compound.ask),
	).toEqual(["kraft→Lexeme/NOUN:Kraft", "voll→Lexeme/ADJ:voll"]);
});

test("an adverb's two words are asked whether a dictionary splits them so, and that yes beats none", async () => {
	const judge = senseJudge(
		{ "irgend + wann": 0.7, [noneOption]: 0.3 },
		{ "written together as one word": 0.8 },
		"irgend",
		"wann",
		"r_0=Lexeme/ADV",
		"r_1=Lexeme/ADV",
	);
	expect(
		await run(input("Lexeme", "ADV", "irgendwann", "🕰"), judge.ask),
	).toEqual(["irgend→Lexeme/ADV:irgend", "wann→Lexeme/ADV:wann"]);
	const senses = judge
		.texts()
		.filter((text) => text.startsWith("Think of irgendwann"));
	expect(senses).toEqual([
		"Think of irgendwann in the sense 🕰. Does a dictionary's word formation split it into the two words irgend and wann, each a word of its own, written together as one word, however far its sense has drifted from theirs? Answer no when its letters only happen to contain them.",
	]);
});

test("an adverb's last word may have two letters, a noun's head may not", () => {
	const labels = (word: string, kind: string) =>
		wordAnalyses(word, kind).map(({ label }) => label);
	expect(labels("irgendwo", "ADV")).toContain("irgend + wo");
	expect(labels("Kanuwo", "NOUN")).not.toContain("Kanu + wo");
});
