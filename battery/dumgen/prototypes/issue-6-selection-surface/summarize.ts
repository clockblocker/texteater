import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CORPUS, type GoldCase } from "./corpus";
import {
	type AttemptForScoring,
	constructAttestedSurface,
	scoreArm,
} from "./logic";
import { ARM_IDS, type ArmId } from "./prompts";

type RetainedAttempt = AttemptForScoring & {
	readonly rawResponses?: readonly Record<string, unknown>[];
};

type AttemptChecks = {
	readonly membership: boolean;
	readonly attestedSurface: boolean;
	readonly orthography: boolean;
	readonly normalization: boolean;
	readonly spelling: boolean;
	readonly coverage: boolean;
	readonly full: boolean;
	readonly whitespaceTokenExpansion: boolean;
	readonly lemmatization: boolean;
};

type RelationalAssertion = {
	readonly id: string;
	readonly label: string;
	readonly scope: "full" | "in-scope projection";
	readonly excludedContractFields: readonly string[];
	readonly evaluate: (
		attempts: ReadonlyMap<string, RetainedAttempt>,
	) => boolean;
};

const prototypeDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(prototypeDirectory, "results");
const manifest = await Bun.file(join(resultsDirectory, "manifest.json")).json();
const corpusById = new Map(CORPUS.map((goldCase) => [goldCase.id, goldCase]));
const attemptsByArm = new Map<ArmId, RetainedAttempt[]>();

for (const armId of ARM_IDS) {
	const path = join(resultsDirectory, `${armId}.jsonl`);
	const text = await Bun.file(path).text();
	const attempts = text
		.trim()
		.split("\n")
		.map((line) => enrichAttempt(JSON.parse(line) as RetainedAttempt));
	attemptsByArm.set(armId, attempts);
	await writeFile(
		path,
		`${attempts.map((attempt) => JSON.stringify(attempt)).join("\n")}\n`,
		"utf8",
	);
}

const summaries = ARM_IDS.map((armId) =>
	scoreArm(armId, attemptsByArm.get(armId) ?? [], CORPUS),
);
const details = {
	generatedAt: new Date().toISOString(),
	scope: "Issue #6 Selection membership and contextual Surface subset. Surface kind/features, Entry, and Meaning fields from the full #5 chain are not produced or scored.",
	perCase: makePerCaseReports(),
	macroByRequiredCaseGroup: makeGroupReports(),
	relationalAssertions: makeRelationalReports(),
	normalizationViolationScope:
		"Whitespace-token expansion and a fixed exact lemmatization oracle are reported. Whitespace-token expansion is not a general proof of lexical insertion safety; that unimplemented full #5 gate prevents production eligibility.",
};

await writeFile(
	join(resultsDirectory, "summary.json"),
	`${JSON.stringify(summaries, null, 2)}\n`,
	"utf8",
);
await writeFile(
	join(resultsDirectory, "detailed.json"),
	`${JSON.stringify(details, null, 2)}\n`,
	"utf8",
);
await writeFile(
	join(resultsDirectory, "summary.md"),
	renderSummary(summaries, details, manifest),
	"utf8",
);

console.table(
	summaries.map((summary) => ({
		arm: summary.armId,
		full: percent(summary.fullContractExact),
		membership: percent(summary.membershipExact),
		membershipF1: percent(summary.membershipF1),
		normalizationGivenMembership: percent(
			summary.normalizedSurfaceExactGivenMembership,
		),
		whitespaceExpansions: summary.whitespaceTokenExpansionViolations,
		lemmatizations: summary.lemmatizationViolations,
		invalid: percent(summary.invalidAttemptRate),
		p95ms: Math.round(summary.latencyMs.p95),
		cost: `$${summary.costUsd.toFixed(6)}`,
	})),
);

function enrichAttempt(attempt: RetainedAttempt): RetainedAttempt {
	return {
		...attempt,
		rawOutputBytes: rawOutputBytes(attempt.rawResponses ?? []),
		parsedJsonBytes:
			attempt.parsedJsonBytes ??
			parsedJsonBytes(attempt.rawResponses ?? []),
		retryCount: attempt.retryCount ?? 0,
	};
}

