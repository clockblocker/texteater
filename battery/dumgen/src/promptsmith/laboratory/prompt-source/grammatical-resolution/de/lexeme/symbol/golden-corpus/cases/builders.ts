export type SymbolCoreFeatures = {
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Range" | null;
};

export const ordinarySymbolCore = {
	foreign: null,
	numType: null,
} satisfies SymbolCoreFeatures;

export function citation(args: {
	readonly normalizedMembers: readonly string[];
	readonly canonicalForm?: string;
	readonly coreFeatures?: SymbolCoreFeatures;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			normalizedMembers: [...args.normalizedMembers],
			surface: {
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm:
					args.canonicalForm ?? args.normalizedMembers.join(" "),
				coreFeatures: args.coreFeatures ?? ordinarySymbolCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedMembers: readonly string[];
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			normalizedMembers: [...args.normalizedMembers],
			surface: {
				spelling: "Canonical" as const,
				surfaceKind: "Inflection" as const,
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: args.case,
					gender: args.gender,
					number: args.number,
				},
			},
			lemma: {
				canonicalForm: args.normalizedMembers.join(" "),
				coreFeatures: ordinarySymbolCore,
			},
		},
	};
}
