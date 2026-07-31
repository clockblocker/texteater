import type { GoldCase, Segment } from "./corpus";

export type CanonicalCandidate = {
	readonly surfaceSegmentIndices: readonly number[];
	readonly selectedOrthography: "Standard" | "Typo";
	readonly normalizedSurface: string;
	readonly spelling: "Canonical" | "Variant";
	readonly realizationCoverage: "Full" | "Partial";
};

export type AdaptResult =
	| { readonly ok: true; readonly candidate: CanonicalCandidate }
	| {
			readonly ok: false;
			readonly category: string;
			readonly message: string;
	  };

export type AttemptForScoring = {
	readonly caseId: string;
	readonly armId: string;
	readonly repetition: number;
	readonly latencyMs: number;
	readonly costUsd: number;
	readonly inputTokens: number;
	readonly cachedInputTokens: number;
	readonly outputTokens: number;
	readonly reasoningTokens: number;
	readonly rawOutputBytes: number;
	readonly parsedJsonBytes: number;
	readonly retryCount: number;
	readonly result: AdaptResult;
};

export type ArmSummary = {
	readonly armId: string;
	readonly attempts: number;
	readonly invalidAttempts: number;
	readonly invalidAttemptRate: number;
	readonly membershipExact: number;
	readonly membershipPrecision: number;
	readonly membershipRecall: number;
	readonly membershipF1: number;
	readonly attestedSurfaceExact: number;
	readonly selectedOrthographyExact: number;
	readonly normalizedSurfaceExact: number;
	readonly normalizationEligibleAttempts: number;
	readonly normalizedSurfaceExactGivenMembership: number;
	readonly spellingExact: number;
	readonly realizationCoverageExact: number;
	readonly fullContractExact: number;
	readonly ambiguousTextMappingFailures: number;
	readonly normalizationErrors: number;
	readonly normalizationErrorsGivenMembership: number;
	readonly whitespaceTokenExpansionViolations: number;
	readonly lemmatizationViolations: number;
	readonly falseTypoPropagation: number;
	readonly falseVariantErasure: number;
	readonly latencyMs: DistributionWithTotal;
	readonly tokens: {
		readonly input: DistributionWithTotal;
		readonly cachedInput: DistributionWithTotal;
		readonly output: DistributionWithTotal;
		readonly reasoning: DistributionWithTotal;
	};
	readonly rawOutputBytes: DistributionWithTotal;
	readonly parsedJsonBytes: DistributionWithTotal;
	readonly retryCount: DistributionWithTotal;
	readonly costUsd: number;
	readonly meanCostUsd: number;
	readonly costPer1000CasesUsd: number;
};

export type Distribution = {
	readonly mean: number;
	readonly p50: number;
	readonly p95: number;
	readonly max: number;
};

export type DistributionWithTotal = Distribution & {
	readonly total: number;
};

export function validateIndices(
	segments: readonly Segment[],
	clickedSegmentIndex: number,
	indices: readonly number[],
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
	if (indices.length === 0) {
		return { ok: false, message: "membership is empty" };
	}
	if (!indices.includes(clickedSegmentIndex)) {
		return { ok: false, message: "membership omits the clicked index" };
	}
	for (let position = 0; position < indices.length; position += 1) {
		const index = indices[position];
		if (
			!Number.isSafeInteger(index) ||
			index < 0 ||
			index >= segments.length
		) {
			return {
				ok: false,
				message: `index ${String(index)} is out of range`,
			};
		}
		if (segments[index]?.kind !== "ResolvableText") {
			return {
				ok: false,
				message: `index ${index} is not ResolvableText`,
			};
		}
		if (position > 0 && indices[position - 1] >= index) {
			return {
				ok: false,
				message: "membership indices are duplicate or non-ascending",
			};
		}
	}
	return { ok: true };
}

export function constructAttestedSurface(
	segments: readonly Segment[],
	indices: readonly number[],
): string {
	return joinMemberTexts(
		segments,
		indices,
		indices.map((index) => segments[index]?.text ?? ""),
	);
}

