import { v } from "convex/values";
import type { SemanticRelation } from "dumrel";

import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
	collectStructuralShadowReferences,
	descriptorFromStoredShadow,
	pendingShadowDescriptor,
	type ShadowDescriptor,
	shadowIsCompatible,
	structuralShadowLocatorKey,
} from "../../model/shadows";
import { semanticRelationValidator } from "../../model/validators";
import {
	featureProjectionValidator,
	projectFeaturesForPresentation,
} from "./featurePresentation";
import { projectPendingRelations } from "./pendingRelations";
import { isUnitReadingFamily } from "./unitReadingFamilies";

const SHADOW_REFERENCE_PAGE_SIZE = 50;
const MAX_SHADOW_CANDIDATE_LEMMAS = 100;

const unitShadowProjectionValidator = v.object({
	language: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

export const shadowNoteValidator = v.object({
	kind: v.literal("ShadowNote"),
	target: v.object({
		kind: v.literal("ShadowNote"),
		shadowId: v.id("shadows"),
	}),
	descriptor: unitShadowProjectionValidator,
	inspection: v.object({
		revision: v.string(),
		candidates: v.array(
			v.object({
				lemmaId: v.id("lemmas"),
				canonicalForm: v.string(),
				family: v.string(),
				kind: v.string(),
				coreFeatures: v.array(featureProjectionValidator),
				target: v.object({
					kind: v.literal("RouteNote"),
					routeKind: v.literal("Lemma"),
					id: v.id("lemmas"),
				}),
			}),
		),
	}),
	references: v.object({
		page: v.array(
			v.object({
				reading: v.object({
					readingId: v.id("readings"),
					canonicalForm: v.string(),
					emojiDescription: v.string(),
					target: v.object({
						kind: v.literal("UnitReadingNote"),
						readingId: v.id("readings"),
					}),
				}),
				pendingRelations: v.array(
					v.object({
						locatorKey: v.string(),
						relation: semanticRelationValidator,
					}),
				),
				structuralReferences: v.array(
					v.object({
						aspect: v.union(
							v.literal("morphologicalTree"),
							v.literal("lexicalBreakdown"),
						),
						path: v.string(),
					}),
				),
			}),
		),
		continueCursor: v.string(),
		isDone: v.boolean(),
	}),
});

type ShadowReferenceCursor = {
	readonly kind: "pending" | "structural";
	readonly cursor: string | null;
};

function parseShadowReferenceCursor(value?: string): ShadowReferenceCursor {
	if (!value) return { kind: "pending", cursor: null };
	try {
		const parsed = JSON.parse(value) as Record<string, unknown>;
		if (
			(parsed.kind === "pending" || parsed.kind === "structural") &&
			(parsed.cursor === null || typeof parsed.cursor === "string")
		) {
			return { kind: parsed.kind, cursor: parsed.cursor };
		}
	} catch {
		// Fall through to the stable invalid-cursor error.
	}
	throw new Error("Invalid Shadow reference cursor.");
}

function shadowReferenceCursor(value: ShadowReferenceCursor): string {
	return JSON.stringify(value);
}

async function loadShadowInspection(
	ctx: QueryCtx,
	descriptor: ShadowDescriptor,
) {
	if (!isUnitReadingFamily(descriptor.family)) {
		const state = await ctx.db
			.query("dictionaryState")
			.withIndex("by_key", (q) => q.eq("key", "global"))
			.unique();
		return {
			revision: `convex-${state?.revision ?? 0}`,
			candidates: [],
		};
	}
	const [state, lemmas] = await Promise.all([
		ctx.db
			.query("dictionaryState")
			.withIndex("by_key", (q) => q.eq("key", "global"))
			.unique(),
		ctx.db
			.query("lemmas")
			.withIndex("by_shadow_descriptor", (q) =>
				q
					.eq("language", descriptor.language)
					.eq("canonicalForm", descriptor.canonicalForm)
					.eq("family", descriptor.family)
					.eq("kind", descriptor.kind),
			)
			.take(MAX_SHADOW_CANDIDATE_LEMMAS + 1),
	]);
	if (lemmas.length > MAX_SHADOW_CANDIDATE_LEMMAS) {
		throw new Error(
			`Shadow inspection supports at most ${MAX_SHADOW_CANDIDATE_LEMMAS} exactly matching Lemmas.`,
		);
	}

	const candidates: {
		lemmaId: Id<"lemmas">;
		canonicalForm: string;
		family: string;
		kind: string;
		coreFeatures: { name: string; value: string }[];
		target: {
			kind: "RouteNote";
			routeKind: "Lemma";
			id: Id<"lemmas">;
		};
	}[] = [];
	for (const lemma of lemmas) {
		const dictionaryLemma = await ctx.db
			.query("dictionaryLemmas")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.unique();
		if (!dictionaryLemma) continue;
		candidates.push({
			lemmaId: lemma._id,
			canonicalForm: lemma.canonicalForm,
			family: lemma.family,
			kind: lemma.kind,
			coreFeatures: projectFeaturesForPresentation(lemma.coreFeatures),
			target: {
				kind: "RouteNote",
				routeKind: "Lemma",
				id: lemma._id,
			},
		});
	}

	return {
		revision: `convex-${state?.revision ?? 0}`,
		candidates: candidates.sort((left, right) =>
			`${left.canonicalForm}\0${left.family}\0${left.kind}\0${left.lemmaId}`.localeCompare(
				`${right.canonicalForm}\0${right.family}\0${right.kind}\0${right.lemmaId}`,
			),
		),
	};
}

export async function loadShadowNote(
	ctx: QueryCtx,
	shadowIdValue: string,
	contextCursor?: string,
) {
	const shadowId = ctx.db.normalizeId("shadows", shadowIdValue);
	if (!shadowId) return null;
	const shadow = await ctx.db.get(shadowId);
	if (!shadow) return null;
	let descriptor: ShadowDescriptor;
	try {
		descriptor = descriptorFromStoredShadow(shadow);
		if (!shadowIsCompatible(shadow, descriptor)) return null;
	} catch {
		return null;
	}

	const [firstPending, firstStructural] = await Promise.all([
		ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.take(1),
		ctx.db
			.query("structuralShadowReferences")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.take(1),
	]);
	if (firstPending.length === 0 && firstStructural.length === 0) return null;

	const cursor = contextCursor
		? parseShadowReferenceCursor(contextCursor)
		: firstPending.length > 0
			? { kind: "pending" as const, cursor: null }
			: { kind: "structural" as const, cursor: null };
	let pendingRows: typeof firstPending = [];
	let structuralRows: typeof firstStructural = [];
	let continueCursor = "";
	let isDone = false;
	if (cursor.kind === "pending") {
		const result = await ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.paginate({
				cursor: cursor.cursor,
				numItems: SHADOW_REFERENCE_PAGE_SIZE,
			});
		pendingRows = result.page;
		if (!result.isDone) {
			continueCursor = shadowReferenceCursor({
				kind: "pending",
				cursor: result.continueCursor,
			});
		} else if (firstStructural.length > 0) {
			continueCursor = shadowReferenceCursor({
				kind: "structural",
				cursor: null,
			});
		} else isDone = true;
	} else {
		const result = await ctx.db
			.query("structuralShadowReferences")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.paginate({
				cursor: cursor.cursor,
				numItems: SHADOW_REFERENCE_PAGE_SIZE,
			});
		structuralRows = result.page;
		isDone = result.isDone;
		continueCursor = result.isDone
			? ""
			: shadowReferenceCursor({
					kind: "structural",
					cursor: result.continueCursor,
				});
	}

	const ownerReadingKeys = [
		...new Set([
			...pendingRows.map(({ sourceReadingKey }) => sourceReadingKey),
			...structuralRows.map(({ ownerReadingKey }) => ownerReadingKey),
		]),
	].sort();
	const readings = await Promise.all(
		ownerReadingKeys.map((ownerReadingKey) =>
			ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", ownerReadingKey),
				)
				.unique(),
		),
	);
	const [lemmas, accumulated] = await Promise.all([
		Promise.all(
			readings.map((reading) =>
				reading ? ctx.db.get(reading.lemmaId) : null,
			),
		),
		Promise.all(
			ownerReadingKeys.map((ownerReadingKey) =>
				ctx.db
					.query("accumulatedKnowledge")
					.withIndex("by_owner_reading_key", (q) =>
						q.eq("ownerReadingKey", ownerReadingKey),
					)
					.unique(),
			),
		),
	]);

	const ownerIndex = new Map(
		ownerReadingKeys.map((ownerReadingKey, index) => [
			ownerReadingKey,
			index,
		]),
	);
	const groups = new Map<
		string,
		{
			reading: {
				readingId: Id<"readings">;
				canonicalForm: string;
				emojiDescription: string;
				target: {
					kind: "UnitReadingNote";
					readingId: Id<"readings">;
				};
			};
			pendingRelations: {
				locatorKey: string;
				relation: SemanticRelation;
			}[];
			structuralReferences: {
				aspect: "morphologicalTree" | "lexicalBreakdown";
				path: string;
			}[];
		}
	>();
	for (const [index, ownerReadingKey] of ownerReadingKeys.entries()) {
		const reading = readings[index];
		const lemma = lemmas[index];
		if (!reading || !lemma || !isUnitReadingFamily(lemma.family)) {
			return null;
		}
		groups.set(ownerReadingKey, {
			reading: {
				readingId: reading._id,
				canonicalForm: lemma.canonicalForm,
				emojiDescription: reading.emojiDescription,
				target: {
					kind: "UnitReadingNote",
					readingId: reading._id,
				},
			},
			pendingRelations: [],
			structuralReferences: [],
		});
	}

	for (const row of pendingRows) {
		const projected = projectPendingRelations([row]);
		const pending = projected[0];
		const group = groups.get(row.sourceReadingKey);
		let pendingDescriptor: ShadowDescriptor;
		try {
			pendingDescriptor = pendingShadowDescriptor(row.record);
		} catch {
			return null;
		}
		if (
			projected.length !== 1 ||
			!pending ||
			!group ||
			pending.target.shadowId !== shadowId ||
			!shadowIsCompatible(shadow, pendingDescriptor)
		) {
			return null;
		}
		group.pendingRelations.push({
			locatorKey: pending.locatorKey,
			relation: pending.relation,
		});
	}

	for (const row of structuralRows) {
		const group = groups.get(row.ownerReadingKey);
		const index = ownerIndex.get(row.ownerReadingKey);
		const knowledge = index === undefined ? null : accumulated[index];
		if (
			!group ||
			!knowledge ||
			row.locatorKey !==
				structuralShadowLocatorKey(
					row.ownerReadingKey,
					row.aspect,
					row.path,
				)
		) {
			return null;
		}
		let matchingReference: ShadowDescriptor | null;
		try {
			matchingReference = collectStructuralReferenceAt(
				knowledge.knowledge,
				row.aspect,
				row.path,
			);
		} catch {
			return null;
		}
		if (
			!matchingReference ||
			!shadowIsCompatible(shadow, matchingReference)
		) {
			return null;
		}
		group.structuralReferences.push({
			aspect: row.aspect,
			path: row.path,
		});
	}

	return {
		kind: "ShadowNote" as const,
		target: { kind: "ShadowNote" as const, shadowId: shadow._id },
		descriptor,
		inspection: await loadShadowInspection(ctx, descriptor),
		references: {
			page: [...groups.values()].map((group) => ({
				...group,
				pendingRelations: group.pendingRelations.sort((left, right) =>
					left.locatorKey.localeCompare(right.locatorKey),
				),
				structuralReferences: group.structuralReferences.sort(
					(left, right) =>
						`${left.aspect}:${left.path}`.localeCompare(
							`${right.aspect}:${right.path}`,
						),
				),
			})),
			continueCursor,
			isDone,
		},
	};
}

function collectStructuralReferenceAt(
	knowledge: unknown,
	aspect: "morphologicalTree" | "lexicalBreakdown",
	path: string,
) {
	const references = collectStructuralShadowReferences(knowledge);
	return (
		references.find(
			(reference) =>
				reference.aspect === aspect && reference.path === path,
		)?.descriptor ?? null
	);
}
