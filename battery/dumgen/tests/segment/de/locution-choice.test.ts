import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import {
	locutionSettings,
	wordingOf,
} from "../../../src/segment/de/locution-choice.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, noul, picked } from "./fake-judge.js";

const withLocution = { ...productionUnitSettings, locution: locutionSettings };

/** The units' Segment groups and the requests' stages, with the Locution Choice on. */
async function run(sentence: string, answers: Record<string, Answer>) {
	const judge = fakeJudge(answers);
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: segmentsOf(sentence) },
			judge.ask,
			withLocution,
		),
	);
	return {
		groups: units.map((unit) => unit.segments),
		units,
		judge,
	};
}

// Sie0 _1 nahm2 _3 das4 _5 Risiko6 _7 in8 _9 Kauf10 .11
const kauf = "Sie nahm das Risiko in Kauf.";
const idiomUnderFloor = {
	s_article_3: picked("p4"),
	s_idiom_6: picked("p2", { p2: 0.4, none: 0.6 }),
};

const fixedSide = picked("fixed", { fixed: 0.8, free: 0.2 });

test("an idiom host share under the floor asks the Locution Choice; both units fixed merge, with the opening preposition", async () => {
	const { groups, units, judge } = await run(kauf, {
		...idiomUnderFloor,
		lc_2_x_6_l: fixedSide,
		lc_2_x_6_r: fixedSide,
		r_2_5_6: picked("Locution/VERB", {
			"Locution/VERB": 0.6,
			"Lexeme/VERB": 0.4,
		}),
	});
	const locution = judge.requests.find(({ stage }) => stage === "locution");
	expect(Object.keys(locution?.questions ?? {})).toEqual([
		"lc_2_x_6_l",
		"lc_2_x_6_r",
	]);
	// The judge sees the unit the merge would make, the opening in included.
	expect(JSON.stringify(locution?.questions)).toContain(
		'one established multiword expression, \\"nahm … in Kauf\\"',
	);
	expect(groups).toEqual([[0], [2, 8, 10], [4, 6]]);
	expect(units.find((unit) => unit.segments.length === 3)?.route).toEqual(
		expect.objectContaining({ family: "Locution", kind: "VERB" }),
	);
	// The new group's route is asked after the batches.
	expect(judge.stages().at(-1)).toBe("route-extra");
});

test("a merge needs both units fixed at the floor; a free unit keeps them apart", async () => {
	const { groups } = await run(kauf, {
		...idiomUnderFloor,
		lc_2_x_6_l: fixedSide,
		lc_2_x_6_r: picked("free", { fixed: 0.4, free: 0.6 }),
	});
	expect(groups).toEqual([[0], [2], [4, 6], [8], [10]]);
});

test("without the setting, or with no candidate, no locution request is sent", async () => {
	const off = fakeJudge(idiomUnderFloor);
	const { locution: _, ...without } = productionUnitSettings;
	await Effect.runPromise(
		segmentGermanUnits({ segments: segmentsOf(kauf) }, off.ask, without),
	);
	expect(off.stages()).not.toContain("locution");
	const { judge } = await run(kauf, {});
	expect(judge.stages()).not.toContain("locution");
});

test("no merge reaches a unit of one word the Rules keep apart: a pronoun, nicht or a modal", async () => {
	// Es0 _1 tut2 _3 uns4 _5 leid6 .7: Es and tut … leid heard as one expression.
	const { judge } = await run("Es tut uns leid.", {
		f_1: noul(0.6),
		f_2: noul(0.9),
		f_4: noul(0.9),
		e_1_2: noul(0.65),
		e_2_4: noul(0.95),
	});
	expect(judge.stages()).not.toContain("locution");
	// Er0 _1 kann2 _3 nicht4 _5 schwimmen6 .7
	const modal = await run("Er kann nicht schwimmen.", {
		f_2: noul(0.6),
		f_3: noul(0.6),
		f_4: noul(0.6),
		e_2_4: noul(0.6),
		e_3_4: noul(0.6),
	});
	expect(modal.judge.stages()).not.toContain("locution");
});

test("the wording shows the pieces as written, with … for a gap", () => {
	const sentence = sentenceOf({
		segments: segmentsOf("Er hat, wie man sagt, Schwein gehabt."),
	});
	expect(wordingOf({ sentence }, [2, 6, 7])).toBe("hat … Schwein gehabt");
	expect(wordingOf({ sentence }, [1, 2])).toBe("Er hat");
});

// Zu0 m1 _2 Beispiel3 _4 fängt5 _6 die7 _8 Schule9 _10 morgen11 _12 an13 .14
const zumBeispiel = [
	{ kind: "ResolvableText", text: "Zu", surface: "zu" },
	{ kind: "ResolvableText", text: "m", surface: "dem" },
	...segmentsOf(" Beispiel fängt die Schule morgen an."),
] as const;

