import { v } from "convex/values";
import { projectSemanticRelations } from "dumdict";
import { readingFingerprint } from "dumling/reading";
import type {
	LemmaReference,
	ProjectedSemanticRelations,
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

export const relationFingerprintProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetLemmaKey: v.string(),
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
});

export const relationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
	target: v.object({
		kind: v.literal("RouteNote"),
		routeKind: v.literal("Lemma"),
		id: v.id("lemmas"),
	}),
});

export type RelationFingerprintProjection = {
	readonly relation: SemanticRelation;
	readonly targetLemmaKey: string;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
};

export type RelationProjection<LemmaId extends string = string> = {
	readonly relation: SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
	readonly target: {
		readonly kind: "RouteNote";
		readonly routeKind: "Lemma";
		readonly id: LemmaId;
	};
};

export function flattenDirectSemanticRelations(
	semanticRelationsValue: unknown,
): RelationFingerprintProjection[] {
	const semanticRelations = optionalRecord(semanticRelationsValue);
	if (!semanticRelations) return [];

	return semanticRelationValues
		.flatMap((relation) => {
			const targets = semanticRelations[relation];
			if (!Array.isArray(targets)) return [];
			return targets.flatMap(
				(target): RelationFingerprintProjection[] => {
					const lemma = optionalRecord(target);
					const targetCanonicalForm = optionalNonEmptyString(
						lemma?.canonicalForm,
					);
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
	const lemmas = await Promise.all(
		projections.map(({ targetLemma }) =>
			ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", lemmaIdentityKey(targetLemma)),
				)
				.unique(),
		),
	);
	const fingerprints = projections.flatMap((projection, index) => {
		const lemma = lemmas[index];
		return lemma
			? [
					{
						relation: projection.relation,
						targetLemmaKey: lemma.lemmaKey,
						targetCanonicalForm: lemma.canonicalForm,
						provenance: projection.provenance,
					},
				]
			: [];
	});
	const knowledge: ProjectedSemanticRelations<LemmaReference> = {};
	for (const [index, projection] of projections.entries()) {
		const lemma = lemmas[index];
		if (!lemma) continue;
		const target = parseGermanLemma({
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		});
		const existingTargets = knowledge[projection.relation];
		if (existingTargets) existingTargets.push(target);
		else knowledge[projection.relation] = [target];
	}
	return {
		fingerprints,
		knowledge,
		resolved: projectResolvedRelationTargets(
			fingerprints,
			lemmas.flatMap((lemma) =>
				lemma ? [{ lemmaKey: lemma.lemmaKey, lemmaId: lemma._id }] : [],
			),
		),
	};
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
