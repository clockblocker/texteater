import type { KnowledgeFailure, KnowledgeRequest } from "dumgen/types";
import type * as Dumrel from "dumrel/types";

/**
 * What covers a Knowledge request: the Reading's stored content and the
 * durable evidence content cannot show. Semantic Relation claims live as
 * edges and pending Shadows, so the stored content keeps no relation lists;
 * an answered kind stays covered even when it found no target.
 */
export type KnowledgeCoverage = {
	readonly knowledge: unknown;
	/** Relation kinds a committed run answered, with or without targets. */
	readonly checkedRelationKinds: readonly Dumrel.DirectSemanticRelation[];
};

/** Retry only uncovered leaves; already committed contributions need no model call. */
export function missingKnowledgeRequest(
	request: KnowledgeRequest,
	coverage: KnowledgeCoverage,
): KnowledgeRequest {
	return Object.fromEntries(
		Object.entries(request).flatMap<[string, null | Record<string, null>]>(
			([aspect, selection]) => {
				if (selection === null)
					return knowledgeRequestComplete(
						coverage,
						{ [aspect]: null } as KnowledgeRequest,
						[],
					)
						? []
						: [[aspect, null]];
				const leaves = Object.fromEntries(
					Object.keys(selection).flatMap((leaf) =>
						knowledgeRequestComplete(
							coverage,
							{ [aspect]: { [leaf]: null } } as KnowledgeRequest,
							[],
						)
							? []
							: [[leaf, null]],
					),
				);
				return Object.keys(leaves).length ? [[aspect, leaves]] : [];
			},
		),
	) as KnowledgeRequest;
}

/** Only validated content or answered relation kinds cover a request; discovery and omitted leaves do not. */
export function knowledgeRequestComplete(
	coverage: KnowledgeCoverage,
	request: KnowledgeRequest,
	failures: readonly KnowledgeFailure[],
): boolean {
	const { knowledge } = coverage;
	const checkedRelationKinds = new Set<string>(coverage.checkedRelationKinds);
	if (
		failures.length ||
		!knowledge ||
		typeof knowledge !== "object" ||
		!Object.keys(request).length
	)
		return false;
	for (const [aspect, selection] of Object.entries(request)) {
		const value = Reflect.get(knowledge, aspect);
		if (selection === null) {
			if (value === undefined) return false;
			continue;
		}
		if (aspect === "semanticRelations") {
			for (const leaf of Object.keys(selection)) {
				if (
					!checkedRelationKinds.has(leaf) &&
					!(
						value &&
						typeof value === "object" &&
						Array.isArray(Reflect.get(value, leaf))
					)
				)
					return false;
			}
			continue;
		}
		if (!value || typeof value !== "object") return false;
		for (const leaf of Object.keys(selection)) {
			const contribution = Reflect.get(value, leaf);
			if (
				aspect === "translations" &&
				(!Array.isArray(contribution) || !contribution.length)
			)
				return false;
		}
	}
	return true;
}

/**
 * The relation kinds one final publication answered: every requested kind
 * whose relations reached the dictionary and did not fail. Pending Shadow
 * targets and an empty answer both count (ADR 0012).
 */
export function answeredRelationKinds(
	requestedKinds: readonly Dumrel.DirectSemanticRelation[],
	published: boolean,
	failures: readonly { readonly aspect: string; readonly leaf?: string }[],
): Dumrel.DirectSemanticRelation[] {
	if (!published) return [];
	const failed = failures.filter(
		(failure) => failure.aspect === "semanticRelations",
	);
	if (failed.some((failure) => !failure.leaf)) return [];
	const failedKinds = new Set(failed.map((failure) => failure.leaf));
	return requestedKinds.filter((kind) => !failedKinds.has(kind));
}
