import { readingFingerprint } from "dumling/id";
import type { Lemma, SupportedLanguage } from "dumling/types";
import { directSemanticRelationValues } from "dumrel/relations";
import type { DirectSemanticRelation, UnitShadow } from "dumrel/types";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
} from "../dto";
import {
	compareLemmas,
	lemmaFingerprint,
	sameLemma,
	sameReading,
} from "./identity";

export type RelationRequest<L extends SupportedLanguage> = {
	sourceReading: Reading<L>;
	relation: DirectSemanticRelation;
	target:
		| { kind: "lemma"; lemma: Lemma<L> }
		| { kind: "reading"; reading: Reading<L> }
		| {
				kind: "shadow";
				shadow: UnitShadow<L>;
				pendingRecord: PendingSemanticRelationRecord<L>;
		  };
};

type PlannedLemmaRelation<L extends SupportedLanguage> = {
	reading: Reading<L>;
	relation: DirectSemanticRelation;
	targetKind?: "lemma";
	targetLemma: Lemma<L>;
	targetReading?: never;
};
type PlannedReadingRelation<L extends SupportedLanguage> = {
	reading: Reading<L>;
	relation: "synonym";
	targetKind: "reading";
	targetReading: Reading<L>;
	targetLemma?: never;
};
export type PlannedRelationAddition<L extends SupportedLanguage> =
	| PlannedLemmaRelation<L>
	| PlannedReadingRelation<L>;
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

function targetKey<L extends SupportedLanguage>(edge: Edge<L>): string {
	return edge.targetKind === "reading"
		? readingFingerprint(edge.targetReading)
		: lemmaFingerprint(edge.targetLemma);
}
function edgeKey<L extends SupportedLanguage>(edge: Edge<L>): string {
	return JSON.stringify([
		readingFingerprint(edge.reading),
		edge.relation,
		edge.targetKind ?? "lemma",
		targetKey(edge),
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
	const entryByReadingKey = new Map(
		input.readings.map(
			(entry) => [readingFingerprint(entry.reading), entry] as const,
		),
	);
	const proposed: Edge<L>[] = [];
	const resolvedPending: PendingSemanticRelationRecord<L>[] = [];
	const unresolvedPending: PendingSemanticRelationRecord<L>[] = [];

	for (const request of input.requests) {
		if (!directSemanticRelationValues.includes(request.relation))
			return rejected(
				"invalidDraft",
				"Inferred relation orientations cannot be stored as direct claims.",
			);
		const sourceEntry = entryByReadingKey.get(
			readingFingerprint(request.sourceReading),
		);
		const sourceLemma = lemmaByKey.get(
			lemmaFingerprint(request.sourceReading.lemma),
		);
		if (!sourceEntry || !sourceLemma)
			return rejected(
				"invalidDraft",
				"Relation source Reading is missing from the planning inventory.",
			);
		const relations = sourceEntry.knowledge?.semanticRelations;
		const sourceTargetKind =
			relations?.targetKind === "reading" ? "reading" : "lemma";
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
				readingFingerprint(request.target.reading),
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

		let targets: Lemma<L>[];
		if (request.target.kind === "lemma") {
			const storedTarget = lemmaByKey.get(
				lemmaFingerprint(request.target.lemma),
			);
			if (!storedTarget)
				return rejected(
					"relationTargetMissing",
					"A direct relation target Lemma is missing.",
				);
			targets = [storedTarget];
		} else {
			const shadow = request.target.shadow;
			targets = lemmas.filter((lemma) =>
				shadowMatchesLemma(shadow, lemma),
			);
			if (targets.length !== 1) {
				unresolvedPending.push(request.target.pendingRecord);
				continue;
			}
			resolvedPending.push(request.target.pendingRecord);
		}
		if (targets.some((target) => sameLemma(target, sourceLemma)))
			return rejected(
				"selfRelation",
				"A Reading cannot relate directly to its own Lemma.",
			);
		const targetLemma = targets[0];
		if (targetLemma)
			proposed.push({
				reading: request.sourceReading,
				relation: request.relation,
				targetLemma,
			});
	}

	const stored = existingEdges(input.readings);
	const existingKeys = new Set(stored.map(edgeKey));
	const storedByTarget = groupEdgesByTarget(stored);
	const proposedByTarget = groupEdgesByTarget(proposed);
	const additions = new Map<string, Edge<L>>();
	const removals = new Map<string, Edge<L>>();
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
function groupEdgesByTarget<L extends SupportedLanguage>(
	edges: readonly Edge<L>[],
): Map<string, Edge<L>[]> {
	const grouped = new Map<string, Edge<L>[]>();
	for (const edge of edges) {
		const key = JSON.stringify([
			readingFingerprint(edge.reading),
			edge.targetKind ?? "lemma",
			targetKey(edge),
		]);
		const bucket = grouped.get(key);
		if (bucket) bucket.push(edge);
		else grouped.set(key, [edge]);
	}
	return grouped;
}
