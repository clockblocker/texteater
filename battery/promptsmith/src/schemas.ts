import { z } from "zod";

export const configurationSchema = z.strictObject({
	model: z.string().min(1),
	settings: z.record(z.string(), z.json()),
});
export const runManifestSchema = z.strictObject({
	version: z.literal(1),
	runId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
	experimentId: z.string().min(1),
	evaluatorVersion: z.string().min(1),
	sourceRevision: z.string().min(1),
	startedAt: z.string().datetime(),
	prompt: z.strictObject({
		route: z.string(),
		fingerprint: z.string(),
		schemaFingerprint: z.string(),
	}),
	corpus: z.strictObject({
		fingerprint: z.string(),
		caseIds: z.array(z.string()),
	}),
	configuration: configurationSchema,
});
export const caseRecordSchema = z.strictObject({
	caseId: z.string(),
	status: z.enum([
		"Success",
		"InvalidOutput",
		"ProviderFailure",
		"EvaluationFailure",
		"Interrupted",
	]),
	input: z.json(),
	idealOutput: z.json(),
	output: z.json().optional(),
	evaluation: z.json().optional(),
	error: z.string().optional(),
	durationMs: z.number().nonnegative(),
	metadata: z.json().optional(),
});
export const runSummarySchema = z.strictObject({
	status: z.enum(["Completed", "Failed", "Interrupted"]),
	finishedAt: z.string().datetime(),
	total: z.number().int().nonnegative(),
	succeeded: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	interrupted: z.number().int().nonnegative(),
});
export const evaluationRunSchema = z.strictObject({
	manifest: runManifestSchema,
	cases: z.array(caseRecordSchema),
	summary: runSummarySchema,
});
