import { createHash } from "node:crypto";
import { open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
	type GermanKnowledgeAnalysis,
	germanKnowledgeGenerationInputSchema,
	modelOutputSchemaForGermanKnowledge,
} from "../../../src/knowledge-generation/de/schemas";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../src/knowledge-generation/relations";
import {
	assembleSystemPrompt,
	stableJson,
} from "../../../src/promptsmith/assembly";
import { createGermanRelationEvaluationReport } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import {
	corpus,
	untouchedAcceptanceReservation,
} from "../../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
import { promptSource as combinedPromptSource } from "../../../src/promptsmith/production/knowledge-analysis/de/combined/prompt-source";
import {
	actualCostNanoUsd,
	canonicalizeRelationOutput,
	formatNanoUsd,
	INPUT_TOKEN_OVERHEAD_ALLOWANCE,
	type LabCallPlan,
	type LabCasePlan,
	LUNA_PRICE_NANO_USD_PER_TOKEN,
	usageCounters,
} from "../german-relation-topology-lab/logic";

const HERE = dirname(fileURLToPath(import.meta.url));
const APPROVAL_PATH = join(HERE, "reservation-approval.json");
const RESULT_PATH = join(HERE, "acceptance-result.json");
const LOCK_PATH = join(HERE, ".acceptance-run.lock");
const CANDIDATE_MANIFEST_PATH = join(HERE, "candidate-manifest.json");
const WORKSPACE_DIRECTORY = join(HERE, "../../../../..");
const ACCEPTANCE_ITERATIONS = 3;
const ACCEPTANCE_TOPOLOGY = "current-combined-narrow-groups" as const;
const COMBINED_SYSTEM_PROMPT = assembleSystemPrompt(combinedPromptSource);
const FROZEN_CALL_COST_LEDGER_NANO_USD = Object.freeze([
	3_013_850, 3_014_350, 3_016_600, 3_015_100, 3_018_350, 3_019_850, 3_027_100,
	3_028_100, 3_013_350, 3_018_350, 3_012_350, 3_014_350, 3_013_850, 3_014_350,
	3_016_600, 3_015_100, 3_018_350, 3_019_850, 3_027_100, 3_028_100, 3_013_350,
	3_018_350, 3_012_350, 3_014_350, 3_013_850, 3_014_350, 3_016_600, 3_015_100,
	3_018_350, 3_019_850, 3_027_100, 3_028_100, 3_013_350, 3_018_350, 3_012_350,
	3_014_350,
]);

type Attempt = Readonly<{
	callId: string;
	iteration: number;
	caseId: string;
	relations: readonly RequestableRelation[];
	maximumCostNanoUsd: number;
	actualCostNanoUsd: number;
	latencyMs: number;
	status: string | null;
	incompleteReason: string | null;
	refusal: boolean;
	usage: unknown;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	cacheWriteInputTokens: number;
	rawOutputText?: string;
	output?: GermanKnowledgeAnalysis;
	error?: Readonly<{ name: string; message: string }>;
}>;

export function createAcceptancePreflight() {
	assertSealedMetadata();
	const maximumSpendNanoUsd = FROZEN_CALL_COST_LEDGER_NANO_USD.reduce(
		(total, maximumCostNanoUsd) => total + maximumCostNanoUsd,
		0,
	);
	return Object.freeze({
		formatVersion: "german-relation-acceptance-preflight-v1" as const,
		topology: ACCEPTANCE_TOPOLOGY,
		model: "gpt-5.6-luna" as const,
		reasoningEffort: "none" as const,
		iterations: ACCEPTANCE_ITERATIONS,
		reservedCaseCount: untouchedAcceptanceReservation.reservedCaseCount,
		callCount: FROZEN_CALL_COST_LEDGER_NANO_USD.length,
		maximumSpendNanoUsd,
		maximumSpendUsd: formatNanoUsd(maximumSpendNanoUsd),
		selectionCommitmentSha256:
			untouchedAcceptanceReservation.selectionCommitmentSha256,
	});
}

