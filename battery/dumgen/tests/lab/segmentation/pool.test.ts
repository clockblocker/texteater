import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
	floors762,
	x1Grid,
} from "../../../lab/segmentation/de/arms/production.js";
import {
	type Heard,
	type PoolTally,
	poolAnswer,
	pooledAsk,
	standIn,
} from "../../../lab/segmentation/harness/pool.js";
import type { Answer } from "../../../src/segment/ask.js";
import { productionUnitSettings } from "../../../src/segment/de/units.js";

const noul = (value: number): Answer => ({ type: "noul", noul: value });
const picked = (probabilities: Record<string, number>): Answer => ({
	type: "choice",
	choice: Object.keys(probabilities)[0] ?? "",
	confidence: 0.9,
	probabilities,
});

test("a pooled Noul is the mean or the median of its answers", () => {
	const answers = [noul(0.2), noul(0.9), noul(0.4)];
	expect(poolAnswer(answers, "mean")).toEqual(noul(0.5));
	expect(poolAnswer(answers, "median")).toEqual(noul(0.4));
	expect(poolAnswer([noul(0.2), noul(0.6)], "median")).toEqual(noul(0.4));
});

test("a pooled Choice pools every share and chooses the best pooled share", () => {
	const answers = [
		picked({ p3: 0.6, none: 0.4 }),
		picked({ none: 0.7, p3: 0.3 }),
		picked({ none: 0.55, p3: 0.45 }),
	];
	const mean = poolAnswer(answers, "mean");
	expect(mean.type === "choice" && mean.choice).toBe("none");
	expect(mean.type === "choice" && mean.probabilities.p3).toBeCloseTo(0.45);
	const median = poolAnswer(answers, "median");
	expect(median.type === "choice" && median.probabilities).toEqual({
		p3: 0.45,
		none: 0.55,
	});
	// A share one answer leaves out counts as 0.
	const sparse = poolAnswer(
		[picked({ a: 1 }), picked({ b: 1 }), picked({ a: 0.6, b: 0.4 })],
		"mean",
	);
	expect(sparse.type === "choice" && sparse.choice).toBe("a");
});

test("a question no repetition asked gets a stand-in that adds nothing", () => {
	expect(standIn({ type: "noul", instructions: "?" })).toEqual(noul(0));
	expect(
		standIn({
			type: "choice",
			instructions: "?",
			criteria: { p1: "a", none: "b" },
		}),
	).toMatchObject({ choice: "none" });
	expect(
		standIn({
			type: "choice",
			instructions: "?",
			criteria: { "Lexeme/ADV": null, "Lexeme/PART": null },
		}),
	).toEqual({
		type: "choice",
		choice: "Unresolved",
		confidence: 0,
		probabilities: {},
	});
});

test("the pooled ask answers from every repetition that heard a question", async () => {
	const heard: Heard[] = [
		new Map([
			["f_1", noul(0.2)],
			["e_1_2", noul(0.8)],
		]),
		new Map([["f_1", noul(0.4)]]),
		new Map([["f_1", noul(0.9)]]),
	];
	const tally: PoolTally = [];
	const answers = await Effect.runPromise(
		pooledAsk(
			heard,
			"median",
			tally,
		)({
			stage: "expressions",
			state: {},
			questions: {
				f_1: { type: "noul", instructions: "?" },
				e_1_2: { type: "noul", instructions: "?" },
				e_1_3: { type: "noul", instructions: "?" },
			},
		}),
	);
	expect(answers).toEqual({
		f_1: noul(0.4),
		e_1_2: noul(0.8),
		e_1_3: noul(0),
	});
	expect([0, 1, 2, 3].map((count) => tally[count] ?? 0)).toEqual([
		1, 1, 0, 1,
	]);
});

test("X1's grid crosses two floor settings, four Saying assemblies and step 0", () => {
	expect(Object.keys(x1Grid)).toHaveLength(16);
	expect(x1Grid["prod+maxim@0.7"]).toEqual({
		floors: productionUnitSettings.floors,
		saying: productionUnitSettings.saying,
		stepZero: true,
	});
	expect(floors762).toMatchObject({
		idiom: 0.6,
		fixed: 0.3,
		expression: 0.7,
	});
	expect(x1Grid["762+saying@0.4+nostep0"]).toEqual({
		floors: floors762,
		saying: { floor: 0.4, maxim: false },
		stepZero: false,
	});
});
