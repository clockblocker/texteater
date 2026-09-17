import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getExperiment } from "dumgen/development";
import { stableJson } from "promptsmith";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { runEvaluationCli } from "../../../battery/dumgen/cli/evaluate";
import { createEvaluationService } from "../src/evaluations";

test("CLI and Laboratory share cases, evaluation records and configured storage", async () => {
	const experimentId = "grammatical-resolution/de/lexeme/noun";
	const experiment = getExperiment(experimentId);
	let calls = 0;
	const execute = async ({ input }: { input: unknown }) => {
		calls++;
		const golden = experiment.evaluation.cases.find(
			(golden) => stableJson(golden.input) === stableJson(input),
		);
		if (!golden) throw Error("Unknown fixture");
		return { output: golden.idealOutput };
	};
	const directory = await mkdtemp(join(tmpdir(), "dumgen-runs-"));
	try {
		const cli = (await runEvaluationCli(
			[
				"--experiment",
				experimentId,
				"--revision",
				"controlled",
				"--output",
				directory,
				"--model",
				"fixture",
			],
			{ execute, write: () => {} },
		)) as OperationEvaluationRun;
		const laboratory = createEvaluationService({
			outputDirectory: directory,
			execute,
		});
		const app = await laboratory.run({
			experimentId,
			sourceRevision: "controlled",
			configuration: { model: "fixture", settings: {} },
		});
		if (app.manifest.version !== 2)
			throw Error("Expected operation evidence");
		const comparable = (run: OperationEvaluationRun) =>
			run.cases.map(({ caseId, status, output, evaluation }) => ({
				caseId,
				status,
				output,
				evaluation,
			}));
		expect(comparable(cli)).toEqual(
			comparable(app as OperationEvaluationRun),
		);
		expect(cli.manifest.configurations).toEqual(
			(app as OperationEvaluationRun).manifest.configurations,
		);
		expect(cli.cases.every((record) => record.traces.length === 1)).toBe(
			true,
		);
		expect(await laboratory.open(cli.manifest.runId)).toEqual(cli);
		expect(
			(await laboratory.compare(cli.manifest.runId, app.manifest.runId))
				.sameCorpus,
		).toBe(true);
		expect(await laboratory.list()).toHaveLength(2);
		expect(calls).toBe(experiment.evaluation.ids.length * 2);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
