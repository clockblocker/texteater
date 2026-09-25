import { type Infer, v } from "convex/values";
import { selectGrammaticalAlternatives } from "dumgen/authored";
import type * as Dumling from "dumling/types";
import {
	parseReadingKnowledge,
	projectParticipleSources,
	projectSemanticRelations,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../../../server/linguisticIdentity";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../../../server/operationalParsing";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { semanticRelationValidator } from "../../model/validators";

const MAX_RELATIONS_PER_NOTE = 50;
const MAX_RELATION_NEIGHBORHOOD_READINGS = 50;
const MAX_RELATION_NEIGHBORHOOD_EDGES = 250;
const MAX_PARTICIPIAL_ADJECTIVES_PER_NOTE = 50;

export const relationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
	target: v.union(
		v.object({
			kind: v.literal("Lemma"),
			lemmaId: v.id("lemmas"),
		}),
		v.object({
			kind: v.literal("Reading"),
			readingId: v.id("readings"),
		}),
	),
});

export const grammaticalAlternativeValidator = v.object({
	feature: v.union(
		v.literal("case"),
		v.literal("person"),
		v.literal("number"),
		v.literal("gender"),
	),
	readingKey: v.string(),
	canonicalForm: v.string(),
});
export type GrammaticalAlternative = {
	readonly feature: "case" | "person" | "number" | "gender";
	readonly readingKey: string;
	readonly canonicalForm: string;
};

export type RelationProjection<
	LemmaId extends string = string,
	ReadingId extends string = string,
> = {
	readonly relation: Dumrel.SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
	readonly target:
		| {
				readonly kind: "Lemma";
				readonly lemmaId: LemmaId;
		  }
		| { readonly kind: "Reading"; readonly readingId: ReadingId };
};

type RelationNeighborhood = {
	readings: Map<Id<"readings">, Doc<"readings">>;
	lemmas: Map<Id<"lemmas">, Doc<"lemmas">>;
	edges: Map<Id<"semanticRelationEdges">, Doc<"semanticRelationEdges">>;
};

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

function parseStoredGermanLemma(lemma: Doc<"lemmas">): Dumling.Lemma<"de"> {
	return parseGermanLemma({
		unitKind: "Lemma",
		language: lemma.language,
		family: lemma.family,
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
		coreFeatures: lemma.coreFeatures,
	});
}

/**
 * Loads the Reading's relation neighbourhood up to its caps. Past a cap it
 * stops adding and marks the result truncated, so an oversized neighbourhood
 * still yields the relations it loaded, in index order.
 */
