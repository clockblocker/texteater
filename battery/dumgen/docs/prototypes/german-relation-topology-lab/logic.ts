// THROWAWAY PROTOTYPE — pure planning, budget, and result-composition logic.

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
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../src/knowledge-generation/relations";
import {
	assembleSystemPrompt,
	stableJson,
} from "../../../src/promptsmith/assembly";
import {
	GERMAN_RELATION_GATE_THRESHOLDS,
	MINIMUM_STABILITY_RUNS,
} from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import { corpus } from "../../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
import { promptSource as combinedPromptSource } from "../../../src/promptsmith/production/knowledge-analysis/de/combined/prompt-source";

export const LAB_QUESTION =
	"Which combined/dedicated and batching/grouping prompt topology yields conservative, stable, precision-first German relation proposals under the frozen semantic evaluator?";

export const LAB_MODEL = "gpt-5.6-luna" as const;
export const LAB_REASONING_EFFORT = "none" as const;
export const LAB_ITERATIONS = 6;
export const LAB_BUDGET_NANO_USD = 5_000_000_000;
export const LONG_CONTEXT_THRESHOLD_TOKENS = 272_000;
export const INPUT_TOKEN_OVERHEAD_ALLOWANCE = 2_048;

/**
 * Direct API rates verified 2026-08-20 against the official GPT-5.6 Luna model
 * page. Nano-USD keeps every guard calculation integral. Cache writes cost
 * 1.25x the ordinary input rate, so that rate is the input ceiling.
 * https://developers.openai.com/api/docs/models/gpt-5.6-luna
 */
export const LUNA_PRICE_NANO_USD_PER_TOKEN = Object.freeze({
	input: 200,
	cachedInput: 20,
	cacheWriteInput: 250,
	output: 1_200,
});

export const LAB_TOPOLOGIES = [
	"current-combined-all-kinds",
	"current-combined-narrow-groups",
	"dedicated-all-kinds",
	"dedicated-narrow-groups",
] as const;

export type LabTopology = (typeof LAB_TOPOLOGIES)[number];

/** Disclosed development cases only. No acceptance reservation is imported. */
export const LAB_DEVELOPMENT_CASE_IDS = [
	"relation-basic-01-hubschrauber",
	"relation-basic-02-sichtbar",
	"relation-adv-01-bank-finance",
	"relation-adv-07-ins-gras-beissen",
	"relation-adv-09-kaufen-converse",
	"relation-adv-13-auto-taxonomy",
	"relation-adv-16-berlin-land",
	"relation-adv-18-johann-trivial",
	"relation-adv-26-und",
	"relation-adv-35-in-betracht-ziehen",
	"relation-adv-42-beginnen-alternative",
	"relation-adv-45-fahrrad-granularity",
] as const;

const NARROW_RELATION_GROUPS = [
	["synonym", "nearSynonym"],
	["antonym", "nearAntonym"],
	["hypernym", "holonym"],
] as const satisfies readonly (readonly RequestableRelation[])[];

const DEDICATED_RELATION_PROMPT = `
You propose direct German Semantic Relations for one exact fixed Reading.
Return only the requested nullable relation leaves. A non-null leaf is an
unordered set of one to five German Lexeme or Phraseme Unit Shadows containing
only language, canonicalForm, family, and kind. Never return a Reading, emoji,
ID, Surface, inflection, Core Features, or persistence instruction.

Precision dominates relation count. Return null whenever no candidate passes
the complete relation test or whenever relation kind or target identity remains
uncertain. The encounter fixes the source Reading but never licenses a relation
that is merely true in that sentence. Never target the source Lemma, duplicate
a target, split a multi-member Lemma, infer from spelling or morphology, or put
one target under multiple relation kinds.

- Synonym requires ordinary equivalence in denotation, entailment, register,
  dialect, stance, connotation, intensity, participants, and presupposition.
- Near Synonym requires the same central denotation plus a stable restriction
  that prevents exact equivalence. It is not a related-word bucket.
- Antonym requires a conventional complementary, scalar-pole, or reversive
  opposition. Near Antonym requires an established paired contrast such as a
  converse viewpoint, not arbitrary co-members or a contextual foil.
- Hypernym is the nearest useful broader NOUN category, informative PROPN
  category, or broader VERB action. A part, whole, location, purpose, or distant
  ancestor is not a Hypernym.
- Holonym is the nearest useful conventional whole of a part, member, or
  constitutive substance. Temporary containment or association is insufficient.

Generate Hypernym and Holonym only in their direct upward orientations.
Hyponym and Meronym are inverse-only and are never requested or returned.
Prefer null over a merely plausible, redundant, distant, wrong-kind,
wrong-Family, cross-Reading, or cross-relation target.
`;

