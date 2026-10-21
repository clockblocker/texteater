import {
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
} from "../domain-types";
import { compareLemmas } from "./identity";
import { resolveShadow } from "./link-target";

export type RelationRequest<L extends Dumling.Language> = {
	sourceReading: Dumling.Reading<L>;
	relation: Dumrel.DirectSemanticRelation;
	target:
		| { kind: "lemma"; lemma: Dumling.Lemma<L> }
		| { kind: "reading"; reading: Dumling.Reading<L> }
		| {
				kind: "shadow";
				pendingRecord: PendingSemanticRelationRecord<L>;
				/**
				 * `propose` for a relation the request names: a Shadow that
				 * resolves to its source's own Lemma, or to a target the
				 * source claims another way, refuses the plan. `reevaluate`
				 * for a stored record a changed Lemma matches: such a Shadow
				 * stays pending instead, so one record never blocks the rest.
				 */
				mode: "propose" | "reevaluate";
		  };
};

/**
 * What a Shadow's record becomes: `next` resolved to the one Lemma it
 * matches, or pending without a resolution. `next` is undefined when the
 * source already claims that Lemma exactly: the exact claim absorbs the
 * Shadow, and no record is kept.
 */
export type ShadowOutcome<L extends Dumling.Language> = {
	record: PendingSemanticRelationRecord<L>;
	next: PendingSemanticRelationRecord<L> | undefined;
};

type PlannedLemmaRelation<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	relation: Dumrel.DirectSemanticRelation;
	targetKind?: "lemma";
	targetLemma: Dumling.Lemma<L>;
	targetReading?: never;
};
type PlannedReadingRelation<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	relation: "synonym";
	targetKind: "reading";
	targetReading: Dumling.Reading<L>;
	targetLemma?: never;
};
export type PlannedRelationAddition<L extends Dumling.Language> =
	| PlannedLemmaRelation<L>
	| PlannedReadingRelation<L>;
export type PlannedRelationRemoval<L extends Dumling.Language> =
	PlannedRelationAddition<L>;

export type RelationMaintenancePlan<L extends Dumling.Language> =
	| {
			status: "planned";
			additions: PlannedRelationAddition<L>[];
			removals: PlannedRelationRemoval<L>[];
			shadowOutcomes: ShadowOutcome<L>[];
	  }
	| {
			status: "rejected";
			code:
				| "relationTargetMissing"
				| "relationConflict"
				| "selfRelation"
				| "invalidDraft";
			message: string;
	  };

type Edge<L extends Dumling.Language> = PlannedRelationAddition<L>;

function targetKey<L extends Dumling.Language>(edge: Edge<L>): string {
	return edge.targetKind === "reading"
		? readingIdentityKey(edge.targetReading)
		: lemmaIdentityKey(edge.targetLemma);
}
function edgeKey<L extends Dumling.Language>(edge: Edge<L>): string {
	return JSON.stringify([
		readingIdentityKey(edge.reading),
		edge.relation,
		edge.targetKind ?? "lemma",
		targetKey(edge),
	]);
}
function existingEdges<L extends Dumling.Language>(
	readings: readonly ReadingEntry<L>[],
): Edge<L>[] {
	return readings.flatMap((entry): Edge<L>[] => {
		const relations = entry.knowledge?.semanticRelations;
		if (!relations) return [];
		if (relations.targetKind === "reading") {
			return (relations.synonym ?? []).map((targetReading) => ({
				reading: entry.reading,
				relation: "synonym",
				targetKind: "reading",
				targetReading,
			}));
		}
		return directSemanticRelationValues.flatMap((relation) =>
			(relations[relation] ?? []).map((targetLemma) => ({
				reading: entry.reading,
				relation,
				targetLemma,
			})),
		);
	});
}

