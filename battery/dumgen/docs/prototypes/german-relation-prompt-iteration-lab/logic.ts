// THROWAWAY PROTOTYPE — pure prompt-revision, budget, and call-plan logic.

import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import type { z } from "zod";

import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "../../../src/ai-sdk/model-policy";
import {
	type GermanKnowledgeAnalysis,
	type GermanKnowledgeGenerationInput,
	germanKnowledgeGenerationInputSchema,
	modelOutputSchemaForGermanKnowledge,
} from "../../../src/knowledge-generation/de/schemas";
import { requestableRelationSchema } from "../../../src/knowledge-generation/relations";
import {
	assembleSystemPrompt,
	stableJson,
} from "../../../src/promptsmith/assembly";
import {
	GERMAN_RELATION_GATE_THRESHOLDS,
	MINIMUM_STABILITY_RUNS,
} from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import { corpus } from "../../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
import { promptSource } from "../../../src/promptsmith/production/knowledge-analysis/de/combined/prompt-source";

export const LAB_QUESTION =
	"Which bounded revisions of the existing combined atomic German Knowledge prompt produce the most conservative relation proposals under the frozen semantic gate?";
export const LAB_MODEL = "gpt-5.6-luna" as const;
export const LAB_REASONING_EFFORT = "none" as const;
export const LAB_BUDGET_NANO_USD = 5_000_000_000;
export const LONG_CONTEXT_THRESHOLD_TOKENS = 272_000;
export const INPUT_TOKEN_OVERHEAD_ALLOWANCE = 2_048;
export const MAXIMUM_OUTPUT_TOKENS = 1_024;

/**
 * Direct API rates verified 2026-08-20 against the official GPT-5.6 Luna
 * model page. Nano-USD keeps every guard calculation integral. Cache writes
 * are bounded at 1.25 times the ordinary input rate.
 * https://developers.openai.com/api/docs/models/gpt-5.6-luna
 */
export const LUNA_PRICE_NANO_USD_PER_TOKEN = Object.freeze({
	input: 200,
	cachedInput: 20,
	cacheWriteInput: 250,
	output: 1_200,
});

const REVISION_APPENDICES = [
	{
		id: "production-baseline",
		title: "Production baseline",
		hypothesis:
			"The reviewed production prompt establishes the baseline without experimental additions.",
		appendix: "",
		repetitions: 1,
	},
	{
		id: "reading-general-null-test",
		title: "Reading-general null test",
		hypothesis:
			"An explicit context-independence test reduces encounter-specific associations and contextual foils.",
		appendix: `
Experimental revision: before returning any relation target, complete this
test: “Outside this sentence, the target is conventionally this relation of
the fixed Reading in ordinary German.” If the claim needs the encounter,
world knowledge about this event, or a merely plausible association, return
null. Context selects the Reading; it never creates the lexical relation.
`,
		repetitions: 1,
	},
	{
		id: "exact-versus-near-equivalence",
		title: "Exact versus near equivalence",
		hypothesis:
			"A substitution boundary reduces Synonym/Near Synonym confusion without turning Near Synonym into a related-word bucket.",
		appendix: `
Experimental revision: classify equivalence before emitting it. Synonym must
preserve denotation, ordinary entailments, register, region, stance,
connotation, intensity, participant structure, and presupposition. Near
Synonym must preserve the central denotation while having one stable named
restriction that blocks exact substitution. If neither test is satisfied,
return null; shared topic, morphology, or taxonomy is insufficient.
`,
		repetitions: 1,
	},
	{
		id: "established-opposition-boundary",
		title: "Established opposition boundary",
		hypothesis:
			"A conventionality test separates Antonym and converse Near Antonym from contextual contrasts and co-members.",
		appendix: `
Experimental revision: Antonym requires a conventional complementary,
scalar-pole, or reversive opposition of the fixed Reading. Near Antonym
requires a conventional lexical pairing that profiles opposite viewpoints on
one event, such as an established converse. It is not weaker sentence-level
opposition. A foil, co-member, cultural pairing, or contrast invented by this
encounter requires null.
`,
		repetitions: 1,
	},
	{
		id: "taxonomy-versus-whole-boundary",
		title: "Taxonomy versus whole boundary",
		hypothesis:
			"Explicit is-a and constitutive-whole tests reduce Hypernym/Holonym swaps and remote targets.",
		appendix: `
Experimental revision: for Hypernym, require “this Reading is a kind of the
target” and choose the nearest useful conventional category. For Holonym,
require “this Reading is a constitutive part, member, or substance of the
target” and choose the nearest useful conventional whole. A location,
container, purpose, owner, association, temporary host, distant ancestor, or
whole/category swap requires null.
`,
		repetitions: 1,
	},
	{
		id: "consolidated-null-first-checklist",
		title: "Consolidated null-first checklist",
		hypothesis:
			"An ordered final decision procedure makes the preceding boundaries stable without adding another demonstration.",
		appendix: `
Experimental revision: use this order for every requested relation leaf:
1. Fix the exact source Reading from the marked context.
2. Reject candidates that do not hold for that Reading generally.
3. Apply only the requested relation's complete conventional lexical test.
4. Reject self, duplicate, cross-kind, wrong-Family, wrong-Kind, inflected,
   distant, or merely associated targets.
5. Emit one to five targets only when every remaining target passes; otherwise
   emit null.
Do not compensate for uncertainty with a related but weaker relation kind.
`,
		repetitions: MINIMUM_STABILITY_RUNS,
	},
] as const;

