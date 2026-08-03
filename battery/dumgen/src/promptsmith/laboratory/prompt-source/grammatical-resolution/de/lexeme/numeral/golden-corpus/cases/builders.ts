export type CardinalCoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly numType: "Card";
};

export const cardinalCore = {
	abbr: null,
	foreign: null,
	numType: "Card",
} satisfies CardinalCoreFeatures;

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm?: string;
	readonly memberOrthography?: "Standard" | "Typo";
	readonly coreFeatures?: CardinalCoreFeatures;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [args.memberOrthography ?? "Standard"],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				realizationCoverage: "Full" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm ?? args.normalizedSurface,
				coreFeatures: args.coreFeatures ?? cardinalCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				realizationCoverage: "Full" as const,
				surfaceKind: "Inflection" as const,
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: args.case,
					gender: args.gender,
					number: args.number,
				},
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: cardinalCore,
			},
		},
	};
}
