import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export type CoreFeatures = input<typeof outputSchema>["lemma"]["coreFeatures"];
export type InflectionalFeatures = Extract<
	input<typeof outputSchema>["surface"],
	{ surfaceKind: "Inflection" }
>["inflectionalFeatures"];

type Options = {
	readonly normalizedMembers?: readonly string[];
	readonly orthographies?: readonly ("Standard" | "Typo")[];
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly coreFeatures?: CoreFeatures;
	readonly explanation?: string;
};

export const unmarkedCore = {
	abbr: null,
	foreign: null,
	gender: null,
} satisfies CoreFeatures;

export function citationCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	options: Options = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return properNounCase(
		markedContext,
		members,
		canonicalForm,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
		},
		options,
	);
}

export function inflectionCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	inflectionalFeatures: InflectionalFeatures,
	options: Options = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return properNounCase(
		markedContext,
		members,
		canonicalForm,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
			inflectionalFeatures,
		},
		options,
	);
}

function properNounCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	surface: input<typeof outputSchema>["surface"],
	options: Options,
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return {
		input: { markedContext, members: [...members] },
		idealOutput: {
			memberOrthographies: [
				...(options.orthographies ??
					members.map(() => "Standard" as const)),
			],
			normalizedMembers: [...(options.normalizedMembers ?? members)],
			surface,
			lemma: {
				canonicalForm,
				coreFeatures: options.coreFeatures ?? unmarkedCore,
			},
		},
		...(options.explanation === undefined
			? {}
			: { explanation: options.explanation }),
	};
}

function surfaceFeatures(historicalStatus: "Archaic" | null | undefined) {
	return historicalStatus === "Archaic"
		? ({ historicalStatus: "Archaic" } as const)
		: null;
}
