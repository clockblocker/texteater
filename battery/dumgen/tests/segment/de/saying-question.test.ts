import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, picked } from "./fake-judge.js";

// Morgenstund hat Gold im Mund: five pieces, one Saying span over them all.
const saying = segmentsOf("Morgenstund hat Gold im Mund.");

test("candidates asks no per-span Saying Noul: only final's Saying Choice weighs a span (#1341)", async () => {
	const judge = fakeJudge();
	await Effect.runPromise(germanUnits({ segments: saying }, judge.ask));
	const ids = judge.requests.flatMap(({ questions }) =>
		Object.keys(questions),
	);
	expect(ids.filter((id) => /^y_/u.test(id))).toEqual([]);
	expect(ids.some((id) => /^y4_/u.test(id))).toBe(true);
});

test("the route batches pre-ask a Saying the Choice reads as whole, which production then routes from its batched answer (#1341)", async () => {
	const span = "1_2_3_4_5";
	const judge = fakeJudge({
		[`y4_${span}`]: picked("whole", { whole: 0.9, none: 0.1 }),
		[`r_${span}`]: picked("Saying/Saying"),
	});
	const units = await Effect.runPromise(
		germanUnits({ segments: saying }, judge.ask),
	);
	// The Saying's group goes out with the batched route questions, so no
	// route-extra request asks it again.
	expect(Object.keys(judge.questionsOf("route") ?? {})).toContain(
		`r_${span}`,
	);
	expect(judge.stages().some((stage) => stage.includes("route-extra"))).toBe(
		false,
	);
	expect(units).toHaveLength(1);
	expect(units[0]?.route).toMatchObject({ family: "Saying" });
});
