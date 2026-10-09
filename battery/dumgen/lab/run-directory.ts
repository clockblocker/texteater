import { fileURLToPath } from "node:url";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
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

/** The subset a resolve run took, as its manifest records it. */
export type CaseFilter = {
	readonly subset: string;
	readonly baselineRunId: string;
	readonly seed: number;
	readonly missed: readonly string[];
	readonly guard: readonly string[];
};

const caseFilterSchema = z.object({
	subset: z.string(),
	baselineRunId: z.string(),
	seed: z.number(),
	missed: z.array(z.string()),
	guard: z.array(z.string()),
}) satisfies z.ZodType<CaseFilter>;

/**
 * What the evaluation CLIs read of a run's judgment settings: its frozen
 * set and hash, and the subset or case filter a partial run names.
 */
export const judgmentSettingsSchema = z.object({
	set: z.string().optional(),
	setHash: z.string().optional(),
	subset: z.unknown().optional(),
	caseFilter: caseFilterSchema.optional(),
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
