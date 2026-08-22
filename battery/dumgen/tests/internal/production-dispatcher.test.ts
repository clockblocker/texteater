import { expect, test } from "bun:test";
import { dispatchProduction } from "../../src/production/dispatcher";

test("a Closed result is terminal and never falls through to Open", async () => {
	const calls: string[] = [];
	const result = await dispatchProduction<
		{ decision: "CatalogMiss" } | { decision: "Open" }
	>({
		closed: true,
		runClosed: async () => {
			calls.push("closed");
			return { decision: "CatalogMiss" as const };
		},
		runOpen: async () => {
			calls.push("open");
			return { decision: "Open" as const };
		},
	});

	expect(result).toEqual({ decision: "CatalogMiss" });
	expect(calls).toEqual(["closed"]);
});

test("new route policies extend the dispatcher without changing it", async () => {
	const routePolicy = new Map([["de/Lexeme/DET", true]]);
	const dispatch = (route: string) =>
		dispatchProduction({
			closed: routePolicy.get(route) === true,
			runClosed: async () => "closed",
			runOpen: async () => "open",
		});

	expect(await dispatch("de/Lexeme/DET")).toBe("closed");
	expect(await dispatch("de/Lexeme/NOUN")).toBe("open");
	routePolicy.set("de/Lexeme/NOUN", true);
	expect(await dispatch("de/Lexeme/NOUN")).toBe("closed");
});
