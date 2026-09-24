import type { PendingSemanticRelationRecord } from "dumdict/pending";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../../server/linguisticIdentity";
import { parseGermanReading } from "../../server/operationalParsing";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { pendingRecordLocatorIndexKey } from "../model/dumdictPendingIndexes";
import {
	lemmaValue,
	readingValue,
	surfaceValue,
} from "../model/occurrenceAttestations";
import {
	type AnyRecord,
	applyTrustedReadingKnowledgeChange,
	requireRecord,
	requireString,
	withoutKeys,
} from "../model/readingKnowledge";

export const STATE_KEY = "global" as const;
export const MAX_PLANNED_CHANGES = 50;
export const MAX_PATCH_OPS = 50;
export const MAX_READING_CANDIDATES = 40;
export const MAX_CONTEXT_KEYS = 50;
export const MAX_PENDING_RELATIONS_PER_SLICE = 100;
const MAX_CLEANUP_CANDIDATE_LEMMAS = 100;
const MAX_RELATION_NEIGHBOURHOOD_LEMMAS = 100;
const MAX_RELATION_NEIGHBOURHOOD_READINGS = 200;
export const MAX_RELATIONS_PER_READING = 200;
const directSemanticRelations = new Set<string>(directSemanticRelationValues);

export type ServerCtx = QueryCtx | MutationCtx;
export type CompactReadingEntry = AnyRecord & {
	reading: unknown;
	knowledge?: AnyRecord;
};

export function revisionString(revision: number): string {
	return `convex-${revision}`;
}

export async function getState(ctx: ServerCtx) {
	return ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", STATE_KEY))
		.unique();
}

export async function currentRevision(ctx: ServerCtx): Promise<string> {
	return revisionString((await getState(ctx))?.revision ?? 0);
}

/** The one place dictionary writes advance the revision readers compare against. */
export async function bumpDictionaryRevision(
	ctx: MutationCtx,
): Promise<string> {
	const state = await getState(ctx);
	const next = (state?.revision ?? 0) + 1;
	if (state) await ctx.db.patch(state._id, { revision: next });
	else
		await ctx.db.insert("dictionaryState", {
			key: STATE_KEY,
			revision: next,
		});
	return revisionString(next);
}

export function assertLemmaRecordHasNoKnowledge(record: AnyRecord): void {
	if (record.knowledge !== undefined) {
		throw new Error("Lemma Records cannot contain Knowledge.");
	}
}

export function readingIdentityKey(value: unknown): string {
	return readingFingerprint(parseGermanReading(value));
}

export function requireDirectSemanticRelation(
	value: unknown,
): Dumrel.DirectSemanticRelation {
	const relation = requireString(value, "Semantic Relation");
	if (!directSemanticRelations.has(relation)) {
		throw new Error(`Unsupported direct Semantic Relation: ${relation}`);
	}
	return relation as Dumrel.DirectSemanticRelation;
}

export function withoutSemanticRelationTargets(value: unknown): unknown {
	const knowledge =
		value === undefined
			? undefined
			: requireRecord(value, "Reading Knowledge");
	if (!knowledge) return undefined;
	const result = withoutKeys(knowledge, ["semanticRelations"]);
	const relations = knowledge.semanticRelations;
	if (
		relations &&
		typeof relations === "object" &&
		Reflect.get(relations, "targetKind") === "reading"
	)
		result.semanticRelations = { targetKind: "reading" };
	return Object.keys(result).length === 0 ? undefined : result;
}

export function applyReadingKnowledgeChange(
	entry: CompactReadingEntry,
	envelopeValue: unknown,
): CompactReadingEntry {
	const envelope = requireRecord(
		envelopeValue,
		"Reading Knowledge Change envelope",
	);
	if (
		readingIdentityKey(envelope.reading) !==
		readingIdentityKey(entry.reading)
	) {
		throw new Error(
			"Knowledge Change Reading does not match the patched Reading Entry.",
		);
	}
	const change = requireRecord(
		envelope.change,
		"Reading Knowledge Change value",
	);
	const knowledge = applyTrustedReadingKnowledgeChange(
		entry.reading,
		entry.knowledge,
		change,
	);
	const withoutKnowledge = withoutKeys(entry, ["knowledge"]);
	return Object.keys(knowledge).length === 0
		? (withoutKnowledge as CompactReadingEntry)
		: ({ ...withoutKnowledge, knowledge } as CompactReadingEntry);
}

