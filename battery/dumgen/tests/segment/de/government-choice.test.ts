import { expect, test } from "bun:test";
import type { Answer } from "../../../src/segment/ask.js";
import {
	type GovernmentFamily,
	governmentFamilies,
	governmentSettings,
} from "../../../src/segment/de/government-choice.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, picked } from "./fake-judge.js";

const withGovernment = (
	families: readonly GovernmentFamily[] = governmentFamilies,
) => ({
	...productionUnitSettings,
	government: { ...governmentSettings, families },
});

/** The units' Segment groups and the requests, with the Government Choice on. */
async function run(
	sentence: string,
	answers: Record<string, Answer>,
	settings = withGovernment(),
) {
	const judge = fakeJudge(answers);
	const units = await segmentGermanUnits(
		{ segments: segmentsOf(sentence) },
		judge.ask,
		settings,
	);
	return { groups: units.map((unit) => unit.segments), judge };
}

// Sie0 _1 blickt2 _3 auf4 _5 die6 _7 Uhr8 .9
const uhr = "Sie blickt auf die Uhr.";
const uhrHeard = {
	s_preposition_3: picked("p2", { p2: 0.75, none: 0.25 }),
	s_article_4: picked("p5"),
};

test("ADR 0034: a preposition heading a direction leaves the verb its slot joined it to", async () => {
	const { groups, judge } = await run(uhr, {
		...uhrHeard,
		g_joined_3_2: picked("place", { place: 0.8, governed: 0.2 }),
	});
	const asked = judge.requests.find(({ stage }) => stage === "government");
	expect(Object.keys(asked?.questions ?? {})).toEqual(["g_joined_3_2"]);
	expect(groups).toEqual([[0], [2], [4], [6, 8]]);
});

test("de/governed-preposition-joins-its-governor: a governed answer, one under the floor and the last option keep the join", async () => {
	const joined = [[0], [2, 4], [6, 8]];
	for (const answer of [
		picked("governed", { governed: 0.9, place: 0.1 }),
		picked("place", { place: 0.55, governed: 0.45 }),
		picked("particle"),
	])
		expect(
			(await run(uhr, { ...uhrHeard, g_joined_3_2: answer })).groups,
		).toEqual(joined);
});

// Sie0 _1 sehnen2 _3 sich4 _5 nach6 _7 Jahren8 _9 nach10 _11 Ruhe12 .13
test("a free preposition gives its host to the rival the host governs", async () => {
	const { groups } = await run("Sie sehnen sich nach Jahren nach Ruhe.", {
		s_reflexive_3: picked("p2"),
		s_preposition_4: picked("p2", { p2: 0.98, none: 0.02 }),
		s_preposition_6: picked("p2", { p2: 0.77, none: 0.23 }),
		g_joined_4_2: picked("adjunct", { adjunct: 0.9, governed: 0.1 }),
		g_rival_6_2: picked("governed", { governed: 0.85, adjunct: 0.15 }),
	});
	expect(groups).toEqual([[0], [2, 4, 10], [6], [8], [12]]);
});

// Er0 _1 nimmt2 _3 das4 _5 Kind6 _7 auf8 _9 den10 _11 Arm12 .13
const arm = "Er nimmt das Kind auf den Arm.";
const armHeard = {
	s_article_3: picked("p4"),
	s_article_6: picked("p7"),
	s_idiom_7: picked("p2", { p2: 0.8, none: 0.2 }),
};

test("de/idiom: the same words used literally are separate units; the family is a setting", async () => {
	const literal = {
		...armHeard,
		g_literal_5_2: picked("literal", { literal: 0.9, idiom: 0.1 }),
	};
	const off = await run(arm, literal, withGovernment(["joined"]));
	expect(off.groups).toEqual([[0], [2, 8, 10, 12], [4, 6]]);
	const { groups } = await run(arm, literal);
	expect(groups).toEqual([[0], [2], [4, 6], [8], [10, 12]]);
});

test("production asks no government request; a Sentence with no flag asks none", async () => {
	const production = fakeJudge(uhrHeard);
	await segmentGermanUnits({ segments: segmentsOf(uhr) }, production.ask);
	expect(production.stages()).not.toContain("government");
	const { judge } = await run("Sie wohnt hier.", {});
	expect(judge.stages()).not.toContain("government");
});
