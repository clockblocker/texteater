export type DiscourseFormulaRole =
	| "Greeting"
	| "Farewell"
	| "Apology"
	| "Thanks"
	| "Acknowledgment"
	| "Refusal"
	| "Request"
	| "Reaction"
	| "Initiation"
	| "Transition";

type MemberOrthography = "Standard" | "Typo";

export function discourseFormulaInput(markedContext: string) {
	const members = [
		...markedContext.matchAll(/<TARGET>([^<>]+)<\/TARGET>/gu),
	].map((match) => match[1] ?? "");
	if (members.length === 0 || members.some((member) => member.length === 0)) {
		throw new Error(
			"A DiscourseFormula Golden Case needs non-empty TARGET members.",
		);
	}
	return { markedContext, members };
}

export function citation(args: {
	readonly normalizedMembers: readonly string[];
	readonly canonicalForm: string;
	readonly role: DiscourseFormulaRole | null;
	readonly memberOrthographies: readonly MemberOrthography[];
	readonly realizationCoverage?: "Full" | "Partial";
	readonly spelling?: "Canonical" | "Variant";
	readonly historical?: boolean;
}) {
	return {
		memberOrthographies: [...args.memberOrthographies],
		normalizedMembers: [...args.normalizedMembers],
		realizationCoverage: args.realizationCoverage ?? ("Full" as const),
		surface: {
			spelling: args.spelling ?? ("Canonical" as const),
			surfaceFeatures: args.historical
				? ({ historicalStatus: "Archaic" } as const)
				: null,
		},
		lemma: {
			canonicalForm: args.canonicalForm,
			coreFeatures: { discourseFormulaRole: args.role },
		},
	};
}