const BASE_SYSTEM_PROMPT = assembleSystemPrompt(promptSource);

export type PromptRevision = Readonly<{
	number: number;
	id: string;
	title: string;
	hypothesis: string;
	repetitions: number;
	systemPrompt: string;
	promptFingerprint: string;
}>;

export const PROMPT_REVISIONS: readonly PromptRevision[] = Object.freeze(
	REVISION_APPENDICES.map((definition, index) => {
		const additions = REVISION_APPENDICES.slice(1, index + 1)
			.map(({ appendix }) => appendix.trim())
			.filter((appendix) => appendix.length > 0);
		const systemPrompt = [BASE_SYSTEM_PROMPT, ...additions].join("\n\n");
		return Object.freeze({
			number: index + 1,
			id: definition.id,
			title: definition.title,
			hypothesis: definition.hypothesis,
			repetitions: definition.repetitions,
			systemPrompt,
			promptFingerprint: sha256(systemPrompt),
		});
	}),
);

export type LabCallPlan = Readonly<{
	id: string;
	revisionNumber: number;
	revisionId: string;
	repetition: number;
	caseId: string;
	promptFingerprint: string;
	providerInput: GermanKnowledgeGenerationInput;
	evaluationInput: GermanKnowledgeGenerationInput;
	idealOutput: GermanKnowledgeAnalysis;
	outputSchema: z.ZodType<GermanKnowledgeAnalysis>;
	request: ResponseCreateParamsNonStreaming;
	inputTokenUpperBound: number;
	maximumCostNanoUsd: number;
}>;

export type LabPlan = Readonly<{
	question: string;
	model: typeof LAB_MODEL;
	reasoningEffort: typeof LAB_REASONING_EFFORT;
	developmentCaseIds: readonly string[];
	revisions: readonly PromptRevision[];
	calls: readonly LabCallPlan[];
	maximumSpendNanoUsd: number;
	maximumSpendUsd: string;
	budgetNanoUsd: number;
	budgetUsd: string;
	guards: Readonly<Record<string, boolean>>;
	byRevision: Readonly<
		Record<
			string,
			Readonly<{
				promptFingerprint: string;
				repetitions: number;
				caseCount: number;
				callCount: number;
				maximumSpendUsd: string;
			}>
		>
	>;
}>;

