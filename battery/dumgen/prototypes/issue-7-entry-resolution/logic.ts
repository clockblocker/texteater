import type {
	EntryCase,
	EntryFamily,
	IdentityDecision,
	InherentFeatures,
} from "./corpus";

export type FeaturePair = {
	readonly name: string;
	readonly value: string;
};

export type CanonicalCandidate = {
	readonly decision: IdentityDecision;
	readonly entryId: string | null;
	readonly family: EntryFamily;
	readonly subkind: string;
	readonly citationForm: string;
	readonly inherentFeatures: readonly FeaturePair[];
};

export type AttemptResult =
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
	readonly costUsd: number | null;
	readonly inputTokens: number;
	readonly cachedInputTokens: number;
	readonly outputTokens: number;
	readonly reasoningTokens: number;
	readonly rawOutputBytes: number;
	readonly result: AttemptResult;
};

export type Distribution = {
	readonly mean: number;
	readonly p50: number;
	readonly p95: number;
	readonly max: number;
};

export type ArmSummary = {
	readonly armId: string;
	readonly attempts: number;
	readonly invalidAttempts: number;
	readonly invalidAttemptRate: number;
	readonly identityExact: number;
	readonly familyExact: number;
	readonly subkindExact: number;
	readonly citationFormExact: number;
	readonly inherentFeaturesExact: number;
	readonly fullContractExact: number;
	readonly falseExistingMerges: number;
	readonly relationalAssertionsExact: number;
	readonly relationalAssertionFailures: readonly string[];
	readonly latencyMs: Distribution;
	readonly tokens: {
		readonly input: number;
		readonly cachedInput: number;
		readonly output: number;
		readonly reasoning: number;
	};
	readonly rawOutputBytes: number;
	readonly costUsd: number | null;
	readonly costPer1000CasesUsd: number | null;
};

export function validateCandidate(
	entryCase: EntryCase,
	candidate: CanonicalCandidate,
): AttemptResult {
	const featureNames = candidate.inherentFeatures.map(
		(feature) => feature.name,
	);
	if (new Set(featureNames).size !== featureNames.length) {
		return {
			ok: false,
			category: "duplicate_feature",
			message: "inherent feature names must be unique",
		};
	}
	if (
		candidate.decision === "Existing" &&
		(candidate.entryId === null ||
			!entryCase.candidates.some(
				(knownCandidate) =>
					knownCandidate.entryId === candidate.entryId,
			))
	) {
		return {
			ok: false,
			category: "unknown_existing_entry",
			message: "Existing must reference one supplied candidate ID",
		};
	}
	if (candidate.decision === "ProposeNew" && candidate.entryId !== null) {
		return {
			ok: false,
			category: "new_entry_has_id",
			message: "ProposeNew must use null entryId",
		};
	}
	return { ok: true, candidate };
}

export function scoreArm(
	armId: string,
	attempts: readonly AttemptForScoring[],
	corpus: readonly EntryCase[],
): ArmSummary {
	const byId = new Map(corpus.map((entryCase) => [entryCase.id, entryCase]));
	let invalidAttempts = 0;
	let identityExact = 0;
	let familyExact = 0;
	let subkindExact = 0;
	let citationFormExact = 0;
	let inherentFeaturesExact = 0;
	let fullContractExact = 0;
	let falseExistingMerges = 0;

	for (const attempt of attempts) {
		const gold = byId.get(attempt.caseId)?.gold;
		if (!gold) throw new Error(`Unknown case ${attempt.caseId}`);
		if (!attempt.result.ok) {
			invalidAttempts += 1;
			continue;
		}
		const candidate = attempt.result.candidate;
		const identityMatches =
			candidate.decision === gold.decision &&
			candidate.entryId === gold.entryId;
		const familyMatches = candidate.family === gold.family;
		const subkindMatches = candidate.subkind === gold.subkind;
		const citationMatches =
			nfc(candidate.citationForm) === nfc(gold.citationForm);
		const featuresMatch = equalFeatures(
			featureObject(candidate.inherentFeatures),
			gold.inherentFeatures,
		);
		identityExact += Number(identityMatches);
		familyExact += Number(familyMatches);
		subkindExact += Number(subkindMatches);
		citationFormExact += Number(citationMatches);
		inherentFeaturesExact += Number(featuresMatch);
		fullContractExact += Number(
			identityMatches &&
				familyMatches &&
				subkindMatches &&
				citationMatches &&
				featuresMatch,
		);
		falseExistingMerges += Number(
			gold.decision === "ProposeNew" && candidate.decision === "Existing",
		);
	}

	const relational = scoreRelationalAssertions(attempts);
	const count = attempts.length || 1;
	const totalCost = attempts.every((attempt) => attempt.costUsd !== null)
		? attempts.reduce((total, attempt) => total + (attempt.costUsd ?? 0), 0)
		: null;
	return {
		armId,
		attempts: attempts.length,
		invalidAttempts,
		invalidAttemptRate: invalidAttempts / count,
		identityExact: identityExact / count,
		familyExact: familyExact / count,
		subkindExact: subkindExact / count,
		citationFormExact: citationFormExact / count,
		inherentFeaturesExact: inherentFeaturesExact / count,
		fullContractExact: fullContractExact / count,
		falseExistingMerges,
		relationalAssertionsExact: relational.exact,
		relationalAssertionFailures: relational.failures,
		latencyMs: distribution(attempts.map((attempt) => attempt.latencyMs)),
		tokens: {
			input: sum(attempts.map((attempt) => attempt.inputTokens)),
			cachedInput: sum(
				attempts.map((attempt) => attempt.cachedInputTokens),
			),
			output: sum(attempts.map((attempt) => attempt.outputTokens)),
			reasoning: sum(attempts.map((attempt) => attempt.reasoningTokens)),
		},
		rawOutputBytes: sum(attempts.map((attempt) => attempt.rawOutputBytes)),
		costUsd: totalCost,
		costPer1000CasesUsd:
			totalCost === null ? null : (totalCost / count) * 1000,
	};
}