export function pendingLocatorKey(recordValue: unknown): string {
	const record = requireRecord(recordValue, "Pending Semantic Relation");
	return pendingRecordLocatorIndexKey(
		record as unknown as PendingSemanticRelationRecord<Dumling.Language>,
	);
}

export function uniqueBoundedKeys(
	values: readonly string[],
	context: string,
): string[] {
	if (values.length > MAX_CONTEXT_KEYS) {
		throw new Error(
			`${context} supports at most ${MAX_CONTEXT_KEYS} raw keys.`,
		);
	}
	const unique = [...new Set(values)];
	return unique;
}

export function assertPlanBudget(
	estimatedChanges: number,
	context: string,
): void {
	if (estimatedChanges > MAX_PLANNED_CHANGES) {
		throw new Error(
			`${context} can produce at most ${MAX_PLANNED_CHANGES} planned changes; this request can produce ${estimatedChanges}.`,
		);
	}
}

export async function findCanonicalLemma(ctx: ServerCtx, lemma: unknown) {
	return ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) =>
			q.eq("lemmaKey", lemmaIdentityKey(lemma)),
		)
		.unique();
}

export async function findLemma(ctx: ServerCtx, lemma: unknown) {
	const canonical = await findCanonicalLemma(ctx, lemma);
	if (!canonical) return null;
	const dictionary = await ctx.db
		.query("dictionaryLemmas")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", canonical._id))
		.unique();
	return dictionary ? { canonical, dictionary } : null;
}

export async function findLemmaByKey(ctx: ServerCtx, lemmaKey: string) {
	const canonical = await ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
		.unique();
	if (!canonical) return null;
	const dictionary = await ctx.db
		.query("dictionaryLemmas")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", canonical._id))
		.unique();
	return dictionary ? { canonical, dictionary } : null;
}

export async function findCanonicalReading(
	ctx: ServerCtx,
	readingInput: unknown,
) {
	const reading = requireRecord(readingInput, "Reading");
	const emojiDescription = requireString(
		reading.emojiDescription,
		"Reading emojiDescription",
	);
	return ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) =>
			q.eq(
				"readingKey",
				readingFingerprint({
					unitKind: "Reading",
					lemma: reading.lemma,
					emojiDescription,
				} as Dumling.Reading),
			),
		)
		.unique();
}

export async function findReading(ctx: ServerCtx, readingInput: unknown) {
	const canonical = await findCanonicalReading(ctx, readingInput);
	return canonical ? loadReading(ctx, canonical) : null;
}

export async function findReadingByKey(ctx: ServerCtx, readingKey: string) {
	const canonical = await ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) => q.eq("readingKey", readingKey))
		.unique();
	return canonical ? loadReading(ctx, canonical) : null;
}

export async function loadReading(
	ctx: ServerCtx,
	canonical: Awaited<ReturnType<typeof findCanonicalReading>> & {},
) {
	if (!canonical) return null;
	const [entry, lemma] = await Promise.all([
		ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) => q.eq("readingId", canonical._id))
			.unique(),
		ctx.db.get(canonical.lemmaId),
	]);
	if (!entry || !lemma) return null;
	const record = requireRecord(entry.record, "Reading Entry record");
	const knowledge = await loadCanonicalReadingKnowledge(
		ctx,
		canonical._id,
		record.knowledge,
	);
	return {
		...canonical,
		entry: {
			...withoutKeys(record, ["knowledge"]),
			...(knowledge === undefined ? {} : { knowledge }),
			reading: readingValue(canonical, lemma),
			attestations: [],
		},
		entryId: entry._id,
	};
}