export async function runApprovedAcceptance(args: {
	readonly candidateId: string;
	readonly authorizedMaximumSpendUsd: string;
}) {
	const preflight = createAcceptancePreflight();
	if (args.authorizedMaximumSpendUsd !== preflight.maximumSpendUsd)
		throw new Error(
			`Acceptance spend authorization must equal the exact ${preflight.maximumSpendUsd} USD ceiling.`,
		);
	const approval = JSON.parse(await readFile(APPROVAL_PATH, "utf8")) as {
		candidateId?: unknown;
		selectionCommitmentSha256?: unknown;
		authorizedMaximumSpendUsd?: unknown;
	};
	if (
		approval.candidateId !== args.candidateId ||
		approval.selectionCommitmentSha256 !==
			preflight.selectionCommitmentSha256 ||
		approval.authorizedMaximumSpendUsd !== preflight.maximumSpendUsd
	)
		throw new Error("Human approval is not bound to this frozen run.");
	const manifest = await verifyCandidateManifest();
	if (manifest.candidateId !== args.candidateId)
		throw new Error("Candidate manifest changed after human approval.");
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey)
		throw new Error(
			"OPENAI_API_KEY is unavailable; the reservation remains approved but unrevealed.",
		);
	const lock = await open(LOCK_PATH, "wx").catch((cause) => {
		throw new Error("Another acceptance execution is active.", { cause });
	});
	try {
		assertReservationShape();
		await open(RESULT_PATH, "wx")
			.then((file) => file.close())
			.catch((cause) => {
				throw new Error(
					"The one-shot acceptance reservation was already revealed or run.",
					{ cause },
				);
			});
		const startedAt = new Date().toISOString();
		const attempts: Attempt[] = [];
		let actualSpendNanoUsd = 0;
		await retain({
			formatVersion: "german-relation-acceptance-result-v1",
			claim: "provider-untouched-at-reveal",
			state: "revealed-running",
			candidateId: args.candidateId,
			selectionCommitmentSha256: preflight.selectionCommitmentSha256,
			startedAt,
			completedAt: null,
			preflight,
			attempts,
			report: null,
		});
		const cases = acceptanceCases();
		const calls = cases.flatMap(({ calls }) => calls);
		const materializedLedger = calls.map(
			({ maximumCostNanoUsd }) => maximumCostNanoUsd,
		);
		if (
			stableJson(materializedLedger) !==
			stableJson(FROZEN_CALL_COST_LEDGER_NANO_USD)
		)
			throw new Error(
				"Revealed acceptance plan no longer matches the approved cost ledger.",
			);

		const client = new OpenAI({ apiKey });
		for (const call of calls) {
			const started = performance.now();
			let rawOutputText: string | undefined;
			let status: string | null = null;
			let incompleteReason: string | null = null;
			let refusal = false;
			let usage: unknown = null;
			let output: GermanKnowledgeAnalysis | undefined;
			let error: Attempt["error"];
			try {
				const response = await client.responses.create(call.request);
				rawOutputText = response.output_text;
				status = response.status ?? null;
				incompleteReason = response.incomplete_details?.reason ?? null;
				refusal = JSON.stringify(response.output).includes('"refusal"');
				usage = response.usage ?? null;
				if (rawOutputText.length === 0)
					throw new Error(
						"Provider returned no structured output text.",
					);
				output = call.outputSchema.parse(JSON.parse(rawOutputText));
			} catch (cause) {
				error = describeError(cause);
			}
			const cost = actualCostNanoUsd(usage, call.maximumCostNanoUsd);
			actualSpendNanoUsd += cost;
			attempts.push({
				callId: call.id,
				iteration: call.iteration,
				caseId: call.caseId,
				relations: call.relations,
				maximumCostNanoUsd: call.maximumCostNanoUsd,
				actualCostNanoUsd: cost,
				latencyMs: Math.round(performance.now() - started),
				status,
				incompleteReason,
				refusal,
				usage,
				...usageCounters(usage),
				...(rawOutputText === undefined ? {} : { rawOutputText }),
				...(output === undefined ? {} : { output }),
				...(error === undefined ? {} : { error }),
			});
			await retain({
				formatVersion: "german-relation-acceptance-result-v1",
				claim: "provider-untouched-at-reveal",
				state: "revealed-running",
				candidateId: args.candidateId,
				selectionCommitmentSha256: preflight.selectionCommitmentSha256,
				startedAt,
				completedAt: null,
				preflight,
				attempts,
				report: null,
			});
		}

		const report = buildReport(cases, attempts, actualSpendNanoUsd);
		const artifact = {
			formatVersion: "german-relation-acceptance-result-v1",
			claim: "provider-untouched-at-reveal",
			state: "complete",
			candidateId: args.candidateId,
			selectionCommitmentSha256: preflight.selectionCommitmentSha256,
			startedAt,
			completedAt: new Date().toISOString(),
			preflight,
			attempts,
			report,
		};
		await retain(artifact);
		return artifact;
	} finally {
		await lock.close();
		await rm(LOCK_PATH, { force: true });
	}
}

