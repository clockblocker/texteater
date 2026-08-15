function fusionInput(markedContext: string) {
	const members = [
		...markedContext.matchAll(/<TARGET>([^<>]+)<\/TARGET>/gu),
	].map((match) => match[1] ?? "");
	if (members.length !== 1 || members[0] === "") {
		throw new Error(
			"A Fusion Golden Case needs exactly one TARGET member.",
		);
	}
	return { markedContext, members };
}

export function resolvedFusion(args: {
	readonly attested: string;
	readonly before?: string;
	readonly after?: string;
	readonly canonical?: string;
	readonly normalized?: string;
	readonly typo?: boolean;
	readonly spelling?: "Canonical" | "Variant";
	readonly historical?: boolean;
}) {
	const normalized = args.normalized ?? args.attested.toLocaleLowerCase("de");
	return {
		input: fusionInput(
			`${args.before ?? ""}<TARGET>${args.attested}</TARGET>${args.after ?? ""}`,
		),
		idealOutput: {
			memberOrthographies: [
				args.typo ? ("Typo" as const) : ("Standard" as const),
			],
			normalizedMembers: [normalized],
			surface: {
				spelling: args.spelling ?? ("Canonical" as const),
				surfaceFeatures: args.historical
					? ({ historicalStatus: "Archaic" } as const)
					: null,
			},
			lemma: { canonicalForm: args.canonical ?? normalized },
		},
	};
}
