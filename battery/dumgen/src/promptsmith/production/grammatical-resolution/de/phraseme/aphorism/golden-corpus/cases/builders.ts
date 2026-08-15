const memberPattern = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
const targetPattern = /<TARGET>([^<>]+)<\/TARGET>/gu;

function markEveryMember(text: string): string {
	return text.replace(memberPattern, "<TARGET>$&</TARGET>");
}

function lexicalMembers(text: string): string[] {
	return text.match(memberPattern) ?? [];
}

function targetMembers(markedContext: string): string[] {
	return [...markedContext.matchAll(targetPattern)].map(
		(match) => match[1] ?? "",
	);
}

export function resolvedAphorism(args: {
	readonly attested: string;
	readonly canonical?: string;
	readonly normalized?: string;
	readonly typoMemberIndices?: readonly number[];
	readonly spelling?: "Canonical" | "Variant";
	readonly historical?: boolean;
	readonly realizationCoverage?: "Full" | "Partial";
	readonly prefix?: string;
	readonly suffix?: string;
	readonly markedContext?: string;
}) {
	const markedContext =
		args.markedContext ??
		`${args.prefix ?? ""}${markEveryMember(args.attested)}${args.suffix ?? ""}`;
	const members = targetMembers(markedContext);
	const typoIndices = new Set(args.typoMemberIndices ?? []);
	const normalized =
		args.normalized ?? lexicalMembers(args.attested).join(" ");
	return {
		input: { markedContext, members },
		idealOutput: {
			memberOrthographies: members.map((_, index) =>
				typoIndices.has(index)
					? ("Typo" as const)
					: ("Standard" as const),
			),
			realizationCoverage: args.realizationCoverage ?? ("Full" as const),
			normalizedMembers: lexicalMembers(normalized),
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
