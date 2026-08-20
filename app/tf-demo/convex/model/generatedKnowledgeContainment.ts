import type { DirectSemanticRelation } from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";
import { COMPILED_RELATION_VERDICT } from "./compiledRelationVerdict";

export type RelationPublicationFingerprints = Readonly<{
	prompt: string;
	schema: string;
	evaluator: string;
	model: string;
	policy: string;
}>;

export type RelationKindVerdict = Readonly<{
	relation: DirectSemanticRelation;
	verdict: "promote" | "revise" | "doNotGenerate";
}>;

/**
 * Deliberately narrow seam for the retained, human-reviewed #193 artifact.
 * The artifact is data, not executable policy: every field is checked against
 * the running code before a relation kind is requested or published.
 */
export type ReviewedRelationVerdictArtifact = Readonly<{
	artifactPath: string;
	status: "awaitingHumanReview" | "reviewed";
	reviewedBy: string | null;
	reviewedAt: string | null;
	fingerprints: RelationPublicationFingerprints;
	verdicts: readonly RelationKindVerdict[];
}>;

type CompiledVerdict = Readonly<{
	artifactPath: string;
	reviewedBy: string;
	reviewedAt: string;
	verdicts: readonly RelationKindVerdict[];
}>;

const compiled = COMPILED_RELATION_VERDICT as Readonly<{
	fingerprints: RelationPublicationFingerprints;
	invalidationReasons: readonly string[];
	verdict: CompiledVerdict | null;
}>;

/** Frozen identifiers mechanically compiled from #193's candidate manifest. */
export const RELATION_PUBLICATION_FINGERPRINTS = Object.freeze({
	...compiled.fingerprints,
} satisfies RelationPublicationFingerprints);

/**
 * #193 has not emitted a signed human verdict yet. Keeping this seam null is
 * fail-closed: no relation kind is implicitly promoted by model quality,
 * Dumrel applicability, or successful Unit Shadow resolution.
 */
export const REVIEWED_RELATION_VERDICT: ReviewedRelationVerdictArtifact | null =
	compiled.verdict
		? {
				artifactPath: compiled.verdict.artifactPath,
				status: "reviewed",
				reviewedBy: compiled.verdict.reviewedBy,
				reviewedAt: compiled.verdict.reviewedAt,
				fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
				verdicts: compiled.verdict.verdicts,
			}
		: null;

export const GENERATED_SEMANTIC_RELATION_POLICY = Object.freeze({
	productionRequest: "reviewedAllowlist",
	productionPublication: "reviewedAllowlist",
	rollback: "serverSideCommitGate",
	verdictIssue: 193,
	publicationIssue: 194,
} as const);

export type EffectiveRelationPublicationPolicy = Readonly<{
	artifactPath: string | null;
	fingerprints: RelationPublicationFingerprints;
	qualifiedKinds: readonly DirectSemanticRelation[];
	invalidationReasons: readonly string[];
}>;

function sameFingerprints(
	left: RelationPublicationFingerprints,
	right: RelationPublicationFingerprints,
): boolean {
	return (
		left.prompt === right.prompt &&
		left.schema === right.schema &&
		left.evaluator === right.evaluator &&
		left.model === right.model &&
		left.policy === right.policy
	);
}

export function effectiveRelationPublicationPolicy(
	artifact: ReviewedRelationVerdictArtifact | null = REVIEWED_RELATION_VERDICT,
): EffectiveRelationPublicationPolicy {
	const invalidationReasons: string[] = [];
	if (!artifact) {
		invalidationReasons.push(...compiled.invalidationReasons);
		if (invalidationReasons.length === 0)
			invalidationReasons.push("missingReviewedVerdictArtifact");
		return {
			artifactPath: null,
			fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
			qualifiedKinds: [],
			invalidationReasons,
		};
	}
	if (artifact.status !== "reviewed")
		invalidationReasons.push("humanReviewIncomplete");
	if (!artifact.reviewedBy?.trim() || !artifact.reviewedAt?.trim())
		invalidationReasons.push("missingHumanSignature");
	if (
		!sameFingerprints(
			artifact.fingerprints,
			RELATION_PUBLICATION_FINGERPRINTS,
		)
	)
		invalidationReasons.push("candidateFingerprintMismatch");

	const seen = new Set<DirectSemanticRelation>();
	for (const verdict of artifact.verdicts) {
		if (seen.has(verdict.relation)) {
			invalidationReasons.push(`duplicateVerdict:${verdict.relation}`);
		}
		seen.add(verdict.relation);
	}
	if (invalidationReasons.length > 0) {
		return {
			artifactPath: artifact.artifactPath,
			fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
			qualifiedKinds: [],
			invalidationReasons,
		};
	}
	return {
		artifactPath: artifact.artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		qualifiedKinds: directSemanticRelationValues.filter((relation) =>
			artifact.verdicts.some(
				(verdict) =>
					verdict.relation === relation &&
					verdict.verdict === "promote",
			),
		),
		invalidationReasons: [],
	};
}

/** Remove every generated relation request while retaining base Knowledge. */
export function withoutGeneratedSemanticRelationRequest<
	TRequest extends { readonly semanticRelations?: unknown },
>(request: TRequest): Omit<TRequest, "semanticRelations"> {
	const { semanticRelations: _semanticRelations, ...baseRequest } = request;
	return baseRequest;
}

export function requestedRelationKinds(request: {
	readonly semanticRelations?: Readonly<
		Partial<Record<DirectSemanticRelation, null>>
	>;
}): DirectSemanticRelation[] {
	return directSemanticRelationValues.filter(
		(relation) => request.semanticRelations?.[relation] === null,
	);
}

/**
 * Keep every unreviewed proposal outside Dumdict. Rollback is passed as an
 * empty qualifiedKinds list; base Knowledge changes remain publishable.
 */
export function generatedKnowledgeAllowedForPublication<
	TChange,
	TPendingRelation extends { readonly relation?: unknown },
>(
	generated: {
		readonly changes: readonly TChange[];
		readonly pendingRelations: readonly TPendingRelation[];
	},
	qualifiedKinds: readonly DirectSemanticRelation[] = effectiveRelationPublicationPolicy()
		.qualifiedKinds,
): { changes: TChange[]; pendingRelations: TPendingRelation[] } {
	const allowed = new Set(qualifiedKinds);
	return {
		changes: generated.changes.filter(
			(change) =>
				!isSemanticRelationChange(change) ||
				allowed.has(change.relation as DirectSemanticRelation),
		),
		pendingRelations: generated.pendingRelations.filter(
			(pending) =>
				typeof pending.relation === "string" &&
				allowed.has(pending.relation as DirectSemanticRelation),
		),
	};
}

function isSemanticRelationChange(change: unknown): change is {
	readonly aspect: "semanticRelations";
	readonly relation: unknown;
} {
	return (
		typeof change === "object" &&
		change !== null &&
		"aspect" in change &&
		change.aspect === "semanticRelations"
	);
}