/** Plans dictionary-owned direct relation maintenance without inference. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function planRelationMaintenance<L extends Dumling.Language>(input: {
	lemmas: readonly LemmaRecord<L>[];
	readings: readonly ReadingEntry<L>[];
	requests: readonly RelationRequest<L>[];
}): RelationMaintenancePlan<L> {
	const lemmas = [...input.lemmas]
		.map(({ lemma }) => lemma)
		.sort(compareLemmas);
	const lemmaByKey = new Map(
		lemmas.map((lemma) => [lemmaIdentityKey(lemma), lemma] as const),
	);
	const entryByReadingKey = new Map(
		input.readings.map(
			(entry) => [readingIdentityKey(entry.reading), entry] as const,
		),
	);
	const stored = existingEdges(input.readings);
	const existingKeys = new Set(stored.map(edgeKey));
	// Claims the requests name exactly: a Shadow resolving to one is absorbed.
	const namedKeys = new Set(
		input.requests.flatMap((request) =>
			request.target.kind === "lemma"
				? [
						edgeKey({
							reading: request.sourceReading,
							relation: request.relation,
							targetLemma: request.target.lemma,
						}),
					]
				: [],
		),
	);
	const proposed: Edge<L>[] = [];
	// Claims a Shadow held and no longer resolves to.
	const unresolvedClaims = new Map<string, Edge<L>>();
	const shadowOutcomes: ShadowOutcome<L>[] = [];

	for (const request of input.requests) {
		if (!directSemanticRelationValues.includes(request.relation))
			return rejected(
				"invalidDraft",
				"Inferred relation orientations cannot be stored as direct claims.",
			);
		const sourceEntry = entryByReadingKey.get(
			readingIdentityKey(request.sourceReading),
		);
		const sourceLemma = lemmaByKey.get(
			lemmaIdentityKey(request.sourceReading.lemma),
		);
		if (!sourceEntry || !sourceLemma)
			return rejected(
				"invalidDraft",
				"Relation source Reading is missing from the planning inventory.",
			);
		const relations = sourceEntry.knowledge?.semanticRelations;
		const sourceTargetKind =
			relations?.targetKind === "reading" ? "reading" : "lemma";

		if (request.target.kind === "shadow") {
			const { pendingRecord: record, mode } = request.target;
			const strict = mode === "propose";
			if (strict && sourceTargetKind === "reading")
				return rejected(
					"invalidDraft",
					"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
				);
			const target = resolveShadow(record.pending.target, lemmas);
			let next = target.kind === "Lemma" ? target.lemma : undefined;
			if (next && sameLemma(next, sourceLemma)) {
				if (strict)
					return rejected(
						"selfRelation",
						"A Reading cannot relate directly to its own Lemma.",
					);
				next = undefined;
			}
			if (sourceTargetKind === "reading") next = undefined;
			const previous = record.resolvedLemma;
			const previousClaim: Edge<L> | undefined = previous && {
				reading: request.sourceReading,
				relation: request.relation,
				targetLemma: previous,
			};
			const claimHeld =
				previousClaim !== undefined &&
				existingKeys.has(edgeKey(previousClaim));
			if (
				!strict &&
				previous &&
				!claimHeld &&
				lemmaByKey.has(lemmaIdentityKey(previous))
			) {
				// Its claim was retracted while its Lemma stayed, so the
				// relation went with it. Only a removed Lemma moves a Shadow
				// whose claim is gone.
				shadowOutcomes.push({ record, next: undefined });
				continue;
			}
			const keeps =
				previous !== undefined &&
				next !== undefined &&
				sameLemma(previous, next);
			if (previousClaim && claimHeld && !keeps)
				unresolvedClaims.set(edgeKey(previousClaim), previousClaim);
			const pending = withoutResolution(record);
			if (!next) {
				shadowOutcomes.push({ record, next: pending });
				continue;
			}
			const edge: Edge<L> = {
				reading: request.sourceReading,
				relation: request.relation,
				targetLemma: next,
			};
			if (keeps && !namedKeys.has(edgeKey(edge))) {
				// A proposal re-asserts a claim something retracted.
				proposed.push(edge);
				shadowOutcomes.push({ record, next: record });
			} else if (
				keeps ||
				existingKeys.has(edgeKey(edge)) ||
				namedKeys.has(edgeKey(edge))
			) {
				// The source already claims the Lemma exactly, so the claim
				// never moves and the Shadow adds nothing.
				shadowOutcomes.push({ record, next: undefined });
			} else if (
				!strict &&
				claimsOtherwise(
					edge,
					[...stored, ...proposed],
					unresolvedClaims,
				)
			) {
				shadowOutcomes.push({ record, next: pending });
			} else {
				proposed.push(edge);
				shadowOutcomes.push({
					record,
					next: { ...pending, resolvedLemma: next },
				});
			}
			continue;
		}

		const requestTargetKind =
			request.target.kind === "reading" ? "reading" : "lemma";
		if (sourceTargetKind !== requestTargetKind)
			return rejected(
				"invalidDraft",
				"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
			);

		if (request.target.kind === "reading") {
			if (request.relation !== "synonym")
				return rejected(
					"invalidDraft",
					"Reading-targeted direct claims currently support Synonym only.",
				);
			const targetReading = entryByReadingKey.get(
				readingIdentityKey(request.target.reading),
			)?.reading;
			if (!targetReading)
				return rejected(
					"relationTargetMissing",
					"A direct relation target Reading is missing.",
				);
			if (sameReading(targetReading, request.sourceReading))
				return rejected(
					"selfRelation",
					"A Reading cannot relate directly to itself.",
				);
			proposed.push({
				reading: request.sourceReading,
				relation: "synonym",
				targetKind: "reading",
				targetReading,
			});
			continue;
		}

		const targetLemma = lemmaByKey.get(
			lemmaIdentityKey(request.target.lemma),
		);
		if (!targetLemma)
			return rejected(
				"relationTargetMissing",
				"A direct relation target Lemma is missing.",
			);
		if (sameLemma(targetLemma, sourceLemma))
			return rejected(
				"selfRelation",
				"A Reading cannot relate directly to its own Lemma.",
			);
		proposed.push({
			reading: request.sourceReading,
			relation: request.relation,
			targetLemma,
		});
	}

	const remaining = stored.filter(
		(edge) => !unresolvedClaims.has(edgeKey(edge)),
	);
	const remainingKeys = new Set(remaining.map(edgeKey));
	const storedByTarget = groupEdgesByTarget(remaining);
	const proposedByTarget = groupEdgesByTarget(proposed);
	const additions = new Map<string, Edge<L>>();
	const removals = new Map<string, Edge<L>>(unresolvedClaims);
	for (const [endpointKey, incoming] of proposedByTarget) {
		const existing = storedByTarget.get(endpointKey) ?? [];
		const incomingRelations = new Set(
			incoming.map(({ relation }) => relation),
		);
		const combinedRelations = new Set([
			...incomingRelations,
			...existing.map(({ relation }) => relation),
		]);
		if (combinedRelations.size > 1) {
			const synonymDominatesNearSynonym =
				combinedRelations.size === 2 &&
				combinedRelations.has("synonym") &&
				combinedRelations.has("nearSynonym") &&
				incomingRelations.has("synonym");
			if (!synonymDominatesNearSynonym)
				return rejected(
					"relationConflict",
					"One source Reading and target cannot carry multiple direct relation kinds.",
				);
			for (const edge of existing)
				if (edge.relation === "nearSynonym")
					removals.set(edgeKey(edge), edge);
		}
		for (const edge of incoming) {
			if (
				edge.relation === "nearSynonym" &&
				incomingRelations.has("synonym")
			)
				continue;
			const key = edgeKey(edge);
			if (!remainingKeys.has(key)) additions.set(key, edge);
		}
	}
	return {
		status: "planned",
		additions: [...additions.values()],
		removals: [...removals.values()],
		shadowOutcomes,
	};
}

/** A pending record as its Shadow alone describes it, with no resolution. */
function withoutResolution<L extends Dumling.Language>(
	record: PendingSemanticRelationRecord<L>,
): PendingSemanticRelationRecord<L> {
	const { resolvedLemma: _resolved, ...pending } = record;
	return pending;
}

