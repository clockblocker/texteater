import { relative } from "node:path";
import { CodegenDriftError } from "./errors.js";
import { runCodegen } from "./runner.js";
import type {
	CodegenRecipe,
	CodegenRun,
	Inputs,
	Outputs,
	RunMode,
} from "./types.js";

type CodegenCommandOptions = Readonly<{
	/** Defaults to `process.argv`; `--check` selects check mode. */
	argv?: readonly string[];
	/** Prefixes the summary line and the drift error. */
	label?: string;
}>;

/**
 * Runs a recipe as a generator script: `--check` verifies, anything else
 * writes. In check mode, drift lists every stale file on stderr and throws a
 * `CodegenDriftError`.
 */
export async function runCodegenCommand<
	I extends Inputs,
	O extends Outputs,
	Metadata,
>(
	recipe: CodegenRecipe<I, O, Metadata>,
	options: CodegenCommandOptions = {},
): Promise<CodegenRun<Metadata>> {
	const argv = options.argv ?? process.argv;
	const mode: RunMode = argv.includes("--check") ? "check" : "write";
	const prefix = options.label === undefined ? "" : `${options.label}: `;
	const run = await runCodegen(recipe, { mode });

	if (mode === "check" && run.status === "changed") {
		const drift = run.plan.changes.filter(
			(change) => change.kind !== "unchanged",
		);
		for (const change of drift) {
			console.error(
				`${change.kind} ${relative(process.cwd(), change.destination)}`,
			);
		}
		throw new CodegenDriftError(
			`${prefix}${drift.length} generated ${
				drift.length === 1 ? "file is" : "files are"
			} out of date; run bun run generate`,
		);
	}

	const verb = mode === "check" ? "Verified" : "Generated";
	const count = run.plan.artifacts.length;
	console.log(`${prefix}${verb} ${count} ${count === 1 ? "file" : "files"}`);
	return run;
}
