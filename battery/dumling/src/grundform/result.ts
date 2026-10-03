import type { Surface } from "../types.js";

export type GrundformFeatureValue = string | readonly string[] | null;

export type GrundformIssue =
	| {
			_tag: "InsufficientFeatures" | "AmbiguousFeatures";
			path: readonly string[];
			expected: readonly (string | null)[];
			received: GrundformFeatureValue;
			message: string;
	  }
	| {
			_tag: "LemmaRuleRequired";
			path: readonly string[];
			message: string;
	  };

/** A valid Surface whose available evidence does not settle Grundform. */
export class GrundformAssessmentError extends Error {
	readonly _tag = "GrundformAssessmentError";
	override readonly name = "GrundformAssessmentError";
	readonly issues: readonly [GrundformIssue, ...GrundformIssue[]];
	readonly route: {
		language: Surface["language"];
		family: Surface["lemma"]["family"];
		kind: Surface["lemma"]["kind"];
	};
	readonly canonicalForm: string;

	constructor(
		surface: Surface,
		issues: readonly [GrundformIssue, ...GrundformIssue[]],
	) {
		super(issues.map((issue) => issue.message).join("; "));
		this.issues = issues;
		const { language, family, kind, canonicalForm } = surface.lemma;
		this.route = { language, family, kind };
		this.canonicalForm = canonicalForm;
	}
}

export type GrundformResult =
	| { success: true; value: boolean }
	| { success: false; error: GrundformAssessmentError };
