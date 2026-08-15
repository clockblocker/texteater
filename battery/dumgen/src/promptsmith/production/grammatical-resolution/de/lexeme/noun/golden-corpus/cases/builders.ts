import type { input } from "zod";

import type { inputSchema, outputSchema } from "../../schemas";

type NounInput = input<typeof inputSchema>;
type NounOutput = input<typeof outputSchema>;
type Orthography = "Standard" | "Typo";
type Gender = "Fem" | "Masc" | "Neut" | null;
type Case = "Acc" | "Dat" | "Gen" | "Nom" | null;
type Number = "Plur" | "Sing" | null;

type NounCase = {
	readonly input: NounInput;
	readonly idealOutput: NounOutput;
	readonly explanation?: string;
};

type CommonArgs = {
	readonly markedContext: string;
	readonly members: readonly [string, ...string[]];
	readonly normalizedMembers?: readonly [string, ...string[]];
	readonly memberOrthographies?: readonly [Orthography, ...Orthography[]];
	readonly canonicalForm: string;
	readonly gender: Gender;
	readonly hyph?: "Yes" | null;
	readonly spelling?: "Canonical" | "Variant";
	readonly archaic?: boolean;
	readonly explanation?: string;
};

export function nounCitation(args: CommonArgs): NounCase {
	return nounCase(args, {
		spelling: args.spelling ?? "Canonical",
		surfaceKind: "Citation",
		surfaceFeatures: args.archaic ? { historicalStatus: "Archaic" } : null,
	});
}

export function nounInflection(
	args: CommonArgs & { readonly case: Case; readonly number: Number },
): NounCase {
	return nounCase(args, {
		spelling: args.spelling ?? "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: args.archaic ? { historicalStatus: "Archaic" } : null,
		inflectionalFeatures: { case: args.case, number: args.number },
	});
}

function nounCase(args: CommonArgs, surface: NounOutput["surface"]): NounCase {
	return {
		input: {
			markedContext: args.markedContext,
			members: [...args.members],
		},
		idealOutput: {
			memberOrthographies: [
				...(args.memberOrthographies ??
					args.members.map(() => "Standard" as const)),
			],
			normalizedMembers: [...(args.normalizedMembers ?? args.members)],
			surface,
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: {
					gender: args.gender,
					hyph: args.hyph ?? null,
				},
			},
		},
		...(args.explanation === undefined
			? undefined
			: { explanation: args.explanation }),
	};
}
