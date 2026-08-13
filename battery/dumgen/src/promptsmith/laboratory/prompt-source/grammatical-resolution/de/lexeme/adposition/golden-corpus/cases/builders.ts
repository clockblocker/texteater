import type { input } from "zod";

import type { GoldenCase } from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

type AdpositionCoreFeatures = input<
	typeof outputSchema
>["lemma"]["coreFeatures"];

type AdpositionCaseOptions = {
	readonly normalizedMembers?: readonly [string, ...string[]];
	readonly memberOrthographies?: readonly [
		"Standard" | "Typo",
		...(readonly ("Standard" | "Typo")[]),
	];
	readonly canonicalForm?: string;
	readonly coreFeatures: AdpositionCoreFeatures;
	readonly spelling?: "Canonical" | "Variant";
	readonly historicalStatus?: "Archaic" | null;
	readonly explanation?: string;
};

export const ordinaryAdpositionCore = (options: {
	readonly adpType: "Circ" | "Post" | "Prep" | null;
	readonly governedCase: "Acc" | "Dat" | "Gen" | null;
	readonly abbr?: "Yes" | null;
	readonly extPos?: "ADV" | "SCONJ" | null;
	readonly foreign?: "Yes" | null;
	readonly partType?: "Vbp" | null;
}): AdpositionCoreFeatures => ({
	abbr: options.abbr ?? null,
	adpType: options.adpType,
	extPos: options.extPos ?? null,
	foreign: options.foreign ?? null,
	governedCase: options.governedCase,
	partType: options.partType ?? null,
});

export function adpositionCase(
	markedContext: string,
	members: readonly [string, ...string[]],
	options: AdpositionCaseOptions,
): GoldenCase<input<typeof inputSchema>, input<typeof outputSchema>> {
	const normalizedMembers = options.normalizedMembers ?? members;
	return {
		input: { markedContext, members: [...members] },
		idealOutput: {
			memberOrthographies: [
				...(options.memberOrthographies ??
					members.map(() => "Standard" as const)),
			],
			normalizedMembers: [...normalizedMembers],
			surface: {
				spelling: options.spelling ?? "Canonical",
				surfaceFeatures:
					options.historicalStatus === "Archaic"
						? { historicalStatus: "Archaic" }
						: null,
			},
			lemma: {
				canonicalForm:
					options.canonicalForm ?? normalizedMembers.join(" ... "),
				coreFeatures: options.coreFeatures,
			},
		},
		...(options.explanation === undefined
			? {}
			: { explanation: options.explanation }),
	};
}
