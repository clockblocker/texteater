export type ProperNounCoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
};

export const unmarkedCore = {
	abbr: null,
	foreign: null,
	gender: null,
} satisfies ProperNounCoreFeatures;

export const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm?: string;
	readonly coreFeatures?: ProperNounCoreFeatures;
	readonly memberOrthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [args.memberOrthography ?? "Standard"],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: args.spelling ?? ("Canonical" as const),
				realizationCoverage: "Full" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm ?? args.normalizedSurface,
				coreFeatures: args.coreFeatures ?? unmarkedCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm?: string;
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly coreFeatures?: ProperNounCoreFeatures;
	readonly memberOrthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [args.memberOrthography ?? "Standard"],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: args.spelling ?? ("Canonical" as const),
				realizationCoverage: "Full" as const,
				surfaceKind: "Inflection" as const,
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: args.case,
					number: args.number,
				},
			},
			lemma: {
				canonicalForm: args.canonicalForm ?? args.normalizedSurface,
				coreFeatures: args.coreFeatures ?? unmarkedCore,
			},
		},
	};
}
