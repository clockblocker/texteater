import { v } from "convex/values";
import { readingFingerprint } from "dumling/reading";
import type { Lemma, Reading } from "dumling/types";
import type {
	DirectSemanticRelationGraphEdge,
	GrammaticalRelation,
	LemmaReference,
	ProjectedSemanticRelations,
	ReadingReference,
	SemanticRelation,
} from "dumrel";
import { projectRelations } from "dumrel";
import { semanticRelationValues } from "dumrel/vocabulary";

import { lemmaIdentityKey } from "../../../server/linguisticIdentity";
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

type UnknownRecord = Record<string, unknown>;

export const relationFingerprintProjectionValidator = v.union(
	v.object({
		relation: semanticRelationValidator,
		targetKind: v.optional(v.literal("lemma")),
		targetLemmaKey: v.string(),
		targetCanonicalForm: v.string(),
		provenance: v.union(v.literal("direct"), v.literal("inferred")),
	}),
	v.object({
		relation: semanticRelationValidator,
		targetKind: v.literal("reading"),
		targetReadingKey: v.string(),
		targetCanonicalForm: v.string(),
		provenance: v.union(v.literal("direct"), v.literal("inferred")),
	}),
);

export const relationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
	target: v.union(
		v.object({
			kind: v.literal("RouteNote"),
			routeKind: v.literal("Lemma"),
			id: v.id("lemmas"),
		}),
		v.object({
			kind: v.literal("UnitReadingNote"),
			readingId: v.id("readings"),
		}),
	),
});

export const grammaticalRelationProjectionValidator = v.object({
	relation: v.union(
		v.literal("CaseCounterpart"),
		v.literal("PersonCounterpart"),
		v.literal("NumberCounterpart"),
	),
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
	target: v.object({
		kind: v.literal("UnitReadingNote"),
		readingId: v.id("readings"),
	}),
});

export type GrammaticalRelationProjection<ReadingId extends string = string> = {
	readonly relation: GrammaticalRelation;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
	readonly target: {
		readonly kind: "UnitReadingNote";
		readonly readingId: ReadingId;
	};
};

export type RelationFingerprintProjection =
	| {
			readonly relation: SemanticRelation;
			readonly targetKind?: "lemma";
			readonly targetLemmaKey: string;
			readonly targetReadingKey?: never;
			readonly targetCanonicalForm: string;
			readonly provenance: "direct" | "inferred";
	  }
	| {
			readonly relation: SemanticRelation;
			readonly targetKind: "reading";
			readonly targetReadingKey: string;
			readonly targetLemmaKey?: never;
			readonly targetCanonicalForm: string;
			readonly provenance: "direct" | "inferred";
	  };

export type RelationProjection<
	LemmaId extends string = string,
	ReadingId extends string = string,
> = {
	readonly relation: SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
	readonly target:
		| {
				readonly kind: "RouteNote";
				readonly routeKind: "Lemma";
				readonly id: LemmaId;
		  }
		| { readonly kind: "UnitReadingNote"; readonly readingId: ReadingId };
};

export function flattenDirectSemanticRelations(
	semanticRelationsValue: unknown,
): RelationFingerprintProjection[] {
	const semanticRelations = optionalRecord(semanticRelationsValue);
	if (!semanticRelations) return [];
	const readingMode = semanticRelations.targetKind === "reading";

	return semanticRelationValues
		.flatMap((relation) => {
			const targets = semanticRelations[relation];
			if (!Array.isArray(targets)) return [];
			return targets.flatMap(
				(target): RelationFingerprintProjection[] => {
					const targetRecord = optionalRecord(target);
					const lemma = readingMode
						? optionalRecord(targetRecord?.lemma)
						: targetRecord;
					const targetCanonicalForm = optionalNonEmptyString(
						lemma?.canonicalForm,
					);
					if (readingMode && targetCanonicalForm && targetRecord) {
						return [
							{
								relation,
								targetKind: "reading",
								targetReadingKey: readingFingerprint(
									targetRecord as unknown as ReadingReference,
								),
								targetCanonicalForm,
								provenance: "direct",
							},
						];
					}
					return targetCanonicalForm && lemma
						? [
								{
									relation,
									targetLemmaKey: lemmaIdentityKey(lemma),
									targetCanonicalForm,
									provenance: "direct",
								},
							]
						: [];
				},
			);
		})
		.slice(0, MAX_RELATIONS_PER_NOTE);
}

