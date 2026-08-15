type CoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly hyph: "Yes" | null;
	readonly numType: "Card" | "Mult" | "Range" | null;
};

type InflectionalFeatures = {
	readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	readonly gender: "Fem" | "Masc" | "Neut" | null;
	readonly mood: "Imp" | "Ind" | "Sub" | null;
	readonly number: "Plur" | "Sing" | null;
	readonly verbForm: "Fin" | "Inf" | "Part" | null;
};

const emptyCoreFeatures: CoreFeatures = {
	abbr: null,
	foreign: null,
	hyph: null,
	numType: null,
};

function otherInput(markedContext: string) {
	const members = [
		...markedContext.matchAll(/<TARGET>([^<>]+)<\/TARGET>/gu),
	].map((match) => match[1] ?? "");
	if (members.length === 0 || members.some((member) => member === "")) {
		throw new Error("An X Golden Case needs at least one TARGET member.");
	}
	return { markedContext, members };
}

export function resolvedOther(args: {
	readonly attested: string;
	readonly before?: string;
	readonly after?: string;
	readonly normalized?: string;
	readonly canonical?: string;
	readonly memberOrthography?: "Standard" | "Typo";
	readonly spelling?: "Canonical" | "Variant";
	readonly historical?: boolean;
	readonly coreFeatures?: Partial<CoreFeatures>;
	readonly inflectionalFeatures?: InflectionalFeatures;
}) {
	const normalized = args.normalized ?? args.attested;
	const markedContext = `${args.before ?? ""}<TARGET>${args.attested}</TARGET>${args.after ?? ""}`;
	return {
		input: otherInput(markedContext),
		idealOutput: {
			memberOrthographies: [
				args.memberOrthography ??
					(normalized === args.attested ? "Standard" : "Typo"),
			],
			normalizedMembers: [normalized],
			surface:
				args.inflectionalFeatures === undefined
					? {
							spelling: args.spelling ?? "Canonical",
							surfaceFeatures: args.historical
								? { historicalStatus: "Archaic" as const }
								: null,
						}
					: {
							spelling: args.spelling ?? "Canonical",
							surfaceKind: "Inflection" as const,
							inflectionalFeatures: args.inflectionalFeatures,
							surfaceFeatures: args.historical
								? { historicalStatus: "Archaic" as const }
								: null,
						},
			lemma: {
				canonicalForm: args.canonical ?? normalized,
				coreFeatures: {
					...emptyCoreFeatures,
					...args.coreFeatures,
				},
			},
		},
	};
}
