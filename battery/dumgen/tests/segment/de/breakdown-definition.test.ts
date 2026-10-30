import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { BreakdownInput } from "../../../src/segment/breakdown-pieces.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { input, judgeWanting } from "./breakdown-support.js";

// The user's 2026-10-30 ruling on #1241 (ADR 0050): a run inside a wording
// is one part only when it keeps its meaning inside the whole, which the
// Reading's definition gives, so only the Locution question reads it.
// `hin und her laufen` is no Breakdown Record.

const defined = (definition: string): BreakdownInput => ({
	...input("Locution", "VERB", "hin und her laufen", "🔄"),
	definition,
});

const requestsOf = async (reading: BreakdownInput) => {
	const judge = judgeWanting();
	await Effect.runPromise(germanConstituents(reading, judge.ask));
	return judge.requests();
};

test("the Locution question reads the definition and points its meaning at it", async () => {
	const requests = await requestsOf(
		defined("ständig die Richtung wechselnd gehen"),
	);
	const [locutions, ...rest] = requests;
	expect(locutions?.stage).toBe("breakdown-locutions");
	expect(locutions?.state).toMatchObject({
		meaning: "🔄",
		definition: "ständig die Richtung wechselnd gehen",
	});
	for (const question of Object.values(locutions?.questions ?? {}))
		expect(String(question.instructions)).toContain(
			"whose meaning `definition` gives",
		);
	expect(rest.length).toBeGreaterThan(0);
	for (const request of rest)
		expect(request.state).not.toHaveProperty("definition");
});

test("without a definition the Locution question is asked as before", async () => {
	const [locutions] = await requestsOf(
		input("Locution", "VERB", "hin und her laufen", "🔄"),
	);
	expect(locutions?.stage).toBe("breakdown-locutions");
	expect(locutions?.state).not.toHaveProperty("definition");
	for (const question of Object.values(locutions?.questions ?? {}))
		expect(String(question.instructions)).not.toContain("`definition`");
});
