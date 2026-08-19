import { describe, expect, test } from "bun:test";
import { type AiSdk, buildDumgen } from "dumgen";
import type { Reading } from "dumling/types";
import { semanticRelationValues } from "dumrel";
import type { z } from "zod";

import { combinedGermanKnowledgeRunner } from "../../docs/prototypes/knowledge-analysis-combined/run";
import { combinedGermanKnowledgePrompt } from "../../src/catalog/combined-german-knowledge-prompt";
import type { ModelExchange } from "../../src/generator/generator";
import {
	EMPTY_GENERATED_KNOWLEDGE_UPDATE,
	projectGermanKnowledgeUpdate,
} from "../../src/knowledge-generation/de/projection";
import {
	germanKnowledgeAnalysisSchema,
	modelOutputSchemaForGermanKnowledge,
} from "../../src/knowledge-generation/de/schemas";
import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import { evaluateCombinedGermanKnowledge } from "../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import { corpus } from "../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
import { promptSource } from "../../src/promptsmith/production/knowledge-analysis/de/combined/prompt-source";

const bankReading: Reading<"de"> = {
	lemma: {
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Fem", hyph: null },
	},
	emojiDescription: "🏦",
};

const baseInput = {
	markedContext: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
	reading: bankReading,
} as const;

function queueSdk(outputs: unknown[]) {
	const calls: Array<{ input: string; schema: z.ZodType; params: unknown }> =
		[];
	const sdk: AiSdk = {
		async structuredGeneration(input, schema, params) {
			calls.push({ input, schema, params });
			return outputs.shift() as never;
		},
		async unstructuredGeneration() {
			throw new Error("Combined Knowledge uses Structured Outputs.");
		},
	};
	return { calls, sdk };
}

function knowledgeRuntime(
	sdk: AiSdk,
	onModelExchange?: (exchange: ModelExchange) => void,
) {
	const dumgen = buildDumgen({
		sdk,
		onModelExchange,
	});
	return (input: Parameters<typeof dumgen.generate.knowledge>[1]) =>
		dumgen.generate.knowledge("de", input);
}