export async function loadCanonicalReadingKnowledge(
	ctx: ServerCtx,
	readingId: Id<"readings">,
	storedKnowledge: unknown,
): Promise<AnyRecord | undefined> {
	const edges = await ctx.db
		.query("semanticRelationEdges")
		.withIndex("by_source_reading_id", (q) =>
			q.eq("sourceReadingId", readingId),
		)
		.take(MAX_RELATIONS_PER_READING + 1);
	if (edges.length > MAX_RELATIONS_PER_READING) {
		throw new Error(
			`A Reading supports at most ${MAX_RELATIONS_PER_READING} Semantic Relation edges.`,
		);
	}
	const targetKinds = new Set(
		edges.map((edge) =>
			edge.targetKind === "reading" || edge.targetReadingId !== undefined
				? "reading"
				: "lemma",
		),
	);
	if (targetKinds.size > 1)
		throw new Error(
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	const preserved = withoutSemanticRelationTargets(storedKnowledge);
	const previousRelations =
		preserved && typeof preserved === "object"
			? Reflect.get(preserved, "semanticRelations")
			: undefined;
	const targetKind =
		targetKinds.has("reading") ||
		previousRelations?.targetKind === "reading"
			? "reading"
			: "lemma";
	const semanticRelations: AnyRecord = {};
	if (targetKind === "reading") semanticRelations.targetKind = "reading";
	const resolvedTargets = await Promise.all(
		edges.map(async (edge) => {
			if (targetKind === "reading") {
				if (!edge.targetReadingId) return null;
				const targetReading = await ctx.db.get(edge.targetReadingId);
				if (!targetReading) return null;
				const targetLemma = await ctx.db.get(targetReading.lemmaId);
				return targetLemma
					? {
							edge,
							targetValue: readingValue(
								targetReading,
								targetLemma,
							),
						}
					: null;
			}
			if (!edge.targetLemmaId) return null;
			const targetLemma = await ctx.db.get(edge.targetLemmaId);
			return targetLemma
				? { edge, targetValue: lemmaValue(targetLemma) }
				: null;
		}),
	);
	for (const resolved of resolvedTargets) {
		if (!resolved) continue;
		const { edge, targetValue } = resolved;
		const bucket = (semanticRelations[edge.relation] ?? []) as unknown[];
		bucket.push(targetValue);
		semanticRelations[edge.relation] = bucket;
	}
	const base = withoutSemanticRelationTargets(storedKnowledge);
	const knowledge =
		base === undefined ? {} : requireRecord(base, "Reading Knowledge");
	if (Object.keys(semanticRelations).length > 0) {
		knowledge.semanticRelations = semanticRelations;
	}
	return Object.keys(knowledge).length === 0 ? undefined : knowledge;
}

/** Dictionary Lemmas a Unit Shadow with this canonical form could resolve to. */
export async function dictionaryLemmasWithCanonicalForm(
	ctx: ServerCtx,
	canonicalForm: string,
) {
	const lemmas = await ctx.db
		.query("lemmas")
		.withIndex("by_language_and_canonical_form", (q) =>
			q.eq("language", "de").eq("canonicalForm", canonicalForm),
		)
		.take(MAX_CLEANUP_CANDIDATE_LEMMAS + 1);
	if (lemmas.length > MAX_CLEANUP_CANDIDATE_LEMMAS)
		throw new Error(
			`Relation planning supports at most ${MAX_CLEANUP_CANDIDATE_LEMMAS} Lemmas per canonical form.`,
		);
	const memberships = await Promise.all(
		lemmas.map((lemma) =>
			ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
				.unique(),
		),
	);
	return lemmas.filter((_lemma, index) => memberships[index]);
}

/**
 * Loads the closed relation inventory one plan checks, not the whole
 * dictionary: the Readings and Lemmas its relations start from, their direct
 * targets, every dictionary Lemma a target Shadow's canonical form could
 * resolve to, and each loaded Reading's Lemma and own relation targets. A plan
 * that names no target reads nothing.
 */
export async function loadRelationNeighbourhood(
	ctx: ServerCtx,
	seeds: {
		readonly sourceReadingKeys?: readonly string[];
		readonly sourceLemmaKeys?: readonly string[];
		readonly targetReadingKeys?: readonly string[];
		readonly targetLemmaKeys?: readonly string[];
		readonly targetCanonicalForms: readonly string[];
	},
) {
	const targetReadingKeys = seeds.targetReadingKeys ?? [];
	const targetLemmaKeys = seeds.targetLemmaKeys ?? [];
	const lemmas = new Map<Id<"lemmas">, Doc<"lemmas">>();
	const readings = new Map<string, CompactReadingEntry>();
	if (
		targetReadingKeys.length +
			targetLemmaKeys.length +
			seeds.targetCanonicalForms.length ===
		0
	)
		return { lemmas: [], readings: [] };
	const addLemma = (lemma: Doc<"lemmas"> | null | undefined) => {
		if (!lemma || lemmas.has(lemma._id)) return;
		if (lemmas.size >= MAX_RELATION_NEIGHBOURHOOD_LEMMAS)
			throw new Error(
				`Relation planning supports at most ${MAX_RELATION_NEIGHBOURHOOD_LEMMAS} neighbourhood Lemmas.`,
			);
		lemmas.set(lemma._id, lemma);
	};
	const [keyed, byForm] = await Promise.all([
		Promise.all(
			[
				...new Set([
					...(seeds.sourceLemmaKeys ?? []),
					...targetLemmaKeys,
				]),
			].map((key) => findLemmaByKey(ctx, key)),
		),
		Promise.all(
			uniqueBoundedKeys(
				seeds.targetCanonicalForms,
				"Relation neighbourhood Shadow loading",
			).map((form) => dictionaryLemmasWithCanonicalForm(ctx, form)),
		),
	]);
	for (const lemma of keyed) addLemma(lemma?.canonical);
	for (const lemma of byForm.flat()) addLemma(lemma);
	let frontier = [
		...new Set([...(seeds.sourceReadingKeys ?? []), ...targetReadingKeys]),
	];
	while (frontier.length > 0) {
		const loaded = await Promise.all(
			frontier.map((key) => findReadingByKey(ctx, key)),
		);
		const next = new Set<string>();
		const lemmaLoads: Promise<Doc<"lemmas"> | null>[] = [];
		for (const reading of loaded) {
			if (!reading || readings.has(reading.readingKey)) continue;
			if (readings.size >= MAX_RELATION_NEIGHBOURHOOD_READINGS)
				throw new Error(
					`Relation planning supports at most ${MAX_RELATION_NEIGHBOURHOOD_READINGS} neighbourhood Readings.`,
				);
			readings.set(reading.readingKey, reading.entry);
			lemmaLoads.push(ctx.db.get(reading.lemmaId));
			const relations = optionalRecord(
				optionalRecord(reading.entry.knowledge)?.semanticRelations,
			);
			for (const [relation, targets] of Object.entries(relations ?? {}))
				if (relation !== "targetKind" && Array.isArray(targets))
					for (const target of targets)
						if (relations?.targetKind === "reading")
							next.add(readingIdentityKey(target));
						else lemmaLoads.push(findCanonicalLemma(ctx, target));
		}
		for (const lemma of await Promise.all(lemmaLoads)) addLemma(lemma);
		frontier = [...next].filter((key) => !readings.has(key));
	}
	return {
		lemmas: [...lemmas.values()].map((lemma) => ({
			lemma: lemmaValue(lemma),
		})),
		readings: [...readings.values()],
	};
}

function optionalRecord(value: unknown): AnyRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as AnyRecord)
		: undefined;
}

