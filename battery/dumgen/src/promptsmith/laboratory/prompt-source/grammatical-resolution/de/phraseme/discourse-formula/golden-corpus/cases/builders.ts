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
	readonly normalizedSurface: string;
	readonly canonicalForm: string;
	readonly role: DiscourseFormulaRole | null;
	readonly memberOrthographies: readonly ("Standard" | "Typo")[];
}) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [...args.memberOrthographies],
			surface: {
				normalizedSurface: args.normalizedSurface,
				spelling: "Canonical" as const,
				realizationCoverage: "Full" as const,
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
