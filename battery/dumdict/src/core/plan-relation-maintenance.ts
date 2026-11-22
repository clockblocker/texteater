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
type IndexedEdge<L extends Dumling.Language> = Readonly<{
	edge: Edge<L>;
	endpoint: string;
	key: string;
}>;
type RejectedPlan = Extract<
	RelationMaintenancePlan<Dumling.Language>,
	{ status: "rejected" }
>;
type SourceTargetKind = "lemma" | "reading";

type PlanningState<L extends Dumling.Language> = {
	readonly lemmas: readonly Dumling.Lemma<L>[];
	readonly lemmaByKey: ReadonlyMap<string, Dumling.Lemma<L>>;
	readonly entryByReadingKey: ReadonlyMap<string, ReadingEntry<L>>;
	readonly stored: readonly IndexedEdge<L>[];
	readonly existingKeys: ReadonlySet<string>;
	readonly namedKeys: ReadonlySet<string>;
	readonly proposed: IndexedEdge<L>[];
	readonly unresolvedClaims: Map<string, Edge<L>>;
	readonly activeByEndpoint: Map<string, Set<Dumrel.DirectSemanticRelation>>;
	readonly shadowOutcomes: ShadowOutcome<L>[];
};

function targetKey<L extends Dumling.Language>(edge: Edge<L>): string {
	return edge.targetKind === "reading"
		? readingIdentityKey(edge.targetReading)
		: lemmaIdentityKey(edge.targetLemma);
}
function indexEdge<L extends Dumling.Language>(edge: Edge<L>): IndexedEdge<L> {
	const reading = readingIdentityKey(edge.reading);
	const kind = edge.targetKind ?? "lemma";
	const target = targetKey(edge);
	return {
		edge,
		endpoint: JSON.stringify([reading, kind, target]),
		key: JSON.stringify([reading, edge.relation, kind, target]),
	};
}
function existingEdges<L extends Dumling.Language>(
	readings: readonly ReadingEntry<L>[],
): IndexedEdge<L>[] {
	return readings.flatMap((entry): IndexedEdge<L>[] => {
		const relations = entry.knowledge?.semanticRelations;
		if (!relations) return [];
		if (relations.targetKind === "reading") {
			return (relations.synonym ?? []).map((targetReading) =>
				indexEdge({
					reading: entry.reading,
					relation: "synonym",
					targetKind: "reading",
					targetReading,
				}),
			);
		}
		return directSemanticRelationValues.flatMap((relation) =>
			(relations[relation] ?? []).map((targetLemma) =>
				indexEdge({
					reading: entry.reading,
					relation,
					targetLemma,
				}),
			),
		);
	});
}

function addActiveRelation(
	activeByEndpoint: Map<string, Set<Dumrel.DirectSemanticRelation>>,
	endpoint: string,
	relation: Dumrel.DirectSemanticRelation,
): void {
	let relations = activeByEndpoint.get(endpoint);
	if (relations === undefined) {
		relations = new Set();
		activeByEndpoint.set(endpoint, relations);
	}
	relations.add(relation);
}

function removeActiveRelation(
	activeByEndpoint: Map<string, Set<Dumrel.DirectSemanticRelation>>,
	endpoint: string,
	relation: Dumrel.DirectSemanticRelation,
): void {
	const relations = activeByEndpoint.get(endpoint);
	if (!relations) return;
	relations.delete(relation);
	if (relations.size === 0) activeByEndpoint.delete(endpoint);
}

function proposeEdge<L extends Dumling.Language>(
	state: PlanningState<L>,
	indexed: IndexedEdge<L>,
): void {
	state.proposed.push(indexed);
	if (!state.unresolvedClaims.has(indexed.key))
		addActiveRelation(
			state.activeByEndpoint,
			indexed.endpoint,
			indexed.edge.relation,
		);
}

function dropClaim<L extends Dumling.Language>(
	state: PlanningState<L>,
	indexed: IndexedEdge<L>,
): void {
	state.unresolvedClaims.set(indexed.key, indexed.edge);
	removeActiveRelation(
		state.activeByEndpoint,
		indexed.endpoint,
		indexed.edge.relation,
	);
}

