import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { inflectedDeterminerOrPronoun } from "../../../src/segment/de/breakdown/forms.js";
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

/** The parts the route questions asked about, as their quoted letters. */
const routedParts = (judge: ReturnType<typeof judgeWanting>) =>
	judge
		.requests()
		.filter(({ stage }) => stage === "breakdown-routes")
		.flatMap(({ questions }) =>
			Object.values(questions).flatMap(({ instructions }) => {
				const part = /the part "([^"]+)"/u.exec(String(instructions));
				return part?.[1] === undefined ? [] : [part[1]];
			}),
		);

test("only a DET and PRON form that no member is cited as and no verb form ends like settles its route", () => {
	for (const word of ["allem", "alles", "dieses", "jenes", "meines"])
		expect(inflectedDeterminerOrPronoun(word)).toBe(true);
	// A Canonical Form (das, mehr), an -en or -e form (jeden; meine, also
	// meinen's), an AUX form (sein) and an open word stay asked.
	for (const word of ["das", "mehr", "jeden", "meine", "sein", "bald"])
		expect(inflectedDeterminerOrPronoun(word)).toBe(false);
});

test("before its noun, an inflected determiner or pronoun is a DET unasked", async () => {
	const judge = judgeWanting("r_1=Lexeme/NOUN", "Erachten");
	expect(
		await run(input("Locution", "ADV", "meines Erachtens", "🤔"), judge),
	).toEqual([
		"meines→Lexeme/DET:mein",
		" ",
		"Erachtens→Lexeme/NOUN:Erachten",
	]);
	expect(routedParts(judge)).toEqual(["Erachtens"]);
});

test("before a word that may be an inflected adjective, it is still asked", async () => {
	const judge = judgeWanting("Lexeme/DET");
	await run(
		input("Saying", "Saying", "aller guten Dinge sind drei", "3️⃣"),
		judge,
	);
	expect(routedParts(judge)).toContain("aller");
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

test("a compound the analysis question picked still takes the word test", async () => {
	const judge = senseJudge(
		{ "Lind + wurm": 0.8 },
		{},
		"r_0=Morpheme/Root",
		"Wurm",
	);
	expect(await run(input("Lexeme", "NOUN", "Lindwurm", "🐉"), judge)).toEqual(
		["Lind→Morpheme/Root:lind", "wurm→Lexeme/NOUN:Wurm"],
	);
	expect(judge.stages()).toContain("breakdown-words");
});
