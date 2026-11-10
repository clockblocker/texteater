import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import { productionUnitSettings } from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, noul, picked } from "./fake-judge.js";

/**
 * Route answers that show the Family code names: a one-piece group routes
 * Lexeme, and a multi-piece group's route Choice offers a Locution and a
 * Lexeme route alike, so its route takes the Family membership gave it.
 */
const routes = (...groups: string[]): Record<string, Answer> => ({
	...Object.fromEntries(
		Array.from({ length: 8 }, (_, index) => [
			`r_${index + 1}`,
			picked("Lexeme/NOUN"),
		]),
	),
	...Object.fromEntries(
		groups.map((group) => [
			`r_${group}`,
			picked("Locution/VERB", {
				"Locution/VERB": 0.5,
				"Lexeme/NOUN": 0.5,
			}),
		]),
	),
});

/** The units' Segment groups and Families, and the judge, under production's setting. */
async function run(sentence: string, answers: Record<string, Answer>) {
	const judge = fakeJudge({
		...routes("2_3_4_5_6", "2_5_6", "3_4", "2_3_4", "2_4"),
		...answers,
	});
	const units = await Effect.runPromise(
		germanUnits({ segments: segmentsOf(sentence) }, judge.ask),
	);
	return {
		units: units.map((unit) => [
			unit.segments,
			unit.route === "Unresolved" ? "Unresolved" : unit.route.family,
		]),
		judge,
	};
}

// Sie0 _1 nahm2 _3 das4 _5 Risiko6 _7 in8 _9 Kauf10 .11
const kauf = "Sie nahm das Risiko in Kauf.";
/** Both nouns heard as nahm's idiom nouns above the floor: one Locution over the free object too. */
const swallowed = {
	s_article_3: picked("p4"),
	s_idiom_4: picked("p2", { p2: 0.8, none: 0.2 }),
	s_idiom_6: picked("p2", { p2: 0.9, none: 0.1 }),
};
const memberRead = (shares: Record<string, number>) =>
	picked(
		Object.entries(shares).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "fixed",
		shares,
	);

test("every member of an assembled Locution is asked de/fixed-member-test beside the rest; one read free leaves with its article", async () => {
	const { units, judge } = await run(kauf, {
		...swallowed,
		lm_2_3_4_5_6_m_3_4: memberRead({ free: 0.9, fixed: 0.1 }),
	});
	const asked = judge.questionsOf("locution") ?? {};
	expect(Object.keys(asked)).toEqual([
		"lm_2_3_4_5_6_m_2",
		"lm_2_3_4_5_6_m_3_4",
		"lm_2_3_4_5_6_m_5_6",
	]);
	expect(JSON.stringify(asked.lm_2_3_4_5_6_m_3_4)).toContain(
		'one established multiword expression, \\"nahm das Risiko in Kauf\\". What is \\"das Risiko\\" there?',
	);
	expect(units).toEqual([
		[[0], "Lexeme"],
		[[2, 8, 10], "Locution"],
		[[4, 6], "Lexeme"],
	]);
});

test("only a free reading at production's 0.7 moves a member: none, literal or a lower free share keep it", async () => {
	const kept = [
		[[0], "Lexeme"],
		[[2, 4, 6, 8, 10], "Locution"],
	];
	const readings: Record<string, number>[] = [
		{ none: 0.9, free: 0.1 },
		{ literal: 0.9, free: 0.1 },
		{ free: 0.65, fixed: 0.35 },
	];
	for (const shares of readings)
		expect(
			(
				await run(kauf, {
					...swallowed,
					lm_2_3_4_5_6_m_3_4: memberRead(shares),
				})
			).units,
		).toEqual(kept);
	// A judge that cannot tell picks the option listed last, fixed.
	expect((await run(kauf, swallowed)).units).toEqual(kept);
});

test("a Locution left with one member is that member's Lexeme", async () => {
	// Sie0 _1 nahm2 _3 das4 _5 Risiko6 .7: Risiko heard as nahm's idiom noun.
	const { units } = await run("Sie nahm das Risiko.", {
		s_article_3: picked("p4"),
		s_idiom_4: picked("p2", { p2: 0.8, none: 0.2 }),
		lm_2_3_4_m_3_4: memberRead({ free: 0.95, fixed: 0.05 }),
	});
	expect(units).toEqual([
		[[0], "Lexeme"],
		[[2], "Lexeme"],
		[[4, 6], "Lexeme"],
	]);
});

test("no member is asked that the Rules keep apart, and no Saying is checked", async () => {
	// Es0 _1 tut2 _3 mir3 … : mir is no reflexive here, and the pronoun rule
	// decides it, so tut … leid's members are asked and mir is not.
	const { judge } = await run("Es tut mir leid.", {
		f_2: noul(0.9),
		f_4: noul(0.9),
		e_2_4: noul(0.9),
	});
	expect(Object.keys(judge.questionsOf("locution") ?? {})).toEqual([
		"lm_2_4_m_2",
		"lm_2_4_m_4",
	]);
	// Zeit0 _1 ist2 _3 Geld4 .5: a Saying span.
	const saying = await run("Zeit ist Geld.", {
		y4_1_2_3: picked("whole", { whole: 0.9, none: 0.1 }),
	});
	expect(saying.units).toEqual([[[0, 2, 4], "Saying"]]);
	expect(saying.judge.questionsOf("locution")).toBeUndefined();
});

test("an article links to an expression only through its noun (de/fixed-member-test)", async () => {
	// das and Kauf heard as one expression; Risiko has no link of its own.
	const { units } = await run(kauf, {
		s_article_3: picked("p4"),
		s_idiom_6: picked("p2", { p2: 0.9, none: 0.1 }),
		f_3: noul(0.9),
		f_6: noul(0.9),
		e_3_6: noul(0.9),
	});
	expect(units).toEqual([
		[[0], "Lexeme"],
		[[2, 8, 10], "Locution"],
		[[4, 6], "Lexeme"],
	]);
});

test("production checks members at 0.7", () => {
	expect(productionUnitSettings.locution?.members).toBe(0.7);
});
