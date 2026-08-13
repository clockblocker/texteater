import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export type CoreFeatures = input<typeof outputSchema>["lemma"]["coreFeatures"];

type Options = {
	readonly normalizedMember?: string;
	readonly orthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly coreFeatures?: CoreFeatures;
	readonly explanation?: string;
};

export const unmarkedCore = {
	abbr: null,
	foreign: null,
	partType: null,
	polarity: null,
} satisfies CoreFeatures;

export function particleCase(
	markedContext: string,
	member: string,
	canonicalForm: string,
	options: Options = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	return {
		input: { markedContext, members: [member] },
		idealOutput: {
			memberOrthographies: [options.orthography ?? "Standard"],
			normalizedMembers: [options.normalizedMember ?? member],
			surface: {
				spelling: options.spelling ?? "Canonical",
				surfaceFeatures:
					options.historicalStatus === "Archaic"
						? { historicalStatus: "Archaic" }
						: null,
			},
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
