import { describe, expect, test } from "bun:test";
import { type AiSdk, buildDumgen } from "dumgen";
import { fixedMembersFor } from "dumling/fixed";
import type { Reading } from "dumling/types";
import { relationTargetWithinFamilySchema } from "dumrel/schema";
import { lexemeGermanKnowledgeRunner } from "../../docs/prototypes/knowledge-analysis-combined/run";
import type { StructuredOutputSchema } from "../../src/ai-sdk/ai-sdk";
import { knowledgeGenerationPromptCatalog } from "../../src/catalog/knowledge-generation-prompts";
import type { ModelExchange } from "../../src/generator/generator";
import { createKnowledgeDumgen } from "../../src/knowledge-generation/build";
import {
	type GermanKnowledgeFamily,
	germanFamilySupportsRelationTargetKind,
	germanRelationTargetKindsByFamily,
} from "../../src/knowledge-generation/de/families";
import {
	EMPTY_GENERATED_KNOWLEDGE_UPDATE,
	normalizeRelationTargets,
	projectGermanKnowledgeUpdate,
} from "../../src/knowledge-generation/de/projection";
import {
	germanKnowledgeAnalysisSchemaForFamily,
	modelOutputSchemaForGermanKnowledge,
} from "../../src/knowledge-generation/de/schemas";
import { requestableRelationSchema } from "../../src/knowledge-generation/relations";
import {
	assembleSystemPrompt,
	assertCaseSelectionsUncontaminated,
} from "../../src/promptsmith/assembly";
import { corpus as constructionCorpus } from "../../src/promptsmith/production/knowledge-analysis/de/construction/golden-corpus/corpus";
import { promptSource as constructionPromptSource } from "../../src/promptsmith/production/knowledge-analysis/de/construction/prompt-source";
import {
	corpus as lexemeCorpus,
	untouchedAcceptanceReservation,
} from "../../src/promptsmith/production/knowledge-analysis/de/lexeme/golden-corpus/corpus";
import { promptSource as lexemePromptSource } from "../../src/promptsmith/production/knowledge-analysis/de/lexeme/prompt-source";
import { corpus as morphemeCorpus } from "../../src/promptsmith/production/knowledge-analysis/de/morpheme/golden-corpus/corpus";
import { promptSource as morphemePromptSource } from "../../src/promptsmith/production/knowledge-analysis/de/morpheme/prompt-source";
import { corpus as phrasemeCorpus } from "../../src/promptsmith/production/knowledge-analysis/de/phraseme/golden-corpus/corpus";
import { promptSource as phrasemePromptSource } from "../../src/promptsmith/production/knowledge-analysis/de/phraseme/prompt-source";
import { relationCorpusAdjudications } from "../../src/promptsmith/production/knowledge-analysis/de/retained-cases";

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
			throw new Error("German Knowledge uses Structured Outputs.");
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