describe("combined German Knowledge generation", () => {
	test("returns the canonical empty update without an adapter call or exchange", async () => {
		const { calls, sdk } = queueSdk([]);
		const exchanges: unknown[] = [];
		const generateKnowledge = knowledgeRuntime(sdk, (exchange) => {
			exchanges.push(exchange);
		});

		const result = await generateKnowledge({
			...baseInput,
			request: {},
		});

		expect(result).toEqual(EMPTY_GENERATED_KNOWLEDGE_UPDATE);
		expect(calls).toHaveLength(0);
		expect(exchanges).toHaveLength(0);
	});

	test("rejects deferred structured leaves before an adapter call", async () => {
		const { calls, sdk } = queueSdk([]);
		const generateKnowledge = knowledgeRuntime(sdk);

		expect(
			generateKnowledge({
				...baseInput,
				request: { morphologicalTree: null },
			} as never),
		).rejects.toMatchObject({ name: "DumgenError", code: "invalid-input" });
		expect(calls).toHaveLength(0);
	});

	test("rejects unconfigured languages before an adapter call", async () => {
		const { calls, sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });

		for (const language of ["en", "he"]) {
			expect(
				dumgen.generate.knowledge(language as never, {
					...baseInput,
					request: {},
				}),
			).rejects.toMatchObject({
				name: "DumgenError",
				code: "invalid-input",
			});
		}
		expect(calls).toHaveLength(0);
	});

	test("rejects a non-German Reading before an adapter call", async () => {
		const { calls, sdk } = queueSdk([]);
		const generateKnowledge = knowledgeRuntime(sdk);

		expect(
			generateKnowledge({
				...baseInput,
				reading: {
					...baseInput.reading,
					lemma: { ...baseInput.reading.lemma, language: "en" },
				},
				request: {},
			} as never),
		).rejects.toMatchObject({ name: "DumgenError", code: "invalid-input" });
		expect(calls).toHaveLength(0);
	});

	test("uses one exact per-request schema and deterministically projects candidates", async () => {
		const { calls, sdk } = queueSdk([
			{
				transcription: " baŋk ",
				definition: "Institut fu\u0308r Geldgescha\u0308fte",
				translations: { en: "bank" },
				semanticRelations: {
					synonym: [
						shadow("Geldinstitut"),
						shadow("Kreditinstitut"),
						shadow("Geldinstitut"),
					],
					hypernym: null,
				},
			},
		]);
		const exchanges: ModelExchange[] = [];
		const generateKnowledge = knowledgeRuntime(sdk, (exchange) => {
			exchanges.push(exchange);
		});
		const request = {
			transcription: null,
			definition: null,
			translations: { en: null },
			semanticRelations: { synonym: null, hypernym: null },
		} as const;

		const result = await generateKnowledge({
			...baseInput,
			request,
		});

		expect(calls).toHaveLength(1);
		expect(exchanges.map(({ phase }) => phase)).toEqual([
			"attempted",
			"received",
			"accepted",
		]);
		expect(exchanges.map(({ promptPath }) => promptPath)).toEqual([
			"laboratory.knowledge.de.combined",
			"laboratory.knowledge.de.combined",
			"laboratory.knowledge.de.combined",
		]);
		expect(
			calls[0]?.schema.safeParse({
				transcription: null,
				definition: null,
				translations: { en: null },
				semanticRelations: { synonym: null, hypernym: null },
			}).success,
		).toBe(true);
		expect(
			calls[0]?.schema.safeParse({
				transcription: null,
				definition: null,
				translations: { en: null },
				semanticRelations: { synonym: null, hypernym: null },
				extra: null,
			}).success,
		).toBe(false);
		expect(result).toEqual({
			changes: [
				{ kind: "Contribute", aspect: "transcription", value: "baŋk" },
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Institut für Geldgeschäfte",
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["bank"],
				},
			],
			pendingRelations: [
				{ relation: "synonym", target: shadow("Geldinstitut") },
				{ relation: "synonym", target: shadow("Kreditinstitut") },
			],
		});
		expect(Object.isFrozen(result)).toBe(true);
		expect(Object.isFrozen(result.changes)).toBe(true);
		const translationChange = result.changes[2];
		expect(
			translationChange?.aspect === "translations" &&
				translationChange.kind !== "Retract" &&
				Object.isFrozen(translationChange.value),
		).toBe(true);
		expect(Object.isFrozen(result.pendingRelations)).toBe(true);
		expect(Object.isFrozen(result.pendingRelations[0]?.target)).toBe(true);
	});

	test("accepts one all-null model result as an immutable empty update", async () => {
		const { calls, sdk } = queueSdk([
			{
				definition: null,
				semanticRelations: { antonym: null },
			},
		]);
		const generateKnowledge = knowledgeRuntime(sdk);

		const result = await generateKnowledge({
			...baseInput,
			request: { definition: null, semanticRelations: { antonym: null } },
		});

		expect(calls).toHaveLength(1);
		expect(result).toEqual(EMPTY_GENERATED_KNOWLEDGE_UPDATE);
		expect(Object.isFrozen(result)).toBe(true);
		expect(Object.isFrozen(result.changes)).toBe(true);
		expect(Object.isFrozen(result.pendingRelations)).toBe(true);
	});

	test("requires every requested nullable leaf and forbids every unrequested leaf", () => {
		const schema = modelOutputSchemaForGermanKnowledge({
			...baseInput,
			request: { definition: null, semanticRelations: { antonym: null } },
		});

		expect(
			schema.safeParse({
				definition: null,
				semanticRelations: { antonym: null },
			}).success,
		).toBe(true);
		expect(schema.safeParse({ definition: null }).success).toBe(false);
		expect(
			schema.safeParse({
				definition: null,
				transcription: null,
				semanticRelations: { antonym: null },
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				definition: null,
				semanticRelations: { antonym: [] },
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				definition: null,
				semanticRelations: {
					antonym: [{ ...shadow("Kreditinstitut"), language: "en" }],
				},
			}).success,
		).toBe(false);
	});

	test("uses the same dynamic sparse schema in the retained direct evaluator", () => {
		const request = combinedGermanKnowledgeRunner.responseRequestFor({
			...baseInput,
			request: { definition: null, semanticRelations: { antonym: null } },
		});
		const format = request.text?.format as unknown as {
			readonly schema: {
				readonly additionalProperties: boolean;
				readonly properties: Record<string, unknown>;
				readonly required: readonly string[];
			};
		};

		expect(format.schema.additionalProperties).toBe(false);
		expect(Object.keys(format.schema.properties)).toEqual([
			"definition",
			"semanticRelations",
		]);
		expect(format.schema.required).toEqual([
			"definition",
			"semanticRelations",
		]);
	});

	test("rejects a model response that violates the exact request shape", async () => {
		const { calls, sdk } = queueSdk([{ transcription: "baŋk" }]);
		const generateKnowledge = knowledgeRuntime(sdk);

		expect(
			generateKnowledge({
				...baseInput,
				request: { transcription: null, definition: null },
			}),
		).rejects.toMatchObject({
			name: "DumgenError",
			code: "invalid-output",
		});
		expect(calls).toHaveLength(1);
	});

	test("never projects semantic relations as Reading Knowledge Changes", () => {
		const result = projectGermanKnowledgeUpdate(
			{
				...baseInput,
				request: { semanticRelations: { antonym: null } },
			},
			{ semanticRelations: { antonym: [shadow("Sparkasse")] } },
		);

		expect(result.changes).toEqual([]);
		expect(result.pendingRelations).toEqual([
			{ relation: "antonym", target: shadow("Sparkasse") },
		]);
	});
});

