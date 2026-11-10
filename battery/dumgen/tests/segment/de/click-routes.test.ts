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