async function loadTargetedRelationProjections(
	ctx: QueryCtx,
	source: Doc<"readings">,
): Promise<{ projections: TargetedRelationProjection[]; truncated: boolean }> {
	let truncated = false;
	const neighborhood: RelationNeighborhood = {
		readings: new Map([[source._id, source]]),
		lemmas: new Map(),
		edges: new Map(),
	};
	const outgoingByReading = new Map<
		Id<"readings">,
		Doc<"semanticRelationEdges">[]
	>();
	const incomingByReading = new Map<
		Id<"readings">,
		Doc<"semanticRelationEdges">[]
	>();
	const incomingByLemma = new Map<
		Id<"lemmas">,
		Doc<"semanticRelationEdges">[]
	>();
	const readingsByLemma = new Map<Id<"lemmas">, Doc<"readings">[]>();

	/** Whether the edge is in the neighbourhood; none is added past the cap. */
	function rememberEdge(edge: Doc<"semanticRelationEdges">): boolean {
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

	async function loadReadingsByLemma(lemmaId: Id<"lemmas">) {
		const known = readingsByLemma.get(lemmaId);
		if (known) return known;
		const rows = await ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemmaId))
			.take(MAX_RELATION_NEIGHBORHOOD_READINGS + 1);
		if (rows.length > MAX_RELATION_NEIGHBORHOOD_READINGS) truncated = true;
		const kept: Doc<"readings">[] = [];
		for (const reading of rows.slice(
			0,
			MAX_RELATION_NEIGHBORHOOD_READINGS,
		)) {
			if (!neighborhood.readings.has(reading._id)) {
				if (
					neighborhood.readings.size >=
					MAX_RELATION_NEIGHBORHOOD_READINGS
				) {
					truncated = true;
					continue;
				}
				neighborhood.readings.set(reading._id, reading);
			}
			kept.push(reading);
		}
		readingsByLemma.set(lemmaId, kept);
		return kept;
	}

	/** At most one note's worth of a Reading's or Lemma's edges. */
	function capIncident(rows: Doc<"semanticRelationEdges">[]) {
		if (rows.length <= MAX_RELATIONS_PER_NOTE) return rows;
		truncated = true;
		return rows.slice(0, MAX_RELATIONS_PER_NOTE);
	}

	async function loadOutgoing(readingId: Id<"readings">) {
		const known = outgoingByReading.get(readingId);
		if (known) return known;
		const rows = await ctx.db
			.query("semanticRelationEdges")
			.withIndex(
				"by_source_reading_id_and_relation_and_target_lemma_id",
				(q) => q.eq("sourceReadingId", readingId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1)
			// The index orders edges by relation and target; keep insertion order.
			.then((edges) =>
				capIncident(
					edges.sort((a, b) => a._creationTime - b._creationTime),
				),
			);
		outgoingByReading.set(readingId, rows);
		return rows;
	}

	async function loadIncomingReading(readingId: Id<"readings">) {
		const known = incomingByReading.get(readingId);
		if (known) return known;
		const rows = await ctx.db
			.query("semanticRelationEdges")
			.withIndex("by_target_reading_id", (q) =>
				q.eq("targetReadingId", readingId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1)
			.then(capIncident);
		incomingByReading.set(readingId, rows);
		return rows;
	}

	async function loadIncomingLemma(lemmaId: Id<"lemmas">) {
		const known = incomingByLemma.get(lemmaId);
		if (known) return known;
		const rows = await ctx.db
			.query("semanticRelationEdges")
			.withIndex("by_target_lemma_id", (q) =>
				q.eq("targetLemmaId", lemmaId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1)
			.then(capIncident);
		incomingByLemma.set(lemmaId, rows);
		return rows;
	}

	async function targetReadings(edge: Doc<"semanticRelationEdges">) {
		if (edge.targetKind === "reading" || edge.targetReadingId) {
			return edge.targetReadingId
				? [await rememberReading(edge.targetReadingId)].filter(
						(reading): reading is Doc<"readings"> =>
							reading !== null,
					)
				: [];
		}
		if (!edge.targetLemmaId) return [];
		await rememberLemma(edge.targetLemmaId);
		return loadReadingsByLemma(edge.targetLemmaId);
	}

	async function expandSynonymComponent(seedIds: readonly Id<"readings">[]) {
		const component = new Set<Id<"readings">>();
		const pending = [...seedIds];
		while (pending.length > 0) {
			const readingId = pending.pop();
			if (!readingId || component.has(readingId)) continue;
			const reading = await rememberReading(readingId);
			if (!reading) continue;
			component.add(readingId);
			await rememberLemma(reading.lemmaId);
			const incident = [
				...(await loadOutgoing(readingId)),
				...(await loadIncomingReading(readingId)),
				...(await loadIncomingLemma(reading.lemmaId)),
			].filter((edge) => edge.relation === "synonym");
			for (const edge of incident) {
				if (!rememberEdge(edge)) continue;
				if (!component.has(edge.sourceReadingId)) {
					pending.push(edge.sourceReadingId);
				}
				for (const target of await targetReadings(edge)) {
					if (!component.has(target._id)) pending.push(target._id);
				}
			}
		}
		return component;
	}

	const sourceComponent = await expandSynonymComponent([source._id]);
	const targetSeeds = new Set<Id<"readings">>();
	for (const readingId of sourceComponent) {
		const reading = neighborhood.readings.get(readingId);
		if (!reading) continue;
		const incident = [
			...(await loadOutgoing(readingId)),
			...(await loadIncomingReading(readingId)),
			...(await loadIncomingLemma(reading.lemmaId)),
		];
		for (const edge of incident) {
			if (!rememberEdge(edge)) continue;
			await rememberReading(edge.sourceReadingId);
			targetSeeds.add(edge.sourceReadingId);
			for (const target of await targetReadings(edge)) {
				targetSeeds.add(target._id);
			}
		}
	}
	await expandSynonymComponent([...targetSeeds]);

	await Promise.all(
		[...neighborhood.readings.values()].map((reading) =>
			rememberLemma(reading.lemmaId),
		),
	);
	const units = new Map(
		[...neighborhood.readings.values()].map((reading) => {
			const lemma = neighborhood.lemmas.get(reading.lemmaId);
			if (!lemma)
				throw new Error("Relation neighborhood has a missing Lemma.");
			return [
				reading._id,
				parseGermanReading({
					unitKind: "Reading",
					lemma: parseStoredGermanLemma(lemma),
					emojiDescription: reading.emojiDescription,
				}),
			] as const;
		}),
	);
	const entries: Dumrel.ReadingWithKnowledge[] = await Promise.all(
		[...units].map(async ([id, reading]) => {
			const accumulated = await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", readingFingerprint(reading)),
				)
				.unique();
			const stored = parseReadingKnowledge({
				source: reading,
				knowledge: accumulated?.knowledge ?? {},
			});
			if (!stored.success) throw stored.error;
			const readingMode =
				stored.value.semanticRelations?.targetKind === "reading" ||
				[...neighborhood.edges.values()].some(
					(edge) =>
						edge.sourceReadingId === id &&
						edge.targetKind === "reading",
				);
			const relations: Record<string, unknown> = readingMode
				? { targetKind: "reading" }
				: {};
			for (const edge of neighborhood.edges.values()) {
				if (edge.sourceReadingId !== id) continue;
				const target = edge.targetReadingId
					? units.get(edge.targetReadingId)
					: edge.targetLemmaId
						? neighborhood.lemmas.get(edge.targetLemmaId)
						: undefined;
				if (!target) {
					// A truncated neighbourhood may hold an edge without its target.
					if (truncated) continue;
					throw new Error(
						"Relation neighborhood has a missing target.",
					);
				}
				const value =
					"emojiDescription" in target
						? target
						: parseStoredGermanLemma(target);
				const bucket = relations[edge.relation];
				if (Array.isArray(bucket)) bucket.push(value);
				else relations[edge.relation] = [value];
			}
			const knowledge = parseReadingKnowledge({
				source: reading,
				knowledge: { semanticRelations: relations },
			});
			if (!knowledge.success) throw knowledge.error;
			return { reading, knowledge: knowledge.value };
		}),
	);
	const sourceReading = units.get(source._id);
	if (!sourceReading)
		throw new Error("Relation neighborhood is missing its source Reading.");
	const projected = projectSemanticRelations(entries, {
		source: sourceReading,
	});
	if (!projected.success) throw projected.error;
	const projections = projected.value.map(
		(item): TargetedRelationProjection =>
			item.target.unitKind === "Reading"
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
					},
	);
	return { projections, truncated };
}