export function projectResolvedRelationTargets<LemmaId extends string>(
	relations: readonly RelationFingerprintProjection[],
	targetLemmas: readonly {
		readonly lemmaKey: string;
		readonly lemmaId: LemmaId;
	}[],
): RelationProjection<LemmaId>[] {
	const lemmaIdByKey = new Map(
		targetLemmas.map(({ lemmaKey, lemmaId }) => [lemmaKey, lemmaId]),
	);
	return relations.flatMap(
		({ targetLemmaKey, ...relation }): RelationProjection<LemmaId>[] => {
			if (relation.targetKind === "reading" || !targetLemmaKey) return [];
			const lemmaId = lemmaIdByKey.get(targetLemmaKey);
			return lemmaId
				? [
						{
							...relation,
							target: {
								kind: "RouteNote",
								routeKind: "Lemma",
								id: lemmaId,
							},
						},
					]
				: [];
		},
	);
}

type RelationNeighborhood = {
	readings: Map<Id<"readings">, Doc<"readings">>;
	lemmas: Map<Id<"lemmas">, Doc<"lemmas">>;
	edges: Map<Id<"semanticRelationEdges">, Doc<"semanticRelationEdges">>;
};

type TargetedRelationProjection =
	| {
			relation: SemanticRelation;
			targetKind: "lemma";
			targetLemma: Lemma<"de">;
			provenance: "direct" | "inferred";
	  }
	| {
			relation: SemanticRelation;
			targetKind: "reading";
			targetReading: Reading<"de">;
			provenance: "direct" | "inferred";
	  };

function parseStoredGermanLemma(lemma: Doc<"lemmas">): Lemma<"de"> {
	return parseGermanLemma({
		language: lemma.language,
		family: lemma.family,
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
		coreFeatures: lemma.coreFeatures,
	});
}

