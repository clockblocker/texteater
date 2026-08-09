export type FiniteFeatures = {
	readonly mood: "Ind" | "Sub" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly tense: "Past" | "Pres" | null;
	readonly verbForm: "Fin";
	readonly voice: "Pass" | null;
};

export type InfinitiveFeatures = {
	readonly mood: null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: null;
	readonly tense: null;
	readonly verbForm: "Inf";
	readonly voice: "Pass" | null;
};

export type ImperativeFeatures = {
	readonly mood: "Imp";
	readonly number: "Plur" | "Sing" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly tense: null;
	readonly verbForm: "Fin";
	readonly voice: "Pass" | null;
};

export type ParticipleFeatures = {
	readonly aspect: "Perf" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly mood: null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: null;
	readonly tense: "Past" | "Pres" | null;
	readonly verbForm: "Part";
	readonly voice: "Pass" | null;
};

type InflectionalFeatures =
	| FiniteFeatures
	| ImperativeFeatures
	| InfinitiveFeatures
	| ParticipleFeatures;
type MemberOrthography = "Standard" | "Typo";
type MemberOrthographies = readonly [
	MemberOrthography,
	MemberOrthography,
	...MemberOrthography[],
];

export const emptyCore = {};

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly memberOrthographies: MemberOrthographies;
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [...args.memberOrthographies],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: emptyCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly inflectionalFeatures: InflectionalFeatures;
	readonly memberOrthographies: MemberOrthographies;
	readonly realizationCoverage?: "Full" | "Partial";
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [...args.memberOrthographies],
			realizationCoverage: args.realizationCoverage ?? ("Full" as const),
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				surfaceKind: "Inflection" as const,
				surfaceFeatures: null,
				inflectionalFeatures: args.inflectionalFeatures,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: emptyCore,
			},
		},
	};
}

export function finite(
	normalizedSurface: string,
	canonicalForm: string,
	features: Omit<FiniteFeatures, "verbForm" | "voice">,
	memberOrthographies: MemberOrthographies,
	realizationCoverage: "Full" | "Partial" = "Full",
) {
	return inflection({
		normalizedSurface,
		canonicalForm,
		memberOrthographies,
		realizationCoverage,
		inflectionalFeatures: {
			...features,
			verbForm: "Fin",
			voice: null,
		},
	});
}

export const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};
