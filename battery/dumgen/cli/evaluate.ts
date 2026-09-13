import { parseArgs } from "node:util";
import {
	defaultRunOutputDirectory,
	evaluateExperiment,
	listExperiments,
} from "dumgen/development";
import type { EvaluationExecutor } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { loadRun } from "promptsmith/storage";
export async function runEvaluationCli(
	argv: string[],
	dependencies: {
		execute?: EvaluationExecutor;
		write?: (value: unknown) => void;
	} = {},
) {
	const { values } = parseArgs({
		args: argv,
		options: {
			list: { type: "boolean" },
			experiment: { type: "string" },
			model: { type: "string" },
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
			configuration,
			sourceRevision: values.revision,
			outputDirectory,
			execute: dependencies.execute ?? createOpenAIExecutor(),
			signal: controller.signal,
		});
		write({ manifest: run.manifest, summary: run.summary });
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