export function joinMemberTexts(
	segments: readonly Segment[],
	indices: readonly number[],
	memberTexts: readonly string[],
): string {
	let result = "";
	for (let position = 0; position < indices.length; position += 1) {
		const index = indices[position];
		if (position > 0) {
			const previousIndex = indices[position - 1] ?? index;
			const between = segments.slice(previousIndex + 1, index);
			if (between.some((segment) => segment.kind === "Whitespace")) {
				result += " ";
			}
		}
		result += memberTexts[position] ?? "";
	}
	return result;
}

export function adaptDirectIndices(
	goldCase: GoldCase,
	value: CanonicalCandidate,
): AdaptResult {
	const validity = validateIndices(
		goldCase.sentence.segments,
		goldCase.clickedSegmentIndex,
		value.surfaceSegmentIndices,
	);
	return validity.ok
		? { ok: true, candidate: value }
		: {
				ok: false,
				category: "invalid_indices",
				message: validity.message,
			};
}

export function adaptQuotedTexts(
	goldCase: GoldCase,
	value: Omit<CanonicalCandidate, "surfaceSegmentIndices"> & {
		readonly memberTexts: readonly string[];
	},
): AdaptResult {
	const resolved: number[] = [];
	for (const memberText of value.memberTexts) {
		const matches = goldCase.sentence.segments.flatMap((segment, index) =>
			segment.kind === "ResolvableText" && segment.text === memberText
				? [index]
				: [],
		);
		if (matches.length !== 1) {
			return {
				ok: false,
				category:
					matches.length === 0
						? "unmapped_member_text"
						: "ambiguous_text_mapping",
				message: `"${memberText}" matched ${matches.length} ResolvableText segments`,
			};
		}
		resolved.push(matches[0] ?? -1);
	}
	return adaptDirectIndices(goldCase, {
		surfaceSegmentIndices: resolved,
		selectedOrthography: value.selectedOrthography,
		normalizedSurface: value.normalizedSurface,
		spelling: value.spelling,
		realizationCoverage: value.realizationCoverage,
	});
}

export function adaptGuardedNormalization(
	goldCase: GoldCase,
	membership: Pick<
		CanonicalCandidate,
		"surfaceSegmentIndices" | "selectedOrthography"
	>,
	normalization: {
		readonly members: readonly {
			readonly index: number;
			readonly normalizedText: string;
		}[];
		readonly spelling: "Canonical" | "Variant";
		readonly realizationCoverage: "Full" | "Partial";
	},
): AdaptResult {
	const indices = membership.surfaceSegmentIndices;
	if (
		normalization.members.length !== indices.length ||
		normalization.members.some(
			(member, position) =>
				member.index !== indices[position] ||
				member.normalizedText.length === 0 ||
				/\s/u.test(member.normalizedText),
		)
	) {
		return {
			ok: false,
			category: "guarded_normalization_adapter",
			message:
				"normalization must return one whitespace-free item for each member index in order",
		};
	}
	return adaptDirectIndices(goldCase, {
		surfaceSegmentIndices: indices,
		selectedOrthography: membership.selectedOrthography,
		normalizedSurface: joinMemberTexts(
			goldCase.sentence.segments,
			indices,
			normalization.members.map((member) => member.normalizedText),
		),
		spelling: normalization.spelling,
		realizationCoverage: normalization.realizationCoverage,
	});
}

