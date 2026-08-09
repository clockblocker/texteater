export type VerbCoreFeatures = {
	readonly hasGovPrep: string | null;
	readonly hasSepPrefix: string | null;
	readonly lexicallyReflexive: "Yes" | null;
	readonly verbType: "Mod" | null;
};

export type FiniteFeatures = {
	readonly mood: "Ind" | "Sub" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly tense: "Past" | "Pres" | null;
	readonly verbForm: "Fin";
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

export type InfinitiveFeatures = {
	readonly mood: null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: null;
	readonly tense: null;
	readonly verbForm: "Inf";
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

export const ordinaryCore: VerbCoreFeatures = {
	hasGovPrep: null,
	hasSepPrefix: null,
	lexicallyReflexive: null,
	verbType: null,
};

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly coreFeatures?: VerbCoreFeatures;
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
				canonicalForm: args.canonicalForm,
				coreFeatures: args.coreFeatures ?? ordinaryCore,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly inflectionalFeatures: InflectionalFeatures;
	readonly coreFeatures?: VerbCoreFeatures;
	readonly memberOrthographies?: readonly ("Standard" | "Typo")[];
	readonly spelling?: "Canonical" | "Variant";
	readonly realizationCoverage?: "Full" | "Partial";
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [
				...(args.memberOrthographies ?? ["Standard" as const]),
			],
			realizationCoverage: args.realizationCoverage ?? ("Full" as const),
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: args.spelling ?? ("Canonical" as const),
				surfaceKind: "Inflection" as const,
				surfaceFeatures: null,
				inflectionalFeatures: args.inflectionalFeatures,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: args.coreFeatures ?? ordinaryCore,
			},
		},
	};
}

export function finite(
	normalizedSurface: string,
	canonicalForm: string,
	features: Omit<FiniteFeatures, "verbForm" | "voice">,
	coreFeatures: VerbCoreFeatures = ordinaryCore,
	memberOrthographies?: readonly ("Standard" | "Typo")[],
) {
	return inflection({
		normalizedSurface,
		canonicalForm,
		coreFeatures,
		memberOrthographies,
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
