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

test("the auxiliary slot offers the word that closes the bracket past its window", async () => {
	// Gelegentlich1 werden2 … hinzugefügt18: a list's commas stand inside the bracket.
	const list = segmentsOf(
		"Gelegentlich werden kleine Speckbrocken, Gurken oder Scheiben und andere Zutaten wie Petersilie, Schnittlauch und auch etwas Feldsalat hinzugefügt.",
	);
	const { units, judge } = await run(list, {
		s_auxiliary_2: picked("p18", { p18: 0.9, none: 0.1 }),
	});
	const question = judge.questionsOf("candidates")?.s_auxiliary_2;
	expect(question?.type === "choice" && question.criteria.p18).toBe(
		"hinzugefügt",
	);
	const werden = list.findIndex((segment) => segment.text === "werden");
	const hinzugefuegt = list.findIndex(
		(segment) => segment.text === "hinzugefügt",
	);
	expect(units.map((unit) => unit.segments)).toContainEqual([
		werden,
		hinzugefuegt,
	]);
});

test("haben with its subject's reflexive in the clause is a perfect, whatever the state answer says", async () => {
	// Er0 _1 hat2 _3 sich4 _5 mit6 _7 der8 _9 Lage10 _11 abgefunden12 .13
	const host = { p7: 0.8, none: 0.2 };
	const answers = {
		s_auxiliary_2: picked("p7", host),
		s_reflexive_3: picked("p7", host),
		v_state_2_7: picked("state", { state: 0.64, perfect: 0.36 }),
	};
	const sich = segmentsOf("Er hat sich mit der Lage abgefunden.");
	expect(await groupsOf(sich, answers)).toContainEqual([2, 4, 12]);
	// Without the reflexive, the state answer splits haben off.
	// Er0 _1 hat2 _3 die4 _5 Tür6 _7 geschlossen8 .9
	const tuer = await groupsOf(segmentsOf("Er hat die Tür geschlossen."), {
		s_auxiliary_2: picked("p5", { p5: 0.8, none: 0.2 }),
		v_state_2_5: picked("state", { state: 0.64, perfect: 0.36 }),
	});
	expect(tuer).toContainEqual([2]);
});

test("a je … desto span counts no maxim share, so it stays its correlator and words", async () => {
	// Je0 _1 länger2 _3 der4 _5 Tag6 ,7 _8 desto9 _10 müder11 _12 die13 _14 Leute15 .16
	const je = segmentsOf("Je länger der Tag, desto müder die Leute.");
	const saying = (maxim: number) => ({
		c_1_5: noul(0.9),
		y4_1_2_3_4_5_6_7_8: picked("whole", {
			whole: 0.37,
			maxim,
			none: 0.63 - maxim,
		}),
	});
	const units = await groupsOf(je, saying(0.34));
	expect(units).toContainEqual([0, 9]);
	expect(units).not.toContainEqual([0, 2, 4, 6, 9, 11, 13, 15]);
});