function scoreRelationalAssertions(attempts: readonly AttemptForScoring[]): {
	readonly exact: number;
	readonly failures: readonly string[];
} {
	const failures: string[] = [];
	const repetitions = [
		...new Set(attempts.map((attempt) => attempt.repetition)),
	];
	const assertions: readonly {
		readonly name: string;
		readonly caseIds: readonly string[];
		readonly predicate: (entryIds: readonly (string | null)[]) => boolean;
	}[] = [
		{
			name: "Schloss lock and palace share one Entry",
			caseIds: ["DE-10-SCHLOSS-LOCK", "DE-11-SCHLOSS-PALACE"],
			predicate: (ids) => ids[0] !== null && ids[0] === ids[1],
		},
		{
			name: "Bank finance and bench differ",
			caseIds: ["DE-12-BANK-FINANCE", "DE-13-BANK-BENCH"],
			predicate: (ids) =>
				ids.every((id) => id !== null) && ids[0] !== ids[1],
		},
		{
			name: "laut adjective and adposition differ",
			caseIds: ["DE-14-LAUT-ADJ", "DE-15-LAUT-ADP"],
			predicate: (ids) =>
				ids.every((id) => id !== null) && ids[0] !== ids[1],
		},
		{
			name: "laufen motor and clock share one Entry",
			caseIds: ["DE-16-LAUFEN-MOTOR", "DE-17-LAUFEN-CLOCK"],
			predicate: (ids) => ids[0] !== null && ids[0] === ids[1],
		},
		{
			name: "Russian коса homonyms all differ",
			caseIds: [
				"RU-01-KOSA-HAIR",
				"RU-02-KOSA-SCYTHE",
				"RU-03-KOSA-SPIT",
			],
			predicate: (ids) =>
				ids.every((id) => id !== null) &&
				new Set(ids).size === ids.length,
		},
		{
			name: "missing Ton identity proposes new",
			caseIds: ["DE-18-TON-NEW"],
			predicate: (ids) => ids[0] === null,
		},
	];
	let passed = 0;
	let total = 0;
	for (const repetition of repetitions) {
		for (const assertion of assertions) {
			total += 1;
			const selected = assertion.caseIds.map((caseId) =>
				attempts.find(
					(attempt) =>
						attempt.repetition === repetition &&
						attempt.caseId === caseId,
				),
			);
			const valid =
				selected.every((attempt) => attempt?.result.ok === true) &&
				assertion.predicate(
					selected.map((attempt) =>
						attempt?.result.ok
							? attempt.result.candidate.entryId
							: null,
					),
				);
			if (valid) {
				passed += 1;
			} else {
				failures.push(`rep ${repetition}: ${assertion.name}`);
			}
		}
	}
	return { exact: total === 0 ? 0 : passed / total, failures };
}

function featureObject(features: readonly FeaturePair[]): InherentFeatures {
	return Object.fromEntries(
		features.map((feature) => [feature.name, feature.value]),
	);
}

function equalFeatures(
	left: InherentFeatures,
	right: InherentFeatures,
): boolean {
	return (
		JSON.stringify(sortObject(left)) === JSON.stringify(sortObject(right))
	);
}

function sortObject(value: InherentFeatures): InherentFeatures {
	return Object.fromEntries(
		Object.entries(value).sort(([left], [right]) =>
			left.localeCompare(right),
		),
	);
}

function nfc(value: string): string {
	return value.normalize("NFC");
}

function sum(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function distribution(values: readonly number[]): Distribution {
	if (values.length === 0) return { mean: 0, p50: 0, p95: 0, max: 0 };
	const sorted = [...values].sort((left, right) => left - right);
	const quantile = (fraction: number) =>
		sorted[
			Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
		] ?? 0;
	return {
		mean: sum(sorted) / sorted.length,
		p50: quantile(0.5),
		p95: quantile(0.95),
		max: sorted[sorted.length - 1] ?? 0,
	};
}
