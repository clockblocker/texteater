import { v } from "convex/values";
import { projectSemanticRelations } from "dumdict";
import { readingFingerprint } from "dumling/reading";
import type {
	GrammaticalRelation,
	LemmaReference,
	ProjectedSemanticRelations,
	ReadingReference,
	SemanticRelation,
} from "dumrel";
import { semanticRelationValues } from "dumrel/vocabulary";

import { lemmaIdentityKey } from "../../../server/linguisticIdentity";
import { parseGermanLemma } from "../../../server/operationalParsing";
import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadRelationInventory } from "../../dumdictStorage";
import { semanticRelationValidator } from "../../model/validators";

const MAX_RELATIONS_PER_NOTE = 50;

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

export async function loadRelationProjections(
	ctx: QueryCtx,
	readingId: Id<"readings">,
) {
	const source = await ctx.db.get(readingId);
	if (!source) return { fingerprints: [], knowledge: {}, resolved: [] };
	const inventory = await loadRelationInventory(ctx);
	const projections = projectSemanticRelations<"de">(
		inventory as unknown as Parameters<
			typeof projectSemanticRelations<"de">
		>[0],
	).filter(
		(projection) =>
			readingFingerprint(projection.sourceReading) === source.readingKey,
	);
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
