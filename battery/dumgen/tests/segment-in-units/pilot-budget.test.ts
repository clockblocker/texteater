import { expect, test } from "bun:test";
import { PilotBudget } from "../../src/segment-in-units/lab/pilot-budget.js";

const maximum = 65_536;

test("in-flight reservations stop a second request before it can overspend", () => {
	const budget = new PilotBudget(maximum * 1.5);
	const settle = budget.reserve();
	expect(() => budget.reserve()).toThrow("before dispatch");
	settle(100);
	expect(() => budget.reserve()).not.toThrow();
});

test("failed requests retain their full reservation when billing is unknown", () => {
	const budget = new PilotBudget(maximum * 1.5);
	budget.reserve()();
	expect(budget.snapshot.unknownUsageReservedTokens).toBe(maximum);
	expect(() => budget.reserve()).toThrow("before dispatch");
});

test("a corrected run carries prior spending into the shared cap", () => {
	const budget = new PilotBudget(maximum * 2, {
		knownTokens: maximum,
		unknownUsageReservedTokens: maximum / 2,
	});
	expect(() => budget.reserve()).toThrow("before dispatch");
	expect(budget.snapshot.incrementalKnownTokens).toBe(0);
	expect(budget.snapshot.knownTokens).toBe(maximum);
	expect(
		() =>
			new PilotBudget(maximum, {
				knownTokens: -1,
				unknownUsageReservedTokens: 0,
			}),
	).toThrow();
	expect(() => new PilotBudget(PilotBudget.maximumCapTokens + 1)).toThrow();
});
