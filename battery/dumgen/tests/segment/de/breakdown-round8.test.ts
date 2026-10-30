import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../src/segment/ask.js";
import type { BreakdownInput } from "../../../src/segment/breakdown-pieces.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { input, senseJudge, shown } from "./breakdown-support.js";

// The round-8 fixes (#1241), each shown on a word that is no Breakdown
// Record.

const run = async (reading: BreakdownInput, ask: Ask) => {
	const result = await Effect.runPromise(germanConstituents(reading, ask));
	return result.kind === "Constituents" ? shown(result.pieces) : result.kind;
};

/** The labels the analysis question offered, in every request a judge saw. */
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

test("outside a verb, a particle that is also a preposition links to its ADP, not to the verb Prefix", async () => {
	const noun = senseJudge({ "Um- (prefix) + weg": 0.9 }, {}, "Weg");
	expect(await run(input("Lexeme", "NOUN", "Umweg", "🔀"), noun.ask)).toEqual(
		["Um→Lexeme/ADP:um", "weg→Lexeme/NOUN:Weg"],
	);
	const verb = senseJudge({ "um- (prefix) + fahren": 0.9 }, {}, "fahren");
	expect(
		await run(input("Lexeme", "VERB", "umfahren", "🚗"), verb.ask),
	).toEqual(["um→Morpheme/Prefix:um-", "fahren→Lexeme/VERB:fahren"]);
});

test("a particle that is no preposition keeps its Prefix outside a verb", async () => {
	const judge = senseJudge({ "Hin- (prefix) + weg": 0.9 }, {}, "Weg");
	expect(
		await run(input("Lexeme", "NOUN", "Hinweg", "➡"), judge.ask),
	).toEqual(["Hin→Morpheme/Prefix:hin-", "weg→Lexeme/NOUN:Weg"]);
});

test("when the base verb test passes, prefix + noun + citation ending is no longer offered", async () => {
	const judge = senseJudge(
		{
			"ver- (prefix) + salz + -en (citation ending)": 0.6,
			"ver- (prefix) + salzen": 0.4,
		},
		{},
		"salzen",
	);
	expect(
		await run(input("Lexeme", "VERB", "versalzen", "🧂"), judge.ask),
	).toEqual(["ver→Morpheme/Prefix:ver-", "salzen→Lexeme/VERB:salzen"]);
	const offered = offeredAnalyses(judge);
	expect(offered).toContain("ver- (prefix) + salzen");
	expect(offered).not.toContain(
		"ver- (prefix) + salz + -en (citation ending)",
	);
});

test("an -ig base that is no adjective but both a verb's stem and a noun is asked between VERB and NOUN alone", async () => {
	const judge = senseJudge(
		{ "durst + -ig (suffix)": 0.9 },
		{ "durst- with the suffix -ig": 0.9 },
		"dursten",
		"Durst",
		"r_0=Lexeme/NOUN",
	);
	expect(
		await run(input("Lexeme", "ADJ", "durstig", "🥤"), judge.ask),
	).toEqual(["durst→Lexeme/NOUN:Durst", "ig→Morpheme/Suffix:-ig"]);
	const routes = judge
		.requests()
		.filter(({ stage }) => stage === "breakdown-routes")
		.flatMap(({ questions }) => {
			const question = questions.r_0 as Question | undefined;
			return question?.type === "choice"
				? Object.keys(question.criteria)
				: [];
		});
	expect(routes.toSorted()).toEqual(["Lexeme/NOUN", "Lexeme/VERB"]);
});