function acceptanceCases(): readonly LabCasePlan[] {
	return Array.from(
		{ length: ACCEPTANCE_ITERATIONS },
		(_, index) => index + 1,
	).flatMap((iteration) =>
		untouchedAcceptanceReservation.selection.ids.map((caseId) =>
			materializeAcceptanceCasePlan(
				iteration,
				ACCEPTANCE_TOPOLOGY,
				caseId,
			),
		),
	);
}

export function materializeAcceptanceCasePlan(
	iteration: number,
	topology: typeof ACCEPTANCE_TOPOLOGY,
	caseId: string,
): LabCasePlan {
	if (topology !== ACCEPTANCE_TOPOLOGY)
		throw new Error(
			`Acceptance topology is frozen to ${ACCEPTANCE_TOPOLOGY}.`,
		);
	const goldenCase = corpus.cases[caseId];
	if (goldenCase === undefined || !corpus.collections.acceptance.has(caseId))
		throw new Error(`Case ${caseId} is outside the sealed reservation.`);
	const sourceInput = germanKnowledgeGenerationInputSchema.parse(
		goldenCase.input,
	);
	const relations = requestableRelationSchema.options.filter(
		(relation) => relation in (sourceInput.request.semanticRelations ?? {}),
	);
	if (relations.length !== 1)
		throw new Error(`Acceptance case ${caseId} must request one relation.`);
	const relation = relations[0] as RequestableRelation;
	const input = germanKnowledgeGenerationInputSchema.parse({
		markedContext: sourceInput.markedContext,
		reading: sourceInput.reading,
		request: {
			transcription: null,
			definition: null,
			translations: { en: null },
			semanticRelations: { [relation]: null },
		},
	});
	const outputSchema = modelOutputSchemaForGermanKnowledge(input);
	const maximumOutputTokens = 768;
	const id = [`iteration-${iteration}`, topology, caseId, "call-1"].join("/");
	const request: LabCallPlan["request"] = {
		model: "gpt-5.6-luna",
		input: [
			{
				role: "system",
				content: [
					{
						type: "input_text",
						text: COMBINED_SYSTEM_PROMPT,
						prompt_cache_breakpoint: { mode: "explicit" },
					},
				],
			},
			{ role: "user", content: stableJson(input) },
		],
		max_output_tokens: maximumOutputTokens,
		prompt_cache_key: createHash("sha256")
			.update(`${topology}\u0000${COMBINED_SYSTEM_PROMPT}`)
			.digest("hex"),
		prompt_cache_options: { mode: "explicit", ttl: "30m" },
		reasoning: { effort: "none" },
		store: false,
		text: {
			format: zodTextFormat(
				outputSchema,
				"german_relation_current_combined_narrow_groups",
			),
			verbosity: "low",
		},
	};
	const serializedBytes = new TextEncoder().encode(
		stableJson(request),
	).length;
	const inputTokenUpperBound =
		serializedBytes + INPUT_TOKEN_OVERHEAD_ALLOWANCE;
	const maximumCostNanoUsd = Math.ceil(
		inputTokenUpperBound * LUNA_PRICE_NANO_USD_PER_TOKEN.cacheWriteInput +
			maximumOutputTokens * LUNA_PRICE_NANO_USD_PER_TOKEN.output,
	);
	const call: LabCallPlan = Object.freeze({
		id,
		iteration,
		topology,
		caseId,
		relations: [relation],
		input,
		outputSchema,
		request,
		inputTokenUpperBound,
		maximumCostNanoUsd,
	});
	return Object.freeze({
		iteration,
		topology,
		caseId,
		input: sourceInput,
		idealOutput: goldenCase.idealOutput,
		calls: [call],
	});
}

