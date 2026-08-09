export function resolvedFusion(args: {
	readonly attested: string;
	readonly before?: string;
	readonly after?: string;
	readonly canonical?: string;
	readonly normalized?: string;
	readonly typo?: boolean;
	readonly spelling?: "Canonical" | "Variant";
}) {
	const normalized = args.normalized ?? args.attested.toLocaleLowerCase("de");
	return {
		input: {
			markedContext: `${args.before ?? ""}<TARGET>${args.attested}</TARGET>${args.after ?? ""}`,
		},
		idealOutput: {
			decision: "Resolved" as const,
			resolution: {
				memberOrthographies: [
					args.typo ? ("Typo" as const) : ("Standard" as const),
				],
				realizationCoverage: "Full" as const,
				normalizedMembers: [normalized],
				surface: {
					spelling: args.spelling ?? ("Canonical" as const),
					surfaceKind: "Citation" as const,
					surfaceFeatures: null,
				},
				lemma: {
					canonicalForm: args.canonical ?? normalized,
					coreFeatures: {},
				},
			},
		},
	};
}

export function unresolved(markedContext: string) {
	return {
		input: { markedContext },
		idealOutput: { decision: "Unresolved" as const, resolution: null },
	};
}
