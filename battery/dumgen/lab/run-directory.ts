import { fileURLToPath } from "node:url";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { loadRun } from "promptsmith/storage";
import { z } from "zod";
import { storedAs } from "./stored-json.js";

/**
 * Where the evaluation CLIs write their Promptsmith runs by default: the
 * untracked `.runs/dumgen/` at the repository root. A caller can always
 * supply a different output directory.
 */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL("../../../.runs/dumgen/", import.meta.url),
);

type StoredRun = Awaited<ReturnType<typeof loadRun>>;

const isOperationRun = (run: StoredRun): run is OperationEvaluationRun =>
	run.manifest.version === 2;

/** The operation run `runId` (manifest version 2) saved under `directory`. */
export async function loadOperationRun(
	directory: string,
	runId: string,
): Promise<OperationEvaluationRun> {
	const run = await loadRun(directory, runId);
	if (!isOperationRun(run))
		throw Error(
			`Run ${runId} is not an operation run (manifest version 2)`,
		);
	return run;
}

/**
 * What the evaluation CLIs read of a run's judgment settings: its frozen
 * set and hash, and the subset or case filter a partial run names.
 */
export const judgmentSettingsSchema = z.object({
	set: z.string().optional(),
	setHash: z.string().optional(),
	subset: z.unknown().optional(),
	caseFilter: z.unknown().optional(),
});

/** A run's judgment settings, checked by `schema`. */
export const judgmentSettings = <T>(
	run: OperationEvaluationRun,
	schema: z.ZodType<T>,
): T =>
	storedAs(
		schema,
		run.manifest.configurations.judgment.settings,
		`Run ${run.manifest.runId}'s judgment settings`,
	);