const COMBINED_SYSTEM_PROMPT = assembleSystemPrompt(combinedPromptSource);

export type LabCallPlan = Readonly<{
	id: string;
	iteration: number;
	topology: LabTopology;
	caseId: string;
	relations: readonly RequestableRelation[];
	input: GermanKnowledgeGenerationInput;
	outputSchema: z.ZodType<GermanKnowledgeAnalysis>;
	request: ResponseCreateParamsNonStreaming;
	inputTokenUpperBound: number;
	maximumCostNanoUsd: number;
}>;

export type LabCasePlan = Readonly<{
	iteration: number;
	topology: LabTopology;
	caseId: string;
	input: GermanKnowledgeGenerationInput;
	idealOutput: GermanKnowledgeAnalysis;
	calls: readonly LabCallPlan[];
}>;

export type LabPlan = Readonly<{
	question: string;
	model: typeof LAB_MODEL;
	reasoningEffort: typeof LAB_REASONING_EFFORT;
	iterations: number;
	developmentCaseIds: readonly string[];
	topologies: readonly LabTopology[];
	cases: readonly LabCasePlan[];
	maximumSpendNanoUsd: number;
	maximumSpendUsd: string;
	budgetNanoUsd: number;
	budgetUsd: string;
	guards: Readonly<{
		modelPolicyPass: boolean;
		iterationBoundPass: boolean;
		developmentSelectionOnlyPass: boolean;
		allDirectKindsCoveredPass: boolean;
		exactThresholdsPass: boolean;
		requestShapePass: boolean;
		longContextPriceTierAvoidedPass: boolean;
		budgetPass: boolean;
	}>;
	byTopology: Readonly<
		Record<
			LabTopology,
			Readonly<{
				caseObservationCount: number;
				callCount: number;
				maximumSpendNanoUsd: number;
				maximumSpendUsd: string;
			}>
		>
	>;
}>;

