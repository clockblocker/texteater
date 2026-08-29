import type { PendingSemanticRelationRecord } from "dumdict/pending";
import { type Reading, readingFingerprint } from "dumling/reading";
import type { SupportedLanguage } from "dumling/types";
import type { DirectSemanticRelation } from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";

import { lemmaIdentityKey } from "../../server/linguisticIdentity";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { pendingRecordLocatorIndexKey } from "../model/dumdictPendingIndexes";
import {
	lemmaValue,
	readingValue,
	surfaceValue,
} from "../model/occurrenceAttestations";

export const STATE_KEY = "global" as const;
export const MAX_PLANNED_CHANGES = 50;
export const MAX_PATCH_OPS = 50;
export const MAX_READING_CANDIDATES = 40;
export const MAX_CONTEXT_KEYS = 50;
export const MAX_PENDING_RELATIONS_PER_SLICE = 100;
export const MAX_CLEANUP_CANDIDATE_LEMMAS = 100;
export const MAX_RELATION_INVENTORY_LEMMAS = 100;
export const MAX_RELATION_INVENTORY_READINGS = 200;
export const MAX_RELATIONS_PER_READING = 200;
const directSemanticRelations = new Set<string>(directSemanticRelationValues);

export type ServerCtx = QueryCtx | MutationCtx;
export type AnyRecord = Record<string, unknown>;
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

/** Current revision for app-owned composition of an ordinary Dumdict plan. */
export async function loadDumdictRevision(ctx: ServerCtx): Promise<string> {
	return revisionString((await getState(ctx))?.revision ?? 0);
}

export async function currentRevision(ctx: ServerCtx): Promise<string> {
	return revisionString((await getState(ctx))?.revision ?? 0);
}

export function requireRecord(value: unknown, context: string): AnyRecord {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${context} must be an object.`);
	}
	return value as AnyRecord;
}

export function assertLemmaRecordHasNoKnowledge(record: AnyRecord): void {
	if (record.knowledge !== undefined) {
		throw new Error("Lemma Records cannot contain Knowledge.");
	}
}

export function requireString(value: unknown, context: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} must be a non-empty string.`);
	}
	return value;
}

export function readingIdentityKey(value: unknown): string {
	const reading = requireRecord(value, "Reading");
	return readingFingerprint({
		lemma: reading.lemma,
		emojiDescription: requireString(
			reading.emojiDescription,
			"Reading emojiDescription",
		),
	} as Reading);
}

export function requireDirectSemanticRelation(
	value: unknown,
): DirectSemanticRelation {
	const relation = requireString(value, "Semantic Relation");
	if (!directSemanticRelations.has(relation)) {
		throw new Error(`Unsupported direct Semantic Relation: ${relation}`);
	}
	return relation as DirectSemanticRelation;
}

export function withoutKeys(
	record: AnyRecord,
	keys: readonly string[],
): AnyRecord {
	const result = { ...record };
	for (const key of keys) delete result[key];
	return result;
}

export function withoutSemanticRelations(value: unknown): unknown {
	const knowledge =
		value === undefined
			? undefined
			: requireRecord(value, "Reading Knowledge");
	if (!knowledge) return undefined;
	const result = withoutKeys(knowledge, ["semanticRelations"]);
	return Object.keys(result).length === 0 ? undefined : result;
}

export function stableFingerprint(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

export function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as AnyRecord)
				.sort(([left], [right]) =>
					left < right ? -1 : left > right ? 1 : 0,
				)
				.map(([key, child]) => [key, sortValue(child)]),
		);
	}
	return value;
}

export function appendUnique(
	existing: readonly unknown[],
	additions: readonly unknown[],
): unknown[] {
	const result = existing.map((value) => structuredClone(value));
	const fingerprints = new Set(result.map(stableFingerprint));
	for (const value of additions) {
		const fingerprint = stableFingerprint(value);
		if (fingerprints.has(fingerprint)) continue;
		result.push(structuredClone(value));
		fingerprints.add(fingerprint);
	}
	return result;
}

export function stableUnique(values: readonly unknown[]): unknown[] {
	return appendUnique([], values);
}

export function requireChangeKind(
	value: unknown,
): "Contribute" | "Correct" | "Retract" {
	if (value !== "Contribute" && value !== "Correct" && value !== "Retract") {
		throw new Error(`Unsupported Knowledge Change kind: ${String(value)}`);
	}
	return value;
}

