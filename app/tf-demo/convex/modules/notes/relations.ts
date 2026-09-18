import { v } from "convex/values";
import { selectGrammaticalAlternatives } from "dumgen/authored";
import type * as Dumling from "dumling/types";
import {
	directSemanticRelationValues,
	parseReadingKnowledge,
	projectSemanticRelations,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import { readingIdentityKey as readingFingerprint } from "../../../server/linguisticIdentity";

const semanticRelationValues = directSemanticRelationValues;

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
	),
	readingKey: v.string(),
	canonicalForm: v.string(),
});
export type GrammaticalAlternative = {
	readonly feature: "case" | "person" | "number";
	readonly readingKey: string;
	readonly canonicalForm: string;
};

export type RelationFingerprintProjection =
	| {
			readonly relation: Dumrel.SemanticRelation;
			readonly targetKind?: "lemma";
			readonly targetLemmaKey: string;
			readonly targetReadingKey?: never;
			readonly targetCanonicalForm: string;
			readonly provenance: "direct" | "inferred";
	  }
	| {
			readonly relation: Dumrel.SemanticRelation;
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
									targetRecord as unknown as Dumling.Reading,
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
								kind: "Lemma",
								lemmaId,
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
				if (!target)
					throw new Error(
						"Relation neighborhood has a missing target.",
					);
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
	const projected = projectSemanticRelations(entries);
	if (!projected.success) throw projected.error;
	return projected.value
		.filter((item) => readingFingerprint(item.source) === source.readingKey)
		.map(
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
		const target = parseGermanLemma({
			unitKind: "Lemma",
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
				kind: "Lemma",
				lemmaId: targetDoc._id,
			},
		});
		const bucket = knowledge[projection.relation];
		if (bucket) bucket.push(target);
		else knowledge[projection.relation] = [target];
	}
	return { fingerprints, knowledge, resolved };
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
export function reviewedAlternatives(lemma: Dumling.Lemma<"de">) {
	if (lemma.family !== "Lexeme" || lemma.kind !== "PRON") return [];
	try {
		return (["case", "person", "number"] as const).flatMap((feature) =>
			selectGrammaticalAlternatives({
				source: lemma,
				vary:
					feature === "number"
						? ["number", "referenceNumber"]
						: [feature],
			}).map((reading) => ({ feature, reading })),
		);
	} catch (error) {
		if (error instanceof Error && error.name === "InvalidInput") return [];
		throw error;
	}
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

export type PresentedRelations =
	| ({ targetKind?: "lemma" } & Partial<
			Record<Dumrel.SemanticRelation, Dumling.Lemma[]>
	  >)
	| ({ targetKind: "reading" } & Partial<
			Record<Dumrel.SemanticRelation, Dumling.Reading[]>
	  >);
