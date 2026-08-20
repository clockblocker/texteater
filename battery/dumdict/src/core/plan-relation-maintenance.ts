import { readingFingerprint } from "dumling/reading";
import type { Lemma, SupportedLanguage } from "dumling/types";
import { directSemanticRelationSchema } from "dumrel/schema";
import type { DirectSemanticRelation, UnitShadow } from "dumrel/types";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
} from "../dto";
import { compareLemmas, lemmaFingerprint, sameLemma } from "./identity";

export type RelationRequest<L extends SupportedLanguage> = {
	sourceReading: Reading<L>;
	relation: DirectSemanticRelation;
	target:
		| { kind: "lemma"; lemma: Lemma<L> }
		| {
				kind: "shadow";
				shadow: UnitShadow<L>;
				pendingRecord: PendingSemanticRelationRecord<L>;
		  };
};

export type PlannedRelationAddition<L extends SupportedLanguage> = {
	reading: Reading<L>;
	relation: DirectSemanticRelation;
	targetLemma: Lemma<L>;
};

export type PlannedRelationRemoval<L extends SupportedLanguage> =
	PlannedRelationAddition<L>;

export type RelationMaintenancePlan<L extends SupportedLanguage> =
	| {
			status: "planned";
			additions: PlannedRelationAddition<L>[];
			removals: PlannedRelationRemoval<L>[];
			resolvedPending: PendingSemanticRelationRecord<L>[];
			unresolvedPending: PendingSemanticRelationRecord<L>[];
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

type Edge<L extends SupportedLanguage> = PlannedRelationAddition<L>;

function edgeKey<L extends SupportedLanguage>(edge: Edge<L>): string {
	return JSON.stringify([
		readingFingerprint(edge.reading),
		edge.relation,
		lemmaFingerprint(edge.targetLemma),
	]);
}

function shadowMatchesLemma<L extends SupportedLanguage>(
	shadow: UnitShadow<L>,
	lemma: Lemma<L>,
): boolean {
	return (
		shadow.language === lemma.language &&
		shadow.canonicalForm === lemma.canonicalForm &&
		shadow.family === lemma.family &&
		shadow.kind === lemma.kind
	);
}

function existingEdges<L extends SupportedLanguage>(
	readings: readonly ReadingEntry<L>[],
): Edge<L>[] {
	return readings.flatMap((entry) =>
		Object.entries(entry.knowledge?.semanticRelations ?? {}).flatMap(
			([relation, targets]) =>
				(targets ?? []).map((targetLemma) => ({
					reading: entry.reading,
					relation: directSemanticRelationSchema.parse(relation),
					targetLemma,
				})),
		),
	);
}

/**
 * Plans all dictionary-owned relation work through one seam.
 *
 * Callers provide the complete relation inventory required by the operation.
 * The implementation resolves only unambiguous Unit Shadows and enforces the
 * direct-claim collision rules. It never plans inverses, closure, substitution,
 * or later-Reading backfill; those are read-time graph projections.
 */
export function planRelationMaintenance<L extends SupportedLanguage>(input: {
	lemmas: readonly LemmaRecord<L>[];
	readings: readonly ReadingEntry<L>[];
	requests: readonly RelationRequest<L>[];
}): RelationMaintenancePlan<L> {
	const lemmas = [...input.lemmas]
		.map(({ lemma }) => lemma)
		.sort(compareLemmas);
	const lemmaByKey = new Map(
		lemmas.map((lemma) => [lemmaFingerprint(lemma), lemma] as const),
	);
	const readingByKey = new Map<string, Reading<L>>(
		input.readings.map(({ reading }) => [
			readingFingerprint(reading),
			reading,
		]),
	);
	const proposed: Edge<L>[] = [];
	const resolvedPending: PendingSemanticRelationRecord<L>[] = [];
	const unresolvedPending: PendingSemanticRelationRecord<L>[] = [];

	for (const request of input.requests) {
		if (!directSemanticRelationSchema.safeParse(request.relation).success) {
			return {
				status: "rejected",
				code: "invalidDraft",
				message:
					"Hyponym and Meronym are inferred views and cannot be stored as direct claims.",
			};
		}
		const target = request.target;
		const sourceLemma = lemmaByKey.get(
			lemmaFingerprint(request.sourceReading.lemma),
		);
		if (
			!sourceLemma ||
			!readingByKey.has(readingFingerprint(request.sourceReading))
		) {
			return {
				status: "rejected",
				code: "invalidDraft",
				message:
					"Relation source Reading is missing from the planning inventory.",
			};
		}

		let targets: Lemma<L>[];
		if (target.kind === "lemma") {
			const storedTarget = lemmaByKey.get(lemmaFingerprint(target.lemma));
			if (!storedTarget) {
				return {
					status: "rejected",
					code: "relationTargetMissing",
					message: "A direct relation target Lemma is missing.",
				};
			}
			targets = [storedTarget];
		} else {
			targets = lemmas.filter((lemma) =>
				shadowMatchesLemma(target.shadow, lemma),
			);
			if (targets.length !== 1) {
				unresolvedPending.push(target.pendingRecord);
				continue;
			}
			resolvedPending.push(target.pendingRecord);
		}

		if (targets.some((target) => sameLemma(target, sourceLemma))) {
			return {
				status: "rejected",
				code: "selfRelation",
				message: "A Reading cannot relate directly to its own Lemma.",
			};
		}

		const chosen = targets[0];
		if (!chosen) continue;
		proposed.push({
			reading: request.sourceReading,
			relation: request.relation,
			targetLemma: chosen,
		});
	}

	const stored = existingEdges(input.readings);
	const existingKeys = new Set(stored.map(edgeKey));
	const storedByTarget = groupEdgesByTarget(stored);
	const proposedByTarget = groupEdgesByTarget(proposed);
	const additions = new Map<string, Edge<L>>();
	const removals = new Map<string, Edge<L>>();
	for (const [targetKey, incoming] of proposedByTarget) {
		const existing = storedByTarget.get(targetKey) ?? [];
		const incomingRelations = new Set(
			incoming.map(({ relation }) => relation),
		);
		const existingRelations = new Set(
			existing.map(({ relation }) => relation),
		);
		const combinedRelations = new Set([
			...incomingRelations,
			...existingRelations,
		]);
		if (combinedRelations.size > 1) {
			const synonymDominatesNearSynonym =
				combinedRelations.size === 2 &&
				combinedRelations.has("synonym") &&
				combinedRelations.has("nearSynonym") &&
				incomingRelations.has("synonym");
			if (!synonymDominatesNearSynonym) {
				return {
					status: "rejected",
					code: "relationConflict",
					message:
						"One source Reading and target Lemma cannot carry multiple direct relation kinds.",
				};
			}
			for (const edge of existing) {
				if (edge.relation === "nearSynonym") {
					removals.set(edgeKey(edge), edge);
				}
			}
		}

		for (const edge of incoming) {
			if (
				edge.relation === "nearSynonym" &&
				incomingRelations.has("synonym")
			) {
				continue;
			}
			const key = edgeKey(edge);
			if (!existingKeys.has(key)) additions.set(key, edge);
		}
	}

	return {
		status: "planned",
		additions: [...additions.values()],
		removals: [...removals.values()],
		resolvedPending,
		unresolvedPending,
	};
}

function groupEdgesByTarget<L extends SupportedLanguage>(
	edges: readonly Edge<L>[],
): Map<string, Edge<L>[]> {
	const grouped = new Map<string, Edge<L>[]>();
	for (const edge of edges) {
		const key = JSON.stringify([
			readingFingerprint(edge.reading),
			lemmaFingerprint(edge.targetLemma),
		]);
		const bucket = grouped.get(key);
		if (bucket) bucket.push(edge);
		else grouped.set(key, [edge]);
	}
	return grouped;
}
