import { describe, expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { Answers, Ask, AskRequest } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { formCandidates } from "../../../src/segment/de/breakdown/forms.js";
import { germanMorphemes } from "../../../src/segment/de/breakdown/morphemes.js";
import type { WordAnalysis } from "../../../src/segment/de/breakdown/word-analyses.js";
import {
	bestContender,
	contendersOf,
	type Weighed,
} from "../../../src/segment/de/breakdown/word-senses.js";
import { input, judgeWanting, shown } from "./breakdown-support.js";
import { asked, noul, picked } from "./fake-judge.js";

// The round-4 fixes (#1241), each shown on a word that is no Breakdown Record.

/**
 * A judge that weighs the analysis question by `weights` (labels to
 * weights, the rest 0), answers each sense question by the label it quotes
 * (`fits`, else 0.1), and otherwise answers as `judgeWanting(...wanted)`.
 */
function senseJudge(
	weights: Readonly<Record<string, number>>,
	fits: Readonly<Record<string, number>>,
	...wanted: string[]
) {
	const fallback = judgeWanting(...wanted);
	const requests: AskRequest[] = [];
	const ask = asked(async (request) => {
		requests.push(request);
		if (request.stage === "breakdown-analysis") {
			const question = request.questions.analysis as Question;
			const criteria =
				question.type === "choice" ? question.criteria : {};
			const probabilities = Object.fromEntries(
				Object.entries(criteria).map(([key, label]) => [
					key,
					weights[String(label)] ?? 0,
				]),
			);
			const [best = "none"] = Object.entries(probabilities)
				.sort(([, left], [, right]) => right - left)
				.map(([key]) => key);
			return { analysis: picked(best, probabilities) } satisfies Answers;
		}
		if (request.stage === "breakdown-senses")
			return Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => {
					const text = String(question.instructions);
					const fit = Object.entries(fits).find(([label]) =>
						text.includes(` ${label}?`),
					)?.[1];
					return [id, noul(fit ?? 0.1)];
				}),
			) satisfies Answers;
		return Effect.runPromise(fallback.ask(request));
	});
	return { ask, stages: () => requests.map(({ stage }) => stage) };
}

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
			{ "Lan + dung": 0.9 },
			"r_0=Lexeme/NOUN",
			"Lan",
			"Dung",
		);
		expect(
			await run(input("Lexeme", "NOUN", "Landung", "🧪"), judge),
		).toEqual(["Lan→Lexeme/NOUN:Lan", "dung→Lexeme/NOUN:Dung"]);
		expect(judge.stages()).toContain("breakdown-senses");
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
