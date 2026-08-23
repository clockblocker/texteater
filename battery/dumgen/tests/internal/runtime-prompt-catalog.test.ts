import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";
import type { ValidationOperations } from "common-utils";
import { ParsingError } from "common-utils";
import { z } from "zod";
import {
	jsonSchemaForRuntimePrompt,
	runtimePromptArtifactRecipe,
} from "../../codegen/runtime-prompt-artifacts";
import { combinedGermanKnowledgePrompt } from "../../src/catalog/combined-german-knowledge-prompt";
import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import {
	decodeRuntimePromptArtifact,
	RUNTIME_PROMPT_CATALOG,
	runtimeCombinedGermanKnowledgePrompt,
	runtimePromptMaterializationCount,
} from "../../src/catalog/runtime-prompt-catalog";
import { runtimePromptDispatch } from "../../src/catalog/runtime-prompt-dispatch";
import {
	decodeEncodedRuntimePromptValidation,
	loadEncodedRuntimePromptValidation,
	parseRuntimePromptRootWithOperations,
	runtimePromptValidationOperation,
} from "../../src/catalog/runtime-prompt-validation";
import {
	encodedRuntimePromptArtifacts,
	loadEncodedRuntimePromptData,
	type RuntimePromptPath,
} from "../../src/generated/runtime-prompt-artifacts";
import { encodedDumgenValidationArtifacts } from "../../src/generated/validation-artifacts";
import { corpus as deDeterminerCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/determiner/golden-corpus/corpus";
import { productionDemonstrationSelection } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit";

type CatalogNode = Readonly<Record<string, unknown>>;

function promptEntries(
	node: CatalogNode,
	path: readonly string[] = [],
): Array<readonly [string, CatalogNode]> {
	if (
		(node as { readonly meta?: { readonly kind?: unknown } }).meta?.kind ===
		"prompt"
	) {
		return [[path.join("."), node]];
	}
	return Object.entries(node).flatMap(([key, child]) =>
		child !== null && typeof child === "object"
			? promptEntries(child as CatalogNode, [...path, key])
			: [],
	);
}

type PromptRepresentativeCase = Readonly<{
	input: unknown;
	modelInput: unknown;
	output: unknown;
}>;
type PromptRepresentative = Readonly<{
	cases: readonly PromptRepresentativeCase[];
}>;

type PromptSource = Readonly<{
	demonstrations: Readonly<{
		cases: readonly Readonly<{ input: unknown; idealOutput: unknown }>[];
	}>;
	inputSchema: unknown;
	outputSchema: unknown;
	route: string;
}>;

async function canonicalPromptRepresentatives(): Promise<
	Readonly<Record<RuntimePromptPath, PromptRepresentative>>
> {
	const authored = [
		...promptEntries(PROMPT_CATALOG as unknown as CatalogNode),
		[
			"knowledge.de.combined",
			combinedGermanKnowledgePrompt as unknown as CatalogNode,
		] as const,
	];
	const representatives = new Map<string, PromptRepresentative>();
	const glob = new Bun.Glob("src/promptsmith/production/**/prompt-source.ts");
	for (const file of glob.scanSync({ cwd: `${import.meta.dir}/../..` })) {
		const module = (await import(
			new URL(`../../${file}`, import.meta.url).href
		)) as { readonly promptSource?: PromptSource };
		const source = module.promptSource;
		const demonstration = source?.demonstrations.cases[0];
		if (source === undefined || demonstration === undefined) continue;
		const matches = authored.filter(([, entry]) => {
			const prompt = (entry as { readonly prompt: CatalogNode }).prompt;
			return (
				prompt.inputSchema === source.inputSchema ||
				prompt.outputSchema === source.outputSchema
			);
		});
		if (matches.length === 0) continue;
		if (matches.length !== 1)
			throw new Error(
				`Prompt representative ${source.route} matched ${matches.length} runtime paths.`,
			);
		const [path, entry] = matches[0] as (typeof matches)[number];
		const prompt = (entry as { readonly prompt: CatalogNode }).prompt;
		const projectInput = prompt.projectInput as
			| ((input: unknown) => unknown)
			| undefined;
		const cases = source.demonstrations.cases.map(
			(demonstrationCase, index): PromptRepresentativeCase => {
				const canonicalInput =
					source.route ===
					"target-classification/de/high-level-whole-unit"
						? productionDemonstrationSelection.cases[index]?.input
						: demonstrationCase.input;
				if (canonicalInput === undefined)
					throw new Error(
						`Prompt representative ${source.route} case ${index} is missing.`,
					);
				const parsedInput = (
					prompt.inputSchema as { parse(input: unknown): unknown }
				).parse(canonicalInput);
				return {
					input: canonicalInput,
					modelInput:
						projectInput?.(parsedInput) ?? demonstrationCase.input,
					output: demonstrationCase.idealOutput,
				};
			},
		);
		if (path === "knowledge.de.combined") {
			const base = cases[0];
			if (base === undefined || base.input === null)
				throw new Error(
					"Combined Knowledge representative is missing.",
				);
			const input = {
				...(base.input as Record<string, unknown>),
				request: {
					definition: null,
					semanticRelations: { synonym: null },
					transcription: null,
					translations: { en: null },
				},
			};
			cases.push({
				input,
				modelInput: input,
				output: {
					definition: "  cafe\u0301  ",
					semanticRelations: { synonym: null },
					transcription: "  haʊs  ",
					translations: { en: "  cafe\u0301  " },
				},
			});
		}
		if (path === "laboratory.grammaticalResolution.de.Lexeme.DET") {
			const base = cases[0];
			if (
				base === undefined ||
				base.output === null ||
				typeof base.output !== "object"
			)
				throw new Error("Determiner representative is missing.");
			const output = structuredClone(base.output) as {
				surface: { inflectionalFeatures: { gender: unknown } };
			};
			output.surface.inflectionalFeatures.gender = "Fem";
			cases.push({ ...base, output });
		}
		representatives.set(path, { cases });
	}
	const paths = authored.map(([path]) => path).toSorted();
	expect([...representatives.keys()].toSorted()).toEqual(paths);
	// Object.fromEntries loses the checked RuntimePromptPath key correlation.
	return Object.fromEntries(representatives) as Record<
		RuntimePromptPath,
		PromptRepresentative
	>;
}

describe("generated operational runtime prompt catalog", () => {
	test("keeps prompt records packed and materializes one route lazily", () => {
		expect(Array.isArray(encodedRuntimePromptArtifacts)).toBe(false);
		expect(encodedRuntimePromptArtifacts.offsetWidth).toBe(6);
		expect(
			loadEncodedRuntimePromptData().promptPayloadBlob.length,
		).toBeGreaterThan(0);
		expect(encodedRuntimePromptArtifacts.routeIndexPayload).toContain(
			"\nlaboratory.intake\0",
		);
		const before = runtimePromptMaterializationCount();
		const prompt = RUNTIME_PROMPT_CATALOG.laboratory.intake.prompt;
		expect(runtimePromptMaterializationCount()).toBe(before);
		const systemPrompt = prompt.systemPrompt;
		const afterFirstAccess = runtimePromptMaterializationCount();
		expect(afterFirstAccess - before).toBeGreaterThanOrEqual(0);
		expect(afterFirstAccess - before).toBeLessThanOrEqual(1);
		expect(prompt.systemPrompt).toBe(systemPrompt);
		expect(runtimePromptMaterializationCount()).toBe(afterFirstAccess);
	});

	test("fails closed on corrupt packed offsets, lengths, masks, and payload text", () => {
		const encoded = {
			...encodedRuntimePromptArtifacts,
			payloadBlob: loadEncodedRuntimePromptData().promptPayloadBlob,
		};
		expect(() =>
			decodeRuntimePromptArtifact("laboratory.intake", {
				...encoded,
				routeIndexPayload: encoded.routeIndexPayload.replace(
					`\0${"0".repeat(6)}`,
					`\0${"0".repeat(5)}1`,
				),
			}),
		).toThrow(RangeError);
		expect(() =>
			decodeRuntimePromptArtifact("laboratory.intake", {
				...encoded,
				payloadBlob: encoded.payloadBlob.slice(0, -1),
			}),
		).toThrow(RangeError);

		const [header, firstEntry, ...remainingEntries] =
			encoded.routeIndexPayload.split("\n");
		if (firstEntry === undefined)
			throw new Error("Expected a generated runtime prompt route.");
		const changedMask = firstEntry.endsWith("00") ? "01" : "00";
		expect(() =>
			decodeRuntimePromptArtifact("laboratory.intake", {
				...encoded,
				routeIndexPayload: [
					header,
					`${firstEntry.slice(0, -2)}${changedMask}`,
					...remainingEntries,
				].join("\n"),
			}),
		).toThrow("dispatch mask drifted");

		expect(() =>
			decodeRuntimePromptArtifact("laboratory.intake", {
				...encoded,
				payloadBlob: `!${encoded.payloadBlob.slice(1)}`,
			}),
		).toThrow(SyntaxError);
		const invalidJsonText = encoded.payloadBlob.replace(
			/("systemPrompt":")./u,
			"$1\n",
		);
		expect(invalidJsonText).not.toBe(encoded.payloadBlob);
		expect(() =>
			decodeRuntimePromptArtifact("laboratory.intake", {
				...encoded,
				payloadBlob: invalidJsonText,
			}),
		).toThrow(SyntaxError);
	});

	test("fails closed when the validation sidecar version drifts", () => {
		const encoded = JSON.parse(
			loadEncodedRuntimePromptData().validationPayload,
		) as Record<string, unknown>;
		expect(encoded.version).toBe(1);
		expect(() =>
			decodeEncodedRuntimePromptValidation(
				JSON.stringify({ ...encoded, version: 2 }),
			),
		).toThrow("Unsupported runtime prompt validation artifact version");
		expect(
			decodeEncodedRuntimePromptValidation(JSON.stringify(encoded))
				.version,
		).toBe(1);
	});

	test("preserves the exact 26 canonical prompt paths, text, and generation parameters", () => {
		const authored = [
			...promptEntries(PROMPT_CATALOG as unknown as CatalogNode),
			[
				"knowledge.de.combined",
				combinedGermanKnowledgePrompt as unknown as CatalogNode,
			] as const,
		];
		const runtime = [
			...promptEntries(RUNTIME_PROMPT_CATALOG as unknown as CatalogNode),
			[
				"knowledge.de.combined",
				runtimeCombinedGermanKnowledgePrompt as unknown as CatalogNode,
			] as const,
		];

		expect(runtime.map(([path]) => path)).toEqual(
			authored.map(([path]) => path),
		);
		expect(runtime).toHaveLength(26);
		for (const [index, [path, authoredEntry]] of authored.entries()) {
			const runtimeEntry = runtime[index]?.[1];
			expect(runtimeEntry, path).toBeDefined();
			expect(
				(runtimeEntry as { readonly prompt: CatalogNode }).prompt
					.systemPrompt,
				path,
			).toBe(
				(authoredEntry as { readonly prompt: CatalogNode }).prompt
					.systemPrompt,
			);
			expect(
				(runtimeEntry as { readonly prompt: CatalogNode }).prompt
					.generationParams,
				path,
			).toEqual(
				(authoredEntry as { readonly prompt: CatalogNode }).prompt
					.generationParams,
			);
		}
	});

	test("validates prompt inputs and outputs with the same canonical schemas", () => {
		const authoredIntake = PROMPT_CATALOG.laboratory.intake.prompt;
		const runtimeIntake = RUNTIME_PROMPT_CATALOG.laboratory.intake.prompt;
		const validInput = {
			items: [{ id: "item-1", sourceText: "Hallo Welt" }],
		};
		const validOutput = {
			items: [
				{
					decision: "Accepted",
					id: "item-1",
					language: "de",
					stitchedText: "Hallo Welt",
				},
			],
			language: "de",
		};

		expect(runtimeIntake.inputSchema.parse(validInput)).toEqual(
			authoredIntake.inputSchema.parse(validInput),
		);
		expect(runtimeIntake.outputSchema?.parse(validOutput)).toEqual(
			authoredIntake.outputSchema.parse(validOutput),
		);
		expect(() => runtimeIntake.inputSchema.parse({ items: [] })).toThrow();
		expect(() =>
			runtimeIntake.outputSchema?.parse({ items: [] }),
		).toThrow();

		const feminineDeterminerCase =
			deDeterminerCorpus.cases[
				"grammar-de-det-demo-feminine-article-die"
			];
		if (feminineDeterminerCase === undefined)
			throw new Error("Feminine determiner representative is missing.");
		const validDeterminerOutput = structuredClone(
			feminineDeterminerCase.idealOutput,
		);
		const authoredDeterminer =
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.DET
				.prompt;
		const runtimeDeterminer =
			RUNTIME_PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme
				.DET.prompt;
		expect(
			runtimeDeterminer.outputSchema?.parse(validDeterminerOutput),
		).toEqual(authoredDeterminer.outputSchema.parse(validDeterminerOutput));
		const invalidDeterminerOutput = structuredClone(
			validDeterminerOutput,
		) as {
			surface: { inflectionalFeatures: { gender: unknown } };
		};
		invalidDeterminerOutput.surface.inflectionalFeatures.gender = [
			"Fem",
			"Masc",
		];
		expect(
			authoredDeterminer.outputSchema.safeParse(invalidDeterminerOutput)
				.success,
		).toBe(false);
		expect(() =>
			runtimeDeterminer.outputSchema?.parse(invalidDeterminerOutput),
		).toThrow();

		const escapedGrammarInput = {
			markedContext:
				"<TARGET>sage</TARGET> &lt;TARGET&gt; <TARGET>auf&amp;</TARGET>",
			members: ["sage", "auf&"],
		};
		const authoredGrammar =
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.NOUN
				.prompt.inputSchema;
		const runtimeGrammar =
			RUNTIME_PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme
				.NOUN.prompt.inputSchema;
		expect(runtimeGrammar.parse(escapedGrammarInput)).toEqual(
			authoredGrammar.parse(escapedGrammarInput),
		);
	});

	test("preserves canonical Unit Shadow normalization without serializing identity binds", () => {
		expect(
			encodedDumgenValidationArtifacts.operationSignatures[
				"dumgen.transitive.transform.bindSupportedUnitShadow"
			],
		).toEqual({ version: 1 });
		expect(
			encodedDumgenValidationArtifacts.operationSignatures[
				"dumgen.transitive.transform.bindLexicalUnitShadow"
			],
		).toEqual({ version: 1 });
		const raw = {
			semanticRelations: {
				synonym: [
					{
						language: "de",
						canonicalForm: "  Ba\u0308nk  ",
						family: " Lexeme ",
						kind: " NOUN ",
					},
				],
			},
		};
		const authored =
			combinedGermanKnowledgePrompt.prompt.outputSchema.parse(raw);
		const generated =
			runtimeCombinedGermanKnowledgePrompt.prompt.outputSchema.parse(raw);
		expect(generated).toEqual(authored);

		function bindSupportedUnitShadow(value: unknown): unknown {
			return { value };
		}
		expect(bindSupportedUnitShadow.name).toBe("bindSupportedUnitShadow");
		expect(() =>
			jsonSchemaForRuntimePrompt(
				z.string().transform(bindSupportedUnitShadow),
			),
		).toThrow();
		expect(authored.semanticRelations?.synonym?.[0]).toEqual({
			language: "de",
			canonicalForm: "Bänk",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(() =>
			z.toJSONSchema(combinedGermanKnowledgePrompt.prompt.outputSchema, {
				target: "draft-7",
			}),
		).toThrow("Transforms cannot be represented in JSON Schema");
	});

	test("ships the exact provider-ready JSON Schemas without loading Zod at runtime", () => {
		const authored =
			PROMPT_CATALOG.laboratory.targetClassification.de.highLevelWholeUnit
				.prompt.outputSchema;
		const runtime =
			RUNTIME_PROMPT_CATALOG.laboratory.targetClassification.de
				.highLevelWholeUnit.prompt.outputSchema;
		const expected = z.toJSONSchema(authored, {
			io: "input",
			target: "draft-7",
			override({ zodSchema, jsonSchema }) {
				const definition = zodSchema._zod.def;
				if (
					definition.type === "union" &&
					"discriminator" in definition &&
					Array.isArray(jsonSchema.oneOf)
				) {
					jsonSchema.anyOf = jsonSchema.oneOf;
					delete jsonSchema.oneOf;
				}
			},
		});

		expect(runtime?.toJSONSchema()).toEqual(
			JSON.parse(JSON.stringify(expected)),
		);
	});

	test("builds the exact sparse combined-Knowledge model schema from the request", () => {
		const input = {
			markedContext: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
			reading: {
				lemma: {
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
					family: "Lexeme",
					kind: "NOUN",
					language: "de",
				},
				emojiDescription: "🏦",
			},
			request: {
				definition: null,
				semanticRelations: { antonym: null },
			},
		};
		const authored =
			combinedGermanKnowledgePrompt.prompt.modelOutputSchemaFor(
				combinedGermanKnowledgePrompt.prompt.inputSchema.parse(input),
			);
		const runtimeInput =
			runtimeCombinedGermanKnowledgePrompt.prompt.inputSchema.parse(
				input,
			);
		const runtime =
			runtimeCombinedGermanKnowledgePrompt.prompt.modelOutputSchemaFor?.(
				runtimeInput,
			);
		const valid = {
			definition: null,
			semanticRelations: { antonym: null },
		};

		expect(runtime?.parse(valid)).toEqual(authored.parse(valid));
		expect(() => runtime?.parse({ definition: null })).toThrow();
		expect(() =>
			runtime?.parse({ ...valid, transcription: null }),
		).toThrow();
		expect(runtime?.toJSONSchema()).toEqual(
			JSON.parse(
				JSON.stringify(
					z.toJSONSchema(authored, {
						io: "input",
						target: "draft-7",
					}),
				),
			),
		);
	});

	test("attaches the combined Knowledge projector and every exact named dispatch", () => {
		const runtimeByPath = new Map([
			...promptEntries(RUNTIME_PROMPT_CATALOG as unknown as CatalogNode),
			[
				"knowledge.de.combined",
				runtimeCombinedGermanKnowledgePrompt as unknown as CatalogNode,
			] as const,
		]);
		let dispatchCount = 0;
		for (const [path] of runtimeByPath) {
			const artifact = decodeRuntimePromptArtifact(path);
			const prompt = (
				runtimeByPath.get(artifact.path) as {
					readonly prompt: CatalogNode;
				}
			).prompt;
			for (const role of Object.keys(artifact.dispatch)) {
				dispatchCount += 1;
				expect(prompt[role], `${artifact.path}:${role}`).toBeDefined();
			}
		}
		expect(dispatchCount).toBe(51);
		expect(() =>
			runtimePromptDispatch(
				"unknown:project-output",
				"unknown",
				() => ({}),
			),
		).toThrow("Unknown runtime prompt dispatch");

		const input = {
			markedContext: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
			reading: {
				emojiDescription: "🏦",
				lemma: {
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
					family: "Lexeme",
					kind: "NOUN",
					language: "de",
				},
			},
			request: { definition: null },
		};
		const analysis = { definition: "Geldinstitut." };
		const authoredInput =
			combinedGermanKnowledgePrompt.prompt.inputSchema.parse(input);
		const runtimeInput =
			runtimeCombinedGermanKnowledgePrompt.prompt.inputSchema.parse(
				input,
			);
		const authoredAnalysis =
			combinedGermanKnowledgePrompt.prompt.outputSchema.parse(analysis);
		const runtimeAnalysis =
			runtimeCombinedGermanKnowledgePrompt.prompt.outputSchema?.parse(
				analysis,
			);
		expect(
			runtimeCombinedGermanKnowledgePrompt.prompt.projectOutput?.(
				runtimeInput,
				runtimeAnalysis,
			),
		).toEqual(
			combinedGermanKnowledgePrompt.prompt.projectOutput?.(
				authoredInput,
				authoredAnalysis,
			),
		);
	});

	test("dispatches target and grammatical projections exactly like authoring", () => {
		const targetInput = {
			clickedSegmentIndex: 0,
			segments: [
				{ kind: "ResolvableText", text: "auf" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "passen" },
			],
		};
		const targetOutput = {
			additionalMemberIndices: [1],
			decision: "Resolved",
			target: { family: "Lexeme", kind: "VERB" },
		};
		const authoredTarget =
			PROMPT_CATALOG.laboratory.targetClassification.de.highLevelWholeUnit
				.prompt;
		const runtimeTarget =
			RUNTIME_PROMPT_CATALOG.laboratory.targetClassification.de
				.highLevelWholeUnit.prompt;
		const authoredParsedTargetInput =
			authoredTarget.inputSchema.parse(targetInput);
		const runtimeParsedTargetInput =
			runtimeTarget.inputSchema.parse(targetInput);
		const authoredParsedTargetOutput =
			authoredTarget.outputSchema.parse(targetOutput);
		const runtimeParsedTargetOutput =
			runtimeTarget.outputSchema?.parse(targetOutput);
		expect(runtimeTarget.projectInput?.(runtimeParsedTargetInput)).toEqual(
			authoredTarget.projectInput?.(authoredParsedTargetInput),
		);
		expect(
			runtimeTarget.projectOutput?.(
				runtimeParsedTargetInput,
				runtimeParsedTargetOutput,
			),
		).toEqual(
			authoredTarget.projectOutput?.(
				authoredParsedTargetInput,
				authoredParsedTargetOutput,
			),
		);

		const grammarInput = {
			markedContext:
				"<TARGET>entweder</TARGET> heute <TARGET>oder</TARGET> morgen",
			members: ["entweder", "oder"],
		};
		const grammarOutput = {
			lemma: {
				canonicalForm: "entweder … oder",
				coreFeatures: { conjType: null },
			},
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["entweder", "oder"],
			surface: { spelling: "Canonical", surfaceFeatures: null },
		};
		const authoredGrammar =
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.CCONJ
				.prompt;
		const runtimeGrammar =
			RUNTIME_PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme
				.CCONJ.prompt;
		const authoredParsedGrammarInput =
			authoredGrammar.inputSchema.parse(grammarInput);
		const runtimeParsedGrammarInput =
			runtimeGrammar.inputSchema.parse(grammarInput);
		const authoredParsedGrammarOutput =
			authoredGrammar.outputSchema.parse(grammarOutput);
		const runtimeParsedGrammarOutput =
			runtimeGrammar.outputSchema?.parse(grammarOutput);
		expect(
			runtimeGrammar.projectOutput?.(
				runtimeParsedGrammarInput,
				runtimeParsedGrammarOutput,
			),
		).toEqual(
			authoredGrammar.projectOutput?.(
				authoredParsedGrammarInput,
				authoredParsedGrammarOutput,
			),
		);

		const nounInput = {
			markedContext:
				"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher.",
			members: ["Kinder-"],
		};
		const nounOutput = {
			lemma: {
				canonicalForm: "Kinderbuch",
				coreFeatures: { gender: "Neut", hyph: null },
			},
			memberOrthographies: ["Standard"],
			normalizedMembers: ["Kinderbücher"],
			surface: {
				inflectionalFeatures: { case: "Acc", number: "Plur" },
				spelling: "Canonical",
				surfaceFeatures: null,
				surfaceKind: "Inflection",
			},
		};
		const authoredNoun =
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.NOUN
				.prompt;
		const runtimeNoun =
			RUNTIME_PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme
				.NOUN.prompt;
		const authoredParsedNounInput =
			authoredNoun.inputSchema.parse(nounInput);
		const runtimeParsedNounInput = runtimeNoun.inputSchema.parse(nounInput);
		const authoredParsedNounOutput =
			authoredNoun.outputSchema.parse(nounOutput);
		const runtimeParsedNounOutput =
			runtimeNoun.outputSchema?.parse(nounOutput);
		expect(
			runtimeNoun.projectOutput?.(
				runtimeParsedNounInput,
				runtimeParsedNounOutput,
			),
		).toEqual(
			authoredNoun.projectOutput?.(
				authoredParsedNounInput,
				authoredParsedNounOutput,
			),
		);
	});

	test("keeps all 78 generated parser roots differentially bound", async () => {
		const representatives = await canonicalPromptRepresentatives();
		const authored = [
			...promptEntries(PROMPT_CATALOG as unknown as CatalogNode),
			[
				"knowledge.de.combined",
				combinedGermanKnowledgePrompt as unknown as CatalogNode,
			] as const,
		];
		const runtime = new Map([
			...promptEntries(RUNTIME_PROMPT_CATALOG as unknown as CatalogNode),
			[
				"knowledge.de.combined",
				runtimeCombinedGermanKnowledgePrompt as unknown as CatalogNode,
			] as const,
		]);
		const executedOperations = new Set<string>();
		const trackingOperations = new Proxy(
			Object.create(null) as ValidationOperations,
			{
				get(_target, property) {
					if (typeof property !== "string") return undefined;
					return (value: unknown) => {
						executedOperations.add(property);
						return runtimePromptValidationOperation(property)(
							value,
						);
					};
				},
			},
		);
		let roots = 0;
		for (const [path, authoredEntry] of authored) {
			const representative = representatives[path as RuntimePromptPath];
			const firstCase = representative.cases[0];
			if (firstCase === undefined)
				throw new Error(`Missing prompt representative: ${path}.`);
			const authoredPrompt = (authoredEntry as { prompt: CatalogNode })
				.prompt;
			const runtimePrompt = (runtime.get(path) as { prompt: CatalogNode })
				.prompt;
			for (const role of [
				"inputSchema",
				"modelInputSchema",
				"outputSchema",
			] as const) {
				const canonical =
					role === "modelInputSchema"
						? (authoredPrompt.modelInputSchema ??
							authoredPrompt.inputSchema)
						: authoredPrompt[role];
				const generated = runtimePrompt[role];
				if (canonical === null || generated === null) continue;
				roots += 1;
				const valid =
					role === "inputSchema"
						? firstCase.input
						: role === "modelInputSchema"
							? firstCase.modelInput
							: firstCase.output;
				const propertyMutation =
					valid !== null &&
					typeof valid === "object" &&
					!Array.isArray(valid)
						? { ...valid, __dumgenMutation: true }
						: { __dumgenMutation: valid };
				for (const input of [valid, propertyMutation, null, {}, []]) {
					const expected = (
						canonical as {
							safeParse(
								value: unknown,
							): z.ZodSafeParseResult<unknown>;
						}
					).safeParse(input);
					try {
						const rootName = `${path}#${role === "inputSchema" ? "input" : role === "modelInputSchema" ? "model-input" : "output"}`;
						const actual = parseRuntimePromptRootWithOperations(
							rootName,
							input,
							trackingOperations,
						);
						expect(expected.success, `${path} ${role}`).toBe(true);
						if (expected.success)
							expect(actual).toEqual(expected.data);
					} catch (cause) {
						expect(expected.success, `${path} ${role}`).toBe(false);
						expect(cause, `${path} ${role}`).toBeInstanceOf(
							ParsingError,
						);
						if (!expected.success && cause instanceof ParsingError)
							expect(cause.issues, `${path} ${role}`).toEqual(
								expected.error.issues,
							);
					}
				}
			}
			for (const validCase of representative.cases.slice(1)) {
				for (const [role, input, canonical] of [
					["input", validCase.input, authoredPrompt.inputSchema],
					[
						"model-input",
						validCase.modelInput,
						authoredPrompt.modelInputSchema ??
							authoredPrompt.inputSchema,
					],
					["output", validCase.output, authoredPrompt.outputSchema],
				] as const)
					if (canonical !== null) {
						const expected = (
							canonical as {
								safeParse(
									value: unknown,
								): z.ZodSafeParseResult<unknown>;
							}
						).safeParse(input);
						const actual = parseRuntimePromptRootWithOperations(
							`${path}#${role}`,
							input,
							trackingOperations,
						);
						expect(
							expected.success,
							`${path} ${role} alternate`,
						).toBe(true);
						if (expected.success)
							expect(actual).toEqual(expected.data);
					}
			}
		}
		expect(roots).toBe(78);
		expect([...executedOperations].toSorted()).toEqual(
			[
				...loadEncodedRuntimePromptValidation().requiredOperations,
			].toSorted(),
		);
	});

	test("constructs and executes the exact generated operation inventory", () => {
		const encodedRuntimePromptValidation =
			loadEncodedRuntimePromptValidation() as Readonly<{
				requiredOperations: readonly string[];
			}>;
		const executed = new Set<string>();
		for (const name of encodedRuntimePromptValidation.requiredOperations) {
			const operation = runtimePromptValidationOperation(name);
			expect(typeof operation, name).toBe("function");
			const fixture = operationMutationFixture(name);
			const result = operation(fixture);
			expectOperationMutationKilled(name, fixture, result);
			executed.add(name);
		}
		expect(encodedRuntimePromptValidation.requiredOperations).toContain(
			"dumgen.prompt.transform.bindSupportedUnitShadow",
		);
		expect(encodedRuntimePromptValidation.requiredOperations).toContain(
			"dumgen.prompt.transform.bindLexicalUnitShadow",
		);
		expect([...executed].toSorted()).toEqual(
			[...encodedRuntimePromptValidation.requiredOperations].toSorted(),
		);
	});

	test("kills normalization, contextual, and customized-regex mutations", () => {
		expect(
			runtimePromptValidationOperation(
				"dumgen.prompt.overwrite.normalizeNfc",
			)("cafe\u0301").value,
		).toBe("café");
		expect(
			runtimePromptValidationOperation(
				"dumgen.prompt.regex.customized.1",
			)("two words").issues,
		).toEqual([
			{
				code: "invalid_format",
				format: "regex",
				message: "A normalized member must contain no whitespace.",
				origin: "string",
				path: [],
				pattern: "/^\\S+$/u",
			},
		]);
		expect(
			runtimePromptValidationOperation(
				"dumgen.prompt.contextual.laboratory.targetClassification.de.highLevelWholeUnit#input@$",
			)({
				clickedSegmentIndex: 0,
				segments: [{ kind: "OpaqueText", text: "?" }],
			}).issues,
		).toEqual([
			{
				code: "custom",
				message: "The clicked index must reference ResolvableText.",
				path: ["clickedSegmentIndex"],
			},
		]);
	});

	test("binds every operation ID to a fresh canonical node/function signature", async () => {
		const encodedRuntimePromptValidation =
			loadEncodedRuntimePromptValidation() as Readonly<{
				operationBindings: Readonly<
					Record<
						string,
						Readonly<{ fingerprint: string; version: number }>
					>
				>;
				requiredOperations: readonly string[];
			}>;
		expect(
			Object.keys(
				encodedRuntimePromptValidation.operationBindings,
			).toSorted(),
		).toEqual(
			[...encodedRuntimePromptValidation.requiredOperations].toSorted(),
		);
		for (const binding of Object.values(
			encodedRuntimePromptValidation.operationBindings,
		)) {
			expect(binding.version).toBe(1);
			expect(binding.fingerprint).toMatch(/^[0-9a-f]{64}$/u);
		}
		expect(
			await runCodegen(runtimePromptArtifactRecipe, { mode: "check" }),
		).toMatchObject({ status: "clean" });
	});
});

function operationMutationFixture(name: string): unknown {
	if (name.includes("discriminator.family"))
		return { family: "Unknown", kind: "Unknown" };
	if (name.includes("regex.customized")) return "two words";
	if (name.includes("readonly.")) return {};
	if (
		name.includes("grammaticalResolution") &&
		name.endsWith("@$.markedContext")
	)
		return "<TARGET>eins";
	if (name.includes("grammaticalResolution"))
		return { markedContext: "<TARGET>eins</TARGET>", members: ["zwei"] };
	if (name.includes("targetClassification") && name.includes("#input@$"))
		return {
			clickedSegmentIndex: 0,
			segments: [{ kind: "OpaqueText", text: "eins" }],
		};
	if (
		name.includes("targetClassification") &&
		name.includes("#model-input@$")
	)
		return {
			clickedIndex: 1,
			markedSentence: "<target>eins</target>",
			segments: [{ i: 0, s: "eins" }],
		};
	if (name.includes("targetClassification") && name.includes("#output@$"))
		return {
			additionalMemberIndices: [],
			decision: "Resolved",
			target: null,
		};
	if (name.includes("unitShadowClassification#output@$.target"))
		return { family: "Unknown", kind: "Unknown" };
	if (name.includes("unitShadowClassification#output@$"))
		return { decision: "Resolved", target: null };
	if (name.includes("knowledge.de.combined#output@$.semanticRelations"))
		return {
			canonicalForm: "Bank",
			family: "Unknown",
			kind: "Unknown",
			language: "en",
		};
	if (name.includes("hasDistinctPair")) return ["same", "same"];
	if (name.includes("hasMarked")) return {};
	if (name.includes("hasEnglishTranslationSelection")) return {};
	if (name.includes("hasSemanticRelationSelection")) return {};
	if (name.includes("isCompactEmojiSequence")) return "not emoji";
	if (name.includes("isGermanKnowledgeReading"))
		return { lemma: { language: "en" } };
	if (name.includes("isLexicalUnitShadow")) return { family: "Construction" };
	if (name.includes("bindGermanKnowledgeInput"))
		return { reading: { lemma: { language: "de" } } };
	if (name.includes("bindGermanKnowledgeReading"))
		return { lemma: { language: "de" } };
	if (name.includes("normalizeReadingLemma"))
		return { canonicalForm: "  cafe\u0301  " };
	if (name.includes("bind")) return {};
	if (
		name.includes("normalizeNfc") ||
		name.includes("NormalizeNfc") ||
		name.endsWith(".2")
	)
		return "cafe\u0301";
	return "  value  ";
}

function expectOperationMutationKilled(
	name: string,
	fixture: unknown,
	result: Readonly<{ issues?: readonly unknown[]; value: unknown }>,
): void {
	if (
		name.includes("discriminator.") ||
		name.includes("regex.customized") ||
		name.includes("contextual.") ||
		name.includes("custom.")
	) {
		expect(result.issues?.length, name).toBeGreaterThan(0);
		return;
	}
	if (name.includes("readonly.")) {
		expect(result.value, name).toBe(fixture);
		expect(Object.isFrozen(result.value), name).toBe(true);
		return;
	}
	if (name.includes("overwrite.")) {
		expect(result.value, name).not.toBe(fixture);
		return;
	}
	if (name.includes("normalizeReadingLemma")) {
		expect(result.value, name).toEqual({ canonicalForm: "café" });
		return;
	}
	if (name.includes("transform.bind")) {
		expect(result.value, name).toBe(fixture);
		return;
	}
	throw new Error(`Missing observable operation witness: ${name}.`);
}
