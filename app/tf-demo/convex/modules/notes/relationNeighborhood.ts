import type * as Dumling from "dumling/types";
import { parseReadingKnowledge, projectSemanticRelations } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { readingIdentityKey } from "../../../server/linguisticIdentity";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../../../server/operationalParsing";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { projectReadingValue } from "./projections";

export const MAX_RELATIONS_PER_NOTE = 50;
const MAX_RELATION_NEIGHBORHOOD_READINGS = 50;
const MAX_RELATION_NEIGHBORHOOD_EDGES = 250;

type RelationEdge = Doc<"semanticRelationEdges">;

type RelationNeighborhood = {
	readings: Map<Id<"readings">, Doc<"readings">>;
	lemmas: Map<Id<"lemmas">, Doc<"lemmas">>;
	edges: Map<Id<"semanticRelationEdges">, RelationEdge>;
};

type ProjectedSemanticRelation = Extract<
	ReturnType<typeof projectSemanticRelations>,
	{ success: true }
>["value"][number];

type RelationNeighborhoodLoader = ReturnType<
	typeof createRelationNeighborhoodLoader
>;

type TargetedRelationProjection =
	| {
			relation: Dumrel.SemanticRelation;
			targetKind: "lemma";
			targetLemma: Dumling.Lemma<"de">;
			provenance: "direct" | "inferred";
	  }
	| {
			relation: Dumrel.SemanticRelation;
			targetKind: "reading";
			targetReading: Dumling.Reading<"de">;
			provenance: "direct" | "inferred";
	  };

/** The stored Lemma fields its Dumling value is parsed from. */
type StoredLemmaFields = {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
};

/** The stored Semantic Relation edge fields a Reading's relations are built from. */
type StoredRelationEdge<ReadingId extends string, LemmaId extends string> = {
	readonly sourceReadingId: ReadingId;
	readonly relation: string;
	readonly targetKind?: "lemma" | "reading";
	readonly targetLemmaId?: LemmaId;
	readonly targetReadingId?: ReadingId;
};

export function parseStoredGermanLemma(
	lemma: StoredLemmaFields,
): Dumling.Lemma<"de"> {
	return parseGermanLemma({
		unitKind: "Lemma",
		language: lemma.language,
		family: lemma.family,
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
		coreFeatures: lemma.coreFeatures,
	});
}

/** A loader that loads each key once and answers repeats from its cache. */
function memoized<Key, Value>(load: (key: Key) => Promise<Value>) {
	const cache = new Map<Key, Value>();
	return async (key: Key) => {
		const known = cache.get(key);
		if (known) return known;
		const value = await load(key);
		cache.set(key, value);
		return value;
	};
}

function queryOutgoingEdges(ctx: QueryCtx, readingId: Id<"readings">) {
	return (
		ctx.db
			.query("semanticRelationEdges")
			.withIndex(
				"by_source_reading_id_and_relation_and_target_lemma_id",
				(q) => q.eq("sourceReadingId", readingId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1)
			// The index orders edges by relation and target; keep insertion order.
			.then((edges) =>
				edges.sort((a, b) => a._creationTime - b._creationTime),
			)
	);
}

function queryIncomingReadingEdges(ctx: QueryCtx, readingId: Id<"readings">) {
	return ctx.db
		.query("semanticRelationEdges")
		.withIndex("by_target_reading_id", (q) =>
			q.eq("targetReadingId", readingId),
		)
		.take(MAX_RELATIONS_PER_NOTE + 1);
}

function queryIncomingLemmaEdges(ctx: QueryCtx, lemmaId: Id<"lemmas">) {
	return ctx.db
		.query("semanticRelationEdges")
		.withIndex("by_target_lemma_id", (q) => q.eq("targetLemmaId", lemmaId))
		.take(MAX_RELATIONS_PER_NOTE + 1);
}

function queryLemmaReadings(ctx: QueryCtx, lemmaId: Id<"lemmas">) {
	return ctx.db
		.query("readings")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemmaId))
		.take(MAX_RELATION_NEIGHBORHOOD_READINGS + 1);
}

/**
 * The capped, cached loader for a Reading's relation neighbourhood. Past a cap
 * it stops adding and marks the neighbourhood truncated.
 */