function rawOutputBytes(responses: readonly Record<string, unknown>[]): number {
	return responses.reduce((total, response) => {
		let bytes = 0;
		if (
			typeof response.output_text === "string" &&
			response.output_text.length > 0
		) {
			bytes += Buffer.byteLength(response.output_text, "utf8");
		}
		if (Array.isArray(response.output)) {
			for (const item of response.output) {
				if (
					typeof item === "object" &&
					item !== null &&
					"type" in item &&
					item.type === "function_call" &&
					"arguments" in item &&
					typeof item.arguments === "string"
				) {
					bytes += Buffer.byteLength(item.arguments, "utf8");
				}
			}
		}
		return total + bytes;
	}, 0);
}

function parsedJsonBytes(
	responses: readonly Record<string, unknown>[],
): number {
	return responses.reduce((total, response) => {
		let bytes = 0;
		if (response.output_parsed !== undefined) {
			bytes += Buffer.byteLength(
				JSON.stringify(response.output_parsed),
				"utf8",
			);
		}
		if (Array.isArray(response.output)) {
			for (const item of response.output) {
				if (
					typeof item === "object" &&
					item !== null &&
					"type" in item &&
					item.type === "function_call" &&
					"arguments" in item &&
					typeof item.arguments === "string"
				) {
					bytes += Buffer.byteLength(item.arguments, "utf8");
				}
			}
		}
		return total + bytes;
	}, 0);
}

function makePerCaseReports() {
	return ARM_IDS.flatMap((armId) => {
		const attempts = attemptsByArm.get(armId) ?? [];
		return CORPUS.map((goldCase) => {
			const caseAttempts = attempts.filter(
				(attempt) => attempt.caseId === goldCase.id,
			);
			const checks = caseAttempts.map((attempt) =>
				checkAttempt(attempt, goldCase),
			);
			return {
				armId,
				caseId: goldCase.id,
				attempts: caseAttempts.length,
				invalidAttempts: caseAttempts.filter(
					(attempt) => !attempt.result.ok,
				).length,
				membershipExact: rate(checks, "membership"),
				attestedSurfaceExact: rate(checks, "attestedSurface"),
				selectedOrthographyExact: rate(checks, "orthography"),
				normalizedSurfaceExact: rate(checks, "normalization"),
				spellingExact: rate(checks, "spelling"),
				realizationCoverageExact: rate(checks, "coverage"),
				fullContractExact: rate(checks, "full"),
				whitespaceTokenExpansionViolations: checks.filter(
					(check) => check.whitespaceTokenExpansion,
				).length,
				lemmatizationViolations: checks.filter(
					(check) => check.lemmatization,
				).length,
			};
		});
	});
}

function requiredCaseGroups() {
	return [
		{ id: "simple-one-segment", caseIds: ["CR-01@0"] },
		{ id: "noisy-phrasal-verb", caseIds: ["CR-02@2", "CR-02@4"] },
		{
			id: "chat-composition",
			caseIds: ["CR-03@0", "CR-03@2", "CR-03@4"],
		},
		{ id: "partial-idiom", caseIds: ["CR-04@2", "CR-04@4"] },
		{
			id: "repeated-token-membership",
			caseIds: ["CR-05@0", "CR-05@2", "CR-05@6"],
		},
		{ id: "partial-fixed-phraseme", caseIds: ["CR-06@2"] },
		{ id: "non-fixed-lexeme", caseIds: ["CR-07@6"] },
		{ id: "discontinuous-morpheme", caseIds: ["CR-08@8", "CR-08@10"] },
		{ id: "canonical-variant-pair", caseIds: ["CR-09@2", "CR-10@2"] },
		{ id: "homograph-pair", caseIds: ["CR-11@2", "CR-12@2"] },
		{
			id: "overlapping-inflection-pair",
			caseIds: ["CR-13@2", "CR-14@2"],
		},
		{
			id: "meaning-identity-controls",
			caseIds: ["CR-15@2", "CR-16@4", "CR-17@4"],
		},
	] as const;
}