export function createLabPlan(): LabPlan {
	const developmentCaseIds = [...corpus.collections.development.ids];
	const calls = PROMPT_REVISIONS.flatMap((revision) =>
		Array.from(
			{ length: revision.repetitions },
			(_, index) => index + 1,
		).flatMap((repetition) =>
			developmentCaseIds.map((caseId) =>
				createCallPlan({ revision, repetition, caseId }),
			),
		),
	);
	const maximumSpendNanoUsd = sum(
		calls,
		({ maximumCostNanoUsd }) => maximumCostNanoUsd,
	);
	const coveredRelations = new Set(
		calls.flatMap(({ evaluationInput }) =>
			requestableRelationSchema.options.filter(
				(relation) =>
					evaluationInput.request.semanticRelations?.[relation] ===
					null,
			),
		),
	);
	const exactThresholdsPass = requestableRelationSchema.options.every(
		(relation) => {
			const threshold = GERMAN_RELATION_GATE_THRESHOLDS[relation];
			return (
				threshold.minimumPrecision === 1 &&
				threshold.maximumFalsePositiveRate === 0 &&
				threshold.maximumHarmfulFalsePositiveRate === 0 &&
				threshold.minimumRecall === 1 &&
				threshold.minimumNullAccuracy === 1 &&
				threshold.minimumTargetFamilyKindAccuracy === 1 &&
				threshold.minimumStability === 1
			);
		},
	);
	const fingerprints = PROMPT_REVISIONS.map(
		({ promptFingerprint }) => promptFingerprint,
	);
	const byRevision = Object.fromEntries(
		PROMPT_REVISIONS.map((revision) => {
			const revisionCalls = calls.filter(
				(call) => call.revisionId === revision.id,
			);
			return [
				revision.id,
				Object.freeze({
					promptFingerprint: revision.promptFingerprint,
					repetitions: revision.repetitions,
					caseCount: developmentCaseIds.length,
					callCount: revisionCalls.length,
					maximumSpendUsd: formatNanoUsd(
						sum(
							revisionCalls,
							({ maximumCostNanoUsd }) => maximumCostNanoUsd,
						),
					),
				}),
			];
		}),
	);
	const guards = Object.freeze({
		modelPolicyPass:
			LAB_MODEL === DUMGEN_GENERATION_MODEL &&
			LAB_REASONING_EFFORT === DUMGEN_REASONING_EFFORT,
		promptRevisionCountPass:
			PROMPT_REVISIONS.length >= 5 && PROMPT_REVISIONS.length <= 7,
		promptFingerprintsDistinctPass:
			new Set(fingerprints).size === fingerprints.length,
		developmentSelectionOnlyPass:
			developmentCaseIds.length === 50 &&
			developmentCaseIds.every((caseId) =>
				corpus.collections.development.has(caseId),
			),
		acceptanceSelectionExcludedPass: developmentCaseIds.every(
			(caseId) => !corpus.collections.acceptance.has(caseId),
		),
		combinedAtomicCallPass: calls.every(combinedAtomicCallPass),
		allDirectKindsCoveredPass: requestableRelationSchema.options.every(
			(relation) => coveredRelations.has(relation),
		),
		finalStabilityPlanPass:
			PROMPT_REVISIONS.at(-1)?.repetitions === MINIMUM_STABILITY_RUNS,
		exactThresholdsPass,
		requestShapePass: calls.every(callShapePass),
		longContextPriceTierAvoidedPass: calls.every(
			({ inputTokenUpperBound }) =>
				inputTokenUpperBound <= LONG_CONTEXT_THRESHOLD_TOKENS,
		),
		budgetPass: maximumSpendNanoUsd <= LAB_BUDGET_NANO_USD,
	});
	if (Object.values(guards).some((pass) => !pass)) {
		throw new Error(
			`German relation prompt-iteration preflight failed: ${stableJson(guards)}`,
		);
	}
	return deepFreeze({
		question: LAB_QUESTION,
		model: LAB_MODEL,
		reasoningEffort: LAB_REASONING_EFFORT,
		developmentCaseIds,
		revisions: PROMPT_REVISIONS,
		calls,
		maximumSpendNanoUsd,
		maximumSpendUsd: formatNanoUsd(maximumSpendNanoUsd),
		budgetNanoUsd: LAB_BUDGET_NANO_USD,
		budgetUsd: formatNanoUsd(LAB_BUDGET_NANO_USD),
		guards,
		byRevision,
	});
}

export function relationEvaluationOutput(
	output: GermanKnowledgeAnalysis,
): GermanKnowledgeAnalysis {
	return Object.freeze({ semanticRelations: output.semanticRelations });
}

export function actualCostNanoUsd(
	usage: unknown,
	fallbackMaximumCostNanoUsd: number,
): number {
	if (typeof usage !== "object" || usage === null)
		return fallbackMaximumCostNanoUsd;
	const record = usage as Record<string, unknown>;
	const inputTokens = nonnegativeNumber(record.input_tokens);
	const outputTokens = nonnegativeNumber(record.output_tokens);
	if (inputTokens === undefined || outputTokens === undefined)
		return fallbackMaximumCostNanoUsd;
	const details = objectRecord(record.input_tokens_details);
	const cachedTokens = nonnegativeNumber(details.cached_tokens) ?? 0;
	const cacheWriteTokens = nonnegativeNumber(details.cache_write_tokens) ?? 0;
	const ordinaryTokens = Math.max(
		0,
		inputTokens - cachedTokens - cacheWriteTokens,
	);
	return Math.ceil(
		ordinaryTokens * LUNA_PRICE_NANO_USD_PER_TOKEN.input +
			cachedTokens * LUNA_PRICE_NANO_USD_PER_TOKEN.cachedInput +
			cacheWriteTokens * LUNA_PRICE_NANO_USD_PER_TOKEN.cacheWriteInput +
			outputTokens * LUNA_PRICE_NANO_USD_PER_TOKEN.output,
	);
}

export function usageCounters(usage: unknown) {
	const record = objectRecord(usage);
	const details = objectRecord(record.input_tokens_details);
	return Object.freeze({
		inputTokens: nonnegativeNumber(record.input_tokens) ?? 0,
		outputTokens: nonnegativeNumber(record.output_tokens) ?? 0,
		cachedInputTokens: nonnegativeNumber(details.cached_tokens) ?? 0,
		cacheWriteInputTokens:
			nonnegativeNumber(details.cache_write_tokens) ?? 0,
	});
}

