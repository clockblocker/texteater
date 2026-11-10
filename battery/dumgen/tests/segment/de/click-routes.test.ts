/**
 * The routes that sent clicks on new texts wrong (#1340, from #1337's
 * clicks): each test holds one rule at the place a route is decided, and
 * fails on the code before #1340.
 */
import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { Answer } from "../../../src/segment/ask.js";
import type { Segment, Unit } from "../../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, picked, route } from "./fake-judge.js";

const run = (
	segments: readonly Segment[],
	answers: Readonly<Record<string, Answer>> = {},
) => {
	const judge = fakeJudge(answers);
	return Effect.runPromise(germanUnits({ segments }, judge.ask)).then(
		(units: Unit[]) => ({ units, judge }),
	);
};
const unitAt = (units: readonly Unit[], segment: number) =>
	units.find((unit) => unit.segments.includes(segment));

test("a negation adverb is ADV, never the PART the route Choice hears", async () => {
	// Fang0 _1 nie2 _3 damit4 _5 an6 !7
	for (const word of ["nie", "niemals", "keineswegs"]) {
		const { units } = await run(segmentsOf(`Fang ${word} damit an!`), {
			r_2: picked("Lexeme/PART", {
				"Lexeme/PART": 0.56,
				"Lexeme/ADV": 0.44,
			}),
		});
		expect(unitAt(units, 2)).toEqual({
			segments: [2],
			route: route("Lexeme", "ADV"),
		});
	}
});

test("a unit of several pieces never takes Lexeme PART: it takes its Family's next Kind", async () => {
	// Er0 _1 ist2 _3 bereit4 _5 zu6 _7 allem8 .9
	const { units } = await run(segmentsOf("Er ist bereit zu allem."), {
		s_preposition_4: picked("p3", { p3: 0.8, none: 0.2 }),
		g_joined_4_3: picked("governed", { governed: 0.9, place: 0.1 }),
		r_3_4: picked("Lexeme/PART", {
			"Lexeme/PART": 0.55,
			"Lexeme/ADJ": 0.28,
			"Locution/ADJ": 0.17,
		}),
	});
	expect(unitAt(units, 4)).toEqual({
		segments: [4, 6],
		route: route("Lexeme", "ADJ"),
	});
});

test("an abbreviation spaced after its inner dot is asked its route as an abbreviation", async () => {
	// Wir0 _1 kaufen2 _3 Obst4 ,5 _6 z. B.7 _8 Äpfel9 .10
	const segments: Segment[] = [
		...segmentsOf("Wir kaufen Obst, "),
		{ kind: "ResolvableText", text: "z. B." },
		...segmentsOf(" Äpfel."),
	];
	const { units, judge } = await run(segments, {
		r_4: picked("Foreign/Foreign"),
		ra_4: picked("Locution/ADV"),
	});
	expect(judge.questionsOf("route2")?.ra_4).toBeDefined();
	expect(unitAt(units, 7)?.route).toEqual(route("Locution", "ADV"));
});