function makeGroupReports() {
	return ARM_IDS.map((armId) => {
		const attempts = attemptsByArm.get(armId) ?? [];
		const groups = requiredCaseGroups().map((group) => {
			const groupAttempts = attempts.filter((attempt) =>
				group.caseIds.some((caseId) => caseId === attempt.caseId),
			);
			const checks = groupAttempts.map((attempt) =>
				checkAttempt(attempt, requiredGold(attempt.caseId)),
			);
			return {
				groupId: group.id,
				caseIds: group.caseIds,
				attempts: groupAttempts.length,
				invalidAttemptRate: divide(
					groupAttempts.filter((attempt) => !attempt.result.ok)
						.length,
					groupAttempts.length,
				),
				membershipExact: rate(checks, "membership"),
				attestedSurfaceExact: rate(checks, "attestedSurface"),
				normalizedSurfaceExact: rate(checks, "normalization"),
				fullContractExact: rate(checks, "full"),
			};
		});
		return {
			armId,
			groups,
			macroAverageAcrossRequiredCaseGroups: {
				membershipExact: mean(
					groups.map((group) => group.membershipExact),
				),
				attestedSurfaceExact: mean(
					groups.map((group) => group.attestedSurfaceExact),
				),
				normalizedSurfaceExact: mean(
					groups.map((group) => group.normalizedSurfaceExact),
				),
				fullContractExact: mean(
					groups.map((group) => group.fullContractExact),
				),
			},
		};
	});
}

function relationalAssertions(): readonly RelationalAssertion[] {
	return [
		{
			id: "CR-02",
			label: "both clicks share [2,4]/gave up; clicked orthography differs",
			scope: "in-scope projection",
			excludedContractFields: ["Entry key", "Meaning"],
			evaluate: (attempts) =>
				candidateMatches(attempts.get("CR-02@2"), {
					indices: [2, 4],
					normalizedSurface: "gave up",
					orthography: "Typo",
				}) &&
				candidateMatches(attempts.get("CR-02@4"), {
					indices: [2, 4],
					normalizedSurface: "gave up",
					orthography: "Standard",
				}),
		},
		{
			id: "CR-03",
			label: "all clicks share [0,2,4]/you are him; clicked orthography differs",
			scope: "full",
			excludedContractFields: [],
			evaluate: (attempts) =>
				(["CR-03@0", "CR-03@2", "CR-03@4"] as const).every(
					(caseId, index) =>
						candidateMatches(attempts.get(caseId), {
							indices: [0, 2, 4],
							normalizedSurface: "you are him",
							orthography: index < 2 ? "Typo" : "Standard",
						}),
				),
		},
		{
			id: "CR-04",
			label: "both clicks remain heulte mit with Partial coverage",
			scope: "full",
			excludedContractFields: [],
			evaluate: (attempts) =>
				(["CR-04@2", "CR-04@4"] as const).every((caseId) =>
					candidateMatches(attempts.get(caseId), {
						indices: [2, 4],
						normalizedSurface: "heulte mit",
						coverage: "Partial",
					}),
				),
		},
		{
			id: "CR-05",
			label: "Pass/detached auf share [0,6]; governed auf is [2]",
			scope: "full",
			excludedContractFields: [],
			evaluate: (attempts) =>
				candidateMatches(attempts.get("CR-05@0"), {
					indices: [0, 6],
				}) &&
				candidateMatches(attempts.get("CR-05@2"), { indices: [2] }) &&
				candidateMatches(attempts.get("CR-05@6"), {
					indices: [0, 6],
				}),
		},
		{
			id: "CR-06/07",
			label: "partial Nur Bahnhof stays multi-member; rote stays one member",
			scope: "in-scope projection",
			excludedContractFields: ["Surface kind"],
			evaluate: (attempts) =>
				candidateMatches(attempts.get("CR-06@2"), {
					indices: [0, 2],
					coverage: "Partial",
				}) &&
				candidateMatches(attempts.get("CR-07@6"), {
					indices: [6],
					coverage: "Full",
				}),
		},
		{
			id: "CR-08",
			label: "both clicks share [8,10] and application output get",
			scope: "full",
			excludedContractFields: [],
			evaluate: (attempts) =>
				(["CR-08@8", "CR-08@10"] as const).every((caseId) =>
					candidateMatches(attempts.get(caseId), {
						indices: [8, 10],
						normalizedSurface: "get",
					}),
				),
		},
		{
			id: "CR-09/10",
			label: "armor and armour remain distinct normalized/spelling Surfaces",
			scope: "in-scope projection",
			excludedContractFields: ["Entry reference", "Meaning"],
			evaluate: (attempts) =>
				candidateMatches(attempts.get("CR-09@2"), {
					indices: [2],
					normalizedSurface: "armor",
					spelling: "Canonical",
				}) &&
				candidateMatches(attempts.get("CR-10@2"), {
					indices: [2],
					normalizedSurface: "armour",
					spelling: "Variant",
				}),
		},
		{
			id: "CR-11/12",
			label: "noun/verb homographs both retain normalized book",
			scope: "in-scope projection",
			excludedContractFields: [
				"global Surface identity",
				"grammatical analysis",
				"Entry identity",
			],
			evaluate: (attempts) =>
				(["CR-11@2", "CR-12@2"] as const).every((caseId) =>
					candidateMatches(attempts.get(caseId), {
						indices: [2],
						normalizedSurface: "book",
					}),
				),
		},
		{
			id: "CR-13/14",
			label: "overlapping inflections retain contextual spielte",
			scope: "in-scope projection",
			excludedContractFields: [
				"person feature",
				"global Surface identity",
			],
			evaluate: (attempts) =>
				(["CR-13@2", "CR-14@2"] as const).every((caseId) =>
					candidateMatches(attempts.get(caseId), {
						indices: [2],
						normalizedSurface: "spielte",
					}),
				),
		},
		{
			id: "CR-16/17",
			label: "close semantic cases retain the same contextual läuft Surface",
			scope: "in-scope projection",
			excludedContractFields: ["Meaning reuse"],
			evaluate: (attempts) =>
				(["CR-16@4", "CR-17@4"] as const).every((caseId) =>
					candidateMatches(attempts.get(caseId), {
						indices: [4],
						normalizedSurface: "läuft",
					}),
				),
		},
	];
}

