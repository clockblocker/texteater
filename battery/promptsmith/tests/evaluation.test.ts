import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	defineExperiment,
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	definePromptSource,
} from "promptsmith";
import { runExperiment } from "promptsmith/evaluation";
import { loadRun, saveRun } from "promptsmith/storage";
import { z } from "zod";

const inputSchema = z.strictObject({ value: z.number() });
const outputSchema = z.strictObject({ value: z.number() });
function experiment() {
	const corpus = defineGoldenCorpus({
		route: "double",
		inputSchema,
		outputSchema,
		collections: {
			cases: defineGoldenCaseCollection(import.meta.url, {
				cases: {
					demo: { input: { value: 1 }, idealOutput: { value: 2 } },
					ok: { input: { value: 2 }, idealOutput: { value: 4 } },
					invalid: { input: { value: 3 }, idealOutput: { value: 6 } },
					failure: { input: { value: 4 }, idealOutput: { value: 8 } },
				},
			}),
		},
	});
	const promptSource = definePromptSource({
		route: "double",
		inputSchema,
		outputSchema,
		body: "Double the input",
		goldenCorpus: corpus,
		demonstrations: corpus.select(["demo"]),
	});
	return {
		corpus,
		promptSource,
		experiment: defineExperiment({
			promptSource,
			evaluation: corpus.select(["ok", "invalid", "failure"]),
			evaluator: ({ output, idealOutput }) => ({
				score: output.value === idealOutput.value ? 1 : 0,
			}),
		}),
	};
}
test("published runner preserves case order, errors, settings and saved evidence", async () => {
	const { experiment: definition } = experiment();
	const run = await runExperiment({
		experiment: definition,
		experimentId: "double-v1",
		evaluatorVersion: "1",
		sourceRevision: "test-revision",
		configuration: { model: "controlled", settings: { temperature: 0 } },
		execute: async ({ input }) => {
			const { value } = inputSchema.parse(input);
			if (value === 4) throw Error("provider unavailable");
			return {
				output: value === 3 ? { value: "wrong" } : { value: value * 2 },
				metadata: { tokens: 10 },
			};
		},
	});
	expect(run.cases.map((item) => [item.caseId, item.status])).toEqual([
		["ok", "Success"],
		["invalid", "InvalidOutput"],
		["failure", "ProviderFailure"],
	]);
	expect(run.summary).toMatchObject({
		status: "Failed",
		total: 3,
		succeeded: 1,
		failed: 2,
	});
	expect(run.manifest.configuration).toEqual({
		model: "controlled",
		settings: { temperature: 0 },
	});
	const directory = await mkdtemp(join(tmpdir(), "promptsmith-"));
	try {
		await saveRun(directory, run);
		expect(await loadRun(directory, run.manifest.runId)).toEqual(run);
		await expect(saveRun(directory, run)).rejects.toThrow();
		await expect(loadRun(directory, "../escape")).rejects.toThrow();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
test("contamination fails before execution and interruption records every remaining case", async () => {
	const { corpus, promptSource, experiment: definition } = experiment();
	let calls = 0;
	const base = {
		experimentId: "double-v1",
		evaluatorVersion: "1",
		sourceRevision: "test",
		configuration: { model: "controlled", settings: {} },
		execute: async () => {
			calls++;
			return { output: { value: 4 } };
		},
	};
	await expect(
		runExperiment({
			...base,
			experiment: {
				...definition,
				promptSource,
				evaluation: corpus.select(["demo"]),
			},
		}),
	).rejects.toThrow();
	expect(calls).toBe(0);
	const controller = new AbortController();
	controller.abort();
	const run = await runExperiment({
		...base,
		experiment: definition,
		signal: controller.signal,
	});
	expect(calls).toBe(0);
	expect(run.summary).toMatchObject({
		status: "Interrupted",
		interrupted: 3,
		succeeded: 0,
	});
});
