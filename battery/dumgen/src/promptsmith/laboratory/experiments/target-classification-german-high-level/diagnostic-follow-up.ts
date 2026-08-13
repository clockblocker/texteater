import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import {
	additionalIndicesOutputSchema,
	classificationTargetSchema,
} from "./representations";

export const DIAGNOSTIC_FOLLOW_UP_SYSTEM_INSTRUCTION = [
	"Produce a neutral, non-scoring diagnostic note about the retained German target-classification exchange.",
	"Use only the supplied original input and original answer. Do not infer unseen scores, labels, reference answers, or selection metadata.",
	"Return only the requested structured fields with concise conclusions grounded in visible segments and a named rule.",
	"Do not provide hidden chain-of-thought or a step-by-step internal reasoning transcript.",
].join("\n");

const conciseReason = z.string().trim().min(1).max(500);

export const diagnosticFollowUpOutputSchema = z
	.strictObject({
		chosenUnit: classificationTargetSchema.nullable(),
		clickRole: z.enum([
			"SoleMember",
			"FixedMember",
			"FreeMember",
			"OutsideChosenUnit",
			"NoChosenUnit",
		]),
		segmentJudgments: z
			.array(
				z.strictObject({
					index: z.number().int().nonnegative(),
					judgment: z.enum(["Fixed", "Free"]),
					reason: conciseReason,
				}),
			)
			.min(1),
		ruleApplied: conciseReason,
		conciseCritique: conciseReason,
		wouldRevise: z.boolean(),
		correctedClassification: additionalIndicesOutputSchema.nullable(),
	})
	.superRefine((diagnostic, context) => {
		if (
			diagnostic.chosenUnit === null &&
			diagnostic.clickRole !== "NoChosenUnit"
		) {
			context.addIssue({
				code: "custom",
				path: ["clickRole"],
				message: "A null chosenUnit requires NoChosenUnit.",
			});
		}
		if (
			diagnostic.chosenUnit !== null &&
			diagnostic.clickRole === "NoChosenUnit"
		) {
			context.addIssue({
				code: "custom",
				path: ["clickRole"],
				message: "NoChosenUnit requires a null chosenUnit.",
			});
		}
		if (
			!diagnostic.wouldRevise &&
			diagnostic.correctedClassification !== null
		) {
			context.addIssue({
				code: "custom",
				path: ["correctedClassification"],
				message: "A retained classification cannot have a correction.",
			});
		}
	});

export type DiagnosticFollowUpOutput = z.output<
	typeof diagnosticFollowUpOutputSchema
>;

export type RetainedFirstTurnAttempt = Readonly<{
	key: string;
	caseId: string;
	privateInput: unknown;
	privateOutputJson: unknown;
	canonicalInput: unknown;
	canonicalOutput?: unknown;
	evaluation: Readonly<Record<string, unknown>>;
}>;

const retainedFirstTurnAttemptSchema = z.custom<RetainedFirstTurnAttempt>(
	(value) =>
		isRecord(value) &&
		typeof value.key === "string" &&
		value.key.length > 0 &&
		typeof value.caseId === "string" &&
		value.caseId.length > 0 &&
		"privateInput" in value &&
		"privateOutputJson" in value &&
		"canonicalInput" in value &&
		isRecord(value.evaluation),
	{
		error: "Expected a retained first-turn attempt.",
	},
);

export const retainedDiagnosticFollowUpSchema = z.strictObject({
	purpose: z.literal("diagnostic-follow-up"),
	scoring: z.literal("excluded"),
	winnerEligible: z.literal(false),
	sourceAttempt: retainedFirstTurnAttemptSchema,
	selectionReason: z.string().trim().min(1),
	cluster: z.string().trim().min(1),
	rawOutputText: z.string().min(1),
	diagnostic: diagnosticFollowUpOutputSchema,
});

export type RetainedDiagnosticFollowUp = z.output<
	typeof retainedDiagnosticFollowUpSchema
>;

export type ParseDiagnosticFollowUpResponseArgs = Readonly<{
	attempt: RetainedFirstTurnAttempt;
	cluster: string;
	rawOutputText: string;
	selectionReason: string;
}>;

export function parseDiagnosticFollowUpResponse(
	args: ParseDiagnosticFollowUpResponseArgs,
): RetainedDiagnosticFollowUp {
	const diagnostic = diagnosticFollowUpOutputSchema.parse(
		JSON.parse(args.rawOutputText),
	);
	return Object.freeze(
		retainedDiagnosticFollowUpSchema.parse({
			purpose: "diagnostic-follow-up",
			scoring: "excluded",
			winnerEligible: false,
			sourceAttempt: args.attempt,
			selectionReason: args.selectionReason,
			cluster: args.cluster,
			rawOutputText: args.rawOutputText,
			diagnostic,
		}),
	);
}

export type PrepareDiagnosticFollowUpRequestArgs = Readonly<{
	attempt: RetainedFirstTurnAttempt;
	model: string;
	promptCacheKey?: string;
}>;

export function prepareDiagnosticFollowUpRequest(
	args: PrepareDiagnosticFollowUpRequestArgs,
) {
	const diagnosticInstruction = [
		"Identify the chosen unit and the clicked segment's role, judge the relevant segments as fixed or free, name the rule applied, and briefly critique the retained answer.",
		"Set wouldRevise to say whether you would now change the retained answer. correctedClassification is optional in meaning: use null when no concise correction is warranted; otherwise use the same index-based classification shape as the original answer.",
		"This artifact is excluded from scoring, cannot be winner-eligible, and must not change or replace the retained first-turn output or evaluation.",
	].join("\n");

	return {
		model: args.model,
		input: [
			{
				role: "system",
				content: DIAGNOSTIC_FOLLOW_UP_SYSTEM_INSTRUCTION,
			},
			{
				role: "user",
				content: stableJson(args.attempt.privateInput),
			},
			{
				role: "assistant",
				content: stableJson(args.attempt.privateOutputJson),
			},
			{ role: "user", content: diagnosticInstruction },
		],
		max_output_tokens: 512,
		...(args.promptCacheKey === undefined
			? {}
			: { prompt_cache_key: args.promptCacheKey }),
		reasoning: { effort: "none" },
		store: false,
		text: {
			format: zodTextFormat(
				diagnosticFollowUpOutputSchema,
				"target_classification_diagnostic_follow_up",
			),
			verbosity: "low",
		},
	} satisfies ResponseCreateParamsNonStreaming;
}

export type DiagnosticFollowUpRequest = ReturnType<
	typeof prepareDiagnosticFollowUpRequest
>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
