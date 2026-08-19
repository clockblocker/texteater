import { readingFingerprint } from "dumling";
import {
	inverseRelationFor,
	propagateRelations,
	type SemanticRelation,
	type UnitShadow,
} from "dumrel";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
} from "../dto";
import type { Lemma, SupportedLanguage } from "../dumling";
import { compareLemmas, lemmaFingerprint, sameLemma } from "./identity";

export type RelationRequest<L extends SupportedLanguage> = {
	sourceReading: Reading<L>;
	relation: SemanticRelation;
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
	relation: SemanticRelation;
	targetLemma: Lemma<L>;
};

export type RelationMaintenancePlan<L extends SupportedLanguage> =
	| {
			status: "planned";
			additions: PlannedRelationAddition<L>[];
			resolvedPending: PendingSemanticRelationRecord<L>[];
			unresolvedPending: PendingSemanticRelationRecord<L>[];
	  }
	| {
			status: "rejected";
			code: "relationTargetMissing" | "selfRelation" | "invalidDraft";
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
					relation: relation as SemanticRelation,
					targetLemma,
				})),
		),
	);
}

/**
 * Plans all dictionary-owned relation work through one seam.
 *
 * Callers provide the complete relation inventory required by the operation.
 * The implementation resolves Unit Shadows, chooses ambiguous forward Lemmas,
 * fans out inverses, asks Dumrel for synonym closure/substitution, and derives
 * later-Reading backfill. Returned additions are idempotent against the input
 * inventory and can be committed atomically with the caller's other changes.
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
	const ambiguousInverseFanout: Edge<L>[] = [];
	const resolvedPending: PendingSemanticRelationRecord<L>[] = [];
	const unresolvedPending: PendingSemanticRelationRecord<L>[] = [];

	for (const request of input.requests) {
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
			if (targets.length === 0) {
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

		// Dumrel will derive the chosen target's inverse. Ambiguous Shadows also
		// require inverses for every non-chosen exact match without adding those
		// Lemmas to the forward bucket.
		for (const target of targets.slice(1)) {
			for (const targetReading of input.readings) {
				if (!sameLemma(targetReading.reading.lemma, target)) continue;
				ambiguousInverseFanout.push({
					reading: targetReading.reading,
					relation: inverseRelationFor(request.relation),
					targetLemma: sourceLemma,
				});
			}
		}
	}

	const stored = existingEdges(input.readings);
	const direct = [...stored, ...proposed];
	const derived = propagateRelations({
		readings: input.readings.map(({ reading }) => ({
			reading: readingFingerprint(reading),
			lemma: lemmaFingerprint(reading.lemma),
		})),
		edges: direct.map((edge) => ({
			sourceReading: readingFingerprint(edge.reading),
			relation: edge.relation,
			targetLemma: lemmaFingerprint(edge.targetLemma),
		})),
	}).flatMap((edge): Edge<L>[] => {
		const reading = readingByKey.get(edge.sourceReading);
		const targetLemma = lemmaByKey.get(edge.targetLemma);
		return reading && targetLemma
			? [{ reading, relation: edge.relation, targetLemma }]
			: [];
	});

	const existingKeys = new Set(stored.map(edgeKey));
	const additions = new Map<string, Edge<L>>();
	for (const edge of [...proposed, ...derived, ...ambiguousInverseFanout]) {
		const key = edgeKey(edge);
		if (existingKeys.has(key) || additions.has(key)) continue;
		if (sameLemma(edge.reading.lemma, edge.targetLemma)) continue;
		additions.set(key, edge);
	}

	return {
		status: "planned",
		additions: [...additions.values()],
		resolvedPending,
		unresolvedPending,
	};
}