export async function findCanonicalSurface(ctx: ServerCtx, surfaceKey: string) {
	return ctx.db
		.query("surfaces")
		.withIndex("by_surface_key", (q) => q.eq("surfaceKey", surfaceKey))
		.unique();
}

export async function findSurface(ctx: ServerCtx, surfaceKey: string) {
	const canonical = await findCanonicalSurface(ctx, surfaceKey);
	if (!canonical) return null;
	const [entry, lemma] = await Promise.all([
		ctx.db
			.query("ownedSurfaces")
			.withIndex("by_surface_id", (q) => q.eq("surfaceId", canonical._id))
			.unique(),
		ctx.db.get(canonical.lemmaId),
	]);
	if (!entry || !lemma) return null;
	return {
		...canonical,
		entry: {
			...requireRecord(entry.record, "Owned Surface record"),
			id: canonical.surfaceKey,
			ownerLemma: lemmaValue(lemma),
			surface: surfaceValue(canonical, lemma),
			attestations: [],
		},
		entryId: entry._id,
	};
}

export async function findPending(ctx: ServerCtx, record: unknown) {
	return ctx.db
		.query("pendingSemanticRelations")
		.withIndex("by_locator_key", (q) =>
			q.eq("locatorKey", pendingLocatorKey(record)),
		)
		.unique();
}
