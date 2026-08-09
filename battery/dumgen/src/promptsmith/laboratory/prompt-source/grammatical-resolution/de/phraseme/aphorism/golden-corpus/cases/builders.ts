const memberPattern = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

export function markEveryMember(text: string): string {
	return text.replace(memberPattern, "<TARGET>$&</TARGET>");
}

export function memberCount(text: string): number {
	return text.match(memberPattern)?.length ?? 0;
}

export function memberText(text: string): string {
	return text.match(memberPattern)?.join(" ") ?? "";
}

export function resolvedAphorism(args: {
	readonly attested: string;
	readonly canonical?: string;
	readonly normalized?: string;
	readonly typoMemberIndices?: readonly number[];
	readonly spelling?: "Canonical" | "Variant";
	readonly historical?: boolean;
}) {
	const count = memberCount(args.attested);
	const typoIndices = new Set(args.typoMemberIndices ?? []);
	const normalized = args.normalized ?? memberText(args.attested);
	return {
		input: { markedContext: markEveryMember(args.attested) },
		idealOutput: {
			decision: "Resolved" as const,
			resolution: {
				memberOrthographies: Array.from(
					{ length: count },
					(_, index) =>
						typoIndices.has(index)
							? ("Typo" as const)
							: ("Standard" as const),
				),
				realizationCoverage: "Full" as const,
				normalizedMembers: normalized.match(memberPattern) ?? [],
				surface: {
					spelling: args.spelling ?? "Canonical",
					surfaceKind: "Citation" as const,
					surfaceFeatures: args.historical
						? ({ historicalStatus: "Archaic" } as const)
						: null,
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
