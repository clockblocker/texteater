export type CoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Ord" | null;
	readonly variant: "Short" | null;
};

export type InflectionalFeatures = {
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly degree: "Cmp" | "Pos" | "Sup";
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
};

export const unmarkedCore = {
	abbr: null,
	foreign: null,
	numType: null,
	variant: null,
} satisfies CoreFeatures;

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly coreFeatures?: CoreFeatures;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				realizationCoverage: "Full" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: args.coreFeatures ?? unmarkedCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly inflectionalFeatures: InflectionalFeatures;
	readonly coreFeatures?: CoreFeatures;
	readonly memberOrthographies?: readonly ("Standard" | "Typo")[];
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [
				...(args.memberOrthographies ?? ["Standard" as const]),
			],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				realizationCoverage: "Full" as const,
				surfaceKind: "Inflection" as const,
				surfaceFeatures: null,
				inflectionalFeatures: args.inflectionalFeatures,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: args.coreFeatures ?? unmarkedCore,
			},
		},
	};
}
