import type { input, output, ZodType } from "zod";

import type { AiSdk } from "../ai-sdk/ai-sdk";
import { AiSdkGenerationError } from "../ai-sdk/ai-sdk-generation-error";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "../catalog/prompt-definition";
import { DumgenError } from "./generator-error";

type AnyPrompt = Prompt;

type ModelExchangeBase = {
	readonly promptPath: string;
	readonly modelInput: unknown;
	readonly modelOutput: unknown;
};

export type ModelExchange =
	| (ModelExchangeBase & { readonly phase: "received" })
	| (ModelExchangeBase & {
			readonly phase: "accepted";
			readonly validatedModelOutput: unknown;
	  })
	| (ModelExchangeBase & {
			readonly phase: "rejected";
			readonly validatedModelOutput?: unknown;
			readonly validationError: {
				readonly name: string;
				readonly message: string;
			};
	  });

export type GeneratorCatalogOptions = {
	readonly onModelExchange?: (exchange: ModelExchange) => void;
};

type ResultOf<Definition extends AnyPrompt> = Definition extends {
	readonly projectOutput: (...args: never[]) => infer Result;
}
	? Result
	: Definition["outputSchema"] extends ZodType
		? output<Definition["outputSchema"]>
		: string;

type GeneratorFor<Definition extends AnyPrompt> = (
	input: input<Definition["inputSchema"]>,
) => Promise<ResultOf<Definition>>;

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
	sdk: AiSdk,
	options: GeneratorCatalogOptions = {},
): GeneratorCatalog<Catalog> {
	return transformNode(
		catalog,
		sdk,
		options,
		[],
	) as GeneratorCatalog<Catalog>;
}

function transformNode(
	node: PromptTree | PromptCatalogEntry,
	sdk: AiSdk,
	options: GeneratorCatalogOptions,
	path: readonly string[],
): unknown {
	if (isPromptCatalogEntry(node)) {
		return makeGenerator(node.prompt, sdk, options, path);
	}

	return Object.freeze(
		Object.fromEntries(
			Object.entries(node).map(([key, child]) => [
				key,
				transformNode(child, sdk, options, [...path, key]),
			]),
		),
	);
}

function isPromptCatalogEntry(
	value: PromptTree | PromptCatalogEntry,
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
	sdk: AiSdk,
	options: GeneratorCatalogOptions,
	path: readonly string[],
): GeneratorFor<Definition> {
	return (async (rawInput: input<Definition["inputSchema"]>) => {
		let parsedInput: output<Definition["inputSchema"]>;
		try {
			parsedInput = prompt.inputSchema.parse(rawInput) as output<
				Definition["inputSchema"]
			>;
		} catch (cause) {
			throw new DumgenError(
				"invalid-input",
				"The generator input does not match its prompt schema.",
				{ cause },
			);
		}

		let modelInput: unknown;
		try {
			const projectedInput =
				prompt.projectInput?.(parsedInput) ?? parsedInput;
			modelInput = (prompt.modelInputSchema ?? prompt.inputSchema).parse(
				projectedInput,
			);
		} catch (cause) {
			throw new DumgenError(
				"invalid-input",
				"The projected model input does not match its prompt schema.",
				{ cause },
			);
		}
		const serializedInput = serializeInput(modelInput);
		const params = {
			...prompt.generationParams,
			systemPrompt: prompt.systemPrompt,
		};

		let generated: unknown;
		try {
			generated =
				prompt.outputSchema === null
					? await sdk.unstructuredGeneration(serializedInput, params)
					: await sdk.structuredGeneration(
							serializedInput,
							prompt.outputSchema,
							params,
						);
		} catch (cause) {
			throw new DumgenError(
				cause instanceof AiSdkGenerationError
					? cause.reason
					: "provider-error",
				"The language-model provider could not complete the generation.",
				{ cause },
			);
		}
		notifyModelExchange(options, {
			phase: "received",
			promptPath: path.join("."),
			modelInput,
			modelOutput: generated,
		});

		if (prompt.outputSchema === null) {
			try {
				const result = prompt.projectOutput
					? prompt.projectOutput(parsedInput, generated as string)
					: generated;
				notifyModelExchange(options, {
					phase: "accepted",
					promptPath: path.join("."),
					modelInput,
					modelOutput: generated,
					validatedModelOutput: generated,
				});
				return result;
			} catch (cause) {
				notifyRejectedModelExchange(
					options,
					path,
					modelInput,
					generated,
					generated,
					cause,
				);
				throw new DumgenError(
					"invalid-output",
					"The generated output does not match its prompt schema.",
					{ cause },
				);
			}
		}

		let parsedOutput: unknown;
		try {
			parsedOutput = prompt.outputSchema.parse(generated);
			prompt.outputPostcondition?.assert(parsedInput, parsedOutput);
			const result = prompt.projectOutput
				? prompt.projectOutput(parsedInput, parsedOutput)
				: parsedOutput;
			notifyModelExchange(options, {
				phase: "accepted",
				promptPath: path.join("."),
				modelInput,
				modelOutput: generated,
				validatedModelOutput: parsedOutput,
			});
			return result;
		} catch (cause) {
			notifyRejectedModelExchange(
				options,
				path,
				modelInput,
				generated,
				parsedOutput,
				cause,
			);
			throw new DumgenError(
				"invalid-output",
				"The generated output does not match its prompt schema.",
				{ cause },
			);
		}
	}) as GeneratorFor<Definition>;
}

function notifyRejectedModelExchange(
	options: GeneratorCatalogOptions,
	path: readonly string[],
	modelInput: unknown,
	modelOutput: unknown,
	validatedModelOutput: unknown,
	cause: unknown,
): void {
	notifyModelExchange(options, {
		phase: "rejected",
		promptPath: path.join("."),
		modelInput,
		modelOutput,
		...(validatedModelOutput === undefined
			? undefined
			: { validatedModelOutput }),
		validationError: describeError(cause),
	});
}

function notifyModelExchange(
	options: GeneratorCatalogOptions,
	exchange: ModelExchange,
): void {
	try {
		options.onModelExchange?.({
			...exchange,
			modelInput: normalizeForSerialization(exchange.modelInput),
			modelOutput: normalizeForSerialization(exchange.modelOutput),
			...(exchange.phase === "received"
				? undefined
				: exchange.phase === "accepted"
					? {
							validatedModelOutput: normalizeForSerialization(
								exchange.validatedModelOutput,
							),
						}
					: exchange.validatedModelOutput === undefined
						? undefined
						: {
								validatedModelOutput: normalizeForSerialization(
									exchange.validatedModelOutput,
								),
							}),
		});
	} catch {
		// Instrumentation must never change generation behavior or mask its error.
	}
}

function describeError(cause: unknown): { name: string; message: string } {
	if (cause instanceof Error) {
		return { name: cause.name, message: cause.message };
	}
	return { name: "Error", message: String(cause) };
}

function serializeInput(value: unknown): string {
	return JSON.stringify(normalizeForSerialization(value));
}

function normalizeForSerialization(value: unknown): unknown {
	if (value === undefined) return { __dumgenUndefined: true };
	if (value === null) return null;

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (typeof value === "bigint") return value.toString();
	if (value instanceof Date) return value.toISOString();

	if (Array.isArray(value)) {
		return value.map(normalizeForSerialization);
	}

	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, nestedValue]) => [
					key,
					normalizeForSerialization(nestedValue),
				]),
		);
	}

	return String(value);
}