export function createLabPlan(): LabPlan {
	const cases: LabCasePlan[] = [];
	for (let iteration = 1; iteration <= LAB_ITERATIONS; iteration += 1) {
		for (const topology of LAB_TOPOLOGIES) {
			for (const caseId of LAB_DEVELOPMENT_CASE_IDS) {
				cases.push(createCasePlan(iteration, topology, caseId));
			}
		}
	}

	const calls = cases.flatMap(({ calls }) => calls);
	const maximumSpendNanoUsd = sum(
		calls,
		({ maximumCostNanoUsd }) => maximumCostNanoUsd,
	);
	const developmentIds = new Set(corpus.collections.development.ids);
	const coveredRelations = new Set(
		cases.flatMap(({ calls }) =>
			calls.flatMap(({ relations }) => relations),
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
	const byTopology = Object.fromEntries(
		LAB_TOPOLOGIES.map((topology) => {
			const topologyCases = cases.filter(
				(item) => item.topology === topology,
			);
			const topologyCalls = topologyCases.flatMap(({ calls }) => calls);
			const cost = sum(
				topologyCalls,
				({ maximumCostNanoUsd }) => maximumCostNanoUsd,
			);
			return [
				topology,
				Object.freeze({
					caseObservationCount: topologyCases.length,
					callCount: topologyCalls.length,
					maximumSpendNanoUsd: cost,
					maximumSpendUsd: formatNanoUsd(cost),
				}),
			];
		}),
	) as Record<LabTopology, LabPlan["byTopology"][LabTopology]>;
	const guards = Object.freeze({
		modelPolicyPass:
			LAB_MODEL === DUMGEN_GENERATION_MODEL &&
			LAB_REASONING_EFFORT === DUMGEN_REASONING_EFFORT,
		iterationBoundPass: LAB_ITERATIONS >= 5 && LAB_ITERATIONS <= 7,
		developmentSelectionOnlyPass:
			new Set(LAB_DEVELOPMENT_CASE_IDS).size ===
				LAB_DEVELOPMENT_CASE_IDS.length &&
			LAB_DEVELOPMENT_CASE_IDS.every((caseId) =>
				developmentIds.has(caseId),
			),
		allDirectKindsCoveredPass: requestableRelationSchema.options.every(
			(relation) => coveredRelations.has(relation),
		),
		exactThresholdsPass:
			exactThresholdsPass && LAB_ITERATIONS >= MINIMUM_STABILITY_RUNS,
		requestShapePass: calls.every(callShapePass),
		longContextPriceTierAvoidedPass: calls.every(
			({ inputTokenUpperBound }) =>
				inputTokenUpperBound <= LONG_CONTEXT_THRESHOLD_TOKENS,
		),
		budgetPass: maximumSpendNanoUsd <= LAB_BUDGET_NANO_USD,
	});
	if (Object.values(guards).some((pass) => !pass)) {
		throw new Error(
			`German relation topology lab preflight failed: ${stableJson(guards)}`,
		);
	}

	return deepFreeze({
		question: LAB_QUESTION,
		model: LAB_MODEL,
		reasoningEffort: LAB_REASONING_EFFORT,
		iterations: LAB_ITERATIONS,
		developmentCaseIds: [...LAB_DEVELOPMENT_CASE_IDS],
		topologies: [...LAB_TOPOLOGIES],
		cases,
		maximumSpendNanoUsd,
		maximumSpendUsd: formatNanoUsd(maximumSpendNanoUsd),
		budgetNanoUsd: LAB_BUDGET_NANO_USD,
		budgetUsd: formatNanoUsd(LAB_BUDGET_NANO_USD),
		guards,
		byTopology,
	});
}

export function canonicalizeRelationOutput(
	casePlan: LabCasePlan,
	callOutputs: ReadonlyMap<string, GermanKnowledgeAnalysis>,
): GermanKnowledgeAnalysis {
	const semanticRelations: Partial<
		Record<
			RequestableRelation,
			GermanKnowledgeAnalysis["semanticRelations"] extends infer Relations
				? Relations extends Readonly<
						Partial<Record<RequestableRelation, infer Value>>
					>
					? Value
					: never
				: never
		>
	> = {};
	for (const call of casePlan.calls) {
		const output = callOutputs.get(call.id);
		if (output === undefined)
			throw new Error(
				`Topology ${casePlan.topology} has no successful output for ${call.id}.`,
			);
		for (const relation of call.relations) {
			if (relation in semanticRelations)
				throw new Error(
					`Topology ${casePlan.topology} emitted relation ${relation} twice for ${casePlan.caseId}.`,
				);
			semanticRelations[relation] = output.semanticRelations?.[relation];
		}
	}
	const { semanticRelations: _ignored, ...idealBase } = casePlan.idealOutput;
	return modelOutputSchemaForGermanKnowledge(casePlan.input).parse({
		...idealBase,
		semanticRelations,
	});
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
	const details =
		typeof record.input_tokens_details === "object" &&
		record.input_tokens_details !== null
			? (record.input_tokens_details as Record<string, unknown>)
			: {};
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
	const record =
		typeof usage === "object" && usage !== null
			? (usage as Record<string, unknown>)
			: {};
	const details =
		typeof record.input_tokens_details === "object" &&
		record.input_tokens_details !== null
			? (record.input_tokens_details as Record<string, unknown>)
			: {};
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

function createCasePlan(
	iteration: number,
	topology: LabTopology,
	caseId: string,
): LabCasePlan {
	const goldenCase = corpus.cases[caseId];
	if (goldenCase === undefined)
		throw new Error(`Missing retained development case ${caseId}.`);
	const input = germanKnowledgeGenerationInputSchema.parse(goldenCase.input);
	const requestedRelations = requestableRelationSchema.options.filter(
		(relation) => relation in (input.request.semanticRelations ?? {}),
	);
	const groups = groupsFor(topology, requestedRelations);
	const calls = groups.map((relations, index) =>
		createCallPlan({
			iteration,
			topology,
			caseId,
			index,
			input,
			relations,
		}),
	);
	return deepFreeze({
		iteration,
		topology,
		caseId,
		input,
		idealOutput: goldenCase.idealOutput,
		calls,
	});
}

function createCallPlan(args: {
	iteration: number;
	topology: LabTopology;
	caseId: string;
	index: number;
	input: GermanKnowledgeGenerationInput;
	relations: readonly RequestableRelation[];
}): LabCallPlan {
	const combined = args.topology.startsWith("current-combined");
	const input = combined
		? combinedInput(args.input, args.relations)
		: relationOnlyInput(args.input, args.relations);
	const outputSchema = modelOutputSchemaForGermanKnowledge(input);
	const systemPrompt = combined
		? COMBINED_SYSTEM_PROMPT
		: DEDICATED_RELATION_PROMPT;
	const maximumOutputTokens = maximumOutputTokensFor(args.topology);
	const id = [
		`iteration-${args.iteration}`,
		args.topology,
		args.caseId,
		`call-${args.index + 1}`,
	].join("/");
	const request = {
		model: LAB_MODEL,
		input: [
			{
				role: "system" as const,
				content: [
					{
						type: "input_text" as const,
						text: systemPrompt,
						prompt_cache_breakpoint: { mode: "explicit" as const },
					},
				],
			},
			{ role: "user" as const, content: stableJson(input) },
		],
		max_output_tokens: maximumOutputTokens,
		prompt_cache_key: sha256(`${args.topology}\u0000${systemPrompt}`),
		prompt_cache_options: {
			mode: "explicit" as const,
			ttl: "30m" as const,
		},
		reasoning: { effort: LAB_REASONING_EFFORT },
		store: false as const,
		text: {
			format: zodTextFormat(
				outputSchema,
				`german_relation_${args.topology.replaceAll("-", "_")}`,
			),
			verbosity: "low" as const,
		},
	} satisfies ResponseCreateParamsNonStreaming;
	const serializedBytes = new TextEncoder().encode(
		stableJson(request),
	).length;
	const inputTokenUpperBound =
		serializedBytes + INPUT_TOKEN_OVERHEAD_ALLOWANCE;
	const maximumCostNanoUsd = Math.ceil(
		inputTokenUpperBound * LUNA_PRICE_NANO_USD_PER_TOKEN.cacheWriteInput +
			maximumOutputTokens * LUNA_PRICE_NANO_USD_PER_TOKEN.output,
	);
	return deepFreeze({
		id,
		iteration: args.iteration,
		topology: args.topology,
		caseId: args.caseId,
		relations: [...args.relations],
		input,
		outputSchema,
		request,
		inputTokenUpperBound,
		maximumCostNanoUsd,
	});
}

function groupsFor(
	topology: LabTopology,
	requested: readonly RequestableRelation[],
): readonly (readonly RequestableRelation[])[] {
	if (
		topology === "current-combined-all-kinds" ||
		topology === "dedicated-all-kinds"
	)
		return [requested];
	return NARROW_RELATION_GROUPS.map((group) =>
		group.filter((relation) => requested.includes(relation)),
	).filter((group) => group.length > 0);
}

function relationOnlyInput(
	input: GermanKnowledgeGenerationInput,
	relations: readonly RequestableRelation[],
): GermanKnowledgeGenerationInput {
	return germanKnowledgeGenerationInputSchema.parse({
		markedContext: input.markedContext,
		reading: input.reading,
		request: {
			semanticRelations: Object.fromEntries(
				relations.map((relation) => [relation, null]),
			),
		},
	});
}

function combinedInput(
	input: GermanKnowledgeGenerationInput,
	relations: readonly RequestableRelation[],
): GermanKnowledgeGenerationInput {
	return germanKnowledgeGenerationInputSchema.parse({
		markedContext: input.markedContext,
		reading: input.reading,
		request: {
			transcription: null,
			definition: null,
			translations: { en: null },
			semanticRelations: Object.fromEntries(
				relations.map((relation) => [relation, null]),
			),
		},
	});
}

function maximumOutputTokensFor(topology: LabTopology): number {
	if (topology === "current-combined-all-kinds") return 1_024;
	if (topology === "current-combined-narrow-groups") return 768;
	if (topology === "dedicated-all-kinds") return 768;
	return 512;
}

function callShapePass(call: LabCallPlan): boolean {
	if (
		call.request.model !== LAB_MODEL ||
		call.request.reasoning?.effort !== LAB_REASONING_EFFORT ||
		call.request.store !== false
	)
		return false;
	const goldenCase = corpus.cases[call.caseId];
	if (goldenCase === undefined) return false;
	const idealRelations = goldenCase.idealOutput.semanticRelations ?? {};
	const candidate = call.topology.startsWith("current-combined")
		? {
				transcription: "x",
				definition: "x",
				translations: { en: "x" },
				semanticRelations: Object.fromEntries(
					call.relations.map((relation) => [
						relation,
						idealRelations[relation],
					]),
				),
			}
		: {
				semanticRelations: Object.fromEntries(
					call.relations.map((relation) => [
						relation,
						idealRelations[relation],
					]),
				),
			};
	return call.outputSchema.safeParse(candidate).success;
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
