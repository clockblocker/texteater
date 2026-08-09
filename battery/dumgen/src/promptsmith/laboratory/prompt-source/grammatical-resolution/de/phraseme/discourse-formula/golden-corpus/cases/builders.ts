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

export const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};

export function citation(args: {
	readonly normalizedMembers: readonly string[];
	readonly canonicalForm: string;
	readonly role: DiscourseFormulaRole | null;
	readonly memberOrthographies: readonly ("Standard" | "Typo")[];
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [...args.memberOrthographies],
			realizationCoverage: "Full" as const,
			normalizedMembers: [...args.normalizedMembers],
			surface: {
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: args.canonicalForm,
				coreFeatures: { discourseFormulaRole: args.role },
			},
		},
	};
}