function makeRelationalReports() {
	return ARM_IDS.map((armId) => {
		const armAttempts = attemptsByArm.get(armId) ?? [];
		const repetitions = [1, 2, 3].map((repetition) => {
			const byCase = new Map(
				armAttempts
					.filter((attempt) => attempt.repetition === repetition)
					.map((attempt) => [attempt.caseId, attempt]),
			);
			const assertions = relationalAssertions().map((assertion) => ({
				id: assertion.id,
				label: assertion.label,
				scope: assertion.scope,
				excludedContractFields: assertion.excludedContractFields,
				passed: assertion.evaluate(byCase),
			}));
			return {
				repetition,
				assertions,
				allInScopeProjectionsPassed: assertions.every(
					(assertion) => assertion.passed,
				),
			};
		});
		return {
			armId,
			repetitions,
			passCounts: relationalAssertions().map((assertion) => ({
				id: assertion.id,
				passed: repetitions.filter(
					(repetition) =>
						repetition.assertions.find(
							(candidate) => candidate.id === assertion.id,
						)?.passed,
				).length,
				attempted: repetitions.length,
			})),
			repetitionsPassingEveryInScopeProjection: repetitions.filter(
				(repetition) => repetition.allInScopeProjectionsPassed,
			).length,
		};
	});
}

function checkAttempt(
	attempt: RetainedAttempt,
	goldCase: GoldCase,
): AttemptChecks {
	if (!attempt.result.ok) return allFalseChecks();
	const candidate = attempt.result.candidate;
	const membership = equalArrays(
		candidate.surfaceSegmentIndices,
		goldCase.surfaceSegmentIndices,
	);
	const attestedSurface =
		nfc(
			constructAttestedSurface(
				goldCase.sentence.segments,
				candidate.surfaceSegmentIndices,
			),
		) === nfc(goldCase.attestedSurface);
	const orthography =
		candidate.selectedOrthography === goldCase.selectedOrthography;
	const normalization =
		nfc(candidate.normalizedSurface) === nfc(goldCase.normalizedSurface);
	const spelling = candidate.spelling === goldCase.spelling;
	const coverage =
		candidate.realizationCoverage === goldCase.realizationCoverage;
	return {
		membership,
		attestedSurface,
		orthography,
		normalization,
		spelling,
		coverage,
		full:
			membership &&
			attestedSurface &&
			orthography &&
			normalization &&
			spelling &&
			coverage,
		whitespaceTokenExpansion:
			wordCount(candidate.normalizedSurface) >
			wordCount(
				constructAttestedSurface(
					goldCase.sentence.segments,
					candidate.surfaceSegmentIndices,
				),
			),
		lemmatization: isKnownLemmatization(
			goldCase.id,
			candidate.normalizedSurface,
		),
	};
}