/**
 * Whether the source already claims the edge's target under another
 * relation, among the claims the plan keeps.
 */
function claimsOtherwise<L extends Dumling.Language>(
	edge: Edge<L>,
	claims: readonly Edge<L>[],
	dropped: ReadonlyMap<string, Edge<L>>,
): boolean {
	const endpoint = endpointKey(edge);
	return claims.some(
		(claim) =>
			!dropped.has(edgeKey(claim)) &&
			endpointKey(claim) === endpoint &&
			claim.relation !== edge.relation,
	);
}

function endpointKey<L extends Dumling.Language>(edge: Edge<L>): string {
	return JSON.stringify([
		readingIdentityKey(edge.reading),
		edge.targetKind ?? "lemma",
		targetKey(edge),
	]);
}

function rejected(
	code:
		| "relationTargetMissing"
		| "relationConflict"
		| "selfRelation"
		| "invalidDraft",
	message: string,
) {
	return { status: "rejected" as const, code, message };
}
function groupEdgesByTarget<L extends Dumling.Language>(
	edges: readonly Edge<L>[],
): Map<string, Edge<L>[]> {
	const grouped = new Map<string, Edge<L>[]>();
	for (const edge of edges) {
		const key = endpointKey(edge);
		const bucket = grouped.get(key);
		if (bucket) bucket.push(edge);
		else grouped.set(key, [edge]);
	}
	return grouped;
}
