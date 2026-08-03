export const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};

export function resolvedFrame(args: {
	readonly markedContext: string;
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly memberOrthographies?: readonly ("Standard" | "Typo")[];
}) {
	const memberCount = args.markedContext.match(/<TARGET>/gu)?.length ?? 0;
	return {
		input: { markedContext: args.markedContext },
		idealOutput: {
			decision: "Resolved" as const,
			resolution: {
				memberOrthographies:
					args.memberOrthographies === undefined
						? Array.from(
								{ length: memberCount },
								() => "Standard" as const,
							)
						: [...args.memberOrthographies],
				surface: {
					normalizedSurface: args.normalizedSurface,
					spelling: "Canonical" as const,
					realizationCoverage: "Full" as const,
					surfaceKind: "Citation" as const,
					surfaceFeatures: null,
				},
				lemma: {
					canonicalForm: args.canonicalForm,
					coreFeatures: {},
				},
			},
		},
	};
}
