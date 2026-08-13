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

export function subordinatingConjunctionCase(
	markedContext: string,
	members: readonly string[],
	canonicalForm: string,
	conjType: "Comp" | null = null,
	options: CaseOptions = {},
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	const normalizedMembers =
		options.normalizedMembers === undefined
			? [...members]
			: [...options.normalizedMembers];
	const spelling = options.spelling ?? "Canonical";
	if (
		spelling === "Variant" &&
		normalizedMembers.join(" ") === canonicalForm
	) {
		throw new Error(
			"A realization identical to its Lemma canonicalForm must use Canonical spelling.",
		);
	}
	return {
		input: { markedContext, members: [...members] },
		idealOutput: {
			memberOrthographies:
				options.orthographies === undefined
					? members.map(() => "Standard" as const)
					: [...options.orthographies],
			normalizedMembers,
			surface: {
				spelling,
				surfaceFeatures:
					options.historicalStatus === "Archaic"
						? { historicalStatus: "Archaic" }
						: null,
			},
			lemma: {
				canonicalForm,
				coreFeatures: { conjType },
			},
		},
		...(options.explanation === undefined
			? {}
			: { explanation: options.explanation }),
	};
}