function allFalseChecks(): AttemptChecks {
	return {
		membership: false,
		attestedSurface: false,
		orthography: false,
		normalization: false,
		spelling: false,
		coverage: false,
		full: false,
		whitespaceTokenExpansion: false,
		lemmatization: false,
	};
}

function candidateMatches(
	attempt: RetainedAttempt | undefined,
	expected: {
		readonly indices?: readonly number[];
		readonly normalizedSurface?: string;
		readonly orthography?: "Standard" | "Typo";
		readonly spelling?: "Canonical" | "Variant";
		readonly coverage?: "Full" | "Partial";
	},
): boolean {
	if (!attempt?.result.ok) return false;
	const candidate = attempt.result.candidate;
	return (
		(expected.indices === undefined ||
			equalArrays(candidate.surfaceSegmentIndices, expected.indices)) &&
		(expected.normalizedSurface === undefined ||
			nfc(candidate.normalizedSurface) ===
				nfc(expected.normalizedSurface)) &&
		(expected.orthography === undefined ||
			candidate.selectedOrthography === expected.orthography) &&
		(expected.spelling === undefined ||
			candidate.spelling === expected.spelling) &&
		(expected.coverage === undefined ||
			candidate.realizationCoverage === expected.coverage)
	);
}

function renderSummary(
	summaries: readonly ReturnType<typeof scoreArm>[],
	detailValue: typeof details,
	manifestValue: Record<string, unknown>,
): string {
	const headlineRows = summaries
		.map(
			(summary) =>
				`| \`${summary.armId}\` | ${percent(summary.fullContractExact)} | ${percent(summary.membershipExact)} | ${percent(summary.membershipF1)} | ${percent(summary.normalizedSurfaceExactGivenMembership)} (${summary.normalizationEligibleAttempts}) | ${summary.whitespaceTokenExpansionViolations} | ${summary.lemmatizationViolations} | ${percent(summary.invalidAttemptRate)} |`,
		)
		.join("\n");
	const operationalRows = summaries
		.map(
			(summary) =>
				`| \`${summary.armId}\` | ${distributionCells(summary.latencyMs)} | ${distributionCells(summary.rawOutputBytes)} | ${distributionCells(summary.parsedJsonBytes)} | ${Math.round(summary.retryCount.total)} | $${summary.meanCostUsd.toFixed(8)} | $${summary.costUsd.toFixed(6)} |`,
		)
		.join("\n");
	const tokenRows = summaries
		.map(
			(summary) =>
				`| \`${summary.armId}\` | ${tokenCells(summary.tokens.input)} | ${tokenCells(summary.tokens.cachedInput)} | ${tokenCells(summary.tokens.output)} | ${tokenCells(summary.tokens.reasoning)} |`,
		)
		.join("\n");
	const perCaseRows = detailValue.perCase
		.map(
			(row) =>
				`| \`${row.armId}\` | \`${row.caseId}\` | ${row.invalidAttempts}/${row.attempts} | ${percent(row.membershipExact)} | ${percent(row.attestedSurfaceExact)} | ${percent(row.selectedOrthographyExact)} | ${percent(row.normalizedSurfaceExact)} | ${percent(row.spellingExact)} | ${percent(row.realizationCoverageExact)} | ${percent(row.fullContractExact)} | ${row.whitespaceTokenExpansionViolations} | ${row.lemmatizationViolations} |`,
		)
		.join("\n");
	const groupRows = detailValue.macroByRequiredCaseGroup
		.flatMap((arm) => [
			...arm.groups.map(
				(group) =>
					`| \`${arm.armId}\` | \`${group.groupId}\` | ${percent(group.membershipExact)} | ${percent(group.attestedSurfaceExact)} | ${percent(group.normalizedSurfaceExact)} | ${percent(group.fullContractExact)} |`,
			),
			`| \`${arm.armId}\` | **macro mean** | **${percent(arm.macroAverageAcrossRequiredCaseGroups.membershipExact)}** | **${percent(arm.macroAverageAcrossRequiredCaseGroups.attestedSurfaceExact)}** | **${percent(arm.macroAverageAcrossRequiredCaseGroups.normalizedSurfaceExact)}** | **${percent(arm.macroAverageAcrossRequiredCaseGroups.fullContractExact)}** |`,
		])
		.join("\n");
	const relationalRows = detailValue.relationalAssertions
		.flatMap((arm) =>
			arm.repetitions.flatMap((repetition) =>
				repetition.assertions.map(
					(assertion) =>
						`| \`${arm.armId}\` | ${repetition.repetition} | \`${assertion.id}\` | ${assertion.passed ? "pass" : "fail"} | ${assertion.scope} | ${assertion.excludedContractFields.join(", ") || "—"} |`,
				),
			),
		)
		.join("\n");
	const priceSnapshot = manifestValue.priceSnapshot as Record<
		string,
		unknown
	>;
	return `# Issue #6 measured summary

Fixed run generated: ${String(manifestValue.generatedAt)}  
Summary regenerated from retained rows: ${detailValue.generatedAt}

Model alias: \`${String(manifestValue.modelAlias)}\`  
Actual model(s): \`${(manifestValue.actualModels as string[]).join(", ")}\`  
Repetitions: ${String(manifestValue.repetitions)} per 24 click cases  
Concurrency: ${String(manifestValue.concurrency)}

Scope: ${detailValue.scope}

## Micro summary

| arm | full exact | membership exact | membership F1 | normalization exact given correct membership (n) | whitespace-token expansions | exact known lemmatizations | invalid |
|---|---:|---:|---:|---:|---:|---:|---:|
${headlineRows}

Invalid attempts receive zero for every correctness metric. For pooled
membership precision/F1, each invalid attempt is represented as an unalignable
prediction with the gold cardinality, contributing zero precision and recall.

${detailValue.normalizationViolationScope}

## Runtime, output, and cost

Distribution cells are mean / p50 / p95 / max / total. Byte and token cells
below include the contract-required mean, p95, and total plus retained p50/max.

| arm | latency ms | raw output bytes | parsed JSON bytes | retry total | mean cost | total cost |
|---|---:|---:|---:|---:|---:|---:|
${operationalRows}

| arm | input tokens (mean/p95/total) | cached input | output | reasoning |
|---|---:|---:|---:|---:|
${tokenRows}

Prices use the captured ${String(priceSnapshot.effectiveDate)} OpenAI schedule:
${String(priceSnapshot.source)}.

## Macro averages by required-case group

| arm | required-case group | membership | attested Surface | normalized Surface | full issue-#6 contract |
|---|---|---:|---:|---:|---:|
${groupRows}

## Every click case

| arm | case | invalid | membership | attested | orthography | normalized | spelling | coverage | full | whitespace expansion | lemmatization |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${perCaseRows}

## Relational assertions, per arm and repetition

Assertions marked “in-scope projection” exclude full-chain fields that issue #6
does not produce. The exact excluded fields are retained rather than silently
counted as passes.

| arm | repetition | assertion | result | scope | excluded full-chain fields |
|---|---:|---|---|---|---|
${relationalRows}
`;
}

function requiredGold(caseId: string): GoldCase {
	const goldCase = corpusById.get(caseId);
	if (!goldCase) throw new Error(`Unknown case ${caseId}`);
	return goldCase;
}

function rate(
	checks: readonly AttemptChecks[],
	key: keyof AttemptChecks,
): number {
	return divide(checks.filter((check) => check[key]).length, checks.length);
}

function mean(values: readonly number[]): number {
	return divide(
		values.reduce((total, value) => total + value, 0),
		values.length,
	);
}

function divide(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : numerator / denominator;
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
	return (forbidden[caseId] ?? []).includes(nfc(value));
}

function distributionCells(value: {
	readonly mean: number;
	readonly p50: number;
	readonly p95: number;
	readonly max: number;
	readonly total: number;
}): string {
	return [value.mean, value.p50, value.p95, value.max, value.total]
		.map((number) => Math.round(number))
		.join(" / ");
}

function tokenCells(value: {
	readonly mean: number;
	readonly p95: number;
	readonly total: number;
}): string {
	return `${value.mean.toFixed(1)} / ${Math.round(value.p95)} / ${Math.round(value.total)}`;
}

function percent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
