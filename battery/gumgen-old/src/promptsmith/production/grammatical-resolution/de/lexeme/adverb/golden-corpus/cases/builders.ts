import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export type AdverbCoreFeatures = {
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Mult" | null;
	readonly pronType: "Dem" | "Ind" | "Int" | "Neg" | "Rel" | null;
};

export const unmarkedCoreFeatures = {
	foreign: null,
	numType: null,
	pronType: null,
} satisfies AdverbCoreFeatures;

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
	coreFeatures: AdverbCoreFeatures = unmarkedCoreFeatures,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return adverbCase(
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
	degree: "Cmp" | "Pos" | "Sup",
	coreFeatures: AdverbCoreFeatures = unmarkedCoreFeatures,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return adverbCase(
		markedContext,
		members,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
			inflectionalFeatures: { degree },
		},
		canonicalForm,
		coreFeatures,
		options,
	);
}

function adverbCase(
	markedContext: string,
	members: readonly string[],
	surface: input<typeof outputSchema>["surface"],
	canonicalForm: string,
	coreFeatures: AdverbCoreFeatures,
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