function createRelationNeighborhoodLoader(
	ctx: QueryCtx,
	source: Doc<"readings">,
) {
	let truncated = false;
	const neighborhood: RelationNeighborhood = {
		readings: new Map([[source._id, source]]),
		lemmas: new Map(),
		edges: new Map(),
	};

	/** Whether the edge is in the neighbourhood; none is added past the cap. */
	function rememberEdge(edge: RelationEdge): boolean {
		if (neighborhood.edges.has(edge._id)) return true;
		if (neighborhood.edges.size >= MAX_RELATION_NEIGHBORHOOD_EDGES) {
			truncated = true;
			return false;
		}
		neighborhood.edges.set(edge._id, edge);
		return true;
	}

	/** The loaded Reading, or null when it is missing or past the cap. */
	async function rememberReading(readingId: Id<"readings">) {
		const known = neighborhood.readings.get(readingId);
		if (known) return known;
		if (neighborhood.readings.size >= MAX_RELATION_NEIGHBORHOOD_READINGS) {
			truncated = true;
			return null;
		}
		const reading = await ctx.db.get(readingId);
		if (!reading) return null;
		neighborhood.readings.set(readingId, reading);
		return reading;
	}

	async function rememberLemma(lemmaId: Id<"lemmas">) {
		const known = neighborhood.lemmas.get(lemmaId);
		if (known) return known;
		const lemma = await ctx.db.get(lemmaId);
		if (!lemma) return null;
		neighborhood.lemmas.set(lemmaId, lemma);
		return lemma;
	}

	/** Whether a fetched Reading is in the neighbourhood; none is added past the cap. */
	function admitReading(reading: Doc<"readings">): boolean {
		if (neighborhood.readings.has(reading._id)) return true;
		if (neighborhood.readings.size >= MAX_RELATION_NEIGHBORHOOD_READINGS) {
			truncated = true;
			return false;
		}
		neighborhood.readings.set(reading._id, reading);
		return true;
	}

	const loadReadingsByLemma = memoized(async (lemmaId: Id<"lemmas">) => {
		const rows = await queryLemmaReadings(ctx, lemmaId);
		if (rows.length > MAX_RELATION_NEIGHBORHOOD_READINGS) truncated = true;
		return rows
			.slice(0, MAX_RELATION_NEIGHBORHOOD_READINGS)
			.filter(admitReading);
	});

	/** At most one note's worth of a Reading's or Lemma's edges. */
	function capIncident(rows: RelationEdge[]) {
		if (rows.length <= MAX_RELATIONS_PER_NOTE) return rows;
		truncated = true;
		return rows.slice(0, MAX_RELATIONS_PER_NOTE);
	}

	const loadOutgoing = memoized((readingId: Id<"readings">) =>
		queryOutgoingEdges(ctx, readingId).then(capIncident),
	);
	const loadIncomingReading = memoized((readingId: Id<"readings">) =>
		queryIncomingReadingEdges(ctx, readingId).then(capIncident),
	);
	const loadIncomingLemma = memoized((lemmaId: Id<"lemmas">) =>
		queryIncomingLemmaEdges(ctx, lemmaId).then(capIncident),
	);

	/** The Reading's outgoing edges, then those into it and into its Lemma. */
	async function loadIncident(reading: Doc<"readings">) {
		return [
			...(await loadOutgoing(reading._id)),
			...(await loadIncomingReading(reading._id)),
			...(await loadIncomingLemma(reading.lemmaId)),
		];
	}

	return {
		neighborhood,
		truncated: () => truncated,
		rememberEdge,
		rememberReading,
		rememberLemma,
		loadReadingsByLemma,
		loadIncident,
	};
}

/** The loaded Readings an edge targets: its Reading, or its Lemma's Readings. */
async function targetReadings(
	loader: RelationNeighborhoodLoader,
	edge: RelationEdge,
) {
	if (edge.targetKind === "reading" || edge.targetReadingId) {
		return edge.targetReadingId
			? [await loader.rememberReading(edge.targetReadingId)].filter(
					(reading): reading is Doc<"readings"> => reading !== null,
				)
			: [];
	}
	if (!edge.targetLemmaId) return [];
	await loader.rememberLemma(edge.targetLemmaId);
	return loader.loadReadingsByLemma(edge.targetLemmaId);
}

