import { expect, test } from "bun:test";
import { createDumgen } from "dumgen";
import type { ModelExchange } from "dumgen/types";
import * as Effect from "effect/Effect";
import {
	executeOutput,
	rejectJudgment,
} from "../../../battery/dumgen/tests/execution-fixture.js";
import { segmentForLaboratory } from "../src/segmentation";

test("published segmentation retains generated intake and deterministic segmentation evidence", async () => {
	const exchanges: ModelExchange[] = [];
	const dumgen = createDumgen({
		judge: rejectJudgment,
		onModelExchange: (value) => exchanges.push(value),
		execute: executeOutput(async () => ({
			language: "de",
			items: [
				{
					id: "0",
					decision: "Accepted",
					language: "de",
					stitchedText: "Die Bank",
				},
			],
		})),
	});
	const response = await Effect.runPromise(
		segmentForLaboratory(dumgen, "Die Bank", exchanges),
	);
	expect(response).toMatchObject({
		decision: "Accepted",
		sentence: {
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "Die" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Bank" },
			],
		},
		stages: {
			intake: { traceOrigin: "generated" },
			segmentation: { traceOrigin: "deterministic" },
		},
		generation: { prompts: ["segment:intake"] },
	});
	expect(exchanges).toHaveLength(1);
});
test("unavailable intake is retained without a segmentation stage", async () => {
	const exchanges: ModelExchange[] = [];
	const dumgen = createDumgen({
		judge: rejectJudgment,
		onModelExchange: (value) => exchanges.push(value),
		execute: executeOutput(async () => ({
			language: null,
			items: [
				{
					id: "0",
					decision: "UnsupportedLanguage",
					language: null,
					stitchedText: "Bonjour",
				},
			],
		})),
	});
	const response = await Effect.runPromise(
		segmentForLaboratory(dumgen, "Bonjour", exchanges),
	);
	expect(response).toMatchObject({
		decision: "UnsupportedLanguage",
		sentence: null,
	});
	expect(response.stages).not.toHaveProperty("segmentation");
});
test("invalid input fails before execution and provider errors retain the failed exchange", async () => {
	const exchanges: ModelExchange[] = [];
	let calls = 0;
	const dumgen = createDumgen({
		judge: rejectJudgment,
		onModelExchange: (value) => exchanges.push(value),
		execute: executeOutput(async () => {
			calls++;
			throw new Error("offline");
		}),
	});
	await expect(
		Effect.runPromise(segmentForLaboratory(dumgen, "", exchanges)),
	).rejects.toThrow();
	expect(calls).toBe(0);
	await expect(
		Effect.runPromise(segmentForLaboratory(dumgen, "Bank", exchanges)),
	).rejects.toThrow("offline");
	expect(exchanges[0]?.failure).toBe("offline");
});
