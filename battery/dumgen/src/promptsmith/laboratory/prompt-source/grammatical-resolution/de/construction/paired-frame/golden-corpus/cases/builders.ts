export const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};

export function resolvedFrame(args: {
	readonly markedContext: string;
	readonly normalizedMembers: readonly string[];
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
				realizationCoverage: "Full" as const,
				normalizedMembers: [...args.normalizedMembers],
				surface: {
					spelling: "Canonical" as const,
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
