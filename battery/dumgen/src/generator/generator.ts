import { recordTrace, traceStage } from "common-utils/workflow";
import * as Effect from "effect/Effect";
import type { ModelGenerator } from "../ai-sdk/ai-sdk";
import { AiSdkGenerationError } from "../ai-sdk/ai-sdk-generation-error";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptSchema,
	PromptSchemaInput,
	PromptSchemaOutput,
	PromptTree,
} from "../catalog/prompt-definition";
import { DumgenError } from "./generator-error";

type AnyPrompt = Prompt<
	PromptSchema,
	PromptSchema | null,
	unknown,
	PromptSchema
>;
type ModelExchangeAttempt = {
	readonly promptPath: string;
	readonly modelInput: unknown;
};
type ModelExchangeResult = ModelExchangeAttempt & {
	readonly modelOutput: unknown;
};
export type ModelExchange =
	| (ModelExchangeAttempt & { readonly phase: "attempted" })
	| (ModelExchangeResult & { readonly phase: "received" })
	| (ModelExchangeResult & {
			readonly phase: "accepted";
			readonly validatedModelOutput: unknown;
			readonly result: unknown;
	  })
	| (ModelExchangeResult & {
			readonly phase: "rejected";
			readonly validatedModelOutput?: unknown;
			readonly validationError: {
				readonly name: string;
				readonly message: string;
			};
	  });
type ResultOf<Definition extends AnyPrompt> = Definition extends {
	readonly projectOutput: (...args: never[]) => infer Result;
}
	? Result
	: Definition["outputSchema"] extends PromptSchema
		? PromptSchemaOutput<Definition["outputSchema"]>
		: string;
type GeneratorFor<Definition extends AnyPrompt> = (
	input: PromptSchemaInput<Definition["inputSchema"]>,
) => Effect.Effect<ResultOf<Definition>, DumgenError>;
export type GeneratorCatalog<Catalog> =
	Catalog extends PromptCatalogEntry<infer Definition>
		? GeneratorFor<Definition>
		: Catalog extends PromptTree
			? {
					readonly [Key in keyof Catalog]: GeneratorCatalog<
						Catalog[Key]
					>;
				}
			: never;

export function buildGeneratorCatalog<const Catalog extends PromptTree>(
	catalog: Catalog,
	modelGenerator: ModelGenerator,
): GeneratorCatalog<Catalog> {
	return transformNode(
		catalog,
		modelGenerator,
		[],
	) as GeneratorCatalog<Catalog>;
}
function transformNode(
	node: PromptTree | PromptCatalogEntry<AnyPrompt>,
	modelGenerator: ModelGenerator,
	path: readonly string[],
): unknown {
	if (isPromptCatalogEntry(node))
		return makeGenerator(node.prompt, modelGenerator, path);
	return Object.freeze(
		Object.fromEntries(
			Object.entries(node).map(([key, child]) => [
				key,
				transformNode(child, modelGenerator, [...path, key]),
			]),
		),
	);
}
function isPromptCatalogEntry(
	value: PromptTree | PromptCatalogEntry<AnyPrompt>,
): value is PromptCatalogEntry<AnyPrompt> {
	const candidate = value as {
		readonly meta?: { readonly kind?: unknown };
		readonly prompt?: unknown;
	};
	return (
		candidate.meta?.kind === "prompt" &&
		typeof candidate.prompt === "object" &&
		candidate.prompt !== null
	);
}

