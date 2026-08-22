import { describe, expect, test } from "bun:test";
import { type AiSdk, buildDumgen } from "dumgen";
import { fixedMembersFor } from "dumling/fixed";
import type { Reading } from "dumling/types";

import { combinedGermanKnowledgeRunner } from "../../docs/prototypes/knowledge-analysis-combined/run";
import type { StructuredOutputSchema } from "../../src/ai-sdk/ai-sdk";
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
import { requestableRelationSchema } from "../../src/knowledge-generation/relations";
import {
	assembleSystemPrompt,
	assertCaseSelectionsUncontaminated,
} from "../../src/promptsmith/assembly";
import {
	corpus,
	relationCorpusAdjudications,
	untouchedAcceptanceReservation,
} from "../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
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

function isStructuredOutputSchema(
	value: unknown,
): value is StructuredOutputSchema {
	return (
		value !== null &&
		typeof value === "object" &&
		"parse" in value &&
		"toJSONSchema" in value
	);
}

function queueSdk(outputs: unknown[]) {
	const calls: Array<{
		input: string;
		schema: StructuredOutputSchema;
		params: unknown;
	}> = [];
	const sdk: AiSdk = {
		async structuredGeneration(input, schema, params) {
			if (!isStructuredOutputSchema(schema))
				throw new Error("Expected a structural output schema fixture.");
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
	test("routes fixed DET Knowledge independently without calling Open", async () => {
		const lemmaCatalog = fixedMembersFor.lemma({
			language: "de",
			family: "Lexeme",
			kind: "DET",
		});
		const lemma = lemmaCatalog?.members.find(
			(member) => member.canonicalForm === "der",
		);
		const reading = lemma && fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed der Reading.");
		const { calls, sdk } = queueSdk([]);

		const result = await knowledgeRuntime(sdk)({
			markedContext: "<TARGET>der</TARGET> Mann",
			reading: reading as unknown as Reading<"de">,
			request: {
				definition: null,
				translations: { en: null },
				semanticRelations: { synonym: null },
			},
		});

		expect(result).toMatchObject({
			changes: [
				{ aspect: "definition" },
				{ aspect: "translations", language: "en", value: ["the"] },
			],
			pendingRelations: [],
		});
		expect(calls).toHaveLength(0);
	});

	test("returns a CatalogMiss for requested Knowledge outside authored coverage", async () => {
		const lemmaCatalog = fixedMembersFor.lemma({
			language: "de",
			family: "Lexeme",
			kind: "DET",
		});
		const lemma = lemmaCatalog?.members.find(
			(member) => member.canonicalForm === "der",
		);
		const reading = lemma && fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed der Reading.");
		const { calls, sdk } = queueSdk([]);

		const result = await knowledgeRuntime(sdk)({
			markedContext: "<TARGET>der</TARGET> Mann",
			reading: reading as unknown as Reading<"de">,
			request: { semanticRelations: { hypernym: null } },
		});

		expect(result).toMatchObject({
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			stage: "ReadingKnowledge",
			missingRequest: { semanticRelations: { hypernym: null } },
		});
		expect(calls).toHaveLength(0);
	});

	test("returns exact Reading and sparse request on a fixed Knowledge miss", async () => {
		const lemmaCatalog = fixedMembersFor.lemma({
			language: "de",
			family: "Lexeme",
			kind: "DET",
		});
		const fixedLemma = lemmaCatalog?.members[0];
		if (!fixedLemma) throw new Error("Expected fixed DET Lemma.");
		const reading = {
			lemma: { ...fixedLemma, canonicalForm: "le" },
			emojiDescription: "🇫🇷",
		};
		const request = { definition: null } as const;
		const { calls, sdk } = queueSdk([]);

		const result = await knowledgeRuntime(sdk)({
			markedContext: "<TARGET>le</TARGET> code",
			reading,
			request,
		});

		expect(result).toEqual({
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			language: "de",
			route: { family: "Lexeme", kind: "DET" },
			stage: "ReadingKnowledge",
			reading,
			missingRequest: request,
		});
		expect(calls).toHaveLength(0);
		expect(JSON.stringify(result)).not.toContain("markedContext");
	});

	test("keeps the operational projection below the generated parser seam", async () => {
		const source = await Bun.file(
			new URL(
				"../../src/knowledge-generation/de/projection.ts",
				import.meta.url,
			),
		).text();
		expect(source).not.toContain('from "dumrel/schema"');
		expect(source).not.toContain('from "../../schemas/public-schemas"');
		expect(source).not.toContain('from "./schemas"');
	});

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

	test("rejects inverse-only relation requests before an adapter call", async () => {
		const { calls, sdk } = queueSdk([]);
		const generateKnowledge = knowledgeRuntime(sdk);

		for (const relation of ["hyponym", "meronym"] as const) {
			expect(
				generateKnowledge({
					...baseInput,
					request: { semanticRelations: { [relation]: null } },
				} as never),
			).rejects.toMatchObject({
				name: "DumgenError",
				code: "invalid-input",
			});
		}
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
		if ("decision" in result) throw new Error("Expected Open success.");

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
		expect(() =>
			calls[0]?.schema.parse({
				transcription: null,
				definition: null,
				translations: { en: null },
				semanticRelations: { synonym: null, hypernym: null },
			}),
		).not.toThrow();
		expect(() =>
			calls[0]?.schema.parse({
				transcription: null,
				definition: null,
				translations: { en: null },
				semanticRelations: { synonym: null, hypernym: null },
				extra: null,
			}),
		).toThrow();
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
		if ("decision" in result) throw new Error("Expected Open success.");

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
		expect(
			schema.safeParse({
				definition: null,
				semanticRelations: {
					antonym: Array.from({ length: 6 }, (_, index) =>
						shadow(`Gegensatz ${index}`),
					),
				},
			}).success,
		).toBe(false);
		for (const target of [
			{
				language: "de",
				canonicalForm: "un-",
				family: "Morpheme",
				kind: "Prefix",
			},
			{
				language: "de",
				canonicalForm: "im",
				family: "Construction",
				kind: "Fusion",
			},
		]) {
			expect(
				schema.safeParse({
					definition: null,
					semanticRelations: { antonym: [target] },
				}).success,
			).toBe(false);
		}
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

	test("rejects self-targets and non-Synonym cross-kind duplicates", () => {
		expect(() =>
			projectGermanKnowledgeUpdate(
				{
					...baseInput,
					request: { semanticRelations: { synonym: null } },
				},
				{ semanticRelations: { synonym: [shadow("Bank")] } },
			),
		).toThrow("cannot target its source Reading");

		expect(() =>
			projectGermanKnowledgeUpdate(
				{
					...baseInput,
					request: {
						semanticRelations: { synonym: null, antonym: null },
					},
				},
				{
					semanticRelations: {
						synonym: [shadow("Geldinstitut")],
						antonym: [shadow("Geldinstitut")],
					},
				},
			),
		).toThrow("cannot appear under both synonym and antonym");
	});

	test("promotes Synonym over Near Synonym without guessing other precedence", () => {
		const target = shadow("Geldinstitut");
		const result = projectGermanKnowledgeUpdate(
			{
				...baseInput,
				request: {
					semanticRelations: { synonym: null, nearSynonym: null },
				},
			},
			{
				semanticRelations: {
					synonym: [target],
					nearSynonym: [target],
				},
			},
		);

		expect(result.pendingRelations).toEqual([
			{ relation: "synonym", target },
		]);
	});

	test("rejects an invalid relation result atomically with its base aspects", async () => {
		const { sdk } = queueSdk([
			{
				definition: "Institut für Geldgeschäfte",
				semanticRelations: { synonym: [shadow("Bank")] },
			},
		]);
		const generateKnowledge = knowledgeRuntime(sdk);

		expect(
			generateKnowledge({
				...baseInput,
				request: {
					definition: null,
					semanticRelations: { synonym: null },
				},
			}),
		).rejects.toMatchObject({
			name: "DumgenError",
			code: "invalid-output",
		});
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
		expect(demonstrations.ids).toHaveLength(2);
		expect(development.ids).toHaveLength(50);
		expect(corpus.groups.development.basic.ids).toHaveLength(5);
		expect(corpus.groups.development.adversarial.ids).toHaveLength(45);
		expect(acceptance.ids).toHaveLength(12);
		expect(demonstrations.isDisjointFrom(development)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptance)).toBe(true);
		expect(development.isDisjointFrom(acceptance)).toBe(true);
		expect(() =>
			assertCaseSelectionsUncontaminated({
				route: corpus.route,
				demonstrations,
				evaluation: development,
			}),
		).not.toThrow();
		expect(untouchedAcceptanceReservation).toMatchObject({
			status: "sealed-pending-human-approval",
			approvedByHuman: false,
			revealedCaseCount: 0,
		});
		expect(untouchedAcceptanceReservation.selection).toBe(acceptance);
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
		expect([...covered].sort()).toEqual(
			[...requestableRelationSchema.options].sort(),
		);
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

	test("retains rationales, contamination keys, failure modes, and the complete route matrix", () => {
		const routeKeys = new Set<string>();
		const failureModes = new Set<string>();
		for (const [caseId, entry] of Object.entries(corpus.cases)) {
			expect(entry.explanation?.length).toBeGreaterThan(0);
			expect(entry.contaminationKeys?.length).toBeGreaterThan(0);
			const adjudication = relationCorpusAdjudications.byCaseId[caseId];
			expect(adjudication).toBeDefined();
			for (const mode of adjudication?.failureModes ?? [])
				failureModes.add(mode);
			const { family, kind } = entry.input.reading.lemma;
			if (
				Object.keys(entry.input.request.semanticRelations ?? {})
					.length > 0
			)
				routeKeys.add(`${family}/${kind}`);
			for (const relation of ["hyponym", "meronym"])
				expect(
					relation in (entry.input.request.semanticRelations ?? {}),
				).toBe(false);
		}
		expect(routeKeys).toEqual(
			new Set([
				"Lexeme/ADJ",
				"Lexeme/ADP",
				"Lexeme/ADV",
				"Lexeme/AUX",
				"Lexeme/CCONJ",
				"Lexeme/DET",
				"Lexeme/INTJ",
				"Lexeme/NOUN",
				"Lexeme/NUM",
				"Lexeme/PART",
				"Lexeme/PRON",
				"Lexeme/PROPN",
				"Lexeme/SCONJ",
				"Lexeme/SYM",
				"Lexeme/VERB",
				"Phraseme/Aphorism",
				"Phraseme/Collocation",
				"Phraseme/DiscourseFormula",
				"Phraseme/Idiom",
				"Phraseme/Proverb",
			]),
		);
		expect(failureModes).toEqual(
			new Set([
				"positive",
				"negative",
				"null",
				"omission",
				"wrong-kind",
				"wrong-family",
				"polysemy",
				"register",
				"multi-member",
				"self-relation",
			]),
		);
		const inverseKinds = new Set(
			Object.values(relationCorpusAdjudications.byCaseId).flatMap(
				({ inverseJudgments }) =>
					inverseJudgments.map(({ relation }) => relation),
			),
		);
		expect(inverseKinds).toEqual(new Set(["hyponym", "meronym"]));

		const developmentAdjudications = corpus.collections.development.ids.map(
			(caseId) => relationCorpusAdjudications.byCaseId[caseId],
		);
		expect(
			developmentAdjudications.filter(
				(adjudication) => adjudication?.authority === "primary-source",
			),
		).toHaveLength(14);
		expect(
			developmentAdjudications.filter(
				(adjudication) =>
					adjudication?.authority === "contract-reviewer",
			),
		).toHaveLength(36);
		expect(
			developmentAdjudications.reduce(
				(count, adjudication) =>
					count + (adjudication?.harmfulTargets.length ?? 0),
				0,
			),
		).toBe(34);
		expect(
			developmentAdjudications.reduce(
				(count, adjudication) =>
					count +
					Object.values(
						adjudication?.acceptableTargetSets ?? {},
					).flat().length,
				0,
			),
		).toBe(1);
		expect(
			developmentAdjudications.reduce(
				(count, adjudication) =>
					count + (adjudication?.inverseJudgments.length ?? 0),
				0,
			),
		).toBe(7);
	});

	test("records bounded alternatives and explicitly harmful targets", () => {
		const alternative =
			relationCorpusAdjudications.byCaseId[
				"relation-adv-42-beginnen-alternative"
			];
		expect(alternative?.acceptableTargetSets?.synonym).toEqual([
			[
				{
					language: "de",
					canonicalForm: "einsetzen",
					family: "Lexeme",
					kind: "VERB",
				},
			],
		]);

		const bank =
			relationCorpusAdjudications.byCaseId[
				"relation-adv-01-bank-finance"
			];
		expect(bank?.harmfulTargets).toContainEqual({
			relation: "hypernym",
			target: shadow("Kreditinstitut"),
			reason: "Primary lexicography treats the pair as synonyms, making taxonomy contested.",
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