function createPlanningState<L extends Dumling.Language>(input: {
	lemmas: readonly LemmaRecord<L>[];
	readings: readonly ReadingEntry<L>[];
	requests: readonly RelationRequest<L>[];
	retractions?: readonly PlannedRelationRemoval<L>[];
}): PlanningState<L> {
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
	const existingKeys = new Set(stored.map(({ key }) => key));
	// Claims the requests name exactly: a Shadow resolving to one is absorbed.
	const namedKeys = new Set<string>();
	for (const request of input.requests) {
		if (request.target.kind === "lemma") {
			namedKeys.add(
				indexEdge({
					reading: request.sourceReading,
					relation: request.relation,
					targetLemma: request.target.lemma,
				}).key,
			);
		}
	}
	// Claims a Shadow held and no longer resolves to, and claims retracted.
	const unresolvedClaims = new Map<string, Edge<L>>();
	for (const edge of input.retractions ?? []) {
		const { key } = indexEdge(edge);
		if (existingKeys.has(key)) unresolvedClaims.set(key, edge);
	}
	const activeByEndpoint = new Map<
		string,
		Set<Dumrel.DirectSemanticRelation>
	>();
	for (const indexed of stored) {
		if (!unresolvedClaims.has(indexed.key))
			addActiveRelation(
				activeByEndpoint,
				indexed.endpoint,
				indexed.edge.relation,
			);
	}
	return {
		lemmas,
		lemmaByKey,
		entryByReadingKey,
		stored,
		existingKeys,
		namedKeys,
		proposed: [],
		unresolvedClaims,
		activeByEndpoint,
		shadowOutcomes: [],
	};
}