export function scoreArm(
	armId: string,
	attempts: readonly AttemptForScoring[],
	corpus: readonly GoldCase[],
): ArmSummary {
	const byId = new Map(corpus.map((goldCase) => [goldCase.id, goldCase]));
	let invalidAttempts = 0;
	let membershipExact = 0;
	let membershipTruePositive = 0;
	let membershipPredicted = 0;
	let membershipGold = 0;
	let attestedSurfaceExact = 0;
	let selectedOrthographyExact = 0;
	let normalizedSurfaceExact = 0;
	let normalizationEligibleAttempts = 0;
	let normalizedSurfaceExactGivenMembership = 0;
	let spellingExact = 0;
	let realizationCoverageExact = 0;
	let fullContractExact = 0;
	let ambiguousTextMappingFailures = 0;
	let normalizationErrors = 0;
	let whitespaceTokenExpansionViolations = 0;
	let lemmatizationViolations = 0;
	let falseTypoPropagation = 0;
	let falseVariantErasure = 0;

	for (const attempt of attempts) {
		const goldCase = byId.get(attempt.caseId);
		if (!goldCase) throw new Error(`Unknown case ${attempt.caseId}`);
		membershipGold += goldCase.surfaceSegmentIndices.length;
		if (!attempt.result.ok) {
			invalidAttempts += 1;
			// The fixed contract gives an invalid attempt zero membership
			// precision as well as zero recall. Represent its unalignable
			// prediction as a disjoint set the size of the gold set.
			membershipPredicted += goldCase.surfaceSegmentIndices.length;
			if (attempt.result.category === "ambiguous_text_mapping") {
				ambiguousTextMappingFailures += 1;
			}
			continue;
		}

		const candidate = attempt.result.candidate;
		const predictedSet = new Set(candidate.surfaceSegmentIndices);
		membershipPredicted += predictedSet.size;
		membershipTruePositive += goldCase.surfaceSegmentIndices.filter(
			(index) => predictedSet.has(index),
		).length;

		const membershipMatches = equalArrays(
			candidate.surfaceSegmentIndices,
			goldCase.surfaceSegmentIndices,
		);
		const orthographyMatches =
			candidate.selectedOrthography === goldCase.selectedOrthography;
		const attestedSurfaceMatches =
			nfc(
				constructAttestedSurface(
					goldCase.sentence.segments,
					candidate.surfaceSegmentIndices,
				),
			) === nfc(goldCase.attestedSurface);
		const normalizationMatches =
			nfc(candidate.normalizedSurface) ===
			nfc(goldCase.normalizedSurface);
		const spellingMatches = candidate.spelling === goldCase.spelling;
		const coverageMatches =
			candidate.realizationCoverage === goldCase.realizationCoverage;

		membershipExact += Number(membershipMatches);
		attestedSurfaceExact += Number(attestedSurfaceMatches);
		selectedOrthographyExact += Number(orthographyMatches);
		normalizedSurfaceExact += Number(normalizationMatches);
		if (membershipMatches) {
			normalizationEligibleAttempts += 1;
			normalizedSurfaceExactGivenMembership +=
				Number(normalizationMatches);
		}
		spellingExact += Number(spellingMatches);
		realizationCoverageExact += Number(coverageMatches);
		fullContractExact += Number(
			membershipMatches &&
				orthographyMatches &&
				normalizationMatches &&
				spellingMatches &&
				coverageMatches,
		);
		normalizationErrors += Number(!normalizationMatches);
		whitespaceTokenExpansionViolations += Number(
			wordCount(candidate.normalizedSurface) >
				wordCount(
					constructAttestedSurface(
						goldCase.sentence.segments,
						candidate.surfaceSegmentIndices,
					),
				),
		);
		lemmatizationViolations += Number(
			isKnownLemmatization(goldCase.id, candidate.normalizedSurface),
		);
		falseTypoPropagation += Number(
			(goldCase.id === "CR-02@4" || goldCase.id === "CR-03@4") &&
				candidate.selectedOrthography === "Typo",
		);
		falseVariantErasure += Number(
			goldCase.id === "CR-10@2" &&
				(candidate.spelling !== "Variant" ||
					nfc(candidate.normalizedSurface) !== "armour"),
		);
	}

	const total = attempts.length;
	const membershipPrecision = divide(
		membershipTruePositive,
		membershipPredicted,
	);
	const membershipRecall = divide(membershipTruePositive, membershipGold);
	return {
		armId,
		attempts: total,
		invalidAttempts,
		invalidAttemptRate: divide(invalidAttempts, total),
		membershipExact: divide(membershipExact, total),
		membershipPrecision,
		membershipRecall,
		membershipF1:
			membershipPrecision + membershipRecall === 0
				? 0
				: (2 * membershipPrecision * membershipRecall) /
					(membershipPrecision + membershipRecall),
		attestedSurfaceExact: divide(attestedSurfaceExact, total),
		selectedOrthographyExact: divide(selectedOrthographyExact, total),
		normalizedSurfaceExact: divide(normalizedSurfaceExact, total),
		normalizationEligibleAttempts,
		normalizedSurfaceExactGivenMembership: divide(
			normalizedSurfaceExactGivenMembership,
			normalizationEligibleAttempts,
		),
		spellingExact: divide(spellingExact, total),
		realizationCoverageExact: divide(realizationCoverageExact, total),
		fullContractExact: divide(fullContractExact, total),
		ambiguousTextMappingFailures,
		normalizationErrors,
		normalizationErrorsGivenMembership:
			normalizationEligibleAttempts -
			normalizedSurfaceExactGivenMembership,
		whitespaceTokenExpansionViolations,
		lemmatizationViolations,
		falseTypoPropagation,
		falseVariantErasure,
		latencyMs: distribution(attempts.map((attempt) => attempt.latencyMs)),
		tokens: {
			input: distribution(attempts.map((attempt) => attempt.inputTokens)),
			cachedInput: distribution(
				attempts.map((attempt) => attempt.cachedInputTokens),
			),
			output: distribution(
				attempts.map((attempt) => attempt.outputTokens),
			),
			reasoning: distribution(
				attempts.map((attempt) => attempt.reasoningTokens),
			),
		},
		rawOutputBytes: distribution(
			attempts.map((attempt) => attempt.rawOutputBytes),
		),
		parsedJsonBytes: distribution(
			attempts.map((attempt) => attempt.parsedJsonBytes),
		),
		retryCount: distribution(attempts.map((attempt) => attempt.retryCount)),
		costUsd: sum(attempts.map((attempt) => attempt.costUsd)),
		meanCostUsd: divide(
			sum(attempts.map((attempt) => attempt.costUsd)),
			total,
		),
		costPer1000CasesUsd:
			total === 0
				? 0
				: (sum(attempts.map((attempt) => attempt.costUsd)) / total) *
					1000,
	};
}