describe("per-Family German Knowledge generation", () => {
	test("routes fixed PRON Knowledge independently without calling Open", async () => {
		const lemmaCatalog = fixedMembersFor.lemma({
			language: "de",
			family: "Lexeme",
			kind: "PRON",
		});
		const lemma = lemmaCatalog?.members.find(
			(member) =>
				member.canonicalForm === "mich" &&
				member.coreFeatures.person === "1",
		);
		const reading = lemma && fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed mich Reading.");
		const { calls, sdk } = queueSdk([]);

		const result = await knowledgeRuntime(sdk)({
			markedContext: "Er sieht <TARGET>mich</TARGET>.",
			reading: reading as unknown as Reading<"de">,
			request: { definition: null, translations: { en: null } },
		});

		expect(result).toMatchObject({
			changes: [
				{ aspect: "definition" },
				{ aspect: "translations", language: "en", value: ["me"] },
			],
			pendingRelations: [],
		});
		expect(calls).toHaveLength(0);
	});

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
				{
					aspect: "semanticRelations",
					relation: "synonym",
					targetKind: "reading",
					value: [
						{ lemma: { canonicalForm: "die" } },
						{ lemma: { canonicalForm: "das" } },
					],
				},
			],
			pendingRelations: [],
		});
		expect(calls).toHaveLength(0);
	});

	test("routes promoted sein-peer Knowledge independently without calling Open", async () => {
		const lemmaCatalog = fixedMembersFor.lemma({
			language: "de",
			family: "Lexeme",
			kind: "AUX",
		});
		const lemma = lemmaCatalog?.members.find(
			(member) => member.canonicalForm === "sein",
		);
		const reading = lemma && fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed sein Reading.");
		const { calls, sdk } = queueSdk([]);

		const result = await knowledgeRuntime(sdk)({
			markedContext: "<TARGET>sein</TARGET>",
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
				{ aspect: "translations", language: "en", value: ["be"] },
				{
					aspect: "semanticRelations",
					relation: "synonym",
					targetKind: "reading",
					value: ["bin", "bist", "ist", "sind", "seid"].map(
						(canonicalForm) => ({ lemma: { canonicalForm } }),
					),
				},
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

	test("dispatches deterministically on the Reading Family and names the route", async () => {
		const { calls, sdk } = queueSdk([
			{
				definition: "Geldinstitut",
				semanticRelations: { synonym: [kindOnly("Geldinstitut")] },
			},
		]);
		const exchanges: ModelExchange[] = [];
		const generateKnowledge = knowledgeRuntime(sdk, (exchange) => {
			exchanges.push(exchange);
		});

		await generateKnowledge({
			...baseInput,
			request: { definition: null, semanticRelations: { synonym: null } },
		});

		expect(calls).toHaveLength(1);
		expect(exchanges.map(({ promptPath }) => promptPath)).toEqual([
			"laboratory.knowledge.de.Lexeme",
			"laboratory.knowledge.de.Lexeme",
			"laboratory.knowledge.de.Lexeme",
		]);
	});

	test("rejects a Reading whose Family has no open Knowledge route", async () => {
		const { calls, sdk } = queueSdk([]);
		const generateKnowledge = knowledgeRuntime(sdk);

		expect(
			generateKnowledge({
				...baseInput,
				reading: {
					...baseInput.reading,
					lemma: { ...baseInput.reading.lemma, family: "Nonsense" },
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
						kindOnly("Geldinstitut"),
						kindOnly("Kreditinstitut"),
						kindOnly("Geldinstitut"),
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
				{ relation: "synonym", target: fullShadow("Geldinstitut") },
				{ relation: "synonym", target: fullShadow("Kreditinstitut") },
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
					antonym: [
						{ ...kindOnly("Kreditinstitut"), language: "en" },
					],
				},
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				definition: null,
				semanticRelations: {
					antonym: Array.from({ length: 6 }, (_, index) =>
						kindOnly(`Gegensatz ${index}`),
					),
				},
			}).success,
		).toBe(false);
		// Kind-only targets are wire-shaped: any well-formed string Kind parses
		// here, even a foreign-Family one — the same-Family filter owns it.
		expect(
			schema.safeParse({
				definition: null,
				semanticRelations: {
					antonym: [
						{
							canonicalForm: "un-",
							kind: "Prefix",
						},
					],
				},
			}).success,
		).toBe(true);
	});

	test("uses the same dynamic sparse schema in the retained direct evaluator", () => {
		const request = lexemeGermanKnowledgeRunner.responseRequestFor({
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
			{ semanticRelations: { antonym: [kindOnly("Sparkasse")] } },
		);

		expect(result.changes).toEqual([]);
		expect(result.pendingRelations).toEqual([
			{ relation: "antonym", target: fullShadow("Sparkasse") },
		]);
	});

	test("filters and records cross-Family proposals without failing the exchange", () => {
		const filtered: Array<{
			relation: string;
			kind: string;
			canonicalForm: string;
			sourceFamily: string;
			reason: string;
		}> = [];
		const result = projectGermanKnowledgeUpdate(
			{
				...baseInput,
				request: { semanticRelations: { antonym: null } },
			},
			{
				semanticRelations: {
					antonym: [
						kindOnly("Nichtbank"),
						// The kind token is a valid string, but "Prefix" belongs
						// to the Morpheme Family inventory.
						{
							canonicalForm: "un-",
							kind: "Prefix",
						},
					],
				},
			},
			{
				onFilteredRelationTarget: (info) => filtered.push(info),
			},
		);

		expect(result.pendingRelations).toEqual([
			{ relation: "antonym", target: fullShadow("Nichtbank") },
		]);
		expect(filtered).toEqual([
			{
				relation: "antonym",
				kind: "Prefix",
				canonicalForm: "un-",
				sourceFamily: "Lexeme",
				reason: "KindNotInSourceFamilyInventory",
			},
		]);
	});

	test("normalizes an all-filtered requested relation to null", () => {
		const analysis = normalizeRelationTargets(
			{
				semanticRelations: {
					antonym: [{ canonicalForm: "un-", kind: "Prefix" }],
				},
			},
			"Lexeme",
		);

		expect(analysis.semanticRelations?.antonym).toBeNull();
	});

	test("emits filtered-target diagnostics through the production generator", async () => {
		const { sdk } = queueSdk([
			{
				semanticRelations: {
					antonym: [{ canonicalForm: "un-", kind: "Prefix" }],
				},
			},
		]);
		const diagnostics: unknown[] = [];
		const dumgen = createKnowledgeDumgen({
			sdk,
			onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
		});

		const result = await dumgen.generate.knowledge("de", {
			...baseInput,
			request: { semanticRelations: { antonym: null } },
		});

		expect(result).toEqual(EMPTY_GENERATED_KNOWLEDGE_UPDATE);
		expect(diagnostics).toEqual([
			{
				relation: "antonym",
				canonicalForm: "un-",
				kind: "Prefix",
				sourceFamily: "Lexeme",
				reason: "KindNotInSourceFamilyInventory",
			},
		]);
	});

	test("rejects self-targets and non-Synonym cross-kind duplicates", () => {
		expect(() =>
			projectGermanKnowledgeUpdate(
				{
					...baseInput,
					request: { semanticRelations: { synonym: null } },
				},
				{ semanticRelations: { synonym: [kindOnly("Bank")] } },
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
						synonym: [kindOnly("Geldinstitut")],
						antonym: [kindOnly("Geldinstitut")],
					},
				},
			),
		).toThrow("cannot appear under both synonym and antonym");
	});

	test("promotes Synonym over Near Synonym without guessing other precedence", () => {
		const target = kindOnly("Geldinstitut");
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
			{ relation: "synonym", target: fullShadow("Geldinstitut") },
		]);
	});

	test("rejects an invalid relation result atomically with its base aspects", async () => {
		const { sdk } = queueSdk([
			{
				definition: "Institut für Geldgeschäfte",
				semanticRelations: { synonym: [kindOnly("Bank")] },
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

	test("keeps the per-Family inventories aligned with dumrel's factory", () => {
		const kindOnlyTarget = (kind: string) => ({
			language: "de",
			canonicalForm: "Beispiel",
			family: "",
			kind,
		});
		for (const family of ["Lexeme", "Phraseme"] as const) {
			const schema = relationTargetWithinFamilySchema(family);
			for (const kind of germanRelationTargetKindsByFamily[family]) {
				expect(
					germanFamilySupportsRelationTargetKind(family, kind),
					`${family}/${kind}`,
				).toBe(true);
				expect(
					schema.safeParse({
						...kindOnlyTarget(kind),
						family,
					}).success,
					`${family}/${kind}`,
				).toBe(true);
			}
			const foreign = family === "Lexeme" ? "Idiom" : "NOUN";
			expect(
				germanFamilySupportsRelationTargetKind(family, foreign),
			).toBe(false);
			expect(
				schema.safeParse({
					...kindOnlyTarget(foreign),
					family,
				}).success,
			).toBe(false);
			expect(
				germanFamilySupportsRelationTargetKind(family, "Nonsense"),
			).toBe(false);
		}
		expect(germanFamilySupportsRelationTargetKind("Morpheme", "NOUN")).toBe(
			false,
		);
		expect(
			germanFamilySupportsRelationTargetKind("Construction", "Fusion"),
		).toBe(false);
	});
});

describe("per-Family German Knowledge evaluation corpora", () => {
	test("keeps the generated catalog prompts fresh", () => {
		expect(
			knowledgeGenerationPromptCatalog.Lexeme.prompt.systemPrompt,
		).toBe(assembleSystemPrompt(lexemePromptSource));
		expect(
			knowledgeGenerationPromptCatalog.Phraseme.prompt.systemPrompt,
		).toBe(assembleSystemPrompt(phrasemePromptSource));
		expect(
			knowledgeGenerationPromptCatalog.Morpheme.prompt.systemPrompt,
		).toBe(assembleSystemPrompt(morphemePromptSource));
		expect(
			knowledgeGenerationPromptCatalog.Construction.prompt.systemPrompt,
		).toBe(assembleSystemPrompt(constructionPromptSource));
	});

	test("keeps demonstrations, development, and acceptance disjoint and bounded per Family", () => {
		const corpora = [
			["lexeme", lexemeCorpus],
			["phraseme", phrasemeCorpus],
			["morpheme", morphemeCorpus],
			["construction", constructionCorpus],
		] as const;
		for (const [name, corpus] of corpora) {
			const { demonstrations, development, acceptance } =
				corpus.collections;
			expect(demonstrations.isDisjointFrom(development), name).toBe(true);
			expect(demonstrations.isDisjointFrom(acceptance), name).toBe(true);
			expect(development.isDisjointFrom(acceptance), name).toBe(true);
			expect(() =>
				assertCaseSelectionsUncontaminated({
					route: corpus.route,
					demonstrations,
					evaluation: development,
				}),
			).not.toThrow();
		}
		expect(lexemeCorpus.collections.demonstrations.ids).toHaveLength(2);
		expect(lexemeCorpus.collections.development.ids).toHaveLength(48);
		expect(lexemeCorpus.groups.development.basic.ids).toHaveLength(5);
		expect(lexemeCorpus.groups.development.adversarial.ids).toHaveLength(
			43,
		);
		expect(lexemeCorpus.collections.acceptance.ids).toHaveLength(12);
		expect(phrasemeCorpus.collections.demonstrations.ids).toHaveLength(1);
		expect(phrasemeCorpus.collections.development.ids).toHaveLength(5);
		expect(phrasemeCorpus.collections.acceptance.ids).toHaveLength(0);
		expect(morphemeCorpus.collections.demonstrations.ids).toHaveLength(1);
		expect(constructionCorpus.collections.demonstrations.ids).toHaveLength(
			1,
		);
		expect(untouchedAcceptanceReservation).toMatchObject({
			status: "sealed-pending-human-approval",
			approvedByHuman: false,
			revealedCaseCount: 0,
			reservedCaseCount: 12,
		});
		expect(untouchedAcceptanceReservation.selection).toBe(
			lexemeCorpus.collections.acceptance,
		);
	});

	test("covers the complete semantic relation matrix across Families", () => {
		const covered = new Set<string>();
		for (const corpus of [
			lexemeCorpus,
			phrasemeCorpus,
			morphemeCorpus,
			constructionCorpus,
		]) {
			for (const entry of corpus.all().cases) {
				for (const relation of Object.keys(
					entry.input.request.semanticRelations ?? {},
				)) {
					covered.add(relation);
				}
			}
		}
		expect([...covered].sort()).toEqual(
			[...requestableRelationSchema.options].sort(),
		);
	});

	test("accepts every canonical ideal output under its Family schema", () => {
		const schemasByFamily: Readonly<
			Record<
				GermanKnowledgeFamily,
				{ safeParse(value: unknown): { success: boolean } }
			>
		> = {
			Lexeme: germanKnowledgeAnalysisSchemaForFamily("Lexeme"),
			Phraseme: germanKnowledgeAnalysisSchemaForFamily("Phraseme"),
			Morpheme: germanKnowledgeAnalysisSchemaForFamily("Morpheme"),
			Construction:
				germanKnowledgeAnalysisSchemaForFamily("Construction"),
		};
		for (const corpus of [
			lexemeCorpus,
			phrasemeCorpus,
			morphemeCorpus,
			constructionCorpus,
		]) {
			const schema =
				schemasByFamily[
					(capitalizedFamilyByCorpusName[
						corpus.route.split("/").at(-1) ?? ""
					] ?? "Lexeme") as GermanKnowledgeFamily
				];
			for (const entry of corpus.all().cases) {
				expect(schema.safeParse(entry.idealOutput).success).toBe(true);
			}
		}
	});

	test("retains rationales, contamination keys, failure modes, and the complete route matrix", () => {
		const routeKeys = new Set<string>();
		const failureModes = new Set<string>();
		const corpora = [
			lexemeCorpus,
			phrasemeCorpus,
			morphemeCorpus,
			constructionCorpus,
		];
		for (const corpus of corpora) {
			for (const [caseId, entry] of Object.entries(corpus.cases)) {
				expect(entry.explanation?.length).toBeGreaterThan(0);
				expect(entry.contaminationKeys?.length).toBeGreaterThan(0);
				for (const source of entry.sources ?? []) {
					expect(source.title.length).toBeGreaterThan(0);
					expect(source.supports.length).toBeGreaterThan(0);
					expect("url" in source || "path" in source).toBe(true);
				}
				const adjudication =
					relationCorpusAdjudications.byCaseId[caseId];
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
						relation in
							(entry.input.request.semanticRelations ?? {}),
					).toBe(false);
			}
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

		const developmentAdjudications = [
			...lexemeCorpus.collections.development.ids,
			...phrasemeCorpus.collections.development.ids,
		].map((caseId) => relationCorpusAdjudications.byCaseId[caseId]);
		expect(
			developmentAdjudications.filter(
				(adjudication) => adjudication?.authority === "primary-source",
			),
		).toHaveLength(16);
		expect(
			developmentAdjudications.filter(
				(adjudication) => adjudication?.authority === "human-accepted",
			),
		).toHaveLength(37);
		expect(
			corpora
				.flatMap((corpus) => corpus.collections.development.cases)
				.filter((entry) => (entry.sources?.length ?? 0) > 0).length,
		).toBeGreaterThan(0);
		expect(
			corpora
				.flatMap((corpus) => corpus.all().cases)
				.flatMap((entry) => entry.sources ?? []),
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: "app/dumling-docs/src/to-generate/docs/general/linguistics.doc.ts",
				}),
				expect.objectContaining({
					path: "battery/dumrel/CONTEXT.md",
				}),
				expect.objectContaining({
					path: "docs/adr/0020-keep-semantic-relations-inside-one-family.md",
				}),
			]),
		);
		for (const entry of lexemeCorpus.collections.acceptance.cases)
			expect(entry.sources?.length).toBeGreaterThan(0);
	});

	test("records bounded alternatives and explicitly harmful targets", () => {
		const alternative =
			relationCorpusAdjudications.byCaseId[
				"relation-adv-42-beginnen-alternative"
			];
		expect(alternative?.acceptableTargetSets?.synonym).toEqual([
			[
				{
					canonicalForm: "einsetzen",
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
			target: kindOnly("Kreditinstitut"),
			reason: "Primary lexicography treats the pair as synonyms, making taxonomy contested.",
		});
	});
});

const capitalizedFamilyByCorpusName: Readonly<Record<string, string>> = {
	lexeme: "Lexeme",
	phraseme: "Phraseme",
	morpheme: "Morpheme",
	construction: "Construction",
};

function kindOnly(canonicalForm: string) {
	return {
		canonicalForm,
		kind: "NOUN" as const,
	};
}

function fullShadow(canonicalForm: string) {
	return {
		language: "de",
		canonicalForm,
		family: "Lexeme",
		kind: "NOUN",
	} as const;
}
