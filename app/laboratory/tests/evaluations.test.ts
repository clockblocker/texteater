import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getExperiment } from "dumgen/development";
import { grammarFixture } from "dumgen/testing";
import type {
	EvaluationExecutor,
	OperationEvaluationRun,
} from "promptsmith/evaluation";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import { runEvaluationCli } from "../../../battery/dumgen/cli/evaluate";
import { createEvaluationService } from "../src/evaluations";

test("CLI and Laboratory share cases, evaluation records and configured storage", async () => {
	const experimentId = "grammatical-resolution/de/lexeme/noun";
	const experiment = getExperiment(experimentId);
	let calls = 0;
	const fixture = (input: unknown) => {
		const context = (input as { markedContext: string }).markedContext;
		const golden = experiment.evaluation.cases.find(
			(golden) =>
				(golden.input as { markedContext: string }).markedContext ===
				context,
		);
		if (!golden) throw Error("Unknown fixture");
		return grammarFixture(golden.idealOutput);
	};
	const execute: EvaluationExecutor = async (request) => {
		calls++;
		return fixture(request.input).execute({
			...request,
			stage: "resolveGrammar",
			route: "de/Lexeme/NOUN",
		});
	};
	const judge: TypeSafeExecutor = async (request, options) => {
		calls++;
		return fixture(request.state).judge(request, options);
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
			{ execute, judge, write: () => {} },
		)) as OperationEvaluationRun;
		const laboratory = createEvaluationService({
			outputDirectory: directory,
			execute,
			judge,
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
		expect(calls).toBe(
			cli.cases.reduce((sum, record) => sum + record.calls, 0) * 2,
		);
		expect(
			cli.cases
				.filter(
					(record) =>
						record.status !== "Success" &&
						!(
							record.status === "Unresolved" &&
							(record.idealOutput as { decision?: string })
								.decision === "Unresolved"
						),
				)
				.map((record) => record.caseId),
		).toEqual([]);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