export async function loadRelationProjections(
	ctx: QueryCtx,
	readingId: Id<"readings">,
) {
	const source = await ctx.db.get(readingId);
	if (!source)
		return {
			knowledge: {},
			resolved: [],
			truncated: false,
		};
	const loaded = await loadTargetedRelationProjections(ctx, source);
	const truncated =
		loaded.truncated || loaded.projections.length > MAX_RELATIONS_PER_NOTE;
	const projections = loaded.projections.slice(0, MAX_RELATIONS_PER_NOTE);
	const targetDocs = await Promise.all(
		projections.map((projection) =>
			projection.targetKind === "reading"
				? ctx.db
						.query("readings")
						.withIndex("by_reading_key", (q) =>
							q.eq(
								"readingKey",
								readingFingerprint(projection.targetReading),
							),
						)
						.unique()
				: ctx.db
						.query("lemmas")
						.withIndex("by_lemma_key", (q) =>
							q.eq(
								"lemmaKey",
								lemmaIdentityKey(projection.targetLemma),
							),
						)
						.unique(),
		),
	);
	const readingMode = projections[0]?.targetKind === "reading";
	if (
		projections.some(
			(projection) =>
				(projection.targetKind === "reading") !== readingMode,
		)
	)
		throw new Error(
			"One Reading Note cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	const resolved: RelationProjection<Id<"lemmas">, Id<"readings">>[] = [];
	const knowledge: PresentedRelations = readingMode
		? { targetKind: "reading" }
		: {};
	for (const [index, projection] of projections.entries()) {
		const targetDoc = targetDocs[index];
		if (!targetDoc) continue;
		if (projection.targetKind === "reading") {
			if (
				!("readingKey" in targetDoc) ||
				knowledge.targetKind !== "reading"
			)
				continue;
			resolved.push({
				relation: projection.relation,
				targetCanonicalForm:
					projection.targetReading.lemma.canonicalForm,
				provenance: projection.provenance,
				target: {
					kind: "Reading",
					readingId: targetDoc._id,
				},
			});
			const bucket = knowledge[projection.relation];
			if (bucket) bucket.push(projection.targetReading);
			else knowledge[projection.relation] = [projection.targetReading];
			continue;
		}
		if (!("lemmaKey" in targetDoc) || knowledge.targetKind === "reading")
			continue;
		const target = parseStoredGermanLemma(targetDoc);
		resolved.push({
			relation: projection.relation,
			targetCanonicalForm: targetDoc.canonicalForm,
			provenance: projection.provenance,
			target: {
				kind: "Lemma",
				lemmaId: targetDoc._id,
			},
		});
		const bucket = knowledge[projection.relation];
		if (bucket) bucket.push(target);
		else knowledge[projection.relation] = [target];
	}
	return { knowledge, resolved, truncated };
}

/**
 * One Participle Source edge on a Reading Note (ADR 0036): the ADJ Reading
 * names its source VERB Lemma, and the verb's Readings list the participial
 * adjectives that name it. The verb's side is projected, never stored.
 */
export const participleLinkValidator = v.object({
	relation: v.union(
		v.literal("participleSource"),
		v.literal("participialAdjective"),
	),
	targetCanonicalForm: v.string(),
	target: v.union(
		v.object({ kind: v.literal("Lemma"), lemmaId: v.id("lemmas") }),
		v.object({ kind: v.literal("Reading"), readingId: v.id("readings") }),
	),
});

/**
 * The Participle Source edges whose source is this Reading, projected by
 * Dumrel over the Reading and the participial adjectives stored against its
 * Lemma. A target missing from the dictionary shows no link.
 */
export async function loadParticipleLinks(
	ctx: QueryCtx,
	source: Doc<"readings">,
	sourceLemma: Doc<"lemmas">,
	participleSource: Dumrel.ParticipleSource | undefined,
): Promise<Infer<typeof participleLinkValidator>[]> {
	const sourceReading = parseGermanReading({
		unitKind: "Reading",
		lemma: parseStoredGermanLemma(sourceLemma),
		emojiDescription: source.emojiDescription,
	});
	const adjectiveRows = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_participle_source_lemma_key", (q) =>
			q.eq("participleSourceLemmaKey", sourceLemma.lemmaKey),
		)
		.take(MAX_PARTICIPIAL_ADJECTIVES_PER_NOTE);
	const readingIds = new Map<string, Id<"readings">>();
	const entries: Dumrel.ReadingWithKnowledge[] = [
		{
			reading: sourceReading,
			knowledge: participleSource ? { participleSource } : {},
		},
	];
	for (const row of adjectiveRows) {
		if (row.ownerReadingKey === source.readingKey) continue;
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", row.ownerReadingKey),
			)
			.unique();
		const lemma = reading ? await ctx.db.get(reading.lemmaId) : null;
		if (!reading || !lemma) continue;
		const adjective = parseGermanReading({
			unitKind: "Reading",
			lemma: parseStoredGermanLemma(lemma),
			emojiDescription: reading.emojiDescription,
		});
		readingIds.set(reading.readingKey, reading._id);
		entries.push({
			reading: adjective,
			knowledge: {
				participleSource: Reflect.get(
					row.knowledge ?? {},
					"participleSource",
				),
			},
		});
	}
	const projected = projectParticipleSources(entries);
	if (!projected.success) throw projected.error;
	const links: Infer<typeof participleLinkValidator>[] = [];
	for (const edge of projected.value) {
		if (readingFingerprint(edge.source) !== source.readingKey) continue;
		if (edge.target.unitKind === "Lemma") {
			const target = await ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", lemmaIdentityKey(edge.target)),
				)
				.unique();
			if (target)
				links.push({
					relation: edge.relation,
					targetCanonicalForm: target.canonicalForm,
					target: { kind: "Lemma", lemmaId: target._id },
				});
			continue;
		}
		const readingId = readingIds.get(readingFingerprint(edge.target));
		if (readingId)
			links.push({
				relation: edge.relation,
				targetCanonicalForm: edge.target.lemma.canonicalForm,
				target: { kind: "Reading", readingId },
			});
	}
	return links;
}

