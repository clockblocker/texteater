import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, noul, picked, route } from "./fake-judge.js";

// Es0 _1 geht2 _3 besonders4 _5 schnell6 .7: besonders is piece 3, which the route Choice reads ADV.
const sentence = "Es geht besonders schnell.";

async function routeOfBesonders(test: number) {
	const judge = fakeJudge({
		r_3: picked("Lexeme/ADV", { "Lexeme/ADV": 0.95, "Lexeme/ADJ": 0.05 }),
		ta_3: noul(test),
	});
	const units = await Effect.runPromise(
		germanUnits({ segments: segmentsOf(sentence) }, judge.ask),
	);
	const question = Object.values(
		judge.requests.find(({ questions }) => "ta_3" in questions)
			?.questions ?? {},
	);
	return {
		route: units.find(({ segments }) => segments.includes(4))?.route,
		asked: JSON.stringify(question),
	};
}

test("the adjective test asks of the word's own letters with an ending, so besonders is asked as besonderse (#1340)", async () => {
	const { asked } = await routeOfBesonders(0.05);
	expect(asked).toContain('Is \\"besonderse\\", the word \\"besonders\\"');
});

test("the adjective test's floor is 0.3: a form the judge calls no word stays ADV, one at 0.35 is ADJ (#1340)", async () => {
	expect((await routeOfBesonders(0.05)).route).toEqual(
		route("Lexeme", "ADV"),
	);
	expect((await routeOfBesonders(0.35)).route).toEqual(
		route("Lexeme", "ADJ"),
	);
});
