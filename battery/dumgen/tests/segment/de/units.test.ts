import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import {
	authoredInventory,
	germanInventory,
} from "../../../src/segment/de/inventory.js";
import { partitionOf } from "../../../src/segment/de/partition.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
	type UnitSettings,
} from "../../../src/segment/de/units.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, noul, picked, route } from "./fake-judge.js";

// Er0 _1 zog2 _3 sich4 _5 an6 ,7 _8 zu9 m10 _11 Glück12 .13
const zumGlueck: readonly Segment[] = [
	...segmentsOf("Er zog sich an, "),
	{ kind: "ResolvableText", text: "zu", surface: "zu" },
	{ kind: "ResolvableText", text: "m", surface: "dem" },
	...segmentsOf(" Glück."),
];

test("the judge's pieces are numbered from 1; a fused piece keeps its written word and clause", () => {
	const sentence = sentenceOf({ segments: zumGlueck });
	expect(sentence.pieces.map((piece) => piece.text)).toEqual([
		"Er",
		"zog",
		"sich",
		"an",
		"zu",
		"m",
		"Glück",
	]);
	expect(sentence.pieces[5]).toMatchObject({
		id: 6,
		segment: 10,
		surface: "dem",
		fusedWord: "zum",
		clause: 1,
	});
	expect(partitionOf([1, 2, 3, 4], [[4, 2]])).toEqual([[1], [2, 4], [3]]);
});

test("satellites join their verb and fixed words make a Locution, the split article included", async () => {
	const judge = fakeJudge({
		s_reflexive_3: picked("p2"),
		s_particle_4: picked("p2"),
		f_5: noul(0.9),
		f_6: noul(0.9),
		f_7: noul(0.9),
		e_5_6: noul(0.9),
		e_5_7: noul(0.9),
		e_6_7: noul(0.9),
		r_1: picked("Lexeme/PRON"),
		r_2_3_4: picked("Lexeme/VERB"),
		r_5_6_7: picked("Locution/ADV"),
	});
	const units = await Effect.runPromise(
		segmentGermanUnits({ segments: zumGlueck }, judge.ask),
	);
	expect(units).toEqual([
		{ segments: [0], route: route("Lexeme", "PRON") },
		{ segments: [2, 4, 6], route: route("Lexeme", "VERB") },
		{ segments: [9, 10, 12], route: route("Locution", "ADV") },
	]);
	// route2 has no group of its own here, and every unit was batched.
	expect(judge.stages()).toEqual([
		"candidates",
		"expressions",
		"final",
		"route",
		"closed",
	]);
});

test("a Sentence with nothing to click makes no call", async () => {
	const judge = fakeJudge();
	expect(
		await Effect.runPromise(
			segmentGermanUnits({ segments: segmentsOf("… !") }, judge.ask),
		),
	).toEqual([]);
	expect(judge.requests).toEqual([]);
});

// Wer0 _1 rastet2 ,3 _4 der5 _6 rostet7 .8
const maxim = segmentsOf("Wer rastet, der rostet.");
const reference: UnitSettings = {
	...productionUnitSettings,
	floors: { ...productionUnitSettings.floors, idiom: 0.6, fixed: 0.3 },
	saying: { floor: 0.4, maxim: false },
	rules: [],
};

test("the Saying assembly is a setting: production counts the maxim, the reference's adopted setting does not", async () => {
	const answers = {
		y4_1_2_3_4: picked("maxim", { maxim: 0.75, whole: 0.1, none: 0.15 }),
	};
	expect(
		await Effect.runPromise(
			segmentGermanUnits({ segments: maxim }, fakeJudge(answers).ask),
		),
	).toContainEqual({
		segments: [0, 2, 5, 7],
		route: route("Saying", "Saying"),
	});
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: maxim },
			fakeJudge(answers).ask,
			reference,
		),
	);
	expect(units.map(({ segments }) => segments)).toEqual([[0], [2], [5], [7]]);
});

// Er0 _1 schlief2 _3 tief4 _5 und6 _7 fest8 .9
const tiefUndFest = segmentsOf("Er schlief tief und fest.");
const looselyFixed = {
	f_3: noul(0.4),
	f_5: noul(0.4),
	e_3_5: noul(0.9),
	r_3_5: picked("Locution/ADV"),
};

test("a floor that builds a group no batch asked about asks route-extra, or leaves it Unresolved", async () => {
	const production = fakeJudge(looselyFixed);
	expect(
		(
			await Effect.runPromise(
				segmentGermanUnits({ segments: tiefUndFest }, production.ask),
			)
		).map(({ segments }) => segments),
	).toEqual([[0], [2], [4], [6], [8]]);
	expect(production.stages()).not.toContain("route-extra");

	const asking = fakeJudge(looselyFixed);
	expect(
		await Effect.runPromise(
			segmentGermanUnits(
				{ segments: tiefUndFest },
				asking.ask,
				reference,
			),
		),
	).toContainEqual({ segments: [4, 8], route: route("Locution", "ADV") });
	expect(asking.stages().at(-1)).toBe("route-extra");
	expect(Object.keys(asking.requests.at(-1)?.questions ?? {})).toEqual([
		"r_3_5",
	]);

	const unasked = fakeJudge(looselyFixed);
	expect(
		await Effect.runPromise(
			segmentGermanUnits({ segments: tiefUndFest }, unasked.ask, {
				...reference,
				unasked: "unresolved",
			}),
		),
	).toContainEqual({ segments: [4, 8], route: "Unresolved" });
	expect(unasked.stages()).not.toContain("route-extra");
});