describe("combined German Knowledge evaluation corpus", () => {
	test("keeps the generated catalog prompt fresh", () => {
		expect(combinedGermanKnowledgePrompt.prompt.systemPrompt).toBe(
			assembleSystemPrompt(promptSource),
		);
	});

	test("keeps demonstrations, development, and acceptance disjoint and bounded", () => {
		const { demonstrations, development, acceptance } = corpus.collections;
		expect(demonstrations.ids).toHaveLength(4);
		expect(development.ids).toHaveLength(9);
		expect(acceptance.ids).toHaveLength(4);
		expect(demonstrations.isDisjointFrom(development)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptance)).toBe(true);
		expect(development.isDisjointFrom(acceptance)).toBe(true);
	});

	test("covers the complete semantic relation matrix", () => {
		const covered = new Set<string>();
		for (const entry of corpus.all().cases) {
			for (const relation of Object.keys(
				entry.input.request.semanticRelations ?? {},
			)) {
				covered.add(relation);
			}
		}
		expect([...covered].sort()).toEqual([...semanticRelationValues].sort());
	});

	test("accepts every canonical ideal output", () => {
		for (const entry of corpus.all().cases) {
			expect(
				germanKnowledgeAnalysisSchema.safeParse(entry.idealOutput)
					.success,
			).toBe(true);
			expect(
				modelOutputSchemaForGermanKnowledge(entry.input).safeParse(
					entry.idealOutput,
				).success,
			).toBe(true);
		}
	});

	test("scores exact outputs and isolates cross-aspect interference", () => {
		const entry = corpus.cases["combined-dev-bank-bench"];
		if (entry === undefined)
			throw new Error("Missing canonical polysemy case.");

		expect(
			evaluateCombinedGermanKnowledge({
				caseId: "combined-dev-bank-bench",
				input: entry.input,
				idealOutput: entry.idealOutput,
				output: entry.idealOutput,
			}),
		).toMatchObject({
			contractPass: true,
			crossAspectConsistencyPass: true,
		});
		expect(
			evaluateCombinedGermanKnowledge({
				caseId: "combined-dev-bank-bench",
				input: entry.input,
				idealOutput: entry.idealOutput,
				output: { ...entry.idealOutput, translations: { en: "bank" } },
			}),
		).toMatchObject({
			contractPass: false,
			definitionPass: true,
			translationPass: false,
			crossAspectConsistencyPass: false,
		});
	});
});

function shadow(canonicalForm: string) {
	return {
		language: "de" as const,
		canonicalForm,
		family: "Lexeme" as const,
		kind: "NOUN" as const,
	};
}