function makeGenerator<Definition extends AnyPrompt>(
	prompt: Definition,
	modelGenerator: ModelGenerator,
	path: readonly string[],
): GeneratorFor<Definition> {
	const promptPath = path.join(".");
	return (rawInput) => {
		const diagnostics: unknown[] = [];
		const projectionContext = Object.freeze({
			reportDiagnostic(diagnostic: unknown): void {
				diagnostics.push(diagnostic);
			},
		});
		return traceStage(
			"model.generation",
			Effect.gen(function* () {
				const parsedInput = yield* parseInput(prompt, rawInput);
				const modelInput = yield* projectModelInput(
					prompt,
					parsedInput,
				);
				const modelOutputSchema = yield* selectModelOutputSchema(
					prompt,
					parsedInput,
				);
				const serializedInput = serializeInput(modelInput);
				const params = {
					...prompt.generationParams,
					systemPrompt: prompt.systemPrompt,
				};
				yield* modelExchange({
					phase: "attempted",
					promptPath,
					modelInput,
				});
				const generated = yield* (
					modelOutputSchema === null
						? modelGenerator.unstructuredGeneration(
								serializedInput,
								params,
							)
						: modelGenerator.structuredGeneration(
								serializedInput,
								modelOutputSchema,
								params,
							)
				).pipe(
					Effect.mapError(
						(cause) =>
							new DumgenError(
								cause instanceof AiSdkGenerationError
									? cause.reason
									: "provider-error",
								"The language-model provider could not complete the generation.",
								{
									cause,
									...(cause instanceof AiSdkGenerationError
										? { generationFailure: cause.failure }
										: {}),
								},
							),
					),
				);
				yield* modelExchange({
					phase: "received",
					promptPath,
					modelInput,
					modelOutput: generated,
				});
				return yield* validateOutput(
					prompt,
					parsedInput,
					modelOutputSchema,
					generated,
					projectionContext,
					modelInput,
					promptPath,
				);
			}).pipe(
				Effect.ensuring(
					Effect.suspend(() =>
						Effect.forEach(
							diagnostics,
							(diagnostic) =>
								recordTrace("model.diagnostic", {
									promptPath,
									diagnostic,
								}),
							{ discard: true },
						),
					),
				),
			),
			rawInput,
		);
	};

	function modelExchange(exchange: ModelExchange): Effect.Effect<void> {
		const normalized = normalizeExchange(exchange);
		return recordTrace("model.exchange", normalized);
	}
}
function parseInput<Definition extends AnyPrompt>(
	prompt: Definition,
	rawInput: PromptSchemaInput<Definition["inputSchema"]>,
) {
	return Effect.try({
		try: () =>
			prompt.inputSchema.parse(rawInput) as PromptSchemaOutput<
				Definition["inputSchema"]
			>,
		catch: (cause) =>
			new DumgenError(
				"invalid-input",
				"The generator input does not match its prompt schema.",
				{ cause },
			),
	});
}
function projectModelInput<Definition extends AnyPrompt>(
	prompt: Definition,
	parsedInput: PromptSchemaOutput<Definition["inputSchema"]>,
) {
	return Effect.try({
		try: () =>
			(prompt.modelInputSchema ?? prompt.inputSchema).parse(
				prompt.projectInput?.(parsedInput) ?? parsedInput,
			),
		catch: (cause) =>
			new DumgenError(
				"invalid-input",
				"The projected model input does not match its prompt schema.",
				{ cause },
			),
	});
}
function selectModelOutputSchema<Definition extends AnyPrompt>(
	prompt: Definition,
	parsedInput: PromptSchemaOutput<Definition["inputSchema"]>,
) {
	return Effect.try({
		try: () =>
			prompt.outputSchema === null
				? null
				: (prompt.modelOutputSchemaFor?.(parsedInput) ??
					prompt.outputSchema),
		catch: (cause) =>
			new DumgenError(
				"invalid-input",
				"The generator input cannot produce a valid model output schema.",
				{ cause },
			),
	});
}
function validateOutput<Definition extends AnyPrompt>(
	prompt: Definition,
	parsedInput: PromptSchemaOutput<Definition["inputSchema"]>,
	modelOutputSchema: PromptSchema | null,
	generated: unknown,
	projectionContext: {
		readonly reportDiagnostic: (diagnostic: unknown) => void;
	},
	modelInput: unknown,
	promptPath: string,
): Effect.Effect<ResultOf<Definition>, DumgenError> {
	return Effect.try({
		try: () => {
			const parsedOutput =
				modelOutputSchema === null || prompt.outputSchema === null
					? generated
					: (() => {
							modelOutputSchema.parse(generated);
							const parsed = prompt.outputSchema.parse(generated);
							prompt.outputPostcondition?.assert(
								parsedInput,
								parsed,
							);
							return parsed;
						})();
			const result = prompt.projectOutput
				? prompt.projectOutput(
						parsedInput,
						parsedOutput as never,
						projectionContext,
					)
				: parsedOutput;
			return { parsedOutput, result: result as ResultOf<Definition> };
		},
		catch: (cause) =>
			new DumgenError(
				"invalid-output",
				"The generated output does not match its prompt schema.",
				{ cause },
			),
	}).pipe(
		Effect.tap(({ parsedOutput, result }) =>
			recordTrace(
				"model.exchange",
				normalizeExchange({
					phase: "accepted",
					promptPath,
					modelInput,
					modelOutput: generated,
					validatedModelOutput: parsedOutput,
					result,
				}),
			),
		),
		Effect.map(({ result }) => result),
	);
}
function normalizeExchange(exchange: ModelExchange): ModelExchange {
	return {
		...exchange,
		modelInput: normalizeForSerialization(exchange.modelInput),
		...(exchange.phase === "attempted"
			? {}
			: { modelOutput: normalizeForSerialization(exchange.modelOutput) }),
		...(exchange.phase === "accepted"
			? {
					validatedModelOutput: normalizeForSerialization(
						exchange.validatedModelOutput,
					),
					result: normalizeForSerialization(exchange.result),
				}
			: exchange.phase === "rejected" &&
					exchange.validatedModelOutput !== undefined
				? {
						validatedModelOutput: normalizeForSerialization(
							exchange.validatedModelOutput,
						),
					}
				: {}),
	} as ModelExchange;
}
function serializeInput(value: unknown): string {
	return JSON.stringify(normalizeForSerialization(value));
}
function normalizeForSerialization(value: unknown): unknown {
	if (value === undefined) return { __dumgenUndefined: true };
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	)
		return value;
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(normalizeForSerialization);
	if (typeof value === "object")
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, nested]) => [
					key,
					normalizeForSerialization(nested),
				]),
		);
	return String(value);
}
