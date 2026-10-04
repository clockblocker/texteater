import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineGoldenCaseCollection, defineGoldenCorpus } from "promptsmith";
import { runOperationExperiment } from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import { z } from "zod";
import { runEvaluationCli } from "../../cli/evaluate.js";

const directory = await mkdtemp(join(tmpdir(), "dumgen-compare-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

const schema = z.strictObject({ kind: z.string() });
const corpus = defineGoldenCorpus({
	route: "compare",
	inputSchema: schema,
	outputSchema: schema,
	collections: {
		cases: defineGoldenCaseCollection({
			cases: {
				demo: { input: { kind: "Z" }, idealOutput: { kind: "Z" } },
				kept: { input: { kind: "A" }, idealOutput: { kind: "A" } },
				moved: { input: { kind: "B" }, idealOutput: { kind: "B" } },
				dropped: { input: { kind: "C" }, idealOutput: { kind: "C" } },
				added: { input: { kind: "D" }, idealOutput: { kind: "D" } },
			},
		}),
	},
});

async function savedRun(
	ids: string[],
	answer: (input: { kind: string }) => { kind: string },
) {
	const run = await runOperationExperiment({
		experimentId: "resolve-grammar/de:dev",
		operationVersion: "1",
		evaluatorVersion: "1",
		sourceRevision: "test",
		configurations: {
			judgment: { model: "jev", settings: {} },
			generation: { model: "luna", settings: {} },
		},
		experiment: {
			corpus,
			evaluation: corpus.select(ids),
			demonstrations: corpus.select(["demo"]),
			run: async (input: { kind: string }) => answer(input),
			evaluator: ({
				output,
				idealOutput,
			}: {
				output: { kind: string };
				idealOutput: { kind: string };
			}) => ({ contractPass: output.kind === idealOutput.kind }),
		},
	});
	await saveRun(directory, run);
	return run.manifest.runId;
}

test("--compare loads two saved runs and reports verdict counts, one-sided cases and changed outputs", async () => {
	const left = await savedRun(["kept", "moved", "dropped"], (input) => input);
	const right = await savedRun(["kept", "moved", "added"], (input) =>
		input.kind === "B" ? { kind: "X" } : input,
	);
	const written: unknown[] = [];
	const report = await runEvaluationCli(
		["--compare", left, right, "--output", directory],
		{ write: (value) => written.push(value) },
	);
	expect(written).toEqual([report]);
	expect(report).toMatchObject({
		left: {
			runId: left,
			experimentId: "resolve-grammar/de:dev",
			cases: 3,
			verdicts: { Passed: 3, Failed: 0 },
		},
		right: { runId: right, cases: 3, verdicts: { Passed: 2, Failed: 1 } },
		sameExperiment: true,
		sameCorpus: false,
		unchanged: 1,
		onlyLeft: ["dropped"],
		onlyRight: ["added"],
		changed: [
			{
				caseId: "moved",
				verdict: "Passed → Failed",
				outputChanges: [
					{ path: "kind", change: "Changed", left: "B", right: "X" },
				],
			},
		],
	});
});

test("--compare needs exactly two run ids", async () => {
	const cli = (argv: string[]) =>
		runEvaluationCli([...argv, "--output", directory], {
			write: () => {},
		});
	await expect(cli(["--compare", "only-one"])).rejects.toThrow(
		"--compare takes two run ids",
	);
	await expect(cli(["--compare", "a", "b", "c"])).rejects.toThrow(
		"--compare takes two run ids",
	);
	await expect(cli(["stray"])).rejects.toThrow("Unexpected argument stray");
});