function resolveShadowRequest<L extends Dumling.Language>(
	request: RelationRequest<L> & {
		target: Extract<RelationRequest<L>["target"], { kind: "shadow" }>;
	},
	sourceLemma: Dumling.Lemma<L>,
	sourceTargetKind: SourceTargetKind,
	state: PlanningState<L>,
): RejectedPlan | undefined {
	const { pendingRecord: record, mode } = request.target;
	const strict = mode === "propose";
	if (strict && sourceTargetKind === "reading")
		return rejected(
			"invalidDraft",
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	const target = resolveShadow(record.pending.target, state.lemmas);
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
	const previousClaim =
		previous &&
		indexEdge({
			reading: request.sourceReading,
			relation: request.relation,
			targetLemma: previous,
		});
	const claimHeld =
		previousClaim !== undefined &&
		state.existingKeys.has(previousClaim.key);
	if (
		!strict &&
		previous &&
		!claimHeld &&
		state.lemmaByKey.has(lemmaIdentityKey(previous))
	) {
		// Its claim was retracted while its Lemma stayed, so the
		// relation went with it. Only a removed Lemma moves a Shadow
		// whose claim is gone.
		state.shadowOutcomes.push({ record, next: undefined });
		return undefined;
	}
	const keeps =
		previous !== undefined &&
		next !== undefined &&
		sameLemma(previous, next);
	if (previousClaim && claimHeld && !keeps) dropClaim(state, previousClaim);
	const pending = withoutResolution(record);
	if (!next) {
		state.shadowOutcomes.push({ record, next: pending });
		return undefined;
	}
	const indexed = indexEdge({
		reading: request.sourceReading,
		relation: request.relation,
		targetLemma: next,
	});
	const isNamed = state.namedKeys.has(indexed.key);
	if (keeps && !isNamed) {
		// A proposal re-asserts a claim something retracted.
		proposeEdge(state, indexed);
		state.shadowOutcomes.push({ record, next: record });
	} else if (keeps || state.existingKeys.has(indexed.key) || isNamed) {
		// The source already claims the Lemma exactly, so the claim
		// never moves and the Shadow adds nothing.
		state.shadowOutcomes.push({ record, next: undefined });
	} else if (
		!strict &&
		claimsOtherwise(
			indexed.endpoint,
			indexed.edge.relation,
			state.activeByEndpoint,
		)
	) {
		state.shadowOutcomes.push({ record, next: pending });
	} else {
		proposeEdge(state, indexed);
		state.shadowOutcomes.push({
			record,
			next: { ...pending, resolvedLemma: next },
		});
	}
	return undefined;
}

function resolveDirectRequest<L extends Dumling.Language>(
	request: RelationRequest<L> & {
		target: Exclude<RelationRequest<L>["target"], { kind: "shadow" }>;
	},
	sourceLemma: Dumling.Lemma<L>,
	sourceTargetKind: SourceTargetKind,
	state: PlanningState<L>,
): RejectedPlan | undefined {
	const requestTargetKind: SourceTargetKind =
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
		const targetReading = state.entryByReadingKey.get(
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
		proposeEdge(
			state,
			indexEdge({
				reading: request.sourceReading,
				relation: "synonym",
				targetKind: "reading",
				targetReading,
			}),
		);
		return undefined;
	}

	const targetLemma = state.lemmaByKey.get(
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
	proposeEdge(
		state,
		indexEdge({
			reading: request.sourceReading,
			relation: request.relation,
			targetLemma,
		}),
	);
	return undefined;
}

function reconcileProposedEdges<L extends Dumling.Language>(
	state: PlanningState<L>,
): RelationMaintenancePlan<L> {
	const remaining = state.stored.filter(
		({ key }) => !state.unresolvedClaims.has(key),
	);
	const remainingKeys = new Set(remaining.map(({ key }) => key));
	const storedByTarget = groupEdgesByTarget(remaining);
	const proposedByTarget = groupEdgesByTarget(state.proposed);
	const additions = new Map<string, Edge<L>>();
	const removals = new Map<string, Edge<L>>(state.unresolvedClaims);
	for (const [endpoint, incoming] of proposedByTarget) {
		const existing = storedByTarget.get(endpoint) ?? [];
		const incomingRelations = new Set(
			incoming.map(({ edge }) => edge.relation),
		);
		const combinedRelations = new Set([
			...incomingRelations,
			...existing.map(({ edge }) => edge.relation),
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
			for (const indexed of existing)
				if (indexed.edge.relation === "nearSynonym")
					removals.set(indexed.key, indexed.edge);
		}
		for (const indexed of incoming) {
			if (
				indexed.edge.relation === "nearSynonym" &&
				incomingRelations.has("synonym")
			)
				continue;
			if (!remainingKeys.has(indexed.key))
				additions.set(indexed.key, indexed.edge);
		}
	}
	return {
		status: "planned",
		additions: [...additions.values()],
		removals: [...removals.values()],
		shadowOutcomes: state.shadowOutcomes,
	};
}

/** Plans dictionary-owned direct relation maintenance without inference. */
export function planRelationMaintenance<L extends Dumling.Language>(input: {
	lemmas: readonly LemmaRecord<L>[];
	readings: readonly ReadingEntry<L>[];
	requests: readonly RelationRequest<L>[];
	/** Stored claims the plan retracts whatever the requests resolve to. */
	retractions?: readonly PlannedRelationRemoval<L>[];
}): RelationMaintenancePlan<L> {
	const state = createPlanningState(input);

	for (const request of input.requests) {
		if (!directSemanticRelationValues.includes(request.relation))
			return rejected(
				"invalidDraft",
				"Inferred relation orientations cannot be stored as direct claims.",
			);
		const sourceEntry = state.entryByReadingKey.get(
			readingIdentityKey(request.sourceReading),
		);
		const sourceLemma = state.lemmaByKey.get(
			lemmaIdentityKey(request.sourceReading.lemma),
		);
		if (!sourceEntry || !sourceLemma)
			return rejected(
				"invalidDraft",
				"Relation source Reading is missing from the planning inventory.",
			);
		const sourceTargetKind: SourceTargetKind =
			sourceEntry.knowledge?.semanticRelations?.targetKind === "reading"
				? "reading"
				: "lemma";

		const failure =
			request.target.kind === "shadow"
				? resolveShadowRequest(
						{ ...request, target: request.target },
						sourceLemma,
						sourceTargetKind,
						state,
					)
				: resolveDirectRequest(
						{ ...request, target: request.target },
						sourceLemma,
						sourceTargetKind,
						state,
					);
		if (failure) return failure;
	}

	return reconcileProposedEdges(state);
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
function claimsOtherwise(
	endpoint: string,
	relation: Dumrel.DirectSemanticRelation,
	activeByEndpoint: ReadonlyMap<
		string,
		ReadonlySet<Dumrel.DirectSemanticRelation>
	>,
): boolean {
	const active = activeByEndpoint.get(endpoint);
	if (!active || active.size === 0) return false;
	return active.size > 1 || !active.has(relation);
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
	edges: readonly IndexedEdge<L>[],
): Map<string, IndexedEdge<L>[]> {
	const grouped = new Map<string, IndexedEdge<L>[]>();
	for (const indexed of edges) {
		const bucket = grouped.get(indexed.endpoint);
		if (bucket) bucket.push(indexed);
		else grouped.set(indexed.endpoint, [indexed]);
	}
	return grouped;
}
