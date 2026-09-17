import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineGoldenCaseCollection, defineGoldenCorpus } from "promptsmith";
import {
	type OperationEvidence,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { loadRun, saveRun } from "promptsmith/storage";
import { z } from "zod";

const schema = z.strictObject({ value: z.number() });
const corpus = defineGoldenCorpus({
	route: "operation",
	inputSchema: schema,
	outputSchema: schema,
	collections: {
		cases: defineGoldenCaseCollection(import.meta.url, {
			cases: {
				demo: { input: { value: 0 }, idealOutput: { value: 0 } },
				first: { input: { value: 1 }, idealOutput: { value: 1 } },
				second: { input: { value: 2 }, idealOutput: { value: 2 } },
			},
		}),
	},
});
const settings = {
	experimentId: "production",
	operationVersion: "2",
	evaluatorVersion: "1",
	sourceRevision: "test",
	configurations: {
		judgment: { model: "jev", settings: { maxRetries: 0 } },
		generation: { model: "luna", settings: { maxRetries: 0 } },
	},
};
function experiment(
	run: (
		input: { value: number },
		context: {
			signal: AbortSignal;
			recordTrace: (trace: OperationEvidence) => void;
		},
	) => Promise<{ value: number }>,
) {
	return {
		corpus,
		evaluation: corpus.select(["first", "second"]),
		demonstrations: corpus.select(["demo"]),
		run,
		evaluator: ({
			output,
			idealOutput,
		}: {
			output: { value: number };
			idealOutput: { value: number };
		}) => ({ matches: output.value === idealOutput.value }),
	};
}
test("operation evidence preserves all calls, domain outcomes, missing usage and immutable v2 runs", async () => {
	let attempts = 0;
	const run = await runOperationExperiment({
		...settings,
		experiment: experiment(async (input, { recordTrace }) => {
			attempts++;
			recordTrace({
				calls: [
					{
						executor: "TypeSafe",
						output: {
							usage: { input_tokens: 5, output_tokens: 1 },
						},
					},
					{
						executor: "Luna",
						metadata:
							input.value === 1
								? {
										usage: {
											input_tokens: 7,
											output_tokens: 3,
										},
									}
								: {},
					},
				],
			});
			if (input.value === 2)
				throw Object.assign(Error("no defensible answer"), {
					_tag: "Unresolved",
				});
			return input;
		}),
	});
	expect(attempts).toBe(2);
	expect(run.manifest.version).toBe(2);
	expect(
		run.cases.map((record) => [record.status, record.calls, record.usage]),
	).toEqual([
		["Success", 2, { inputTokens: 12, outputTokens: 4 }],
		["Unresolved", 2, { inputTokens: null, outputTokens: null }],
	]);
	const directory = await mkdtemp(join(tmpdir(), "operation-evidence-"));
	try {
		await saveRun(directory, run);
		expect(await loadRun(directory, run.manifest.runId)).toEqual(run);
		await expect(saveRun(directory, run)).rejects.toThrow();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
test("operation selection contamination and cancellation never start dependent or remaining calls", async () => {
	let calls = 0;
	const controller = new AbortController();
	const definition = experiment(async (input) => {
		calls++;
		controller.abort();
		return input;
	});
	await expect(
		runOperationExperiment({
			...settings,
			experiment: { ...definition, evaluation: corpus.select(["demo"]) },
		}),
	).rejects.toThrow();
	expect(calls).toBe(0);
	const run = await runOperationExperiment({
		...settings,
		experiment: definition,
		signal: controller.signal,
	});
	expect(calls).toBe(1);
	expect(run.cases.map((record) => record.status)).toEqual([
		"Interrupted",
		"Interrupted",
	]);
});