test("a borderline unit carries route variants only under a variant margin", async () => {
	const answers = {
		r_3: picked("Lexeme/ADV", {
			"Lexeme/ADV": 0.5,
			"Lexeme/ADJ": 0.4,
			"Lexeme/NOUN": 0.1,
		}),
	};
	const tief = async (variantMargin?: number) =>
		(
			await Effect.runPromise(
				segmentGermanUnits(
					{ segments: tiefUndFest },
					fakeJudge(answers).ask,
					{
						...productionUnitSettings,
						...(variantMargin === undefined
							? {}
							: { variantMargin }),
					},
				),
			)
		).find(({ segments }) => segments[0] === 4);
	expect(await tief()).toEqual({
		segments: [4],
		route: route("Lexeme", "ADV"),
	});
	expect(await tief(0.05)).not.toHaveProperty("variants");
	expect((await tief(0.2))?.variants).toEqual([
		route("Lexeme", "ADV"),
		route("Lexeme", "ADJ"),
	]);
});

test("route variants span only the tolerated Kind pairs and never sit on a fused half (#827)", async () => {
	const borderlineZu = picked("infinitive", {
		infinitive: 0.5,
		degree: 0.45,
		preposition: 0.05,
	});
	const variantsAt = async (
		segments: readonly Segment[],
		answers: Readonly<Record<string, Answer>>,
		segment: number,
	) =>
		(
			await Effect.runPromise(
				segmentGermanUnits({ segments }, fakeJudge(answers).ask, {
					...productionUnitSettings,
					variantMargin: 0.2,
				}),
			)
		).find(({ segments: [first] }) => first === segment)?.variants;
	// Er0 _1 kam2 _3 zu4 _5 spät6 .7: PART|ADV is a tolerated pair.
	expect(
		await variantsAt(
			segmentsOf("Er kam zu spät."),
			{ cc_3: borderlineZu },
			4,
		),
	).toEqual([route("Lexeme", "PART"), route("Lexeme", "ADV")]);
	// The same zu as the first half of zum carries none.
	expect(
		await variantsAt(zumGlueck, { cc_5: borderlineZu }, 9),
	).toBeUndefined();
	// NOUN|ADP is not a tolerated pair.
	expect(
		await variantsAt(
			zumGlueck,
			{
				r_7: picked("Lexeme/NOUN", {
					"Lexeme/NOUN": 0.5,
					"Lexeme/ADP": 0.45,
				}),
			},
			12,
		),
	).toBeUndefined();
});

test("closed-class identity routes a covered spelling by its use, and a one-use spelling with no question", async () => {
	// Das0 _1 ist2 _3 eben4 _5 nicht6 _7 so8 .9
	const judge = fakeJudge({
		r_3: picked("Lexeme/ADV"),
		r_4: picked("Lexeme/ADV"),
		cc_3: picked("modal"),
	});
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: segmentsOf("Das ist eben nicht so.") },
			judge.ask,
		),
	);
	expect(units).toContainEqual({
		segments: [4],
		route: route("Lexeme", "PART"),
	});
	expect(units).toContainEqual({
		segments: [6],
		route: route("Lexeme", "PART"),
	});
	const closed = judge.requests.find(({ stage }) => stage === "closed");
	expect(Object.keys(closed?.questions ?? {})).toEqual(["cc_3"]);
});

test("the inventory is a setting: pinning the AUX Lemmas drops causative lassen's slot", async () => {
	const pinned = germanInventory({
		auxiliaryLemmas: new Set(["sein", "haben", "werden", "bekommen"]),
	});
	expect(authoredInventory.isAuxiliary("Ließ")).toBe(true);
	expect(pinned.isAuxiliary("ließ")).toBe(false);
	expect(pinned.isAuxiliary("hat")).toBe(true);
	const slots = async (inventory = authoredInventory) => {
		const judge = fakeJudge();
		await Effect.runPromise(
			segmentGermanUnits(
				{ segments: segmentsOf("Er ließ das Auto reparieren.") },
				judge.ask,
				{ ...productionUnitSettings, inventory },
			),
		);
		return Object.keys(judge.requests[0]?.questions ?? {});
	};
	expect(await slots()).toContain("s_auxiliary_2");
	expect(await slots(pinned)).not.toContain("s_auxiliary_2");
});