export function requireArray(value: unknown, context: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${context} must be an array.`);
	return value;
}

/** Apply a Knowledge Change that was validated before entering this transaction. */
export function applyTrustedReadingKnowledgeChange(
	existingValue: unknown,
	change: AnyRecord,
): AnyRecord {
	const result =
		existingValue === undefined
			? {}
			: structuredClone(
					requireRecord(existingValue, "Stored Reading Knowledge"),
				);
	const kind = requireChangeKind(change.kind);
	const aspect = requireString(change.aspect, "Knowledge Change aspect");
	if (aspect === "translations") {
		const language = requireString(
			change.language,
			"Translation target language",
		);
		const buckets =
			result.translations === undefined
				? {}
				: {
						...requireRecord(
							result.translations,
							"Reading translation buckets",
						),
					};
		if (kind === "Retract") delete buckets[language];
		else {
			const values = requireArray(change.value, "Translation values");
			const current =
				buckets[language] === undefined
					? []
					: requireArray(
							buckets[language],
							"Stored translation values",
						);
			buckets[language] =
				kind === "Correct"
					? stableUnique(values)
					: appendUnique(current, values);
		}
		if (Object.keys(buckets).length === 0) delete result.translations;
		else result.translations = buckets;
		return result;
	}
	if (aspect === "semanticRelations") {
		const relation = requireString(change.relation, "Semantic Relation");
		const relations =
			result.semanticRelations === undefined
				? {}
				: {
						...requireRecord(
							result.semanticRelations,
							"Stored Semantic Relations",
						),
					};
		if (kind === "Retract") delete relations[relation];
		else {
			const values = requireArray(
				change.value,
				"Semantic Relation values",
			);
			const current =
				relations[relation] === undefined
					? []
					: requireArray(
							relations[relation],
							"Stored Semantic Relation values",
						);
			relations[relation] =
				kind === "Correct"
					? stableUnique(values)
					: appendUnique(current, values);
		}
		if (Object.keys(relations).length === 0)
			delete result.semanticRelations;
		else result.semanticRelations = relations;
		return result;
	}
	if (
		aspect !== "transcription" &&
		aspect !== "definition" &&
		aspect !== "morphologicalTree" &&
		aspect !== "lexicalBreakdown"
	) {
		throw new Error(`Unsupported Reading Knowledge aspect: ${aspect}`);
	}
	if (kind === "Retract") {
		delete result[aspect];
		return result;
	}
	if (change.value === undefined) {
		throw new Error(`${aspect} Knowledge Change requires a value.`);
	}
	if (
		kind === "Contribute" &&
		result[aspect] !== undefined &&
		stableFingerprint(result[aspect]) !== stableFingerprint(change.value)
	) {
		throw new Error(
			`Contribute conflicts with existing ${aspect}; use Correct to replace it.`,
		);
	}
	result[aspect] = structuredClone(change.value);
	return result;
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
		record as unknown as PendingSemanticRelationRecord<SupportedLanguage>,
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

/** True when the exact ordinary Lemma is already part of the dictionary. */
export async function hasDumdictLemma(
	ctx: ServerCtx,
	lemma: unknown,
): Promise<boolean> {
	return (await findLemma(ctx, lemma)) !== null;
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
					lemma: reading.lemma,
					emojiDescription,
				} as Reading),
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

/** Internal app seam for composing ordinary Dumdict writes atomically. */
export async function loadDumdictReadingEntryByKey(
	ctx: ServerCtx,
	readingKey: string,
) {
	return (await findReadingByKey(ctx, readingKey))?.entry ?? null;
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
	const targetKind = targetKinds.has("reading") ? "reading" : "lemma";
	const semanticRelations: AnyRecord = {};
	if (targetKind === "reading") semanticRelations.targetKind = "reading";
	for (const edge of edges) {
		let targetValue: unknown;
		if (targetKind === "reading") {
			if (!edge.targetReadingId) continue;
			const targetReading = await ctx.db.get(edge.targetReadingId);
			if (!targetReading) continue;
			const targetLemma = await ctx.db.get(targetReading.lemmaId);
			if (!targetLemma) continue;
			targetValue = readingValue(targetReading, targetLemma);
		} else {
			if (!edge.targetLemmaId) continue;
			const targetLemma = await ctx.db.get(edge.targetLemmaId);
			if (!targetLemma) continue;
			targetValue = lemmaValue(targetLemma);
		}
		const bucket = (semanticRelations[edge.relation] ?? []) as unknown[];
		bucket.push(targetValue);
		semanticRelations[edge.relation] = bucket;
	}
	const base = withoutSemanticRelations(storedKnowledge);
	const knowledge =
		base === undefined ? {} : requireRecord(base, "Reading Knowledge");
	if (Object.keys(semanticRelations).length > 0) {
		knowledge.semanticRelations = semanticRelations;
	}
	return Object.keys(knowledge).length === 0 ? undefined : knowledge;
}

export async function loadRelationInventory(ctx: ServerCtx) {
	const dictionaryRows = await ctx.db
		.query("dictionaryLemmas")
		.take(MAX_RELATION_INVENTORY_LEMMAS + 1);
	if (dictionaryRows.length > MAX_RELATION_INVENTORY_LEMMAS) {
		throw new Error(
			`Relation planning supports at most ${MAX_RELATION_INVENTORY_LEMMAS} dictionary Lemmas.`,
		);
	}
	const lemmas = await Promise.all(
		dictionaryRows.map(({ lemmaId }) => ctx.db.get(lemmaId)),
	);
	const canonicalReadings: Doc<"readings">[] = [];
	for (const lemma of lemmas) {
		if (!lemma) continue;
		const remaining =
			MAX_RELATION_INVENTORY_READINGS - canonicalReadings.length;
		const readings = await ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.take(remaining + 1);
		if (readings.length > remaining) {
			throw new Error(
				`Relation planning supports at most ${MAX_RELATION_INVENTORY_READINGS} dictionary Readings.`,
			);
		}
		for (const reading of readings) {
			if (
				!canonicalReadings.some(
					(existing) => existing._id === reading._id,
				)
			) {
				canonicalReadings.push(reading);
			}
		}
	}
	const readings = await Promise.all(
		canonicalReadings.map((reading) => loadReading(ctx, reading)),
	);
	return {
		lemmas: lemmas.flatMap((lemma) =>
			lemma ? [{ lemma: lemmaValue(lemma) }] : [],
		),
		readings: readings.flatMap((reading) =>
			reading ? [reading.entry] : [],
		),
	};
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