function distribution(values: readonly number[]): DistributionWithTotal {
	if (values.length === 0) {
		return { mean: 0, p50: 0, p95: 0, max: 0, total: 0 };
	}
	const sorted = [...values].sort((left, right) => left - right);
	return {
		mean: sum(sorted) / sorted.length,
		p50: percentile(sorted, 0.5),
		p95: percentile(sorted, 0.95),
		max: sorted.at(-1) ?? 0,
		total: sum(sorted),
	};
}

function percentile(sorted: readonly number[], quantile: number): number {
	const index = Math.ceil(quantile * sorted.length) - 1;
	return sorted[Math.max(0, index)] ?? 0;
}

function equalArrays(
	left: readonly number[],
	right: readonly number[],
): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function nfc(value: string): string {
	return value.normalize("NFC");
}

function wordCount(value: string): number {
	const trimmed = value.trim();
	return trimmed === "" ? 0 : trimmed.split(/\s+/u).length;
}

function isKnownLemmatization(caseId: string, value: string): boolean {
	const forbidden: Readonly<Record<string, readonly string[]>> = {
		"CR-02@2": ["give up"],
		"CR-02@4": ["give up"],
		"CR-04@2": ["heulen", "mit den Wölfen heulen"],
		"CR-04@4": ["heulen", "mit den Wölfen heulen"],
		"CR-05@0": ["aufpassen"],
		"CR-05@6": ["aufpassen"],
		"CR-06@2": ["nur Bahnhof verstehen"],
		"CR-07@6": ["rot"],
		"CR-13@2": ["spielen"],
		"CR-14@2": ["spielen"],
		"CR-16@4": ["laufen"],
		"CR-17@4": ["laufen"],
	};
	return (forbidden[caseId] ?? []).includes(value.normalize("NFC"));
}

function divide(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : numerator / denominator;
}

function sum(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0);
}
