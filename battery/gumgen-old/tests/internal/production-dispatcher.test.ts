import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { dispatchProduction } from "../../src/production/dispatcher";

test("a Closed result is terminal and never falls through to Open", async () => {
	const calls: string[] = [];
	const result = await Effect.runPromise(
		dispatchProduction<{ decision: "CatalogMiss" } | { decision: "Open" }>({
			closed: true,
			runClosed: () =>
				Effect.sync(() => {
					calls.push("closed");
					return { decision: "CatalogMiss" as const };
				}),
			runOpen: () =>
				Effect.sync(() => {
					calls.push("open");
					return { decision: "Open" as const };
				}),
		}),
	);

	expect(result).toEqual({ decision: "CatalogMiss" });
	expect(calls).toEqual(["closed"]);
});

test("new route policies extend the dispatcher without changing it", async () => {
	const routePolicy = new Map([["de/Lexeme/DET", true]]);
	const dispatch = (route: string) =>
		dispatchProduction({
			closed: routePolicy.get(route) === true,
			runClosed: () => Effect.succeed("closed"),
			runOpen: () => Effect.succeed("open"),
		});

	expect(await Effect.runPromise(dispatch("de/Lexeme/DET"))).toBe("closed");
	expect(await Effect.runPromise(dispatch("de/Lexeme/NOUN"))).toBe("open");
	routePolicy.set("de/Lexeme/NOUN", true);
	expect(await Effect.runPromise(dispatch("de/Lexeme/NOUN"))).toBe("closed");
});
