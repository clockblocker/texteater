import { v } from "convex/values";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { foldedCanonicalForm } from "../../../server/linguisticIdentity";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
	parsePendingShadowDescriptor,
	parseStoredShadowDescriptor,
	parseStructuralShadowReferences,
	type ShadowDescriptor,
	shadowIsCompatible,
	structuralShadowLocatorKey,
	warnMalformedStoredRow,
} from "../../model/shadows";
import {
	type StructuralShadowAspect,
	semanticRelationValidator,
	structuralShadowAspectValidator,
} from "../../model/validators";
import {
	featureProjectionValidator,
	projectFeaturesForPresentation,
} from "./featurePresentation";
import { projectPendingRelations } from "./pendingRelations";
import {
	isUnitReadingFamily,
	type UnitReadingFamily,
	unitReadingEmojiDescription,
} from "./unitReadingFamilies";

const SHADOW_REFERENCE_PAGE_SIZE = 50;
const MAX_SHADOW_CANDIDATE_LEMMAS = 100;

export const unitShadowProjectionValidator = v.object({
	language: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

/** One page of the Readings that refer to a Shadow, loaded apart from the Note body. */
export const shadowReferencePageValidator = v.object({
	page: v.array(
		v.object({
			reading: v.object({
				readingId: v.id("readings"),
				canonicalForm: v.string(),
				emojiDescription: v.string(),
				target: v.object({
					kind: v.literal("Reading"),
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
					aspect: structuralShadowAspectValidator,
					path: v.string(),
				}),
			),
		}),
	),
	continueCursor: v.string(),
	isDone: v.boolean(),
});

export const shadowNoteValidator = v.object({
	kind: v.literal("Shadow"),
	target: v.object({
		kind: v.literal("Shadow"),
		shadowId: v.id("shadows"),
	}),
	descriptor: unitShadowProjectionValidator,
	inspection: v.object({
		candidates: v.array(
			v.object({
				lemmaId: v.id("lemmas"),
				canonicalForm: v.string(),
				family: v.string(),
				kind: v.string(),
				coreFeatures: v.array(featureProjectionValidator),
				target: v.object({
					kind: v.literal("Lemma"),
					lemmaId: v.id("lemmas"),
				}),
			}),
		),
	}),
	references: shadowReferencePageValidator,
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
	const { family } = descriptor;
	if (!isUnitReadingFamily(family)) return { candidates: [] };
	const lemmas = await ctx.db
		.query("lemmas")
		.withIndex("by_shadow_descriptor", (q) =>
			q
				.eq("language", descriptor.language)
				.eq("foldedCanonicalForm", foldedCanonicalForm(descriptor))
				.eq("family", family)
				.eq("kind", descriptor.kind),
		)
		.take(MAX_SHADOW_CANDIDATE_LEMMAS + 1);
	if (lemmas.length > MAX_SHADOW_CANDIDATE_LEMMAS) {
		throw new Error(
			`Shadow inspection supports at most ${MAX_SHADOW_CANDIDATE_LEMMAS} matching Lemmas.`,
		);
	}

	const candidates = (
		await Promise.all(
			lemmas.map(async (lemma) => {
				const dictionaryLemma = await ctx.db
					.query("dictionaryLemmas")
					.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
					.unique();
				return dictionaryLemma ? lemma : null;
			}),
		)
	).flatMap(
		(
			lemma,
		): {
			lemmaId: Id<"lemmas">;
			canonicalForm: string;
			family: UnitReadingFamily;
			kind: Dumling.Kind;
			coreFeatures: { name: string; value: string }[];
			target: {
				kind: "Lemma";
				lemmaId: Id<"lemmas">;
			};
		}[] =>
			lemma
				? [
						{
							lemmaId: lemma._id,
							canonicalForm: lemma.canonicalForm,
							// The index matched these exactly.
							family,
							kind: descriptor.kind,
							coreFeatures: projectFeaturesForPresentation(
								lemma.coreFeatures,
							),
							target: {
								kind: "Lemma",
								lemmaId: lemma._id,
							},
						},
					]
				: [],
	);

	return {
		candidates: candidates.sort((left, right) =>
			`${left.canonicalForm}\0${left.family}\0${left.kind}\0${left.lemmaId}`.localeCompare(
				`${right.canonicalForm}\0${right.family}\0${right.kind}\0${right.lemmaId}`,
			),
		),
	};
}

async function loadCompatibleShadow(ctx: QueryCtx, shadowIdValue: string) {
	const shadowId = ctx.db.normalizeId("shadows", shadowIdValue);
	if (!shadowId) return null;
	const shadow = await ctx.db.get(shadowId);
	if (!shadow) return null;
	const parsed = parseStoredShadowDescriptor(shadow);
	if (!parsed.ok) {
		warnMalformedStoredRow("shadows", shadow._id, parsed.error);
		return null;
	}
	const descriptor = parsed.value;
	return shadowIsCompatible(shadow, descriptor)
		? { shadow, descriptor }
		: null;
}

/** The Shadow Note body with the first page of its references. */
export async function loadShadowNote(ctx: QueryCtx, shadowIdValue: string) {
	const compatible = await loadCompatibleShadow(ctx, shadowIdValue);
	if (!compatible) return null;
	const { shadow, descriptor } = compatible;
	const references = await loadShadowReferencePage(ctx, shadow);
	if (!references) return null;
	return {
		kind: "Shadow" as const,
		target: { kind: "Shadow" as const, shadowId: shadow._id },
		descriptor,
		inspection: await loadShadowInspection(ctx, descriptor),
		references,
	};
}

/** A later page of a Shadow's references; the body is not recomputed. */
export async function loadShadowNoteReferences(
	ctx: QueryCtx,
	shadowIdValue: string,
	cursor: string,
) {
	const compatible = await loadCompatibleShadow(ctx, shadowIdValue);
	return compatible
		? loadShadowReferencePage(ctx, compatible.shadow, cursor)
		: null;
}

type PendingReferenceRow = Pick<
	Doc<"pendingSemanticRelations">,
	| "_id"
	| "locatorKey"
	| "sourceReadingKey"
	| "targetFoldedCanonicalForm"
	| "shadowId"
	| "record"
>;
type StructuralReferenceRow = Pick<
	Doc<"structuralShadowReferences">,
	"ownerReadingKey" | "locatorKey" | "aspect" | "path"
>;

/** One page of a Shadow's reference rows, from one of its two tables. */
type ShadowReferenceRows = {
	readonly pendingRows: readonly PendingReferenceRow[];
	readonly structuralRows: readonly StructuralReferenceRow[];
	readonly continueCursor: string;
	readonly isDone: boolean;
};

/** An owner Reading's stored rows; null where a row is missing. */
type ShadowReferenceOwner = {
	readonly reading: Pick<Doc<"readings">, "_id" | "emojiDescription"> | null;
	readonly lemma: Pick<Doc<"lemmas">, "family" | "canonicalForm"> | null;
	readonly knowledge: Pick<
		Doc<"accumulatedKnowledge">,
		"_id" | "knowledge"
	> | null;
};

type ShadowReferenceGroup = {
	reading: {
		readingId: Id<"readings">;
		canonicalForm: string;
		emojiDescription: string;
		target: { kind: "Reading"; readingId: Id<"readings"> };
	};
	pendingRelations: {
		locatorKey: string;
		relation: Dumrel.SemanticRelation;
	}[];
	structuralReferences: { aspect: StructuralShadowAspect; path: string }[];
};

type WarnMalformedStoredRow = typeof warnMalformedStoredRow;

/** The stored Shadow a page's references must fit. */
type ShadowValue = Omit<Doc<"shadows">, "_creationTime">;

/**
 * One page of the Shadow's reference rows: its pending rows first, then its
 * structural rows, each table paged in turn. Null when it has neither.
 */
async function readShadowReferenceRows(
	ctx: QueryCtx,
	shadowId: Id<"shadows">,
	contextCursor?: string,
): Promise<ShadowReferenceRows | null> {
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
	if (cursor.kind === "pending") {
		const result = await ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
			.paginate({
				cursor: cursor.cursor,
				numItems: SHADOW_REFERENCE_PAGE_SIZE,
			});
		const continueCursor = !result.isDone
			? shadowReferenceCursor({
					kind: "pending",
					cursor: result.continueCursor,
				})
			: firstStructural.length > 0
				? shadowReferenceCursor({ kind: "structural", cursor: null })
				: "";
		return {
			pendingRows: result.page,
			structuralRows: [],
			continueCursor,
			isDone: result.isDone && firstStructural.length === 0,
		};
	}
	const result = await ctx.db
		.query("structuralShadowReferences")
		.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
		.paginate({
			cursor: cursor.cursor,
			numItems: SHADOW_REFERENCE_PAGE_SIZE,
		});
	return {
		pendingRows: [],
		structuralRows: result.page,
		continueCursor: result.isDone
			? ""
			: shadowReferenceCursor({
					kind: "structural",
					cursor: result.continueCursor,
				}),
		isDone: result.isDone,
	};
}

/** The Readings owning the page's rows, once each, in key order. */
function ownerReadingKeysOf(rows: ShadowReferenceRows): string[] {
	return [
		...new Set([
			...rows.pendingRows.map(({ sourceReadingKey }) => sourceReadingKey),
			...rows.structuralRows.map(
				({ ownerReadingKey }) => ownerReadingKey,
			),
		]),
	].sort();
}

/** Each owner Reading with its Lemma and Accumulated Knowledge, by Reading key. */
async function loadShadowReferenceOwners(
	ctx: QueryCtx,
	ownerReadingKeys: readonly string[],
): Promise<Map<string, ShadowReferenceOwner>> {
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
	return new Map(
		ownerReadingKeys.map((ownerReadingKey, index) => [
			ownerReadingKey,
			{
				reading: readings[index] ?? null,
				lemma: lemmas[index] ?? null,
				knowledge: accumulated[index] ?? null,
			},
		]),
	);
}

/**
 * The pending row's relation when it projects to exactly one relation for
 * this Shadow and its target descriptor fits the Shadow; null otherwise.
 */
function checkPendingRow(
	shadow: ShadowValue,
	row: PendingReferenceRow,
	warn: WarnMalformedStoredRow,
) {
	const projected = projectPendingRelations([row]);
	const pending = projected[0];
	const pendingDescriptor = parsePendingShadowDescriptor(row.record);
	if (!pendingDescriptor.ok) {
		warn("pendingSemanticRelations", row._id, pendingDescriptor.error);
		return null;
	}
	if (
		projected.length !== 1 ||
		!pending ||
		pending.target.shadowId !== shadow._id ||
		!shadowIsCompatible(shadow, pendingDescriptor.value)
	) {
		return null;
	}
	return { locatorKey: pending.locatorKey, relation: pending.relation };
}

/**
 * Whether the structural row's locator key is its own and its owner's
 * Knowledge still stores a reference there that fits the Shadow.
 */
function checkStructuralRow(
	shadow: ShadowValue,
	row: StructuralReferenceRow,
	knowledge: ShadowReferenceOwner["knowledge"],
	warn: WarnMalformedStoredRow,
): boolean {
	if (
		!knowledge ||
		row.locatorKey !==
			structuralShadowLocatorKey(
				row.ownerReadingKey,
				row.aspect,
				row.path,
			)
	) {
		return false;
	}
	const references = parseStructuralShadowReferences(knowledge.knowledge);
	if (!references.ok) {
		warn("accumulatedKnowledge", knowledge._id, references.error);
		return false;
	}
	const matchingReference =
		references.value.find(
			({ aspect, path }) => aspect === row.aspect && path === row.path,
		)?.descriptor ?? null;
	return (
		matchingReference !== null &&
		shadowIsCompatible(shadow, matchingReference)
	);
}

function sortedGroup(group: ShadowReferenceGroup): ShadowReferenceGroup {
	return {
		...group,
		pendingRelations: group.pendingRelations.sort((left, right) =>
			left.locatorKey.localeCompare(right.locatorKey),
		),
		structuralReferences: group.structuralReferences.sort((left, right) =>
			`${left.aspect}:${left.path}`.localeCompare(
				`${right.aspect}:${right.path}`,
			),
		),
	};
}

/**
 * The page of a Shadow's references grouped by owner Reading, in Reading key
 * order. Null when an owner Reading or its Unit Lemma is missing, or any row
 * no longer matches the Shadow; a malformed stored row is also warned about.
 */
export function buildShadowReferencePage(
	shadow: ShadowValue,
	rows: ShadowReferenceRows,
	owners: ReadonlyMap<string, ShadowReferenceOwner>,
	warn: WarnMalformedStoredRow = warnMalformedStoredRow,
) {
	const groups = new Map<string, ShadowReferenceGroup>();
	for (const ownerReadingKey of ownerReadingKeysOf(rows)) {
		const { reading, lemma } = owners.get(ownerReadingKey) ?? {};
		if (!reading || !lemma || !isUnitReadingFamily(lemma.family)) {
			return null;
		}
		groups.set(ownerReadingKey, {
			reading: {
				readingId: reading._id,
				canonicalForm: lemma.canonicalForm,
				emojiDescription: unitReadingEmojiDescription(reading),
				target: { kind: "Reading", readingId: reading._id },
			},
			pendingRelations: [],
			structuralReferences: [],
		});
	}
	for (const row of rows.pendingRows) {
		const relation = checkPendingRow(shadow, row, warn);
		const group = groups.get(row.sourceReadingKey);
		if (!relation || !group) return null;
		group.pendingRelations.push(relation);
	}
	for (const row of rows.structuralRows) {
		const group = groups.get(row.ownerReadingKey);
		const knowledge = owners.get(row.ownerReadingKey)?.knowledge ?? null;
		if (!group || !checkStructuralRow(shadow, row, knowledge, warn)) {
			return null;
		}
		group.structuralReferences.push({ aspect: row.aspect, path: row.path });
	}
	return {
		page: [...groups.values()].map(sortedGroup),
		continueCursor: rows.continueCursor,
		isDone: rows.isDone,
	};
}

/**
 * One page of the Readings that refer to the Shadow, grouped by Reading.
 * Null when the Shadow has no references or a reference no longer matches.
 */
async function loadShadowReferencePage(
	ctx: QueryCtx,
	shadow: Doc<"shadows">,
	contextCursor?: string,
) {
	const rows = await readShadowReferenceRows(ctx, shadow._id, contextCursor);
	if (!rows) return null;
	const owners = await loadShadowReferenceOwners(
		ctx,
		ownerReadingKeysOf(rows),
	);
	return buildShadowReferencePage(shadow, rows, owners);
}
