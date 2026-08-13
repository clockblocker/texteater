import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../../assembly";
import type {
	inputSchema,
	modelInflectionalFeaturesSchema,
	outputSchema,
} from "../../schemas";

export type NumeralCoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Frac" | "Mult" | "Range" | null;
};

export const cardinalCore = {
	abbr: null,
	foreign: null,
	numType: "Card",
} satisfies NumeralCoreFeatures;

type CaseOptions = {
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
	coreFeatures: NumeralCoreFeatures = cardinalCore,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return numeralCase(
		markedContext,
		members,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
		},
		canonicalForm,
		coreFeatures,
		options,
	);
}

export function inflectionCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	inflectionalFeatures: input<typeof modelInflectionalFeaturesSchema>,
	coreFeatures: NumeralCoreFeatures = cardinalCore,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return numeralCase(
		markedContext,
		members,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
			inflectionalFeatures,
		},
		canonicalForm,
		coreFeatures,
		options,
	);
}

function numeralCase(
	markedContext: string,
	members: readonly string[],
	surface: input<typeof outputSchema>["surface"],
	canonicalForm: string,
	coreFeatures: NumeralCoreFeatures,
	options: CaseOptions,
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return {
		input: { markedContext, members: [...members] },
		idealOutput: {
			memberOrthographies:
				options.orthographies === undefined
					? members.map(() => "Standard" as const)
					: [...options.orthographies],
			normalizedMembers:
				options.normalizedMembers === undefined
					? [...members]
					: [...options.normalizedMembers],
			surface,
			lemma: { canonicalForm, coreFeatures },
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
