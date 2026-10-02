import { parseArgs } from "node:util";
import {
	defaultRunOutputDirectory,
	evaluateExperiment,
	evaluationMetrics,
	listExperiments,
} from "dumgen/development";
import { loadRun } from "promptsmith/storage";
import {
	createTypeSafeExecutor,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";
export async function runEvaluationCli(
	argv: string[],
	dependencies: {
		judge?: TypeSafeExecutor;
		write?: (value: unknown) => void;
	} = {},
) {
	const { values } = parseArgs({
		args: argv,
		options: {
			list: { type: "boolean" },
			experiment: { type: "string" },
			"judgment-model": { type: "string" },
			output: { type: "string" },
			revision: { type: "string" },
			open: { type: "string" },
			offline: { type: "boolean" },
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
			...(values["judgment-model"]
				? { judgmentModel: values["judgment-model"] }
				: {}),
			offline: values.offline ?? false,
			sourceRevision: values.revision,
			outputDirectory,
			signal: controller.signal,
		});
		write({
			manifest: run.manifest,
			summary: run.summary,
			metrics: evaluationMetrics(run),
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