async function expandSynonymComponent(
	loader: RelationNeighborhoodLoader,
	seedIds: readonly Id<"readings">[],
) {
	const component = new Set<Id<"readings">>();
	const pending = [...seedIds];
	while (pending.length > 0) {
		const readingId = pending.pop();
		if (!readingId || component.has(readingId)) continue;
		const reading = await loader.rememberReading(readingId);
		if (!reading) continue;
		component.add(readingId);
		await loader.rememberLemma(reading.lemmaId);
		const incident = (await loader.loadIncident(reading)).filter(
			(edge) => edge.relation === "synonym",
		);
		for (const edge of incident) {
			if (!loader.rememberEdge(edge)) continue;
			if (!component.has(edge.sourceReadingId)) {
				pending.push(edge.sourceReadingId);
			}
			for (const target of await targetReadings(loader, edge)) {
				if (!component.has(target._id)) pending.push(target._id);
			}
		}
	}
	return component;
}

/**
 * Walks the neighbourhood: the synonym component around the source, its
 * direct targets, then their synonym components, and every loaded Reading's
 * Lemma.
 */
async function walkRelationNeighborhood(
	loader: RelationNeighborhoodLoader,
	source: Doc<"readings">,
) {
	const sourceComponent = await expandSynonymComponent(loader, [source._id]);
	const targetSeeds = new Set<Id<"readings">>();
	for (const readingId of sourceComponent) {
		const reading = loader.neighborhood.readings.get(readingId);
		if (!reading) continue;
		for (const edge of await loader.loadIncident(reading)) {
			if (!loader.rememberEdge(edge)) continue;
			await loader.rememberReading(edge.sourceReadingId);
			targetSeeds.add(edge.sourceReadingId);
			for (const target of await targetReadings(loader, edge)) {
				targetSeeds.add(target._id);
			}
		}
	}
	await expandSynonymComponent(loader, [...targetSeeds]);
	await Promise.all(
		[...loader.neighborhood.readings.values()].map((reading) =>
			loader.rememberLemma(reading.lemmaId),
		),
	);
}

/** The edge's target value, or undefined when the neighbourhood lacks it. */
function relationTarget<ReadingId extends string, LemmaId extends string>(
	edge: StoredRelationEdge<ReadingId, LemmaId>,
	units: ReadonlyMap<ReadingId, Dumling.Reading<"de">>,
	lemmas: ReadonlyMap<LemmaId, StoredLemmaFields>,
): Dumling.Reading<"de"> | Dumling.Lemma<"de"> | undefined {
	if (edge.targetReadingId) return units.get(edge.targetReadingId);
	const lemma = edge.targetLemmaId
		? lemmas.get(edge.targetLemmaId)
		: undefined;
	return lemma ? parseStoredGermanLemma(lemma) : undefined;
}

/**
 * One Reading's `semanticRelations` record from the neighbourhood's edges,
 * grouped by relation in edge order. It targets Readings when the stored
 * Knowledge says so or any of its edges targets a Reading.
 */
export function relationsOf<
	ReadingId extends string,
	LemmaId extends string,
>(input: {
	readonly readingId: ReadingId;
	readonly storedTargetKind: "lemma" | "reading" | undefined;
	readonly edges: readonly StoredRelationEdge<ReadingId, LemmaId>[];
	readonly units: ReadonlyMap<ReadingId, Dumling.Reading<"de">>;
	readonly lemmas: ReadonlyMap<LemmaId, StoredLemmaFields>;
	readonly truncated: boolean;
}): Record<string, unknown> {
	const own = input.edges.filter(
		(edge) => edge.sourceReadingId === input.readingId,
	);
	const readingMode =
		input.storedTargetKind === "reading" ||
		own.some((edge) => edge.targetKind === "reading");
	const relations: Record<string, unknown> = readingMode
		? { targetKind: "reading" }
		: {};
	for (const edge of own) {
		const value = relationTarget(edge, input.units, input.lemmas);
		if (!value) {
			// A truncated neighbourhood may hold an edge without its target.
			if (input.truncated) continue;
			throw new Error("Relation neighborhood has a missing target.");
		}
		const bucket = relations[edge.relation];
		if (Array.isArray(bucket)) bucket.push(value);
		else relations[edge.relation] = [value];
	}
	return relations;
}