async function loadTargetedRelationProjections(
	ctx: QueryCtx,
	source: Doc<"readings">,
): Promise<TargetedRelationProjection[]> {
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

	function rememberEdge(edge: Doc<"semanticRelationEdges">): void {
		neighborhood.edges.set(edge._id, edge);
		if (neighborhood.edges.size > MAX_RELATION_NEIGHBORHOOD_EDGES) {
			throw new Error(
				`A Reading Note relation neighborhood supports at most ${MAX_RELATION_NEIGHBORHOOD_EDGES} direct edges.`,
			);
		}
	}

	async function rememberReading(readingId: Id<"readings">) {
		const known = neighborhood.readings.get(readingId);
		if (known) return known;
		const reading = await ctx.db.get(readingId);
		if (!reading) return null;
		neighborhood.readings.set(readingId, reading);
		if (neighborhood.readings.size > MAX_RELATION_NEIGHBORHOOD_READINGS) {
			throw new Error(
				`A Reading Note relation neighborhood supports at most ${MAX_RELATION_NEIGHBORHOOD_READINGS} Readings.`,
			);
		}
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
		if (rows.length > MAX_RELATION_NEIGHBORHOOD_READINGS) {
			throw new Error(
				`A relation target Lemma supports at most ${MAX_RELATION_NEIGHBORHOOD_READINGS} Readings in one note projection.`,
			);
		}
		for (const reading of rows) {
			neighborhood.readings.set(reading._id, reading);
		}
		if (neighborhood.readings.size > MAX_RELATION_NEIGHBORHOOD_READINGS) {
			throw new Error(
				`A Reading Note relation neighborhood supports at most ${MAX_RELATION_NEIGHBORHOOD_READINGS} Readings.`,
			);
		}
		readingsByLemma.set(lemmaId, rows);
		return rows;
	}

	async function loadOutgoing(readingId: Id<"readings">) {
		const known = outgoingByReading.get(readingId);
		if (known) return known;
		const rows = await ctx.db
			.query("semanticRelationEdges")
			.withIndex("by_source_reading_id", (q) =>
				q.eq("sourceReadingId", readingId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1);
		if (rows.length > MAX_RELATIONS_PER_NOTE) {
			throw new Error(
				`A Reading supports at most ${MAX_RELATIONS_PER_NOTE} outgoing relations in one note projection.`,
			);
		}
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
			.take(MAX_RELATIONS_PER_NOTE + 1);
		if (rows.length > MAX_RELATIONS_PER_NOTE) {
			throw new Error(
				`A Reading supports at most ${MAX_RELATIONS_PER_NOTE} incoming relations in one note projection.`,
			);
		}
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
			.take(MAX_RELATIONS_PER_NOTE + 1);
		if (rows.length > MAX_RELATIONS_PER_NOTE) {
			throw new Error(
				`A Lemma supports at most ${MAX_RELATIONS_PER_NOTE} incoming relations in one note projection.`,
			);
		}
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
				rememberEdge(edge);
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
			rememberEdge(edge);
			await rememberReading(edge.sourceReadingId);
			targetSeeds.add(edge.sourceReadingId);
			for (const target of await targetReadings(edge)) {
				targetSeeds.add(target._id);
			}
		}
	}
	await expandSynonymComponent([...targetSeeds]);

	for (const reading of neighborhood.readings.values()) {
		await rememberLemma(reading.lemmaId);
	}
	const graphReadings = [...neighborhood.readings.values()].flatMap(
		(reading) => {
			const lemma = neighborhood.lemmas.get(reading.lemmaId);
			if (!lemma) return [];
			const outgoing = outgoingByReading.get(reading._id) ?? [];
			return [
				{
					reading: reading.readingKey,
					lemma: lemma.lemmaKey,
					relationTargetKind: outgoing.some(
						(edge) =>
							edge.targetKind === "reading" ||
							edge.targetReadingId !== undefined,
					)
						? ("reading" as const)
						: ("lemma" as const),
				},
			];
		},
	);
	const graphEdges = [...neighborhood.edges.values()].flatMap(
		(edge): DirectSemanticRelationGraphEdge[] => {
			const sourceReading = neighborhood.readings.get(
				edge.sourceReadingId,
			);
			if (!sourceReading) return [];
			if (edge.targetKind === "reading" || edge.targetReadingId) {
				if (edge.relation !== "synonym") return [];
				const target = edge.targetReadingId
					? neighborhood.readings.get(edge.targetReadingId)
					: undefined;
				return target
					? [
							{
								sourceReading: sourceReading.readingKey,
								relation: edge.relation,
								targetKind: "reading",
								targetReading: target.readingKey,
							},
						]
					: [];
			}
			const target = edge.targetLemmaId
				? neighborhood.lemmas.get(edge.targetLemmaId)
				: undefined;
			return target
				? [
						{
							sourceReading: sourceReading.readingKey,
							relation: edge.relation,
							targetLemma: target.lemmaKey,
						},
					]
				: [];
		},
	);
	const readingByKey = new Map(
		[...neighborhood.readings.values()].map((reading) => [
			reading.readingKey,
			reading,
		]),
	);
	const lemmaByKey = new Map(
		[...neighborhood.lemmas.values()].map((lemma) => [
			lemma.lemmaKey,
			lemma,
		]),
	);
	return projectRelations({ readings: [...graphReadings], edges: graphEdges })
		.filter((projection) => projection.sourceReading === source.readingKey)
		.flatMap((projection): TargetedRelationProjection[] => {
			if (projection.targetKind === "reading") {
				const targetReading = readingByKey.get(
					projection.targetReading,
				);
				const targetLemma = targetReading
					? neighborhood.lemmas.get(targetReading.lemmaId)
					: undefined;
				return targetReading && targetLemma
					? [
							{
								relation: projection.relation,
								targetKind: "reading" as const,
								targetReading: parseGermanReading({
									lemma: parseStoredGermanLemma(targetLemma),
									emojiDescription:
										targetReading.emojiDescription,
								}),
								provenance: projection.provenance,
							},
						]
					: [];
			}
			const targetLemma = lemmaByKey.get(projection.targetLemma);
			return targetLemma
				? [
						{
							relation: projection.relation,
							targetKind: "lemma" as const,
							targetLemma: parseStoredGermanLemma(targetLemma),
							provenance: projection.provenance,
						},
					]
				: [];
		});
}

