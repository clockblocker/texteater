import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
	attempts,
	generateWith,
	insertAttempt,
	rows,
	seedDictionaryReading,
} from "./knowledge-generation-fixtures";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("a run whose every failure is a Catalog Miss records a growth signal and fails as catalogMiss (#883 point 8)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "miss", { state: "Scheduled" });
	await generateWith(t, "miss", () =>
		Effect.succeed({
			changes: [],
			pendingRelations: [],
			failures: [
				{
					aspect: "definition",
					code: "CatalogMiss",
					message:
						"The authored NOUN Bank has no reviewed definition",
				},
			],
		}),
	);
	expect(await rows(t, "catalogGrowthSignals")).toHaveLength(1);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "catalogMiss",
	});
});
