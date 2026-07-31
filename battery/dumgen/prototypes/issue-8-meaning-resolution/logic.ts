import type { MeaningCase, MeaningDraft } from "./corpus";
import type { ArmId } from "./prompts";

export type MeaningCandidateOutput = {
	readonly decision: "ReuseExisting" | "DraftNew";
	readonly existingMeaningId: string | null;
	readonly draft: MeaningDraft | null;
};

export type AttemptResult =
	| {
			readonly ok: true;
			readonly candidate: MeaningCandidateOutput;
			readonly exact: boolean;
			readonly decisionExact: boolean;
			readonly reuseIdExact: boolean | null;
			readonly draftExact: boolean | null;
	  }
	| {
			readonly ok: false;
			readonly category: string;
			readonly message: string;
	  };

export type AttemptForScoring = {
	readonly armId: ArmId;
	readonly caseId: string;
	readonly repetition: number;
	readonly latencyMs: number;
	readonly rawOutputBytes: number;
	readonly usage: {
		readonly inputTokens: number;
		readonly cachedInputTokens: number;
		readonly outputTokens: number;
		readonly reasoningTokens: number;
	};
	readonly result: AttemptResult;
};

export function validateOutput(
	meaningCase: MeaningCase,
	output: MeaningCandidateOutput,
): AttemptResult {
	if (output.decision === "ReuseExisting") {
		if (output.existingMeaningId === null || output.draft !== null) {
			return invalid(
				"contract_shape",
				"reuse must have an ID and null draft",
			);
		}
		if (
			!meaningCase.candidates.some(
				(candidate) => candidate.meaningId === output.existingMeaningId,
			)
		) {
			return invalid(
				"unknown_meaning_id",
				"reuse selected an ID outside the supplied inventory",
			);
		}
	} else if (output.existingMeaningId !== null || output.draft === null) {
		return invalid(
			"contract_shape",
			"draft must have a null existing ID and a draft",
		);
	}

	const decisionExact = output.decision === meaningCase.gold.decision;
	const reuseIdExact =
		meaningCase.gold.decision === "ReuseExisting"
			? output.decision === "ReuseExisting" &&
				output.existingMeaningId === meaningCase.gold.meaningId
			: null;
	const draftExact =
		meaningCase.gold.decision === "DraftNew"
			? output.decision === "DraftNew" &&
				output.draft !== null &&
				equalDraft(output.draft, meaningCase.gold.draft)
			: null;
	return {
		ok: true,
		candidate: output,
		exact: reuseIdExact ?? draftExact ?? false,
		decisionExact,
		reuseIdExact,
		draftExact,
	};
}

