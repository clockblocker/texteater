import type * as Dumrel from "dumrel/types";
import data from "./adjudications.json";

type Target = Readonly<{
	readonly canonicalForm: string;
	readonly kind: string;
}>;
type FailureMode =
	| "positive"
	| "negative"
	| "null"
	| "omission"
	| "wrong-kind"
	| "wrong-family"
	| "polysemy"
	| "register"
	| "multi-member"
	| "self-relation";
type Authority = "primary-source" | "human-accepted";

export type RelationCorpusAdjudication = Readonly<{
	rationale: string;
	failureModes: readonly FailureMode[];
	authority: Authority;
	acceptableTargetSets?: Readonly<
		Partial<
			Record<
				Dumrel.DirectSemanticRelation,
				readonly (readonly Target[] | null)[]
			>
		>
	>;
	harmfulTargets: readonly Readonly<{
		relation: Dumrel.DirectSemanticRelation;
		target: Target;
		reason: string;
	}>[];
	inverseJudgments: readonly Readonly<{
		relation: "hyponym" | "meronym";
		target: Target;
		rationale: string;
	}>[];
}>;

export const relationCorpusAdjudications = data as {
	byCaseId: Record<string, RelationCorpusAdjudication>;
};
