export type SymbolCoreFeatures = {
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Range" | null;
};

export const ordinarySymbolCore = {
	foreign: null,
	numType: null,
} satisfies SymbolCoreFeatures;

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm?: string;
	readonly coreFeatures?: SymbolCoreFeatures;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm ?? args.normalizedSurface,
				coreFeatures: args.coreFeatures ?? ordinarySymbolCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: args.normalizedSurface,
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
				canonicalForm: args.normalizedSurface,
				coreFeatures: ordinarySymbolCore,
			},
		},
	};
}
