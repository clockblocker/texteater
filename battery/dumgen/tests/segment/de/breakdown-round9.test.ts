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

test("a word part's letters as they stand win when the headword test passes them, whatever the headword question picks", async () => {
	// The headword question picks Lacke (f_1=f1); the test passes Lack.
	const judge = senseJudge(
		{ "Auto + lack": 0.9 },
		{},
		"Auto",
		"Lack",
		"r_0=Lexeme/NOUN",
		"f_1=f1",
	);
	expect(
		await run(input("Lexeme", "NOUN", "Autolack", "🚗"), judge.ask),
	).toEqual(["Auto→Lexeme/NOUN:Auto", "lack→Lexeme/NOUN:Lack"]);
});

test("a proper name's umlaut before a suffix is undone, and the form the headword test passes wins over the letters", async () => {
	const judge = senseJudge(
		{ "röm + -isch (suffix)": 0.9 },
		{},
		"Rom",
		"r_0=Lexeme/PROPN",
		"f_0=f0",
	);
	expect(
		await run(input("Lexeme", "ADJ", "römisch", "🏛"), judge.ask),
	).toEqual(["röm→Lexeme/PROPN:Rom", "isch→Morpheme/Suffix:-isch"]);
});

test("with no form passing the headword test, the headword question's pick stands", async () => {
	const judge = senseJudge(
		{ "Auto + lack": 0.9 },
		{},
		"Auto",
		"r_0=Lexeme/NOUN",
		"f_1=f1",
	);
	expect(
		await run(input("Lexeme", "NOUN", "Autolack", "🚗"), judge.ask),
	).toEqual(["Auto→Lexeme/NOUN:Auto", "lack→Lexeme/NOUN:Lacke"]);
});

test("-voll is a suffix with a noun base, never the adjective voll as a head", async () => {
	const judge = senseJudge({ "kraft + -voll (suffix)": 0.9 }, {}, "Kraft");
	expect(
		await run(input("Lexeme", "ADJ", "kraftvoll", "💪"), judge.ask),
	).toEqual(["kraft→Lexeme/NOUN:Kraft", "voll→Morpheme/Suffix:-voll"]);
	expect(offeredAnalyses(judge)).not.toContain("kraft + voll");
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
