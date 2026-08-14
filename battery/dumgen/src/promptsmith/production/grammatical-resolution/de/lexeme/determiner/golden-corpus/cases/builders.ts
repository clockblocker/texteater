import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export type CoreFeatures = input<typeof outputSchema>["lemma"]["coreFeatures"];
export type InflectionalFeatures = Extract<
	input<typeof outputSchema>["surface"],
	{ surfaceKind: "Inflection" }
>["inflectionalFeatures"];

type Options = {
	readonly normalizedMember?: string;
	readonly orthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly coreFeatures?: CoreFeatures;
	readonly explanation?: string;
};

export const unmarkedCore = {
	definite: null,
	extPos: null,
	foreign: null,
	numType: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
} satisfies CoreFeatures;

export const emptyInflection = {
	case: null,
	degree: null,
	gender: null,
	"gender[psor]": null,
	number: null,
	"number[psor]": null,
} satisfies InflectionalFeatures;

export function citationCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	options: Options = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return determinerCase(
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
	options: Options = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return determinerCase(
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

function determinerCase(
	markedContext: string,
	member: string,
	surface: input<typeof outputSchema>["surface"],
	canonicalForm: string,
	options: Options,
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
