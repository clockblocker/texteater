import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

type CaseOptions = {
	readonly explanation?: string;
	readonly historicalStatus?: "Archaic" | null;
	readonly normalizedMembers?: readonly string[];
	readonly orthographies?: readonly ("Standard" | "Typo")[];
	readonly spelling?: "Canonical" | "Variant";
};

export function interjectionCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	partType: "Res" | null = null,
	options: CaseOptions = {},
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
			surface: {
				spelling: options.spelling ?? "Canonical",
				surfaceFeatures:
					options.historicalStatus === "Archaic"
						? { historicalStatus: "Archaic" }
						: null,
			},
			lemma: {
				canonicalForm,
				coreFeatures: { partType },
			},
		},
		...(options.explanation === undefined
			? {}
			: { explanation: options.explanation }),
	};
}