function buildReport(
	cases: readonly LabCasePlan[],
	attempts: readonly Attempt[],
	actualSpendNanoUsd: number,
) {
	const outputs = new Map(
		attempts.flatMap((attempt) =>
			attempt.output === undefined
				? []
				: [[attempt.callId, attempt.output] as const],
		),
	);
	const successfulCaseIds =
		untouchedAcceptanceReservation.selection.ids.filter((caseId) =>
			cases
				.filter((item) => item.caseId === caseId)
				.every((item) =>
					item.calls.every((call) => outputs.has(call.id)),
				),
		);
	const runs = Array.from(
		{ length: ACCEPTANCE_ITERATIONS },
		(_, index) => index + 1,
	).map((iteration) => ({
		runId: `untouched-acceptance/iteration-${iteration}`,
		cases: cases
			.filter(
				(item) =>
					item.iteration === iteration &&
					successfulCaseIds.includes(item.caseId),
			)
			.map((item) => ({
				caseId: item.caseId,
				input: item.input,
				idealOutput: item.idealOutput,
				output: canonicalizeRelationOutput(item, outputs),
			})),
	}));
	const semanticReport = createGermanRelationEvaluationReport({ runs });
	const executionFailureRelations = [
		...new Set(
			attempts.flatMap((attempt) =>
				attempt.error === undefined ? [] : attempt.relations,
			),
		),
	];
	const byRelationPass = Object.fromEntries(
		Object.entries(semanticReport.byRelation).map(([relation, item]) => [
			relation,
			item?.gate.pass === true &&
				!executionFailureRelations.includes(
					relation as RequestableRelation,
				),
		]),
	);
	return Object.freeze({
		formatVersion: "german-relation-acceptance-report-v1" as const,
		actualSpendUsd: formatNanoUsd(actualSpendNanoUsd),
		executionFailureCount: attempts.filter(
			({ error }) => error !== undefined,
		).length,
		executionFailureRelations,
		evaluatedCaseIds: successfulCaseIds,
		excludedCaseIds: untouchedAcceptanceReservation.selection.ids.filter(
			(caseId) => !successfulCaseIds.includes(caseId),
		),
		semanticReport,
		byRelationPass,
	});
}

function assertReservationShape() {
	assertSealedMetadata();
	if (
		untouchedAcceptanceReservation.selection.ids.length !== 12 ||
		untouchedAcceptanceReservation.selectionCommitmentSha256 !==
			calculateReservationCommitment()
	)
		throw new Error("Untouched acceptance reservation is not sealed.");
}

function assertSealedMetadata() {
	if (
		untouchedAcceptanceReservation.status !==
			"sealed-pending-human-approval" ||
		untouchedAcceptanceReservation.approvedByHuman !== false ||
		untouchedAcceptanceReservation.revealedCaseCount !== 0 ||
		untouchedAcceptanceReservation.reservedCaseCount !== 12 ||
		untouchedAcceptanceReservation.selectionCommitmentSha256.length !== 64
	)
		throw new Error(
			"Untouched acceptance reservation metadata is invalid.",
		);
}

async function verifyCandidateManifest() {
	const manifest = JSON.parse(
		await readFile(CANDIDATE_MANIFEST_PATH, "utf8"),
	) as {
		candidateId?: unknown;
		artifacts?: readonly Readonly<{
			issue: number;
			role: string;
			path: string;
			sha256: string;
		}>[];
	};
	if (typeof manifest.candidateId !== "string" || !manifest.artifacts)
		throw new Error("Candidate manifest is malformed.");
	for (const artifact of manifest.artifacts) {
		const contents = await readFile(
			join(WORKSPACE_DIRECTORY, artifact.path),
		);
		const actual = createHash("sha256").update(contents).digest("hex");
		if (actual !== artifact.sha256)
			throw new Error(
				`Frozen artifact drifted before reveal: ${artifact.path}`,
			);
	}
	const candidateId = createHash("sha256")
		.update(
			manifest.artifacts
				.map(({ issue, role, path, sha256 }) =>
					[issue, role, path, sha256].join("\u0000"),
				)
				.join("\u0001"),
		)
		.digest("hex");
	if (candidateId !== manifest.candidateId)
		throw new Error("Candidate ID drifted before reveal.");
	return manifest;
}

export function calculateReservationCommitment() {
	const selection = untouchedAcceptanceReservation.selection;
	return createHash("sha256")
		.update(
			stableJson(
				selection.ids.map((id, index) => ({
					id,
					case: selection.cases[index],
				})),
			),
		)
		.digest("hex");
}

async function retain(value: unknown) {
	const temporaryPath = `${RESULT_PATH}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify(value, null, "\t")}\n`, {
		encoding: "utf8",
		mode: 0o600,
	});
	await rename(temporaryPath, RESULT_PATH);
}

function describeError(cause: unknown) {
	return cause instanceof Error
		? { name: cause.name, message: cause.message }
		: { name: "UnknownError", message: String(cause) };
}