/** Each loaded Reading with the Semantic Relations its gathered edges give it. */
function loadRelationEntries(
	ctx: QueryCtx,
	neighborhood: RelationNeighborhood,
	units: ReadonlyMap<Id<"readings">, Dumling.Reading<"de">>,
	truncated: boolean,
): Promise<Dumrel.ReadingWithKnowledge[]> {
	const edges = [...neighborhood.edges.values()];
	return Promise.all(
		[...units].map(async ([readingId, reading]) => {
			const accumulated = await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", readingIdentityKey(reading)),
				)
				.unique();
			const stored = parseReadingKnowledge({
				source: reading,
				knowledge: accumulated?.knowledge ?? {},
			});
			if (!stored.success) throw stored.error;
			const relations = relationsOf({
				readingId,
				storedTargetKind: stored.value.semanticRelations?.targetKind,
				edges,
				units,
				lemmas: neighborhood.lemmas,
				truncated,
			});
			const knowledge = parseReadingKnowledge({
				source: reading,
				knowledge: { semanticRelations: relations },
			});
			if (!knowledge.success) throw knowledge.error;
			return { reading, knowledge: knowledge.value };
		}),
	);
}

/**
 * Dictionary-wide Reading counts for the neighbourhood's Lemmas that hold fewer
 * than two of their Readings here. Projection closes over a Lemma target only
 * when its Lemma has exactly one Reading (ADR 0011), and a Lemma with two
 * loaded Readings is already homonymous; a count of two means two or more.
 */
async function countLemmaReadings(
	ctx: QueryCtx,
	neighborhood: RelationNeighborhood,
) {
	const loaded = new Map<Id<"lemmas">, number>();
	for (const reading of neighborhood.readings.values())
		loaded.set(reading.lemmaId, (loaded.get(reading.lemmaId) ?? 0) + 1);
	return Promise.all(
		[...neighborhood.lemmas.values()]
			.filter((lemma) => (loaded.get(lemma._id) ?? 0) < 2)
			.map(async (lemma) => ({
				lemma: parseStoredGermanLemma(lemma),
				readingCount: (
					await ctx.db
						.query("readings")
						.withIndex("by_lemma_id", (q) =>
							q.eq("lemmaId", lemma._id),
						)
						.take(2)
				).length,
			})),
	);
}

function toTargetedProjection(
	item: ProjectedSemanticRelation,
): TargetedRelationProjection {
	return item.target.unitKind === "Reading"
		? {
				relation: item.relation,
				targetKind: "reading",
				targetReading: parseGermanReading(item.target),
				provenance: item.provenance,
			}
		: {
				relation: item.relation,
				targetKind: "lemma",
				targetLemma: parseGermanLemma(item.target),
				provenance: item.provenance,
			};
}

/**
 * Loads the Reading's relation neighbourhood up to its caps. Past a cap it
 * stops adding and marks the result truncated, so an oversized neighbourhood
 * still yields the relations it loaded, in index order.
 */
export async function loadTargetedRelationProjections(
	ctx: QueryCtx,
	source: Doc<"readings">,
): Promise<{ projections: TargetedRelationProjection[]; truncated: boolean }> {
	const loader = createRelationNeighborhoodLoader(ctx, source);
	await walkRelationNeighborhood(loader, source);
	const { neighborhood } = loader;
	const truncated = loader.truncated();
	const units = new Map(
		[...neighborhood.readings.values()].map((reading) => {
			const lemma = neighborhood.lemmas.get(reading.lemmaId);
			if (!lemma)
				throw new Error("Relation neighborhood has a missing Lemma.");
			return [reading._id, projectReadingValue(reading, lemma)] as const;
		}),
	);
	const entries = await loadRelationEntries(
		ctx,
		neighborhood,
		units,
		truncated,
	);
	const sourceReading = units.get(source._id);
	if (!sourceReading)
		throw new Error("Relation neighborhood is missing its source Reading.");
	const projected = projectSemanticRelations(entries, {
		source: sourceReading,
		readingCounts: await countLemmaReadings(ctx, neighborhood),
	});
	if (!projected.success) throw projected.error;
	return {
		projections: projected.value.map(toTargetedProjection),
		truncated,
	};
}
