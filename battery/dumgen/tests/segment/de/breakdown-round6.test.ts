import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { restoredNouns } from "../../../src/segment/de/breakdown/forms.js";
import { germanMorphemes } from "../../../src/segment/de/breakdown/morphemes.js";
import { noneOption } from "../../../src/segment/de/breakdown/word-prompts.js";
import { input, judgeWanting, senseJudge, shown } from "./breakdown-support.js";
import { asked, picked } from "./fake-judge.js";

// The round-6 fixes (#1241), each shown on a word or wording that is no
// Breakdown Record.

const run = async (reading: BreakdownInput, ask: Ask) => {
	const result = await Effect.runPromise(germanConstituents(reading, ask));
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

/** `ask` with the affix test's cut weighed `weight`, no cut the rest. */
const prefixTest =
	(weight: number, ask: Ask): Ask =>
	(request) =>
		"p_0" in request.questions
			? asked(() => ({
					p_0: picked(weight >= 0.5 ? "c0" : "none", {
						c0: weight,
						none: 1 - weight,
					}),
				}))(request)
			: ask(request);

/** Every question text a judge's requests held. */
const texts = (judge: ReturnType<typeof judgeWanting>) =>
	judge
		.requests()
		.flatMap(({ questions }) =>
			Object.values(questions).map(({ instructions }) =>
				String(instructions),
			),
		);

test("a ge- cut the affix test doesn't confirm leaves the options, and the heaviest left is the pick", async () => {
	const judge = senseJudge(
		{ "Ge- (prefix) + duld": 0.7, [noneOption]: 0.3 },
		{},
	);
	expect(
		await run(
			input("Lexeme", "NOUN", "Geduld", "🧘"),
			prefixTest(0.2, judge.ask),
		),
	).toBe("NoConstituents");
});

test("a ge- cut the affix test confirms stays", async () => {
	const judge = senseJudge({ "Ge- (prefix) + büsch": 0.9 }, {}, "Busch");
	expect(
		await run(
			input("Lexeme", "NOUN", "Gebüsch", "🌳"),
			prefixTest(0.9, judge.ask),
		),
	).toEqual(["Ge→Morpheme/Prefix:ge-", "büsch→Lexeme/NOUN:Busch"]);
});

test("the affix test is asked only when a ge- cut is in play", async () => {
	const judge = senseJudge({ [noneOption]: 0.9 }, {});
	expect(await run(input("Lexeme", "NOUN", "Gerste", "🌾"), judge.ask)).toBe(
		"NoConstituents",
	);
	expect(judge.texts().some((text) => text.includes("prefix ge-"))).toBe(
		false,
	);
});

test("restoredNouns undoes the umlaut and restores the -e", () => {
	expect(restoredNouns("gnäd")).toEqual(["Gnäd", "Gnäde", "Gnad", "Gnade"]);
	expect(restoredNouns("sonn")).toEqual(["Sonn", "Sonne"]);
});

test("before -ig, the base is the noun its letters stand for once the umlaut is undone, unasked", async () => {
	const sensed = senseJudge(
		{ "bärt + -ig (suffix)": 0.9 },
		{ "bärt- with the suffix -ig": 0.9 },
		"Bart",
	);
	expect(
		await run(input("Lexeme", "ADJ", "bärtig", "🧔"), sensed.ask),
	).toEqual(["bärt→Lexeme/NOUN:Bart", "ig→Morpheme/Suffix:-ig"]);
	expect(sensed.stages()).not.toContain("breakdown-routes");
	expect(sensed.stages()).not.toContain("breakdown-forms");
});

test("before -lich, a base that is also an adjective keeps its route question", async () => {
	const sensed = senseJudge(
		{ "rund + -lich (suffix)": 0.9 },
		{ "rund- with the suffix -lich": 0.9 },
		"Runde",
		"rund",
		"r_0=Lexeme/ADJ",
	);
	expect(
		await run(input("Lexeme", "ADJ", "rundlich", "🟠"), sensed.ask),
	).toEqual(["rund→Lexeme/ADJ:rund", "lich→Morpheme/Suffix:-lich"]);
	expect(sensed.stages()).toContain("breakdown-routes");
});

test("before another suffix, the base's noun test keeps its letters as they stand", async () => {
	const sensed = senseJudge(
		{ "Bäck + -er (suffix)": 0.9 },
		{ "Bäck- with the suffix -er": 0.9 },
		"backen",
	);
	await run(input("Lexeme", "NOUN", "Bäcker", "🥖"), sensed.ask);
	const words = sensed.texts().filter((text) => text.includes("a noun"));
	expect(words.some((text) => text.includes('"Bäck"'))).toBe(true);
	expect(words.some((text) => text.includes('"Back"'))).toBe(false);
});

test("a zu right before a noun inside a phraseme is the ADP, unasked", async () => {
	const judge = judgeWanting(
		"r_1=Lexeme/NOUN",
		"r_2=Lexeme/VERB",
		"Fuß",
		"gehen",
	);
	expect(
		await run(input("Locution", "VERB", "zu Fuß gehen", "🚶"), judge.ask),
	).toEqual([
		"zu→Lexeme/ADP:zu",
		" ",
		"Fuß→Lexeme/NOUN:Fuß",
		" ",
		"gehen→Lexeme/VERB:gehen",
	]);
	expect(texts(judge).some((text) => text.includes('the part "zu"'))).toBe(
		false,
	);
});

test("so is a zu fused with its noun's article", async () => {
	const judge = judgeWanting("Glück");
	const [zu] = await run(
		input("Locution", "ADV", "zum Glück", "🍀"),
		judge.ask,
	);
	expect(zu).toBe("zu→Lexeme/ADP:zu");
});

test("a zu before a word that is no noun is still asked", async () => {
	const judge = judgeWanting("Lexeme/ADV");
	await run(input("Locution", "ADV", "zu sehr", "📈"), judge.ask);
	expect(texts(judge).some((text) => text.includes('the part "zu"'))).toBe(
		true,
	);
});

test("a bottom word's ge- split the affix test doesn't confirm stays inside the Root", async () => {
	const judge = judgeWanting();
	const pieces = await Effect.runPromise(
		germanMorphemes(
			input("Lexeme", "NOUN", "Gebühr", "💶"),
			prefixTest(0.2, judge.ask),
		),
	);
	expect(shown(pieces)).toEqual([
		"Gebühr→Morpheme/Root:gebühr",
		"→Morpheme/Ending:∅",
	]);
	expect(judge.stages()).not.toContain("breakdown-morphemes");
});
