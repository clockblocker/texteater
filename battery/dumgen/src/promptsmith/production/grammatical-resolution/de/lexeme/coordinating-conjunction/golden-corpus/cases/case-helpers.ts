import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

type ConjunctionCaseOptions = {
	readonly normalizedMember?: string;
	readonly canonicalForm?: string;
	readonly conjType?: "Comp" | null;
	readonly orthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly explanation?: string;
};

type MultiMemberConjunctionCaseOptions = Omit<
	ConjunctionCaseOptions,
	"canonicalForm" | "normalizedMember" | "orthography"
> & {
	readonly normalizedMembers?: readonly string[];
	readonly orthographies?: readonly ("Standard" | "Typo")[];
};

export function conjunctionCase(
	markedContext: string,
	member: string,
	options: ConjunctionCaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	const normalizedMember = options.normalizedMember ?? member;
	const idealOutput = {
		memberOrthographies: [options.orthography ?? "Standard"],
		normalizedMembers: [normalizedMember],
		surface: {
			spelling: options.spelling ?? "Canonical",
			surfaceFeatures:
				options.historicalStatus === "Archaic"
					? { historicalStatus: "Archaic" as const }
					: null,
		},
		lemma: {
			canonicalForm: options.canonicalForm ?? normalizedMember,
			coreFeatures: { conjType: options.conjType ?? null },
		},
	} satisfies input<typeof outputSchema>;

	return {
		input: { markedContext, members: [member] },
		idealOutput,
		...(options.explanation === undefined
			? {}
			: { explanation: options.explanation }),
	};
}

export function multiMemberConjunctionCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	options: MultiMemberConjunctionCaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	const normalizedMembers = options.normalizedMembers ?? members;
	const idealOutput = {
		memberOrthographies:
			options.orthographies === undefined
				? members.map(() => "Standard" as const)
				: [...options.orthographies],
		normalizedMembers: [...normalizedMembers],
		surface: {
			spelling: options.spelling ?? "Canonical",
			surfaceFeatures:
				options.historicalStatus === "Archaic"
					? { historicalStatus: "Archaic" as const }
					: null,
		},
		lemma: {
			canonicalForm,
			coreFeatures: { conjType: options.conjType ?? null },
		},
	} satisfies input<typeof outputSchema>;

	return {
		input: { markedContext, members: [...members] },
		idealOutput,
		...(options.explanation === undefined
			? {}
			: { explanation: options.explanation }),
	};
}
