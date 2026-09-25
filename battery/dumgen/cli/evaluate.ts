import { join } from "node:path";
import { parseArgs } from "node:util";
import {
	defaultRunOutputDirectory,
	disagreementsFileName,
	evaluateExperiment,
	listExperiments,
	reviewEvaluationRun,
} from "dumgen/development";
import type { EvaluationExecutor } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { loadRun } from "promptsmith/storage";
import {
	createTypeSafeExecutor,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";
export async function runEvaluationCli(
	argv: string[],
	dependencies: {
		execute?: EvaluationExecutor;
		judge?: TypeSafeExecutor;
		write?: (value: unknown) => void;
	} = {},
) {
	const { values } = parseArgs({
		args: argv,
		options: {
			list: { type: "boolean" },
			experiment: { type: "string" },
			model: { type: "string" },
			"judgment-model": { type: "string" },
			"judgment-timeout": { type: "string" },
			settings: { type: "string" },
			output: { type: "string" },
			revision: { type: "string" },
			open: { type: "string" },
		},
	});
	const write =
		dependencies.write ??
		((value) => console.log(JSON.stringify(value, null, 2)));
	if (values.list) {
		const experiments = listExperiments();
		write(experiments);
		return experiments;
	}
	const outputDirectory =
		values.output ??
		process.env.DUMGEN_RUN_DIRECTORY ??
		defaultRunOutputDirectory;
	if (values.open) {
		const run = await loadRun(outputDirectory, values.open);
		write(run);
		return run;
	}
	if (!values.experiment)
		throw Error(
			"Use --list, --open RUN_ID, or --experiment ID --revision REVISION",
		);
	if (!values.revision)
		throw Error("--revision is required to identify the evaluated source");
	const configuration = values.model
		? {
				model: values.model,
				settings: values.settings ? JSON.parse(values.settings) : {},
			}
		: undefined;
	if (values.settings && !values.model)
		throw Error("--settings requires --model");
	const controller = new AbortController();
	const interrupt = () => controller.abort();
	process.once("SIGINT", interrupt);
	try {
		const run = await evaluateExperiment({
			experimentId: values.experiment,
			judge:
				dependencies.judge ??
				((request, options) =>
					createTypeSafeExecutor()(request, options)),
			judgmentConfiguration: {
				model: values["judgment-model"],
				timeoutMs: values["judgment-timeout"]
					? Number(values["judgment-timeout"])
					: undefined,
			},
			configuration,
			sourceRevision: values.revision,
			outputDirectory,
			execute: dependencies.execute ?? createOpenAIExecutor(),
			signal: controller.signal,
		});
		const review = reviewEvaluationRun(run);
		write({
			manifest: run.manifest,
			summary: run.summary,
			...(review && {
				review: {
					scores: review.scores,
					disagreements: review.disagreements.length,
					disagreementsFile: join(
						outputDirectory,
						run.manifest.runId,
						disagreementsFileName,
					),
				},
			}),
		});
		return run;
	} finally {
		process.removeListener("SIGINT", interrupt);
	}
}
if (import.meta.main)
	runEvaluationCli(process.argv.slice(2)).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
