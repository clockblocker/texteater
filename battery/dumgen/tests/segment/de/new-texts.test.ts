/**
 * What reading segment.inUnits on six new texts found (#1336): each test
 * holds one Rule over a construction those texts showed wrong, and fails
 * on the code before #1336.
 */
import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import type { Segment, Unit } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, noul, picked, route } from "./fake-judge.js";

/** A written word split into its pieces: zum is zu and m (dem). */
const fused = (...parts: (readonly [string, string])[]): Segment[] =>
	parts.map(([text, surface]) => ({ kind: "ResolvableText", text, surface }));

const run = (
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>> = {},
) => {
	const judge = fakeJudge(answers);
	return Effect.runPromise(germanUnits({ segments }, judge.ask)).then(
		(units: Unit[]) => ({ units, judge }),
	);
};
const groupsOf = async (
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>> = {},
) => (await run(segments, answers)).units.map((unit) => unit.segments);

test("a fused article joins its noun past the commas of coordinated adjectives and an ordinal's full stop", async () => {
	// Er0 _1 schält2 _3 sie4 _5 i6 m7 _8 rohen9 ,10 _11 kalten12 _13 Zustand14 .15
	const zustand = [
		...segmentsOf("Er schält sie "),
		...fused(["i", "in"], ["m", "dem"]),
		...segmentsOf(" rohen, kalten Zustand."),
	];
	const units = await groupsOf(zustand);
	expect(units).toContainEqual([6]);
	expect(units).toContainEqual([7, 14]);
	// Es0 _1 geschah2 _3 a4 m5 _6 17 .8 _9 Mai10 .11
	const mai = [
		...segmentsOf("Es geschah "),
		...fused(["a", "an"], ["m", "dem"]),
		...segmentsOf(" 1. Mai."),
	];
	expect(await groupsOf(mai)).toContainEqual([5, 10]);
});

test("a fused word's preposition piece standing alone routes ADP, and its spelling's uses are never asked", async () => {
	// Es0 _1 dauert2 _3 länger4 _5 zu6 m7 _8 Kochen9 .10
	const kochen = [
		...segmentsOf("Es dauert länger "),
		...fused(["zu", "zu"], ["m", "dem"]),
		...segmentsOf(" Kochen."),
	];
	const { units, judge } = await run(kochen, {
		s_article_5: picked("p6", { p6: 0.9, none: 0.1 }),
		r_4: picked("Lexeme/PART"),
		// What the judge heard when asked: the infinitive's zu.
		cc_4: picked("infinitive"),
	});
	expect(units).toContainEqual({
		segments: [6],
		route: route("Lexeme", "ADP"),
	});
	expect(judge.questionsOf("closed")?.cc_4).toBeUndefined();
});

test("a preposition's own phrase never governs it, though the slot names its noun", async () => {
	// Sie0 _1 arbeiten2 _3 nach4 _5 dem6 _7 Prinzip8 _9 des10 _11 Tauchsieders12 .13
	const prinzip = segmentsOf(
		"Sie arbeiten nach dem Prinzip des Tauchsieders.",
	);
	const units = await groupsOf(prinzip, {
		s_preposition_3: picked("p5", { p5: 0.61, none: 0.36, p2: 0.03 }),
		s_article_4: picked("p5", { p5: 0.96, none: 0.04 }),
		g_joined_3_5: picked("governed", { governed: 0.9, place: 0.1 }),
	});
	expect(units).toContainEqual([4]);
	expect(units).toContainEqual([6, 8]);
	// Auf0 _1 ihn2 _3 ist4 _5 kein6 _7 Verlass8 .9: a pronoun opens the
	// phrase, so a noun after it may still govern the preposition.
	const verlass = await groupsOf(segmentsOf("Auf ihn ist kein Verlass."), {
		s_preposition_1: picked("p5", { p5: 0.8, none: 0.2 }),
		g_joined_1_5: picked("governed", { governed: 0.9, place: 0.1 }),
	});
	expect(verlass).toContainEqual([0, 8]);
});

test("an article's host share spread over one name's words counts for the name", async () => {
	// Das0 _1 gehört2 _3 der4 _5 Deutschen6 _7 Post8 _9 AG10 .11
	const post = segmentsOf("Das gehört der Deutschen Post AG.");
	const answers = {
		c_4_5: noul(0.9),
		c_5_6: noul(0.9),
		s_article_3: picked("p5", { p4: 0.06, p5: 0.45, p6: 0.34, none: 0.15 }),
	};
	expect(await groupsOf(post, answers)).toContainEqual([4, 6, 8, 10]);
	// Words no name pair joins stay apart: their shares don't add up.
	const { c_4_5: _name, c_5_6: _rest, ...unnamed } = answers;
	expect(await groupsOf(post, unnamed)).toContainEqual([4]);
});
