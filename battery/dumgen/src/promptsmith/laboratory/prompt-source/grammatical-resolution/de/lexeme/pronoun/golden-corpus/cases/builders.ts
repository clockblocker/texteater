export type PronounCoreFeatures = {
	readonly extPos: "DET" | null;
	readonly foreign: "Yes" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly polite: "Form" | "Infm" | null;
	readonly poss: "Yes" | null;
	readonly pronType:
		| "Dem"
		| "Ind"
		| "Int"
		| "Neg"
		| "Prs"
		| "Rcp"
		| "Rel"
		| "Tot";
};

export type PronounInflectionalFeatures = {
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly reflex: "Yes" | null;
};

export function core(
	pronType: PronounCoreFeatures["pronType"],
	overrides: Partial<Omit<PronounCoreFeatures, "pronType">> = {},
): PronounCoreFeatures {
	return {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType,
		...overrides,
	};
}

export function citation(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly coreFeatures: PronounCoreFeatures;
	readonly spelling?: "Canonical" | "Variant";
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: args.spelling ?? ("Canonical" as const),
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: args.coreFeatures,
			},
		},
	};
}

export function inflection(args: {
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly coreFeatures: PronounCoreFeatures;
	readonly inflectionalFeatures: PronounInflectionalFeatures;
	readonly memberOrthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly realizationCoverage?: "Full" | "Partial";
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [
				args.memberOrthography ?? ("Standard" as const),
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
				coreFeatures: args.coreFeatures,
			},
		},
	};
}

export const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};