/**
 * tf-demo's live smoke (#851): nomination hears zum Beispiel, but under the
 * floors (fixedness Zu 0.63 to 0.68, m 0.37 to 0.43, Beispiel 0.81;
 * expression Zu~Beispiel 0.49 to 0.63, m~Beispiel 0.65 to 0.70).
 */
const zumBeispielHeard: Record<string, Answer> = {
	f_1: noul(0.65),
	f_2: noul(0.4),
	f_3: noul(0.81),
	e_1_2: noul(0.62),
	e_1_3: noul(0.55),
	e_2_3: noul(0.68),
	s_particle_8: picked("p4"),
	s_article_5: picked("p6"),
};

test("Zum Beispiel, capitalized and fused: under the floors production splits it three ways; an accepted link keeps the fused halves together", async () => {
	const segments = [...zumBeispiel];
	const sentence = sentenceOf({ segments });
	expect(sentence.pieces.slice(0, 2).map((piece) => piece.fusedWord)).toEqual(
		["Zum", "Zum"],
	);
	const production = await Effect.runPromise(
		segmentGermanUnits({ segments }, fakeJudge(zumBeispielHeard).ask),
	);
	expect(production.map((unit) => unit.segments)).toEqual([
		[0],
		[1],
		[3],
		[5, 13],
		[7, 9],
		[11],
	]);
	// One expression link over the floors, and the fused halves follow it.
	const linked = await Effect.runPromise(
		segmentGermanUnits(
			{ segments },
			fakeJudge({
				...zumBeispielHeard,
				f_2: noul(0.6),
				e_2_3: noul(0.75),
			}).ask,
		),
	);
	expect(linked.map((unit) => unit.segments)).toContainEqual([0, 1, 3]);
});

test("Zum Beispiel: the Locution Choice asks about the heard links and, both units fixed, makes [Zu, m, Beispiel] one Locution", async () => {
	const judge = fakeJudge({
		...zumBeispielHeard,
		lc_1_x_3_l: fixedSide,
		lc_1_x_3_r: fixedSide,
		lc_2_x_3_l: fixedSide,
		lc_2_x_3_r: fixedSide,
		r_1_2_3: picked("Locution/ADV"),
	});
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: [...zumBeispiel] },
			judge.ask,
			withLocution,
		),
	);
	const locution = judge.requests.find(({ stage }) => stage === "locution");
	expect(JSON.stringify(locution?.questions)).toContain(
		'expression, \\"Zum Beispiel\\"',
	);
	expect(units[0]).toEqual({
		segments: [0, 1, 3],
		route: expect.objectContaining({ family: "Locution", kind: "ADV" }),
	});
});

test("a fused word split between units is a candidate when the other unit holds a possibly fixed word: Im Allgemeinen", async () => {
	// I0 m1 _2 Allgemeinen3 _4 ist5 _6 er7 _8 pünktlich9 .10
	const segments = [
		{ kind: "ResolvableText", text: "I", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		...segmentsOf(" Allgemeinen ist er pünktlich."),
	] as const;
	const judge = fakeJudge({
		f_3: noul(0.7),
		s_article_2: picked("p3", { p3: 0.6, none: 0.4 }),
		lc_1_x_2_3_l: fixedSide,
		lc_1_x_2_3_r: fixedSide,
	});
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: [...segments] },
			judge.ask,
			withLocution,
		),
	);
	expect(units.map((unit) => unit.segments)).toEqual([
		[0, 1, 3],
		[5],
		[7],
		[9],
	]);
	// Without a possibly fixed word beside it, the fused piece asks nothing.
	const plain = fakeJudge({ s_article_2: picked("p3") });
	await Effect.runPromise(
		segmentGermanUnits(
			{ segments: [...segments] },
			plain.ask,
			withLocution,
		),
	);
	expect(plain.stages()).not.toContain("locution");
});

test("production asks the Locution Choice and merges at 0.6 (#851, X5)", async () => {
	expect(productionUnitSettings.locution).toEqual({
		floor: 0.6,
		absorb: true,
	});
	const at = (share: number) =>
		run(kauf, {
			...idiomUnderFloor,
			lc_2_x_6_l: fixedSide,
			lc_2_x_6_r: picked("fixed", { fixed: share, free: 1 - share }),
		}).then(({ groups }) => groups);
	const judge = fakeJudge({
		...idiomUnderFloor,
		lc_2_x_6_l: fixedSide,
		lc_2_x_6_r: picked("fixed", { fixed: 0.55, free: 0.45 }),
	});
	const units = await Effect.runPromise(
		segmentGermanUnits({ segments: segmentsOf(kauf) }, judge.ask),
	);
	expect(judge.stages()).toContain("locution");
	expect(units.map((unit) => unit.segments)).toEqual(await at(0.4));
	expect(await at(0.55)).toContainEqual([2, 8, 10]);
});
