import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { formCandidates } from "../../../src/segment/de/breakdown/forms.js";
import { germanMorphemes } from "../../../src/segment/de/breakdown/morphemes.js";
import type { WordAnalysis } from "../../../src/segment/de/breakdown/word-analyses.js";
import { noneOption } from "../../../src/segment/de/breakdown/word-prompts.js";
import {
	bestContender,
	contendersOf,
	type Weighed,
} from "../../../src/segment/de/breakdown/word-senses.js";
import { input, judgeWanting, senseJudge, shown } from "./breakdown-support.js";

// The round-4 fixes (#1241), each shown on a word that is no Breakdown Record.

const run = async (reading: BreakdownInput, judge: { readonly ask: Ask }) => {
	const result = await Effect.runPromise(
		germanConstituents(reading, judge.ask),
	);
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

const analysis = (label: string, ...cut: string[]): WordAnalysis => ({
	label,
	pieces: cut.map((letters) =>
		letters.startsWith("-")
			? {
					role: "Suffix" as const,
					letters: letters.slice(1),
					canonicalForm: letters,
				}
			: { role: "Word" as const, letters },
	),
});

describe("the sense check (proposal 1)", () => {
	const derived = analysis("Land + -ung (suffix)", "Land", "-ung");
	const compound = analysis("Lan + dung", "Lan", "dung");
	const options = (land: number, lan: number, none: number): Weighed[] => [
		{ analysis: derived, weight: land },
		{ analysis: compound, weight: lan },
		{ analysis: undefined, weight: none },
	];

	test("a derivation is contested by the compound one letter off it, however light", () => {
		expect(
			contendersOf(options(0.9, 0.02, 0.05))?.map(({ weight }) => weight),
		).toEqual([0.9, 0.02, 0.05]);
	});

	test("a compound with only light rivals is not contested", () => {
		expect(
			contendersOf([
				{ analysis: compound, weight: 0.9 },
				{ analysis: derived, weight: 0.05 },
				{ analysis: undefined, weight: 0.05 },
			]),
		).toBeUndefined();
	});

	test("the sense answer rescues a contender weighed 0.03, and the weight settles a tie", () => {
		const [land, lan] = options(0.9, 0.03, 0.07);
		if (land === undefined || lan === undefined) throw Error("No option");
		expect(
			bestContender([
				{ weighed: land, fit: 0.1 },
				{ weighed: lan, fit: 0.9 },
			]),
		).toBe(lan);
		expect(
			bestContender([
				{ weighed: land, fit: 0.9 },
				{ weighed: lan, fit: 0.9 },
			]),
		).toBe(land);
	});

	test("on a contested word, the contender that gives the sense wins", async () => {
		const judge = senseJudge(
			{ "Land + -ung (suffix)": 0.9, "Lan + dung": 0.03 },
			{ "it is a Dung": 0.9 },
			"r_0=Lexeme/NOUN",
			"Lan",
			"Dung",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Landung", "🧪"), judge),
		).toEqual(["Lan→Lexeme/NOUN:Lan", "dung→Lexeme/NOUN:Dung"]);
		expect(judge.stages()).toContain("breakdown-senses");
	});

	test("a heavy pick that gives the sense stands over a contender weighed 0.03 that gives it better", async () => {
		const judge = senseJudge(
			{ "Land + -ung (suffix)": 0.9, "Lan + dung": 0.03 },
			{ "it is a Dung": 0.9, "made from Land-": 0.6 },
			"Land",
			"landen",
		);
		expect(
			(await run(input("Lexeme", "NOUN", "Landung", "🛬"), judge))[1],
		).toBe("ung→Morpheme/Suffix:-ung");
	});

	test("none wins when no analysis gives the sense, and the question names the article", async () => {
		const judge = senseJudge(
			{
				"Hamm + -er (suffix)": 0.6,
				"Ham + mer": 0.2,
				[noneOption]: 0.15,
			},
			{},
		);
		expect(
			await run(
				{
					reading: {
						...input("Lexeme", "NOUN", "Hammer", "🔨").reading,
						lemma: {
							...input("Lexeme", "NOUN", "Hammer").reading.lemma,
							coreFeatures: { gender: "Masc" },
						},
					},
				} as BreakdownInput,
				judge,
			),
		).toBe("NoConstituents");
		expect(judge.texts().join(" ")).toContain(
			"Think of der Hammer in the sense 🔨.",
		);
	});

	test("an uncontested word asks no sense question", async () => {
		const judge = senseJudge({ "Apfel + saft": 0.97 }, {}, "Apfel", "Saft");
		await run(input("Lexeme", "NOUN", "Apfelsaft", "🧃"), judge);
		expect(judge.stages()).not.toContain("breakdown-senses");
	});
});

describe("a suffix's base is a verb or a noun by its letters (fix 2)", () => {
	test("Fahr is a verb's stem and no noun, so it is VERB unasked", async () => {
		const judge = judgeWanting("Fahr + -er (suffix)", "fahren");
		expect(
			await run(input("Lexeme", "NOUN", "Fahrer", "🚕"), judge),
		).toEqual(["Fahr→Lexeme/VERB:fahren", "er→Morpheme/Suffix:-er"]);
		expect(judge.stages()).toContain("breakdown-words");
		expect(judge.stages()).not.toContain("breakdown-routes");
	});

	test("Musik is a noun and no verb's stem, so it is NOUN unasked", async () => {
		const judge = judgeWanting("Musik + -er (suffix)", "Musik");
		expect(
			await run(input("Lexeme", "NOUN", "Musiker", "🎻"), judge),
		).toEqual(["Musik→Lexeme/NOUN:Musik", "er→Morpheme/Suffix:-er"]);
		expect(judge.stages()).not.toContain("breakdown-routes");
	});
});

describe("a bottom word's Root is no word (fix 2, segment.inMorphemes)", () => {
	const morphemes = async (word: string, ...wanted: string[]) => {
		const judge = judgeWanting(...wanted);
		const pieces = await Effect.runPromise(
			germanMorphemes(input("Lexeme", "NOUN", word, "🍬"), judge.ask),
		);
		return { pieces: shown(pieces), stages: judge.stages() };
	};

	test("zuck is zucken's stem, so -er is not cut off Zucker", async () => {
		const { pieces, stages } = await morphemes("Zucker", "zucken");
		expect(pieces).toEqual([
			"Zucker→Morpheme/Root:zucker",
			"→Morpheme/Ending:∅",
		]);
		expect(stages).toEqual(["breakdown-words"]);
	});

	test("a Root that is no word keeps its split for the split question", async () => {
		const { stages } = await morphemes("Eimer");
		expect(stages).toEqual(["breakdown-words", "breakdown-morphemes"]);
	});
});

describe("irregular verb headwords (fix 3)", () => {
	test("weiß offers wissen and no weeßen; tut offers tun; nimmt nehmen", () => {
		const weiss = formCandidates("weiß", "Lexeme", "VERB");
		expect(weiss).toContain("wissen");
		expect(weiss).not.toContain("weeßen");
		expect(formCandidates("tut", "Lexeme", "VERB")).toContain("tun");
		expect(formCandidates("nimmt", "Lexeme", "VERB")).toContain("nehmen");
		// The vowel rules still undo an i that is no diphthong's.
		expect(formCandidates("gibt", "Lexeme", "VERB")).toContain("geben");
	});
});
