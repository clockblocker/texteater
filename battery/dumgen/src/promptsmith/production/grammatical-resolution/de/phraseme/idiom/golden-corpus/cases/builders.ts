export type FiniteFeatures = {
	readonly mood: "Ind" | "Sub" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly tense: "Past" | "Pres" | null;
	readonly verbForm: "Fin";
	readonly voice: "Pass" | null;
};

type UnspecifiedFeatures = {
	readonly number: "Plur" | "Sing" | null;
	readonly tense: "Past" | "Pres" | null;
	readonly verbForm: null;
	readonly voice: "Pass" | null;
};

type InfinitiveFeatures = {
	readonly mood: null;
	readonly number: "Plur" | "Sing" | null;
	readonly person: null;
	readonly tense: null;
	readonly verbForm: "Inf";
	readonly voice: "Pass" | null;
};

type ImperativeFeatures = {
	readonly mood: "Imp";
	readonly number: "Plur" | "Sing" | null;
	readonly person: "1" | "2" | "3" | null;
	readonly tense: null;
	readonly verbForm: "Fin";
	readonly voice: "Pass" | null;
};

type ParticipleFeatures = {
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
	| UnspecifiedFeatures
	| FiniteFeatures
	| ImperativeFeatures
	| InfinitiveFeatures
	| ParticipleFeatures;
type MemberOrthography = "Standard" | "Typo";

export function idiomInput(markedContext: string) {
	const members = [
		...markedContext.matchAll(/<TARGET>([^<>]+)<\/TARGET>/gu),
	].map((match) => match[1] ?? "");
	if (members.length === 0 || members.some((member) => member.length === 0)) {
		throw new Error("An Idiom Golden Case needs non-empty TARGET members.");
	}
	return { markedContext, members };
}

export function citation(args: {
	readonly normalizedMembers: readonly string[];
	readonly canonicalForm: string;
	readonly memberOrthographies: readonly MemberOrthography[];
	readonly realizationCoverage?: "Full" | "Partial";
}) {
	return {
		memberOrthographies: [...args.memberOrthographies],
		realizationCoverage: args.realizationCoverage ?? ("Full" as const),
		normalizedMembers: [...args.normalizedMembers],
		surface: {
			spelling: "Canonical" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: null,
		},
		lemma: { canonicalForm: args.canonicalForm },
	};
}

export function inflection(args: {
	readonly normalizedMembers: readonly string[];
	readonly canonicalForm: string;
	readonly inflectionalFeatures: InflectionalFeatures;
	readonly memberOrthographies: readonly MemberOrthography[];
	readonly realizationCoverage?: "Full" | "Partial";
}) {
	return {
		memberOrthographies: [...args.memberOrthographies],
		realizationCoverage: args.realizationCoverage ?? ("Full" as const),
		normalizedMembers: [...args.normalizedMembers],
		surface: {
			spelling: "Canonical" as const,
			surfaceKind: "Inflection" as const,
			surfaceFeatures: null,
			inflectionalFeatures: args.inflectionalFeatures,
		},
		lemma: { canonicalForm: args.canonicalForm },
	};
}

export function finite(
	normalizedMembers: readonly string[],
	canonicalForm: string,
	features: Omit<FiniteFeatures, "verbForm" | "voice">,
	memberOrthographies: readonly MemberOrthography[],
	realizationCoverage: "Full" | "Partial" = "Full",
) {
	return inflection({
		normalizedMembers,
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
