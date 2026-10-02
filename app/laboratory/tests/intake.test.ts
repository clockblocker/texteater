import { expect, test } from "bun:test";
import { Effect } from "effect";
import { createDumgen } from "legacy-dumgen";
import { intakeFixture } from "legacy-dumgen/testing";
import { segmentForLaboratory } from "../src/segmentation.js";

test("Laboratory admits English intake with a complete operation trace", async () => {
	const operations: import("legacy-dumgen/types").OperationTrace[] = [];
	const exchanges: import("legacy-dumgen/types").ModelExchange[] = [];
	const dumgen = createDumgen({
		...intakeFixture({
			items: [
				{
					decision: "Accepted",
					language: "en",
					stitchedText: "The house is large.",
				},
			],
		}),
		onOperation: (trace) => operations.push(trace),
		onModelExchange: (exchange) => exchanges.push(exchange),
	});
	const result = await Effect.runPromise(
		segmentForLaboratory(
			dumgen,
			"The house is large.",
			exchanges,
			operations,
		),
	);
	expect(result.decision).toBe("Accepted");
	expect(result.sentence?.language).toBe("en");
	expect(operations[0]?.calls.map((call) => call.executor)).toEqual([
		"TypeSafe",
	]);
});
