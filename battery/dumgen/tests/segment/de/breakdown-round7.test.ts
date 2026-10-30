import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown-pieces.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { baseHeadwords } from "../../../src/segment/de/breakdown/prefix-cut.js";
import { noneOption } from "../../../src/segment/de/breakdown/word-prompts.js";
import { input, senseJudge, shown } from "./breakdown-support.js";
import { asked, picked } from "./fake-judge.js";

// The round-7 fixes (#1241), each shown on a word that is no Breakdown
// Record.

const run = async (reading: BreakdownInput, ask: Ask) => {
	const result = await Effect.runPromise(germanConstituents(reading, ask));
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

/** `ask` with the affix test answered by `weigh` from its options' texts, every other request by `ask`. */
const prefixChoice =
	(
		weigh: (
			options: Readonly<Record<string, string>>,
		) => Record<string, number>,
		ask: Ask,
		seen: Record<string, string>[] = [],
	): Ask =>
	(request) => {
		const question = request.questions.p_0 as Question | undefined;
		if (question?.type !== "choice") return ask(request);
		const options = Object.fromEntries(
			Object.entries(question.criteria).map(([key, text]) => [
				key,
				String(text),
			]),
		);
		seen.push(options);
		const probabilities = weigh(options);
		const [top = "none"] = Object.entries(probabilities)
			.sort(([, left], [, right]) => right - left)
			.map(([key]) => key);
		return asked(() => ({ p_0: picked(top, probabilities) }))(request);
	};

test("a base's headwords are its letters as they stand, a noun's with its final -e dropped or restored, then with the umlaut undone", () => {
	expect(baseHeadwords("büsch", true)).toEqual([
		"Büsch",
		"Büsche",
		"Busch",
		"Busche",
	]);
	expect(baseHeadwords("birge", true)).toEqual(["Birge", "Birg"]);
	expect(baseHeadwords("fallen", false)).toEqual(["fallen"]);
});

test("the affix test weighs the cut, naming the word it leaves, against no cut", async () => {
	const seen: Record<string, string>[] = [];
	const judge = senseJudge({ "Ge- (prefix) + büsch": 0.9 }, {}, "Busch");
	expect(
		await run(
			input("Lexeme", "NOUN", "Gebüsch", "🌳"),
			prefixChoice(
				() => ({ c0: 0.1, c1: 0.7, none: 0.2 }),
				judge.ask,
				seen,
			),
		),
	).toEqual(["Ge→Morpheme/Prefix:ge-", "büsch→Lexeme/NOUN:Busch"]);
	const [options] = seen;
	expect(options?.c2).toStartWith("ge- + Busch:");
	expect(options?.none).toStartWith("No cut:");
});

test("the best candidate must outweigh no cut: two spellings of a cut are not summed", async () => {
	const judge = senseJudge(
		{ "Ge- (prefix) + büsch": 0.6, [noneOption]: 0.4 },
		{},
	);
	expect(
		await run(
			input("Lexeme", "NOUN", "Gebüsch", "🌳"),
			prefixChoice(() => ({ c0: 0.3, c2: 0.3, none: 0.4 }), judge.ask),
		),
	).toBe("NoConstituents");
});

test("a cut no cut outweighs leaves the options, and the heaviest left is the pick", async () => {
	const judge = senseJudge(
		{ "Ge- (prefix) + birge": 0.6, [noneOption]: 0.4 },
		{},
	);
	expect(
		await run(
			input("Lexeme", "NOUN", "Gebirge", "🏔"),
			prefixChoice(() => ({ c0: 0.2, c1: 0.2, none: 0.6 }), judge.ask),
		),
	).toBe("NoConstituents");
});

test("the sense check weighs the contenders against each other: a pick that gives the sense loses to one that gives it better", async () => {
	const judge = senseJudge(
		{ "Ver- (prefix) + beugung": 0.7, "Verbeug + -ung (suffix)": 0.25 },
		{
			"beugung with the prefix Ver-": 0.3,
			"Verbeug- with the suffix -ung": 0.6,
			none: 0.1,
		},
		"verbeugen",
	);
	expect(
		await run(input("Lexeme", "NOUN", "Verbeugung", "🙇"), judge.ask),
	).toEqual(["Verbeug→Lexeme/VERB:verbeugen", "ung→Morpheme/Suffix:-ung"]);
});

test("the sense check asks which split gives the sense, and none wins when no split gives it", async () => {
	const judge = senseJudge(
		{
			"Ver- (prefix) + beugung": 0.7,
			"Verbeug + -ung (suffix)": 0.25,
			[noneOption]: 0.05,
		},
		{ none: 0.9 },
	);
	expect(
		await run(input("Lexeme", "NOUN", "Verbeugung", "🙇"), judge.ask),
	).toBe("NoConstituents");
	expect(judge.texts().join(" ")).toContain(
		"Think of Verbeugung in the sense 🙇. Which of these splits gives that sense",
	);
});