export function scoreArm(
	armId: ArmId,
	attempts: readonly AttemptForScoring[],
	corpus: readonly MeaningCase[],
) {
	const valid = attempts.filter(
		(
			attempt,
		): attempt is AttemptForScoring & {
			result: Extract<AttemptResult, { ok: true }>;
		} => attempt.result.ok,
	);
	const caseById = new Map(
		corpus.map((meaningCase) => [meaningCase.id, meaningCase]),
	);
	const reuseAttempts = valid.filter(
		(attempt) =>
			caseById.get(attempt.caseId)?.gold.decision === "ReuseExisting",
	);
	const draftAttempts = valid.filter(
		(attempt) => caseById.get(attempt.caseId)?.gold.decision === "DraftNew",
	);
	const pennyAttempts = valid.filter(
		(attempt) => caseById.get(attempt.caseId)?.group === "penny-control",
	);
	const mergeTrapAttempts = valid.filter(
		(attempt) => caseById.get(attempt.caseId)?.group === "false-merge-trap",
	);
	const sortedLatencies = attempts
		.map((attempt) => attempt.latencyMs)
		.sort(numeric);
	const usage = attempts.reduce(
		(total, attempt) => ({
			inputTokens: total.inputTokens + attempt.usage.inputTokens,
			cachedInputTokens:
				total.cachedInputTokens + attempt.usage.cachedInputTokens,
			outputTokens: total.outputTokens + attempt.usage.outputTokens,
			reasoningTokens:
				total.reasoningTokens + attempt.usage.reasoningTokens,
		}),
		{
			inputTokens: 0,
			cachedInputTokens: 0,
			outputTokens: 0,
			reasoningTokens: 0,
		},
	);
	return {
		armId,
		attempts: attempts.length,
		invalidAttempts: attempts.length - valid.length,
		invalidAttemptRate: ratio(
			attempts.length - valid.length,
			attempts.length,
		),
		fullExact: ratio(
			valid.filter((attempt) => attempt.result.exact).length,
			attempts.length,
		),
		decisionExact: ratio(
			valid.filter((attempt) => attempt.result.decisionExact).length,
			attempts.length,
		),
		reuseIdExact: ratio(
			reuseAttempts.filter((attempt) => attempt.result.reuseIdExact)
				.length,
			reuseAttempts.length,
		),
		draftExact: ratio(
			draftAttempts.filter((attempt) => attempt.result.draftExact).length,
			draftAttempts.length,
		),
		falseSplitRate: ratio(
			pennyAttempts.filter(
				(attempt) => attempt.result.candidate.decision === "DraftNew",
			).length,
			pennyAttempts.length,
		),
		falseMergeRate: ratio(
			mergeTrapAttempts.filter(
				(attempt) =>
					attempt.result.candidate.decision === "ReuseExisting",
			).length,
			mergeTrapAttempts.length,
		),
		groupExact: Object.fromEntries(
			[
				"baseline-reuse",
				"penny-control",
				"false-merge-trap",
				"multi-candidate",
				"empty-inventory",
			].map((group) => {
				const groupAttempts = valid.filter(
					(attempt) => caseById.get(attempt.caseId)?.group === group,
				);
				return [
					group,
					ratio(
						groupAttempts.filter((attempt) => attempt.result.exact)
							.length,
						groupAttempts.length,
					),
				];
			}),
		),
		caseFailures: corpus
			.map((meaningCase) => {
				const caseAttempts = valid.filter(
					(attempt) => attempt.caseId === meaningCase.id,
				);
				const failures = caseAttempts.filter(
					(attempt) => !attempt.result.exact,
				).length;
				return failures === 0
					? null
					: `${meaningCase.id}: ${failures}/${attemptsForCase(attempts, meaningCase.id)}`;
			})
			.filter((value): value is string => value !== null),
		latencyMs: {
			mean:
				attempts.reduce((sum, attempt) => sum + attempt.latencyMs, 0) /
				attempts.length,
			p50: percentile(sortedLatencies, 0.5),
			p95: percentile(sortedLatencies, 0.95),
			max: sortedLatencies.at(-1) ?? 0,
		},
		tokens: usage,
		rawOutputBytes: attempts.reduce(
			(sum, attempt) => sum + attempt.rawOutputBytes,
			0,
		),
		costUsd: cost(usage),
	};
}

function invalid(category: string, message: string): AttemptResult {
	return { ok: false, category, message };
}

function equalDraft(left: MeaningDraft, right: MeaningDraft): boolean {
	return (
		left.meaningInEmojis.normalize("NFC") ===
			right.meaningInEmojis.normalize("NFC") &&
		JSON.stringify(
			left.descriptionBlocks.map((value) => value.normalize("NFC")),
		) ===
			JSON.stringify(
				right.descriptionBlocks.map((value) => value.normalize("NFC")),
			)
	);
}

function ratio(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : numerator / denominator;
}

function numeric(left: number, right: number): number {
	return left - right;
}

function percentile(values: readonly number[], quantile: number): number {
	if (values.length === 0) return 0;
	return (
		values[
			Math.min(values.length - 1, Math.floor(values.length * quantile))
		] ?? 0
	);
}

function attemptsForCase(
	attempts: readonly AttemptForScoring[],
	caseId: string,
): number {
	return attempts.filter((attempt) => attempt.caseId === caseId).length;
}

function cost(usage: {
	readonly inputTokens: number;
	readonly cachedInputTokens: number;
	readonly outputTokens: number;
}): number {
	const uncachedInput = usage.inputTokens - usage.cachedInputTokens;
	return (
		(uncachedInput * 0.05 +
			usage.cachedInputTokens * 0.005 +
			usage.outputTokens * 0.4) /
		1_000_000
	);
}
