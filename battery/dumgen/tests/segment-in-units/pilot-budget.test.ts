import { expect, test } from "bun:test";
import { jevUsdPerToken } from "../../src/segment-in-units/lab/ledger.js";
import { PilotBudget } from "../../src/segment-in-units/lab/pilot-budget.js";

test("in-flight reservations stop a second request before it can overspend", () => {
	const maximum = 65_536 * jevUsdPerToken;
	const budget = new PilotBudget(maximum * 1.5);
	const settle = budget.reserve();
	expect(() => budget.reserve()).toThrow("before dispatch");
	settle(100);
	expect(() => budget.reserve()).not.toThrow();
});

test("failed requests retain their full reservation when billing is unknown", () => {
	const maximum = 65_536 * jevUsdPerToken;
	const budget = new PilotBudget(maximum * 1.5);
	budget.reserve()();
	expect(budget.snapshot.unknownUsageReservedUsd).toBe(maximum);
	expect(() => budget.reserve()).toThrow("before dispatch");
});

test("a corrected run carries prior spending into the shared cap", () => {
	const maximum = 65_536 * jevUsdPerToken;
	const budget = new PilotBudget(maximum * 2, {
		knownUsd: maximum,
		unknownUsageReservedUsd: maximum / 2,
	});
	expect(() => budget.reserve()).toThrow("before dispatch");
	expect(budget.snapshot.incrementalKnownUsd).toBe(0);
	expect(budget.snapshot.knownUsd).toBe(maximum);
	expect(
		() => new PilotBudget(1, { knownUsd: -1, unknownUsageReservedUsd: 0 }),
	).toThrow();
});
