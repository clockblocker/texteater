import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type {
	deSymbolModelInflectionalFeaturesSchema,
	inputSchema,
	outputSchema,
} from "../../schemas";

export type SymbolCoreFeatures = input<
	typeof outputSchema
>["lemma"]["coreFeatures"];

export const ordinarySymbolCore = {
	foreign: null,
	numType: null,
} satisfies SymbolCoreFeatures;

type CaseOptions = {
	readonly coreFeatures?: SymbolCoreFeatures;
	readonly explanation?: string;
	readonly historicalStatus?: "Archaic" | null;
	readonly normalizedMembers?: readonly string[];
	readonly orthographies?: readonly ("Standard" | "Typo")[];
	readonly spelling?: "Canonical" | "Variant";
};

export function citationCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return symbolCase(
		markedContext,
		members,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
		},
		canonicalForm,
		options,
	);
}

export function inflectionCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	inflectionalFeatures: input<typeof deSymbolModelInflectionalFeaturesSchema>,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return symbolCase(
		markedContext,
		members,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
			inflectionalFeatures,
		},
		canonicalForm,
		options,
	);
}

function symbolCase(
	markedContext: string,
	members: readonly string[],
	surface: input<typeof outputSchema>["surface"],
	canonicalForm: string,
	options: CaseOptions,
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
				coreFeatures: options.coreFeatures ?? ordinarySymbolCore,
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
