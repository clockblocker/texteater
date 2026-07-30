import type { input, output, ZodType } from "zod";

import type { AiSdk } from "../ai-sdk/ai-sdk";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "../promtsmith/prompt";
import { DumgenError } from "./generator-error";

type AnyPrompt = Prompt<ZodType, ZodType | null>;

type GeneratorFor<Definition extends AnyPrompt> = (
	input: input<Definition["inputSchema"]>,
) => Promise<
	Definition["outputSchema"] extends ZodType
		? output<Definition["outputSchema"]>
		: string
>;

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
): GeneratorCatalog<Catalog> {
	return transformNode(catalog, sdk) as GeneratorCatalog<Catalog>;
}

function transformNode(
	node: PromptTree | PromptCatalogEntry,
	sdk: AiSdk,
): unknown {
	if (isPromptCatalogEntry(node)) {
		return makeGenerator(node.prompt, sdk);
	}

	return Object.freeze(
		Object.fromEntries(
			Object.entries(node).map(([key, child]) => [
				key,
				transformNode(child, sdk),
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

		const serializedInput = serializeInput(parsedInput);
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
				"generation-failed",
				"The language-model provider could not complete the generation.",
				{ cause },
			);
		}

		if (prompt.outputSchema === null) {
			return generated;
		}

		try {
			return prompt.outputSchema.parse(generated);
		} catch (cause) {
			throw new DumgenError(
				"invalid-output",
				"The generated output does not match its prompt schema.",
				{ cause },
			);
		}
	}) as GeneratorFor<Definition>;
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