export function formatNanoUsd(nanoUsd: number): string {
	return (nanoUsd / 1_000_000_000).toFixed(9);
}

function createCallPlan(args: {
	revision: PromptRevision;
	repetition: number;
	caseId: string;
}): LabCallPlan {
	const goldenCase = corpus.cases[args.caseId];
	if (goldenCase === undefined)
		throw new Error(`Missing retained development case ${args.caseId}.`);
	const evaluationInput = germanKnowledgeGenerationInputSchema.parse(
		goldenCase.input,
	);
	const providerInput = combinedInput(evaluationInput);
	const outputSchema = modelOutputSchemaForGermanKnowledge(providerInput);
	const id = [
		`revision-${String(args.revision.number).padStart(2, "0")}-${args.revision.id}`,
		`repetition-${args.repetition}`,
		args.caseId,
	].join("/");
	const request = {
		model: LAB_MODEL,
		input: [
			{
				role: "system" as const,
				content: [
					{
						type: "input_text" as const,
						text: args.revision.systemPrompt,
						prompt_cache_breakpoint: { mode: "explicit" as const },
					},
				],
			},
			{ role: "user" as const, content: stableJson(providerInput) },
		],
		max_output_tokens: MAXIMUM_OUTPUT_TOKENS,
		prompt_cache_key: args.revision.promptFingerprint,
		prompt_cache_options: {
			mode: "explicit" as const,
			ttl: "30m" as const,
		},
		reasoning: { effort: LAB_REASONING_EFFORT },
		store: false as const,
		text: {
			format: zodTextFormat(
				outputSchema,
				`german_relation_revision_${args.revision.number}`,
			),
			verbosity: "low" as const,
		},
	} satisfies ResponseCreateParamsNonStreaming;
	const inputTokenUpperBound =
		new TextEncoder().encode(stableJson(request)).length +
		INPUT_TOKEN_OVERHEAD_ALLOWANCE;
	const maximumCostNanoUsd = Math.ceil(
		inputTokenUpperBound * LUNA_PRICE_NANO_USD_PER_TOKEN.cacheWriteInput +
			MAXIMUM_OUTPUT_TOKENS * LUNA_PRICE_NANO_USD_PER_TOKEN.output,
	);
	return deepFreeze({
		id,
		revisionNumber: args.revision.number,
		revisionId: args.revision.id,
		repetition: args.repetition,
		caseId: args.caseId,
		promptFingerprint: args.revision.promptFingerprint,
		providerInput,
		evaluationInput,
		idealOutput: goldenCase.idealOutput,
		outputSchema,
		request,
		inputTokenUpperBound,
		maximumCostNanoUsd,
	});
}

function combinedInput(
	input: GermanKnowledgeGenerationInput,
): GermanKnowledgeGenerationInput {
	return germanKnowledgeGenerationInputSchema.parse({
		markedContext: input.markedContext,
		reading: input.reading,
		request: {
			transcription: null,
			definition: null,
			translations: { en: null },
			semanticRelations: input.request.semanticRelations,
		},
	});
}

function combinedAtomicCallPass(call: LabCallPlan): boolean {
	return (
		call.providerInput.request.transcription === null &&
		call.providerInput.request.definition === null &&
		call.providerInput.request.translations?.en === null &&
		stableJson(call.providerInput.request.semanticRelations) ===
			stableJson(call.evaluationInput.request.semanticRelations)
	);
}

function callShapePass(call: LabCallPlan): boolean {
	if (
		call.request.model !== LAB_MODEL ||
		call.request.reasoning?.effort !== LAB_REASONING_EFFORT ||
		call.request.store !== false
	)
		return false;
	const idealRelations = call.idealOutput.semanticRelations ?? {};
	return call.outputSchema.safeParse({
		transcription: "x",
		definition: "x",
		translations: { en: "x" },
		semanticRelations: Object.fromEntries(
			Object.keys(call.providerInput.request.semanticRelations ?? {}).map(
				(relation) => [
					relation,
					idealRelations[relation as keyof typeof idealRelations],
				],
			),
		),
	}).success;
}

function objectRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function nonnegativeNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: undefined;
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function sum<Value>(
	values: readonly Value[],
	select: (value: Value) => number,
): number {
	return values.reduce((total, value) => total + select(value), 0);
}

function deepFreeze<Value>(value: Value): Value {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		for (const nested of Object.values(value)) deepFreeze(nested);
		Object.freeze(value);
	}
	return value;
}
