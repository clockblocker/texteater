import { describe, expect, test } from "bun:test";

import {
	DIAGNOSTIC_FOLLOW_UP_SYSTEM_INSTRUCTION,
	diagnosticFollowUpOutputSchema,
	parseDiagnosticFollowUpResponse,
	prepareDiagnosticFollowUpRequest,
	retainedDiagnosticFollowUpSchema,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/diagnostic-follow-up";

const firstTurnAttempt = Object.freeze({
	key: "additional-compact-indices/1/target-de-boundary-fusion-zum",
	caseId: "target-de-boundary-fusion-zum",
	privateInput: Object.freeze({
		clickedIndex: 1,
		segments: Object.freeze(["Sie", "zum"]),
	}),
	privateOutputJson: Object.freeze({
		decision: "Resolved",
		target: Object.freeze({
			family: "Lexeme",
			kind: "ADP",
			membership: null,
		}),
	}),
	canonicalInput: Object.freeze({
		clickedSegmentIndex: 2,
		segments: Object.freeze([
			Object.freeze({ kind: "ResolvableText", text: "Sie" }),
			Object.freeze({ kind: "Whitespace", text: " " }),
			Object.freeze({ kind: "ResolvableText", text: "zum" }),
		]),
	}),
	canonicalOutput: Object.freeze({
		decision: "Resolved",
		target: Object.freeze({
			family: "Lexeme",
			kind: "ADP",
			memberSegmentIndices: Object.freeze([2]),
		}),
	}),
	evaluation: Object.freeze({ contractPass: false, routePass: false }),
});

describe("target-classification diagnostic follow-up", () => {
	test("prepares a concise non-scoring second turn from a retained attempt", () => {
		const before = JSON.stringify(firstTurnAttempt);
		const request = prepareDiagnosticFollowUpRequest({
			attempt: firstTurnAttempt,
			model: "gpt-5.6-luna",
			promptCacheKey: "diagnostic-contract-test",
		});

		expect(request).toMatchObject({
			model: "gpt-5.6-luna",
			max_output_tokens: 512,
			prompt_cache_key: "diagnostic-contract-test",
			reasoning: { effort: "none" },
			store: false,
			text: { verbosity: "low" },
		});
		expect(request.input).toHaveLength(4);
		expect(request.input[0]).toEqual({
			role: "system",
			content: DIAGNOSTIC_FOLLOW_UP_SYSTEM_INSTRUCTION,
		});
		expect(request.input[1]).toEqual({
			role: "user",
			content: '{"clickedIndex":1,"segments":["Sie","zum"]}',
		});
		expect(request.input[2]).toEqual({
			role: "assistant",
			content:
				'{"decision":"Resolved","target":{"family":"Lexeme","kind":"ADP","membership":null}}',
		});
		const modelFacingTranscript = JSON.stringify(request.input);
		expect(modelFacingTranscript).toContain(
			"Do not provide hidden chain-of-thought",
		);
		expect(modelFacingTranscript).toContain("excluded from scoring");
		expect(modelFacingTranscript).toContain("cannot be winner-eligible");
		expect(modelFacingTranscript).toContain(
			"must not change or replace the retained first-turn output or evaluation",
		);
		expect(modelFacingTranscript).not.toContain(
			"Classify the clicked German segment",
		);
		expect(modelFacingTranscript).not.toContain("first-turn route miss");
		expect(modelFacingTranscript).not.toContain("contractPass");
		expect(modelFacingTranscript).not.toContain("routePass");
		expect(modelFacingTranscript).not.toContain("canonicalInput");
		expect(modelFacingTranscript).not.toContain("Whitespace");
		expect(modelFacingTranscript).not.toContain("oracle");
		expect(request.text.format).toBeDefined();
		expect(() =>
			diagnosticFollowUpOutputSchema.parse({
				chosenUnit: {
					family: "Construction",
					kind: "Fusion",
					membership: null,
				},
				clickRole: "SoleMember",
				segmentJudgments: [
					{
						index: 1,
						judgment: "Fixed",
						reason: "zum is the fixed fused realization of zu plus dem.",
					},
				],
				ruleApplied:
					"An article-preposition fusion is classified as one Fusion construction.",
				conciseCritique:
					"The first turn treated the fused form as a free adposition.",
				wouldRevise: true,
				correctedClassification: {
					decision: "Resolved",
					target: {
						family: "Construction",
						kind: "Fusion",
						membership: null,
					},
				},
			}),
		).not.toThrow();
		expect(JSON.stringify(firstTurnAttempt)).toBe(before);
	});

	test("retains a parsed diagnostic beside the unchanged first-turn evidence", () => {
		const before = JSON.stringify(firstTurnAttempt);
		const followUp = parseDiagnosticFollowUpResponse({
			attempt: firstTurnAttempt,
			cluster: "Fusion",
			rawOutputText: JSON.stringify({
				chosenUnit: {
					family: "Construction",
					kind: "Fusion",
					membership: null,
				},
				clickRole: "SoleMember",
				segmentJudgments: [
					{
						index: 1,
						judgment: "Fixed",
						reason: "zum is a fixed fusion of zu and dem.",
					},
				],
				ruleApplied:
					"A fused preposition and article form one Fusion construction.",
				conciseCritique:
					"The retained answer selected the productive ADP route instead.",
				wouldRevise: true,
				correctedClassification: {
					decision: "Resolved",
					target: {
						family: "Construction",
						kind: "Fusion",
						membership: null,
					},
				},
			}),
			selectionReason: "first-turn route miss",
		});

		expect(followUp).toMatchObject({
			purpose: "diagnostic-follow-up",
			scoring: "excluded",
			winnerEligible: false,
			cluster: "Fusion",
			selectionReason: "first-turn route miss",
			diagnostic: {
				wouldRevise: true,
				correctedClassification: {
					decision: "Resolved",
					target: { family: "Construction", kind: "Fusion" },
				},
			},
		});
		expect(followUp.sourceAttempt).toBe(firstTurnAttempt);
		expect(followUp.sourceAttempt.privateOutputJson).toBe(
			firstTurnAttempt.privateOutputJson,
		);
		expect(followUp.sourceAttempt.evaluation).toBe(
			firstTurnAttempt.evaluation,
		);
		expect(Object.hasOwn(followUp, "canonicalOutput")).toBe(false);
		expect(Object.hasOwn(followUp, "evaluation")).toBe(false);
		expect(() =>
			retainedDiagnosticFollowUpSchema.parse(followUp),
		).not.toThrow();
		expect(JSON.stringify(firstTurnAttempt)).toBe(before);
	});
});