export async function loadGrammaticalAlternatives(
	ctx: QueryCtx,
	readingId: Id<"readings">,
): Promise<GrammaticalAlternative[]> {
	const source = await ctx.db.get(readingId);
	if (!source) return [];
	const lemmaDoc = await ctx.db.get(source.lemmaId);
	if (!lemmaDoc) return [];
	return reviewedAlternatives(parseStoredGermanLemma(lemmaDoc)).map(
		({ feature, reading }) => ({
			feature,
			readingKey: readingFingerprint(reading),
			canonicalForm: reading.lemma.canonicalForm,
		}),
	);
}
/**
 * The Paradigm Cells a learner can step to from a reviewed pillar pronoun or
 * article. A stem Lemma (dieser, mein) has none: all its forms are Surfaces
 * of this one Reading, so navigation never leaves it.
 */
export function reviewedAlternatives(lemma: Dumling.Lemma<"de">) {
	if (lemma.family !== "Lexeme") return [];
	try {
		if (lemma.kind === "PRON")
			return (["case", "person", "number"] as const).flatMap((feature) =>
				selectGrammaticalAlternatives({
					source: lemma,
					vary: [feature],
				}).map((reading) => ({ feature, reading })),
			);
		if (lemma.kind === "DET")
			// Plural cells have no gender, so a number step also frees gender;
			// only the cells that change number belong to that step.
			return (["case", "gender", "number"] as const).flatMap((feature) =>
				selectGrammaticalAlternatives({
					source: lemma,
					vary:
						feature === "number" ? ["number", "gender"] : [feature],
				})
					.filter(
						(reading) =>
							feature !== "number" ||
							readingNumber(reading) !==
								lemma.coreFeatures.number,
					)
					.map((reading) => ({ feature, reading })),
			);
		return [];
	} catch (error) {
		if (error instanceof Error && error.name === "InvalidInput") return [];
		throw error;
	}
}
function readingNumber(reading: Dumling.Reading<"de">) {
	return (reading.lemma.coreFeatures as { number?: string | null }).number;
}

export type PresentedRelations =
	| ({ targetKind?: "lemma" } & Partial<
			Record<Dumrel.SemanticRelation, Dumling.Lemma[]>
	  >)
	| ({ targetKind: "reading" } & Partial<
			Record<Dumrel.SemanticRelation, Dumling.Reading[]>
	  >);
