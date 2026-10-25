import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { input, judgeWanting, senseJudge, shown } from "./breakdown-support.js";

// The round-5 fixes (#1241), each shown on a wording that is no Breakdown Record.

const run = async (reading: BreakdownInput, judge: { readonly ask: Ask }) => {
	const result = await Effect.runPromise(
		germanConstituents(reading, judge.ask),
	);
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

test("a phraseme part that is only an inflected determiner or pronoun is a PRON unasked at the wording's end", async () => {
	const judge = judgeWanting("r_0=Lexeme/ADP");
	expect(await run(input("Locution", "ADV", "trotz allem"), judge)).toEqual([
		"trotz→Lexeme/ADP:trotz",
		" ",
		"allem→Lexeme/PRON:alle",
	]);
	const routeQuestions = judge
		.requests()
		.filter(({ stage }) => stage === "breakdown-routes")
		.flatMap(({ questions }) =>
			Object.values(questions).map(({ instructions }) =>
				String(instructions),
			),
		);
	expect(routeQuestions.some((text) => text.includes('"allem"'))).toBe(false);
});

test("a compound the sense check chose over the pick is no cranberry piece", async () => {
	// jev weighs Lan no word, but the sense check named Lan + dung as two words.
	const judge = senseJudge(
		{ "Land + -ung (suffix)": 0.9, "Lan + dung": 0.03 },
		{ "Is it a Dung": 0.9 },
		"r_0=Lexeme/NOUN",
		"Dung",
	);
	const [first, head] = await run(
		input("Lexeme", "NOUN", "Landung", "🧪"),
		judge,
	);
	expect(first).toStartWith("Lan→Lexeme/NOUN:");
	expect(head).toBe("dung→Lexeme/NOUN:Dung");
	// No cranberry gate is asked, so no route question offers a Root.
	expect(judge.stages()).not.toContain("breakdown-words");
});
