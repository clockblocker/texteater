import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineGoldenCaseCollection, defineGoldenCorpus } from "promptsmith";
import { runOperationExperiment } from "promptsmith/evaluation";
import { compareRuns, loadRun, saveRun } from "promptsmith/storage";
import { z } from "zod";

const schema = z.strictObject({ value: z.number() });
const corpus = defineGoldenCorpus({
	route: "repeated",
	inputSchema: schema,
	outputSchema: schema,
	collections: {
		cases: defineGoldenCaseCollection({
			cases: {
				demo: { input: { value: 0 }, idealOutput: { value: 0 } },
				steady: { input: { value: 1 }, idealOutput: { value: 1 } },
				flaky: { input: { value: 2 }, idealOutput: { value: 2 } },
				wandering: { input: { value: 3 }, idealOutput: { value: 3 } },
			},
		}),
	},
});
const settings = {
	experimentId: "repeated",
	operationVersion: "1",
	evaluatorVersion: "1",
	sourceRevision: "test",
	configurations: {
		judgment: { model: "judge", settings: {} },
		generation: { model: "generator", settings: {} },
	},
};
const evaluator = ({
	output,
	idealOutput,
}: {
	output: { value: number };
	idealOutput: { value: number };
}) => ({ contractPass: output.value === idealOutput.value });

/** steady always passes; flaky passes on odd calls only; wandering fails with a new output each time. */
function scriptedOperation() {
	const calls = new Map<number, number>();
	return {
		corpus,
		evaluation: corpus.select(["steady", "flaky", "wandering"]),
		demonstrations: corpus.select(["demo"]),
		evaluator,
		run: async (input: { value: number }) => {
			const call = (calls.get(input.value) ?? 0) + 1;
			calls.set(input.value, call);
			if (input.value === 2) return { value: call % 2 === 1 ? 2 : -2 };
			if (input.value === 3) return { value: 100 + call };
			return input;
		},
	};
}

test("one repetition keeps the historical record shape", async () => {
	const run = await runOperationExperiment({
		...settings,
		experiment: scriptedOperation(),
	});
	expect(run.manifest).not.toHaveProperty("repetitions");
	expect(run.summary).not.toHaveProperty("stability");
	for (const record of run.cases) {
		expect(record).not.toHaveProperty("repetitions");
		expect(record).not.toHaveProperty("stability");
	}
	await expect(
		runOperationExperiment({
			...settings,
			experiment: scriptedOperation(),
			repetitions: 0,
		}),
	).rejects.toThrow("Repetitions");
});

