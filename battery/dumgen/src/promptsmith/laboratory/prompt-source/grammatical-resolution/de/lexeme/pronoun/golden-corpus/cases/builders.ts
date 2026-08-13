import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export type PronounCoreFeatures = {
	readonly extPos: "DET" | null;
	readonly foreign: "Yes" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly polite: "Form" | "Infm" | null;
	readonly poss: "Yes" | null;
	readonly pronType:
		| "Dem"
		| "Ind"
		| "Int"
		| "Neg"
		| "Prs"
		| "Rcp"
		| "Rel"
		| "Tot"
		| null;
};

export type PronounInflectionalFeatures = {
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly reflex: "Yes" | null;
};

type CaseMetadata = {
	readonly explanation?: string;
};

type SurfaceOptions = CaseMetadata & {
	readonly normalizedMember?: string;
	readonly orthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly coreFeatures?: PronounCoreFeatures;
};

export const unmarkedCore = {
	extPos: null,
	foreign: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
} satisfies PronounCoreFeatures;

export function core(
	pronType: PronounCoreFeatures["pronType"],
	overrides: Partial<Omit<PronounCoreFeatures, "pronType">> = {},
): PronounCoreFeatures {
	return { ...unmarkedCore, pronType, ...overrides };
}

export function citationCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	options: SurfaceOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return pronounCase(
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
	inflectionalFeatures: PronounInflectionalFeatures,
	options: SurfaceOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return pronounCase(
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

function pronounCase(
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
