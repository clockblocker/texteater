import type * as Dumling from "dumling/types";

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
		language: Dumling.Surface["language"];
		family: Dumling.Surface["lemma"]["family"];
		kind: Dumling.Surface["lemma"]["kind"];
	};
	readonly canonicalForm: string;

	constructor(
		surface: Dumling.Surface,
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
