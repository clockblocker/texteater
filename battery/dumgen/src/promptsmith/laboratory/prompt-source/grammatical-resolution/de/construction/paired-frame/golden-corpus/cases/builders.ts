const targetPattern = /<TARGET>([^<>]+)<\/TARGET>/gu;

function targetMembers(markedContext: string): string[] {
	return [...markedContext.matchAll(targetPattern)].map(
		(match) => match[1] ?? "",
	);
}

export function resolvedFrame(args: {
	readonly markedContext: string;
	readonly normalizedMembers?: readonly string[];
	readonly canonicalForm: string;
	readonly memberOrthographies?: readonly ("Standard" | "Typo")[];
	readonly spelling?: "Canonical" | "Variant";
	readonly historical?: boolean;
}) {
	const members = targetMembers(args.markedContext);
	return {
		input: { markedContext: args.markedContext, members },
		idealOutput: {
			memberOrthographies:
				args.memberOrthographies === undefined
					? members.map(() => "Standard" as const)
					: [...args.memberOrthographies],
			normalizedMembers: args.normalizedMembers
				? [...args.normalizedMembers]
				: [...members],
			surface: {
				spelling: args.spelling ?? ("Canonical" as const),
				surfaceFeatures: args.historical
					? ({ historicalStatus: "Archaic" } as const)
					: null,
			},
			lemma: { canonicalForm: args.canonicalForm },
		},
	};
}