test("repeated operation runs record every repetition and count flips", async () => {
	const run = await runOperationExperiment({
		...settings,
		experiment: scriptedOperation(),
		repetitions: 3,
	});
	expect(run.manifest.repetitions).toBe(3);
	const [steady, flaky, wandering] = run.cases;
	expect(flaky?.repetitions?.map((repetition) => repetition.output)).toEqual([
		{ value: 2 },
		{ value: -2 },
		{ value: 2 },
	]);
	expect(
		flaky?.repetitions?.every(
			(repetition) =>
				repetition.durationMs >= 0 && repetition.calls === 0,
		),
	).toBe(true);
	expect(steady?.stability).toEqual({
		repetitions: 3,
		passed: 3,
		failed: 0,
		needsReview: 0,
		unscored: 0,
		flipped: false,
		distinctOutputs: 1,
	});
	expect(flaky?.stability).toMatchObject({
		passed: 2,
		failed: 1,
		flipped: true,
		distinctOutputs: 2,
	});
	expect(wandering?.stability).toMatchObject({
		passed: 0,
		failed: 3,
		flipped: false,
		distinctOutputs: 3,
	});
	// Every repetition executed cleanly, so each case mirrors its first repetition.
	expect(flaky?.output).toEqual({ value: 2 });
	expect(run.summary).toMatchObject({
		status: "Completed",
		total: 3,
		succeeded: 3,
		stability: {
			repetitions: 3,
			flipped: 1,
			varyingOutputs: 2,
			quality: { passed: 5, failed: 4, needsReview: 0, unscored: 0 },
		},
	});

	const directory = await mkdtemp(join(tmpdir(), "repeated-runs-"));
	try {
		await saveRun(directory, run);
		expect(await loadRun(directory, run.manifest.runId)).toEqual(run);
		const tamperedId = crypto.randomUUID();
		await saveRun(directory, {
			...run,
			manifest: { ...run.manifest, runId: tamperedId },
			cases: run.cases.map((record) =>
				record.caseId === "flaky" && record.stability
					? {
							...record,
							stability: { ...record.stability, flipped: false },
						}
					: record,
			),
		});
		await expect(loadRun(directory, tamperedId)).rejects.toThrow(
			"repetitions",
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("a failed repetition represents its case and interrupted repetitions never flip", async () => {
	const controller = new AbortController();
	let calls = 0;
	const run = await runOperationExperiment({
		...settings,
		experiment: {
			...scriptedOperation(),
			evaluation: corpus.select(["steady", "flaky"]),
			run: async (input: { value: number }) => {
				calls++;
				if (calls === 2)
					throw Object.assign(Error("no answer"), {
						_tag: "Unresolved",
					});
				if (calls === 3) controller.abort();
				return input;
			},
		},
		signal: controller.signal,
		repetitions: 2,
	});
	expect(calls).toBe(3);
	const [steady, flaky] = run.cases;
	expect(steady?.repetitions?.map((repetition) => repetition.status)).toEqual(
		["Success", "Unresolved"],
	);
	expect(steady?.status).toBe("Unresolved");
	expect(steady?.error).toBe("no answer");
	expect(steady?.stability).toMatchObject({ passed: 1, flipped: true });
	expect(flaky?.repetitions?.map((repetition) => repetition.status)).toEqual([
		"Interrupted",
		"Interrupted",
	]);
	expect(flaky?.stability).toMatchObject({ passed: 0, flipped: false });
	expect(run.summary).toMatchObject({
		status: "Interrupted",
		failed: 1,
		interrupted: 1,
		stability: { flipped: 1 },
	});
});

test("records written before repetitions existed still load and compare", async () => {
	// Exact on-disk shape written by earlier promptsmith versions.
	const runId = "legacy-operation-run";
	const manifest = {
		version: 2,
		runId,
		experimentId: "legacy",
		evaluatorVersion: "1",
		sourceRevision: "old",
		startedAt: "2026-09-01T00:00:00.000Z",
		corpus: { fingerprint: "abc", caseIds: ["one", "two"] },
		operationVersion: "1",
		configurations: {
			generation: { model: "generator", settings: {} },
			judgment: { model: "judge", settings: {} },
		},
	};
	const cases = [
		{
			caseId: "one",
			input: { value: 1 },
			idealOutput: { value: 1 },
			output: { value: 1 },
			evaluation: { contractPass: true },
			status: "Success",
			traces: [],
			calls: 0,
			usage: { inputTokens: null, outputTokens: null },
			durationMs: 3,
		},
		{
			caseId: "two",
			input: { value: 2 },
			idealOutput: { value: 2 },
			status: "Unresolved",
			error: "no answer",
			traces: [],
			calls: 1,
			usage: { inputTokens: null, outputTokens: null },
			durationMs: 5,
		},
	];
	const summary = {
		status: "Failed",
		finishedAt: "2026-09-01T00:00:01.000Z",
		total: 2,
		succeeded: 1,
		interrupted: 0,
		failed: 1,
	};
	const directory = await mkdtemp(join(tmpdir(), "legacy-runs-"));
	try {
		await mkdir(join(directory, runId));
		await writeFile(
			join(directory, runId, "manifest.json"),
			JSON.stringify(manifest),
		);
		await writeFile(
			join(directory, runId, "cases.jsonl"),
			`${cases.map((record) => JSON.stringify(record)).join("\n")}\n`,
		);
		await writeFile(
			join(directory, runId, "summary.json"),
			JSON.stringify(summary),
		);
		const legacy = await loadRun(directory, runId);
		expect<unknown>(legacy).toEqual({ manifest, cases, summary });

		const repeated = await runOperationExperiment({
			...settings,
			experiment: {
				...scriptedOperation(),
				evaluation: corpus.select(["steady", "flaky"]),
			},
			repetitions: 2,
		});
		const comparison = compareRuns(legacy, repeated);
		expect(comparison.onlyLeft).toEqual(["one", "two"]);
		expect(comparison.onlyRight).toEqual(["steady", "flaky"]);
		expect(compareRuns(legacy, legacy).cases).toEqual([
			expect.objectContaining({
				caseId: "one",
				verdict: { left: "Passed", right: "Passed" },
				verdictChanged: false,
				outputChanges: [],
			}),
			expect.objectContaining({
				caseId: "two",
				verdict: { left: "Unscored", right: "Unscored" },
				outputChanges: [],
			}),
		]);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