export async function loadRelationProjections(
	ctx: QueryCtx,
	readingId: Id<"readings">,
) {
	const source = await ctx.db.get(readingId);
	if (!source) return { fingerprints: [], knowledge: {}, resolved: [] };
	const projections = await loadTargetedRelationProjections(ctx, source);
	if (projections.length > MAX_RELATIONS_PER_NOTE) {
		throw new Error(
			`A Reading Note supports at most ${MAX_RELATIONS_PER_NOTE} Semantic Relations.`,
		);
	}
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
	const fingerprints: RelationFingerprintProjection[] = [];
	const resolved: RelationProjection<Id<"lemmas">, Id<"readings">>[] = [];
	const knowledge: ProjectedSemanticRelations<
		LemmaReference,
		ReadingReference
	> = readingMode ? { targetKind: "reading" } : {};
	for (const [index, projection] of projections.entries()) {
		const targetDoc = targetDocs[index];
		if (!targetDoc) continue;
		if (projection.targetKind === "reading") {
			if (
				!("readingKey" in targetDoc) ||
				knowledge.targetKind !== "reading"
			)
				continue;
			fingerprints.push({
				relation: projection.relation,
				targetKind: "reading",
				targetReadingKey: targetDoc.readingKey,
				targetCanonicalForm:
					projection.targetReading.lemma.canonicalForm,
				provenance: projection.provenance,
			});
			resolved.push({
				relation: projection.relation,
				targetCanonicalForm:
					projection.targetReading.lemma.canonicalForm,
				provenance: projection.provenance,
				target: {
					kind: "UnitReadingNote",
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
		const target = parseGermanLemma({
			language: targetDoc.language,
			family: targetDoc.family,
			kind: targetDoc.kind,
			canonicalForm: targetDoc.canonicalForm,
			coreFeatures: targetDoc.coreFeatures,
		});
		fingerprints.push({
			relation: projection.relation,
			targetLemmaKey: targetDoc.lemmaKey,
			targetCanonicalForm: targetDoc.canonicalForm,
			provenance: projection.provenance,
		});
		resolved.push({
			relation: projection.relation,
			targetCanonicalForm: targetDoc.canonicalForm,
			provenance: projection.provenance,
			target: {
				kind: "RouteNote",
				routeKind: "Lemma",
				id: targetDoc._id,
			},
		});
		const bucket = knowledge[projection.relation];
		if (bucket) bucket.push(target);
		else knowledge[projection.relation] = [target];
	}
	return { fingerprints, knowledge, resolved };
}

export async function loadGrammaticalRelationProjections(
	ctx: QueryCtx,
	readingId: Id<"readings">,
): Promise<GrammaticalRelationProjection<Id<"readings">>[]> {
	const [outgoing, incoming] = await Promise.all([
		ctx.db
			.query("grammaticalRelationEdges")
			.withIndex("by_source_reading_id", (q) =>
				q.eq("sourceReadingId", readingId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1),
		ctx.db
			.query("grammaticalRelationEdges")
			.withIndex("by_target_reading_id", (q) =>
				q.eq("targetReadingId", readingId),
			)
			.take(MAX_RELATIONS_PER_NOTE + 1),
	]);
	const candidates = [
		...outgoing.map((edge) => ({
			relation: edge.relation,
			targetReadingId: edge.targetReadingId,
			provenance: "direct" as const,
		})),
		...incoming.map((edge) => ({
			relation: edge.relation,
			targetReadingId: edge.sourceReadingId,
			provenance: "inferred" as const,
		})),
	];
	if (candidates.length > MAX_RELATIONS_PER_NOTE) {
		throw new Error(
			`A Reading Note supports at most ${MAX_RELATIONS_PER_NOTE} Grammatical Relations.`,
		);
	}
	const targetDocs = await Promise.all(
		candidates.map(({ targetReadingId }) =>
			targetReadingId ? ctx.db.get(targetReadingId) : null,
		),
	);
	const targetLemmas = await Promise.all(
		targetDocs.map((target) =>
			target ? ctx.db.get(target.lemmaId) : Promise.resolve(null),
		),
	);
	const unique = new Map<
		string,
		GrammaticalRelationProjection<Id<"readings">>
	>();
	for (const [index, candidate] of candidates.entries()) {
		const targetLemma = targetLemmas[index];
		if (!candidate.targetReadingId || !targetLemma) continue;
		const projection: GrammaticalRelationProjection<Id<"readings">> = {
			relation: candidate.relation,
			targetCanonicalForm: targetLemma.canonicalForm,
			provenance: candidate.provenance,
			target: {
				kind: "UnitReadingNote",
				readingId: candidate.targetReadingId,
			},
		};
		const key = `${projection.relation}:${projection.target.readingId}`;
		const current = unique.get(key);
		if (!current || projection.provenance === "direct") {
			unique.set(key, projection);
		}
	}
	return [...unique.values()].sort((left, right) =>
		`${left.relation}:${left.targetCanonicalForm}:${left.target.readingId}`.localeCompare(
			`${right.relation}:${right.targetCanonicalForm}:${right.target.readingId}`,
		),
	);
}

function optionalRecord(value: unknown): UnknownRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function optionalNonEmptyString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}
