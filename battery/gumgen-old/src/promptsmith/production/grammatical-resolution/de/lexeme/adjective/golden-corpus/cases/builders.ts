import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export type CoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Ord" | null;
	readonly variant: "Short" | null;
};

export type InflectionalFeatures = {
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly degree: "Cmp" | "Pos" | "Sup" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
};

type CaseMetadata = {
	readonly explanation?: string;
};

type SurfaceOptions = CaseMetadata & {
	readonly normalizedMember?: string;
	readonly orthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly coreFeatures?: CoreFeatures;
};

export const unmarkedCore = {
	abbr: null,
	foreign: null,
	numType: null,
	variant: null,
} satisfies CoreFeatures;

export function citationCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	options: SurfaceOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return adjectiveCase(
		markedContext,
		member,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
		},
		canonicalForm,
		options,
	);
}

export function inflectionCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	inflectionalFeatures: InflectionalFeatures,
	options: SurfaceOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return adjectiveCase(
		markedContext,
		member,
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

function adjectiveCase(
	markedContext: string,
	member: string,
	surface: input<typeof outputSchema>["surface"],
	canonicalForm: string,
	options: SurfaceOptions,
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return {
		input: { markedContext, members: [member] },
		idealOutput: {
			memberOrthographies: [options.orthography ?? "Standard"],
			normalizedMembers: [options.normalizedMember ?? member],
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
