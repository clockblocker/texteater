import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import {
	type GovernmentFamily,
	governmentFamilies,
	governmentSettings,
} from "../../../src/segment/de/government-choice.js";
import { productionUnitSettings } from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, picked } from "./fake-judge.js";

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
	const units = await Effect.runPromise(
		germanUnits({ segments: segmentsOf(sentence) }, judge.ask, settings),
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
	const asked = judge.questionsOf("government");
	expect(Object.keys(asked ?? {})).toEqual(["g_joined_3_2"]);
	expect(groups).toEqual([[0], [2], [4], [6, 8]]);
});

test("de/governed-preposition-joins-its-governor: a governed answer, one under the floor and the last option keep the join", async () => {
	const joined = [[0], [2, 4], [6, 8]];
	for (const answer of [
		picked("governed", { governed: 0.9, place: 0.1 }),
		picked("place", { place: 0.45, governed: 0.4, particle: 0.15 }),
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

test("ADR 0034: of one preposition twice, the duel's answer picks the complement over both flags' own answers", async () => {
	const { groups, judge } = await run(
		"Sie sehnen sich nach Jahren nach Ruhe.",
		{
			s_reflexive_3: picked("p2"),
			s_preposition_4: picked("p2", { p2: 0.98, none: 0.02 }),
			s_preposition_6: picked("p2", { p2: 0.77, none: 0.23 }),
			g_joined_4_2: picked("governed", { governed: 0.95, adjunct: 0.05 }),
			g_rival_6_2: picked("governed", { governed: 0.9, adjunct: 0.1 }),
			g_duel_2_4_6: picked("p6", { p6: 0.8, p4: 0.15, none: 0.05 }),
		},
	);
	const asked = judge.questionsOf("government");
	expect(Object.keys(asked ?? {})).toContain("g_duel_2_4_6");
	expect(groups).toEqual([[0], [2, 4, 10], [6], [8], [12]]);
});

test("the duel picks which preposition a host may take, but a winner its own Choice reads as place stays apart (#1335)", async () => {
	// Sie0 _1 blickt2 _3 auf4 _5 die6 _7 Uhr8 _9 und10 _11 steht12 _13 danach14 _15 auf16 .17
	const heard = {
		s_preposition_3: picked("p2", { p2: 0.82, none: 0.18 }),
		s_preposition_9: picked("p2", { p2: 0.6, none: 0.4 }),
		s_particle_9: picked("p7", { p7: 0.95, none: 0.05 }),
		s_article_4: picked("p5"),
		g_duel_2_3_9: picked("p3", { p3: 0.59, p9: 0, none: 0.41 }),
	};
	const sentence = "Sie blickt auf die Uhr und steht danach auf.";
	const place = await run(sentence, {
		...heard,
		g_joined_3_2: picked("place", { governed: 0.27, place: 0.73 }),
	});
	expect(place.groups).toEqual([[0], [2], [4], [6, 8], [10], [12, 16], [14]]);
	const governed = await run(sentence, {
		...heard,
		g_joined_3_2: picked("governed", { governed: 0.77, place: 0.23 }),
	});
	expect(governed.groups).toEqual([
		[0],
		[2, 4],
		[6, 8],
		[10],
		[12, 16],
		[14],
	]);
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

test("de/idiom: used literally, the idiom's preposition leaves the verb its slot joined it to", async () => {
	const { groups } = await run(arm, {
		...armHeard,
		s_preposition_5: picked("p2", { p2: 0.7, none: 0.3 }),
		g_joined_5_2: picked("fixed", { fixed: 0.6, governed: 0.4 }),
		g_literal_5_2: picked("literal", { literal: 0.9, idiom: 0.1 }),
	});
	expect(groups).toEqual([[0], [2], [4, 6], [8], [10, 12]]);
});

test("production asks the government request without its weak family; a Sentence with no flag asks none", async () => {
	expect(productionUnitSettings.government?.families).not.toContain("weak");
	const production = fakeJudge(uhrHeard);
	await Effect.runPromise(
		germanUnits({ segments: segmentsOf(uhr) }, production.ask),
	);
	expect(production.questionsOf("government")).toBeDefined();
	const { judge } = await run("Sie wohnt hier.", {});
	expect(judge.questionsOf("government")).toBeUndefined();
	const off = fakeJudge(uhrHeard);
	const { government: _, ...without } = productionUnitSettings;
	await Effect.runPromise(
		germanUnits({ segments: segmentsOf(uhr) }, off.ask, without),
	);
	expect(off.questionsOf("government")).toBeUndefined();
});
