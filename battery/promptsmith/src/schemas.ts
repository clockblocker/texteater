import { z } from "zod";

export const configurationSchema = z.strictObject({
	model: z.string().min(1),
	settings: z.record(z.string(), z.json()),
});
/** Manifest version 2: an operation run, the only run format Promptsmith stores. */
export const operationManifestSchema = z.strictObject({
	version: z.literal(2),
	runId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
	experimentId: z.string().min(1),
	evaluatorVersion: z.string().min(1),
	sourceRevision: z.string().min(1),
	startedAt: z.string().datetime(),
	corpus: z.strictObject({
		fingerprint: z.string(),
		caseIds: z.array(z.string()),
	}),
	/** How many times each case ran. Absent means once, as in every earlier run. */
	repetitions: z.number().int().min(2).optional(),
	operationVersion: z.string().min(1),
	configurations: z.strictObject({
		generation: configurationSchema,
		judgment: configurationSchema,
	}),
});
const qualitySchema = z.strictObject({
	passed: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	needsReview: z.number().int().nonnegative(),
	unscored: z.number().int().nonnegative(),
});
/** One case's agreement across its repetitions. */
const caseStabilitySchema = z.strictObject({
	repetitions: z.number().int().min(2),
	...qualitySchema.shape,
	flipped: z.boolean(),
	distinctOutputs: z.number().int().nonnegative(),
});
/** Agreement across every repeated case in a run. */
const runStabilitySchema = z.strictObject({
	repetitions: z.number().int().min(2),
	flipped: z.number().int().nonnegative(),
	varyingOutputs: z.number().int().nonnegative(),
	quality: qualitySchema,
});
const caseIdentityShape = {
	caseId: z.string(),
	input: z.json(),
	idealOutput: z.json(),
};
const runSummarySchema = z.strictObject({
	quality: qualitySchema.optional(),
	status: z.enum(["Completed", "Failed", "Interrupted"]),
	finishedAt: z.string().datetime(),
	total: z.number().int().nonnegative(),
	succeeded: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	interrupted: z.number().int().nonnegative(),
	stability: runStabilitySchema.optional(),
});
export const operationCaseRepetitionSchema = z.strictObject({
	status: z.enum([
		"Success",
		"Partial",
		"InvalidOutput",
		"ProviderFailure",
		"EvaluationFailure",
		"Interrupted",
		"Unresolved",
		"CatalogMiss",
		"InvalidInput",
		"NotImplemented",
	]),
	output: z.json().optional(),
	evaluation: z.json().optional(),
	error: z.string().optional(),
	durationMs: z.number().nonnegative(),
	metadata: z.json().optional(),
	traces: z.array(z.json()),
	calls: z.number().int().nonnegative(),
	usage: z.strictObject({
		inputTokens: z.number().nonnegative().nullable(),
		outputTokens: z.number().nonnegative().nullable(),
	}),
});
export const operationCaseRecordSchema = z.strictObject({
	...caseIdentityShape,
	...operationCaseRepetitionSchema.shape,
	repetitions: z.array(operationCaseRepetitionSchema).min(2).optional(),
	stability: caseStabilitySchema.optional(),
});
export const operationEvaluationRunSchema = z.strictObject({
	manifest: operationManifestSchema,
	cases: z.array(operationCaseRecordSchema),
	summary: runSummarySchema,
});
