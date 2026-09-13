import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type {
	inputSchema,
	modelInflectionalFeaturesSchema,
	outputSchema,
} from "../../schemas";

export type FiniteFeatures = {
	readonly mood: "Ind" | "Sub" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly tense: "Past" | "Pres" | null;
	readonly verbForm: "Fin";
	readonly voice: "Pass" | null;
};

type CaseOptions = {
	readonly explanation?: string;
	readonly historicalStatus?: "Archaic" | null;
	readonly normalizedMember?: string;
	readonly orthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
};

export function citationCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	verbType: "Mod" | null,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return auxiliaryCase(
		markedContext,
		member,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
		},
		canonicalForm,
		verbType,
		options,
	);
}

export function finiteCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	verbType: "Mod" | null,
	features: Omit<FiniteFeatures, "verbForm">,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return inflectionCase(
		markedContext,
		member,
		canonicalForm,
		verbType,
		{ ...features, verbForm: "Fin" },
		options,
	);
}

export function imperativeCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	number: "Plur" | "Sing" | null,
	person: "1" | "2" | "3" | null,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return inflectionCase(
		markedContext,
		member,
		canonicalForm,
		null,
		{
			mood: "Imp",
			number,
			person,
			tense: null,
			verbForm: "Fin",
			voice: null,
		},
		options,
	);
}

export function infinitiveCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	verbType: "Mod" | null,
	voice: "Pass" | null,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return inflectionCase(
		markedContext,
		member,
		canonicalForm,
		verbType,
		{
			mood: null,
			number: null,
			person: null,
			tense: null,
			verbForm: "Inf",
			voice,
		},
		options,
	);
}

export function participleCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	voice: "Pass" | null,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return inflectionCase(
		markedContext,
		member,
		canonicalForm,
		null,
		{
			aspect: null,
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			verbForm: "Part",
			voice,
		},
		options,
	);
}

function inflectionCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	verbType: "Mod" | null,
	inflectionalFeatures: input<typeof modelInflectionalFeaturesSchema>,
	options: CaseOptions,
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return auxiliaryCase(
		markedContext,
		member,
		{
			spelling: options.spelling ?? "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: surfaceFeatures(options.historicalStatus),
			inflectionalFeatures,
		},
		canonicalForm,
		verbType,
		options,
	);
}

function auxiliaryCase(
	markedContext: string,
	member: string,
	surface: input<typeof outputSchema>["surface"],
	canonicalForm: string,
	verbType: "Mod" | null,
	options: CaseOptions,
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return {
		input: { markedContext, members: [member] },
		idealOutput: {
			memberOrthographies: [options.orthography ?? "Standard"],
			normalizedMembers: [options.normalizedMember ?? member],
			surface,
			lemma: { canonicalForm, coreFeatures: { verbType } },
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
