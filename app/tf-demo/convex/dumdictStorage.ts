import { v } from "convex/values";
import { type Reading, readingFingerprint } from "dumling/reading";
import type { DirectSemanticRelation } from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import {
	lemmaValue,
	readingValue,
	surfaceValue,
} from "./model/occurrenceAttestations";
import {
	attachPendingShadowReference,
	ensureAccumulatedKnowledgeStatus,
	pendingShadowDescriptor,
	replaceAccumulatedKnowledge,
} from "./model/shadows";
import {
	dumdictPlannedChangeValidator,
	lemmaValueValidator,
} from "./model/validators";

const STATE_KEY = "global" as const;
const MAX_PLANNED_CHANGES = 50;
const MAX_PATCH_OPS = 50;
const MAX_READING_CANDIDATES = 40;
const MAX_CONTEXT_KEYS = 50;
const MAX_PENDING_RELATIONS_PER_SLICE = 100;
const MAX_CLEANUP_CANDIDATE_LEMMAS = 100;
const MAX_RELATION_INVENTORY_LEMMAS = 100;
const MAX_RELATION_INVENTORY_READINGS = 200;
const MAX_RELATIONS_PER_READING = 200;
const directSemanticRelations = new Set<string>(directSemanticRelationValues);

type ServerCtx = QueryCtx | MutationCtx;
type AnyRecord = Record<string, unknown>;
type CompactReadingEntry = AnyRecord & {
	reading: unknown;
	knowledge?: AnyRecord;
};

function revisionString(revision: number): string {
	return `convex-${revision}`;
}

async function getState(ctx: ServerCtx) {
	return ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", STATE_KEY))
		.unique();
}

/** Current revision for app-owned composition of an ordinary Dumdict plan. */
export async function loadDumdictRevision(ctx: ServerCtx): Promise<string> {
	return revisionString((await getState(ctx))?.revision ?? 0);
}

async function currentRevision(ctx: ServerCtx): Promise<string> {
	return revisionString((await getState(ctx))?.revision ?? 0);
}

function requireRecord(value: unknown, context: string): AnyRecord {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${context} must be an object.`);
	}
	return value as AnyRecord;
}

function assertLemmaRecordHasNoKnowledge(record: AnyRecord): void {
	if (record.knowledge !== undefined) {
		throw new Error("Lemma Records cannot contain Knowledge.");
	}
}

function requireString(value: unknown, context: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} must be a non-empty string.`);
	}
	return value;
}

function requireDirectSemanticRelation(value: unknown): DirectSemanticRelation {
	const relation = requireString(value, "Semantic Relation");
	if (!directSemanticRelations.has(relation)) {
		throw new Error(`Unsupported direct Semantic Relation: ${relation}`);
	}
	return relation as DirectSemanticRelation;
}

function withoutKeys(record: AnyRecord, keys: readonly string[]): AnyRecord {
	const result = { ...record };
	for (const key of keys) delete result[key];
	return result;
}

function withoutSemanticRelations(value: unknown): unknown {
	const knowledge =
		value === undefined
			? undefined
			: requireRecord(value, "Reading Knowledge");
	if (!knowledge) return undefined;
	const result = withoutKeys(knowledge, ["semanticRelations"]);
	return Object.keys(result).length === 0 ? undefined : result;
}

function stableFingerprint(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
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

function appendUnique(
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

function stableUnique(values: readonly unknown[]): unknown[] {
	return appendUnique([], values);
}

function requireChangeKind(
	value: unknown,
): "Contribute" | "Correct" | "Retract" {
	if (value !== "Contribute" && value !== "Correct" && value !== "Retract") {
		throw new Error(`Unsupported Knowledge Change kind: ${String(value)}`);
	}
	return value;
}

function requireArray(value: unknown, context: string): unknown[] {
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

function applyReadingKnowledgeChange(
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

function pendingLocatorKey(recordValue: unknown): string {
	const record = requireRecord(recordValue, "Pending Semantic Relation");
	const locator = requireRecord(
		record.locator,
		"Pending Semantic Relation locator",
	);
	return JSON.stringify([
		requireString(locator.sourceReadingKey, "sourceReadingKey"),
		requireString(locator.relation, "relation"),
		requireString(locator.targetPendingId, "targetPendingId"),
	]);
}

function pendingProposalKey(recordValue: unknown): string {
	const record = requireRecord(recordValue, "Pending Semantic Relation");
	const pending = requireRecord(
		record.pending,
		"Pending Semantic Relation value",
	);
	const target = requireRecord(
		pending.target,
		"Pending Semantic Relation target",
	);
	return JSON.stringify([
		requireString(pending.relation, "relation"),
		requireString(target.language, "target language"),
		requireString(target.canonicalForm, "target canonicalForm"),
		requireString(target.family, "target family"),
		requireString(target.kind, "target kind"),
	]);
}

function uniqueBoundedKeys(
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

function assertPlanBudget(estimatedChanges: number, context: string): void {
	if (estimatedChanges > MAX_PLANNED_CHANGES) {
		throw new Error(
			`${context} can produce at most ${MAX_PLANNED_CHANGES} planned changes; this request can produce ${estimatedChanges}.`,
		);
	}
}

async function findCanonicalLemma(ctx: ServerCtx, lemma: unknown) {
	return ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) =>
			q.eq("lemmaKey", lemmaIdentityKey(lemma)),
		)
		.unique();
}

async function findLemma(ctx: ServerCtx, lemma: unknown) {
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

async function findLemmaByKey(ctx: ServerCtx, lemmaKey: string) {
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

async function findCanonicalReading(ctx: ServerCtx, readingInput: unknown) {
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

async function findReading(ctx: ServerCtx, readingInput: unknown) {
	const canonical = await findCanonicalReading(ctx, readingInput);
	return canonical ? loadReading(ctx, canonical) : null;
}

async function findReadingByKey(ctx: ServerCtx, readingKey: string) {
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

async function loadReading(
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

async function loadCanonicalReadingKnowledge(
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

async function findCanonicalSurface(ctx: ServerCtx, surfaceKey: string) {
	return ctx.db
		.query("surfaces")
		.withIndex("by_surface_key", (q) => q.eq("surfaceKey", surfaceKey))
		.unique();
}

async function findSurface(ctx: ServerCtx, surfaceKey: string) {
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

async function loadPendingRelationsForSource(
	ctx: ServerCtx,
	sourceReadingKey: string,
) {
	const records = await ctx.db
		.query("pendingSemanticRelations")
		.withIndex("by_source_reading_key", (q) =>
			q.eq("sourceReadingKey", sourceReadingKey),
		)
		.take(MAX_PENDING_RELATIONS_PER_SLICE + 1);
	if (records.length > MAX_PENDING_RELATIONS_PER_SLICE) {
		throw new Error(
			`A pending-relation slice supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} records.`,
		);
	}
	return records;
}

async function findPending(ctx: ServerCtx, record: unknown) {
	return ctx.db
		.query("pendingSemanticRelations")
		.withIndex("by_locator_key", (q) =>
			q.eq("locatorKey", pendingLocatorKey(record)),
		)
		.unique();
}

export const getDumdictRevision = internalQuery({
	args: {},
	returns: v.string(),
	handler: async (ctx) => currentRevision(ctx),
});

export const findDumdictStoredReadings = internalQuery({
	args: { lemmaKey: v.string() },
	returns: v.object({ revision: v.string(), candidates: v.array(v.any()) }),
	handler: async (ctx, { lemmaKey }) => {
		const [revision, lemma] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
				.unique(),
		]);
		if (!lemma) return { revision, candidates: [] };
		const [dictionaryLemma, readings] = await Promise.all([
			ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
				.unique(),
			ctx.db
				.query("readings")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
				.take(MAX_READING_CANDIDATES + 1),
		]);
		if (!dictionaryLemma) return { revision, candidates: [] };
		if (readings.length > MAX_READING_CANDIDATES) {
			throw new Error(
				`Stored Reading lookup supports at most ${MAX_READING_CANDIDATES} candidates.`,
			);
		}
		const entries = await Promise.all(
			readings.map((reading) => loadReading(ctx, reading)),
		);
		return {
			revision,
			candidates: readings.flatMap((_reading, index) => {
				const entry = entries[index];
				return entry
					? [
							{
								reading: entry.entry,
								lemma: { lemma: lemmaValue(lemma) },
							},
						]
					: [];
			}),
		};
	},
});

export const loadDumdictNewNoteContext = internalQuery({
	args: {
		lemmaKey: v.string(),
		proposedLemma: lemmaValueValidator,
		readingKey: v.string(),
		surfaceKeys: v.array(v.string()),
		explicitLemmaTargetKeys: v.array(v.string()),
		pendingProposalKeys: v.array(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		assertPlanBudget(
			2 +
				args.surfaceKeys.length +
				args.explicitLemmaTargetKeys.length +
				args.pendingProposalKeys.length,
			"New-note context",
		);
		const surfaceKeys = uniqueBoundedKeys(
			args.surfaceKeys,
			"New-note owned Surface loading",
		);
		const explicitLemmaTargetKeys = uniqueBoundedKeys(
			args.explicitLemmaTargetKeys,
			"New-note explicit Lemma target loading",
		);
		const pendingProposalKeys = new Set(
			uniqueBoundedKeys(
				args.pendingProposalKeys,
				"New-note pending target loading",
			),
		);
		const [
			revision,
			lemma,
			reading,
			surfaces,
			explicitTargets,
			pending,
			matchingPending,
			inventory,
		] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.lemmaKey),
				)
				.unique(),
			findReadingByKey(ctx, args.readingKey),
			Promise.all(surfaceKeys.map((key) => findSurface(ctx, key))),
			Promise.all(
				explicitLemmaTargetKeys.map((key) => findLemmaByKey(ctx, key)),
			),
			pendingProposalKeys.size === 0
				? []
				: loadPendingRelationsForSource(ctx, args.readingKey),
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_target_canonical_form", (q) =>
					q.eq(
						"targetCanonicalForm",
						args.proposedLemma.canonicalForm,
					),
				)
				.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
			loadRelationInventory(ctx),
		]);
		if (matchingPending.length > MAX_PENDING_RELATIONS_PER_SLICE) {
			throw new Error(
				`A pending-relation slice supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} matching records.`,
			);
		}
		const dictionaryLemma = await (lemma
			? ctx.db
					.query("dictionaryLemmas")
					.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
					.unique()
			: Promise.resolve(null));
		return {
			revision,
			...(lemma && dictionaryLemma
				? { existingLemma: { lemma: lemmaValue(lemma) } }
				: {}),
			...(reading ? { existingReading: reading.entry } : {}),
			existingOwnedSurfaces: surfaces.flatMap((surface) =>
				surface ? [surface.entry] : [],
			),
			explicitExistingLemmaTargets: explicitTargets.flatMap((target) =>
				target ? [{ lemma: lemmaValue(target.canonical) }] : [],
			),
			existingPendingRelationsForProposedPendingTargets: pending.flatMap(
				(record) => {
					const stored = requireRecord(
						record.record,
						"Pending Semantic Relation record",
					);
					return pendingProposalKeys.has(pendingProposalKey(stored))
						? [stored]
						: [];
				},
			),
			pendingRelationsMatchingProposedLemma: matchingPending.flatMap(
				(record) => {
					try {
						const descriptor = pendingShadowDescriptor(
							record.record,
						);
						return descriptor.language ===
							args.proposedLemma.language &&
							descriptor.canonicalForm ===
								args.proposedLemma.canonicalForm &&
							descriptor.family === args.proposedLemma.family &&
							descriptor.kind === args.proposedLemma.kind
							? [
									requireRecord(
										record.record,
										"Pending Semantic Relation record",
									),
								]
							: [];
					} catch {
						return [];
					}
				},
			),
			relationLemmas: inventory.lemmas,
			relationReadings: inventory.readings,
		};
	},
});

export const getDumdictRelationsCleanupInfo = internalQuery({
	args: { canonicalForm: v.string() },
	returns: v.any(),
	handler: async (ctx, { canonicalForm }) => {
		const [revision, lemmas, pending] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("lemmas")
				.withIndex("by_language_and_canonical_form", (q) =>
					q.eq("language", "de").eq("canonicalForm", canonicalForm),
				)
				.take(MAX_CLEANUP_CANDIDATE_LEMMAS + 1),
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_target_canonical_form", (q) =>
					q.eq("targetCanonicalForm", canonicalForm),
				)
				.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
		]);
		if (lemmas.length > MAX_CLEANUP_CANDIDATE_LEMMAS) {
			throw new Error(
				`Relations cleanup supports at most ${MAX_CLEANUP_CANDIDATE_LEMMAS} candidate Lemmas.`,
			);
		}
		if (pending.length > MAX_PENDING_RELATIONS_PER_SLICE) {
			throw new Error(
				`Relations cleanup supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} pending records.`,
			);
		}
		const dictionaryLemmas = await Promise.all(
			lemmas.map((lemma) =>
				ctx.db
					.query("dictionaryLemmas")
					.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
					.unique(),
			),
		);
		return {
			revision,
			canonicalForm,
			candidateLemmas: lemmas.flatMap((lemma, index) =>
				dictionaryLemmas[index] ? [{ lemma: lemmaValue(lemma) }] : [],
			),
			pendingRelations: pending.map((record) =>
				requireRecord(
					record.record,
					"Pending Semantic Relation record",
				),
			),
		};
	},
});

export const loadDumdictCleanupRelationsContext = internalQuery({
	args: {
		locatorKeys: v.array(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		assertPlanBudget(args.locatorKeys.length, "Relations-cleanup context");
		const locatorKeys = uniqueBoundedKeys(
			args.locatorKeys,
			"Relations-cleanup locator loading",
		);
		const [revision, pending, inventory] = await Promise.all([
			currentRevision(ctx),
			Promise.all(
				locatorKeys.map((locatorKey) =>
					ctx.db
						.query("pendingSemanticRelations")
						.withIndex("by_locator_key", (q) =>
							q.eq("locatorKey", locatorKey),
						)
						.unique(),
				),
			),
			loadRelationInventory(ctx),
		]);
		return {
			revision,
			pendingRelations: pending.flatMap((record) =>
				record
					? [
							requireRecord(
								record.record,
								"Pending Semantic Relation record",
							),
						]
					: [],
			),
			relationLemmas: inventory.lemmas,
			relationReadings: inventory.readings,
		};
	},
});

export const loadDumdictReadingForPatch = internalQuery({
	args: { readingKey: v.string() },
	returns: v.any(),
	handler: async (ctx, { readingKey }) => {
		const [revision, reading] = await Promise.all([
			currentRevision(ctx),
			findReadingByKey(ctx, readingKey),
		]);
		return {
			revision,
			...(reading ? { reading: reading.entry } : {}),
		};
	},
});

type PreflightState = {
	lemmas: Map<string, boolean>;
	readings: Map<string, boolean>;
	readingEntries: Map<string, CompactReadingEntry | null>;
	surfaces: Map<string, boolean>;
	pendingRelations: Map<string, boolean>;
};

function createPreflightState(): PreflightState {
	return {
		lemmas: new Map(),
		readings: new Map(),
		readingEntries: new Map(),
		surfaces: new Map(),
		pendingRelations: new Map(),
	};
}

async function preflightReadingEntry(
	ctx: MutationCtx,
	reading: unknown,
	shadow: PreflightState,
): Promise<CompactReadingEntry | null> {
	const key = readingIdentityKey(reading);
	if (shadow.readingEntries.has(key)) {
		return shadow.readingEntries.get(key) ?? null;
	}
	const stored = await findReading(ctx, reading);
	const entry = stored
		? (structuredClone(stored.entry) as CompactReadingEntry)
		: null;
	shadow.readingEntries.set(key, entry);
	shadow.readings.set(key, entry !== null);
	return entry;
}

function readingIdentityKey(value: unknown): string {
	const reading = requireRecord(value, "Reading");
	return readingFingerprint({
		lemma: reading.lemma,
		emojiDescription: requireString(
			reading.emojiDescription,
			"Reading emojiDescription",
		),
	} as Reading);
}

async function cachedPresence(
	cache: Map<string, boolean>,
	key: string,
	load: () => Promise<unknown>,
): Promise<boolean> {
	const cached = cache.get(key);
	if (cached !== undefined) return cached;
	const exists = Boolean(await load());
	cache.set(key, exists);
	return exists;
}

async function preconditionFails(
	ctx: MutationCtx,
	preconditionValue: unknown,
	transactionRevision: string,
	shadow: PreflightState,
): Promise<boolean> {
	const precondition = requireRecord(
		preconditionValue,
		"Dumdict precondition",
	);
	switch (precondition.kind) {
		case "revisionMatches":
			return precondition.revision !== transactionRevision;
		case "lemmaExists": {
			const key = lemmaIdentityKey(precondition.lemma);
			return !(await cachedPresence(shadow.lemmas, key, () =>
				findLemma(ctx, precondition.lemma),
			));
		}
		case "lemmaMissing": {
			const key = lemmaIdentityKey(precondition.lemma);
			return cachedPresence(shadow.lemmas, key, () =>
				findLemma(ctx, precondition.lemma),
			);
		}
		case "readingExists": {
			const key = readingIdentityKey(precondition.reading);
			return !(await cachedPresence(shadow.readings, key, () =>
				findReading(ctx, precondition.reading),
			));
		}
		case "readingMissing": {
			const key = readingIdentityKey(precondition.reading);
			return cachedPresence(shadow.readings, key, () =>
				findReading(ctx, precondition.reading),
			);
		}
		case "surfaceExists": {
			const key = requireString(precondition.surfaceId, "surfaceId");
			return !(await cachedPresence(shadow.surfaces, key, () =>
				findSurface(ctx, key),
			));
		}
		case "surfaceMissing": {
			const key = requireString(precondition.surfaceId, "surfaceId");
			return cachedPresence(shadow.surfaces, key, () =>
				findSurface(ctx, key),
			);
		}
		case "pendingRelationExists": {
			const key = pendingLocatorKey(precondition.record);
			return !(await cachedPresence(shadow.pendingRelations, key, () =>
				findPending(ctx, precondition.record),
			));
		}
		case "pendingRelationMissing": {
			const key = pendingLocatorKey(precondition.record);
			return cachedPresence(shadow.pendingRelations, key, () =>
				findPending(ctx, precondition.record),
			);
		}
		case "readingAttestationMissing": {
			throw new Error(
				"tf-demo stores occurrence Attestations in its host graph, not in Dumdict Reading Entries.",
			);
		}
		default:
			throw new Error(
				`Unsupported Dumdict precondition: ${String(precondition.kind)}`,
			);
	}
}

async function advancePreflightState(
	_ctx: MutationCtx,
	changeValue: unknown,
	shadow: PreflightState,
): Promise<void> {
	const change = requireRecord(changeValue, "Dumdict planned change");
	switch (change.type) {
		case "createLemma": {
			const record = requireRecord(change.record, "Lemma Record");
			assertLemmaRecordHasNoKnowledge(record);
			shadow.lemmas.set(lemmaIdentityKey(record.lemma), true);
			return;
		}
		case "createReading": {
			const entry = requireRecord(change.entry, "Reading Entry");
			const key = readingIdentityKey(entry.reading);
			shadow.readings.set(key, true);
			shadow.readingEntries.set(
				key,
				structuredClone(entry) as CompactReadingEntry,
			);
			return;
		}
		case "createOwnedSurface": {
			const entry = requireRecord(change.entry, "Surface Entry");
			shadow.surfaces.set(
				requireString(entry.id, "Surface Entry id"),
				true,
			);
			return;
		}
		case "createPendingSemanticRelation":
			shadow.pendingRelations.set(pendingLocatorKey(change.record), true);
			return;
		case "deletePendingSemanticRelation":
			shadow.pendingRelations.set(
				pendingLocatorKey(change.record),
				false,
			);
			return;
		case "patchReading": {
			if (
				!Array.isArray(change.ops) ||
				change.ops.length > MAX_PATCH_OPS
			) {
				throw new Error(
					`A Reading patch supports at most ${MAX_PATCH_OPS} operations.`,
				);
			}
			let entry = await preflightReadingEntry(
				_ctx,
				change.reading,
				shadow,
			);
			if (!entry) {
				throw new Error("Cannot patch a missing Dumdict Reading.");
			}
			for (const operationValue of change.ops) {
				const operation = requireRecord(
					operationValue,
					"Reading patch operation",
				);
				if (operation.kind === "addAttestation") {
					throw new Error(
						"tf-demo stores occurrence Attestations in its host graph, not in Dumdict Reading Entries.",
					);
				} else if (operation.kind === "applyKnowledgeChange") {
					entry = applyReadingKnowledgeChange(
						entry,
						operation.envelope,
					);
				} else {
					throw new Error(
						`Unsupported Reading patch operation: ${String(operation.kind)}`,
					);
				}
			}
			shadow.readingEntries.set(
				readingIdentityKey(change.reading),
				entry,
			);
			return;
		}
		default:
			throw new Error(
				`Unsupported Dumdict planned change: ${String(change.type)}`,
			);
	}
}

async function syncSemanticRelationChange(
	ctx: MutationCtx,
	sourceReadingId: Id<"readings">,
	sourceLemmaId: Id<"lemmas">,
	changeValue: unknown,
): Promise<void> {
	const change = requireRecord(
		changeValue,
		"Semantic Relation Knowledge Change",
	);
	const relation = requireDirectSemanticRelation(change.relation);
	const kind = requireChangeKind(change.kind);
	const targetKind = change.targetKind === "reading" ? "reading" : "lemma";
	if (targetKind === "reading" && relation !== "synonym")
		throw new Error(
			"Reading-targeted direct claims currently support Synonym only.",
		);
	const existing = await ctx.db
		.query("semanticRelationEdges")
		.withIndex("by_source_reading_id_and_relation", (q) =>
			q.eq("sourceReadingId", sourceReadingId).eq("relation", relation),
		)
		.take(MAX_RELATIONS_PER_READING + 1);
	if (existing.length > MAX_RELATIONS_PER_READING) {
		throw new Error(
			`A Reading supports at most ${MAX_RELATIONS_PER_READING} Semantic Relation edges.`,
		);
	}
	if (
		existing.some(
			(edge) =>
				(edge.targetKind === "reading" ||
					edge.targetReadingId !== undefined) !==
				(targetKind === "reading"),
		)
	)
		throw new Error(
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	if (kind === "Retract") {
		for (const edge of existing) await ctx.db.delete(edge._id);
		return;
	}
	const targets = requireArray(change.value, "Semantic Relation values");
	if (targetKind === "reading") {
		const resolvedTargets = await Promise.all(
			targets.map((target) => findReading(ctx, target)),
		);
		if (resolvedTargets.some((target) => target === null))
			throw new Error("A Semantic Relation target Reading is missing.");
		const targetIds = new Set(
			resolvedTargets.flatMap((target) => (target ? [target._id] : [])),
		);
		if (targetIds.has(sourceReadingId))
			throw new Error("A Reading cannot relate directly to itself.");
		if (kind === "Correct") {
			for (const edge of existing)
				if (
					!edge.targetReadingId ||
					!targetIds.has(edge.targetReadingId)
				)
					await ctx.db.delete(edge._id);
		}
		for (const targetReadingId of targetIds) {
			const edge = await ctx.db
				.query("semanticRelationEdges")
				.withIndex(
					"by_source_reading_id_and_relation_and_target_reading_id",
					(q) =>
						q
							.eq("sourceReadingId", sourceReadingId)
							.eq("relation", relation)
							.eq("targetReadingId", targetReadingId),
				)
				.unique();
			if (!edge)
				await ctx.db.insert("semanticRelationEdges", {
					sourceReadingId,
					targetKind: "reading",
					targetReadingId,
					relation,
				});
		}
		return;
	}
	const resolvedTargets = await Promise.all(
		targets.map((target) => findLemma(ctx, target)),
	);
	if (resolvedTargets.some((target) => target === null)) {
		throw new Error("A Semantic Relation target Lemma is missing.");
	}
	const targetIds = new Set(
		resolvedTargets.flatMap((target) =>
			target ? [target.canonical._id] : [],
		),
	);
	if (targetIds.has(sourceLemmaId)) {
		throw new Error("A Reading cannot relate directly to its own Lemma.");
	}
	if (kind === "Correct") {
		for (const edge of existing) {
			if (!edge.targetLemmaId || !targetIds.has(edge.targetLemmaId))
				await ctx.db.delete(edge._id);
		}
	}
	for (const targetLemmaId of targetIds) {
		const edge = await ctx.db
			.query("semanticRelationEdges")
			.withIndex(
				"by_source_reading_id_and_relation_and_target_lemma_id",
				(q) =>
					q
						.eq("sourceReadingId", sourceReadingId)
						.eq("relation", relation)
						.eq("targetLemmaId", targetLemmaId),
			)
			.unique();
		if (!edge) {
			await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId,
				targetKind: "lemma",
				targetLemmaId,
				relation,
			});
		}
	}
}

async function syncSemanticRelationsFromKnowledge(
	ctx: MutationCtx,
	sourceReadingId: Id<"readings">,
	sourceLemmaId: Id<"lemmas">,
	knowledgeValue: unknown,
): Promise<void> {
	const knowledge = optionalRecord(knowledgeValue);
	const relations = optionalRecord(knowledge?.semanticRelations);
	if (!relations) return;
	for (const [relation, value] of Object.entries(relations)) {
		if (relation === "targetKind") continue;
		await syncSemanticRelationChange(ctx, sourceReadingId, sourceLemmaId, {
			kind: "Contribute",
			aspect: "semanticRelations",
			relation,
			targetKind:
				relations.targetKind === "reading" ? "reading" : "lemma",
			value,
		});
	}
}

function optionalRecord(value: unknown): AnyRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as AnyRecord)
		: null;
}

async function applyChange(
	ctx: MutationCtx,
	changeValue: unknown,
): Promise<boolean> {
	const change = requireRecord(changeValue, "Dumdict planned change");
	switch (change.type) {
		case "createLemma": {
			const record = requireRecord(change.record, "Lemma Record");
			assertLemmaRecordHasNoKnowledge(record);
			const lemma = requireRecord(record.lemma, "Lemma");
			const lemmaKey = lemmaIdentityKey(lemma);
			if (await findLemma(ctx, record.lemma)) return false;
			const language = requireString(lemma.language, "Lemma language");
			if (language !== "de" && language !== "he") {
				throw new Error("Unsupported Lemma language.");
			}
			const canonical = await findCanonicalLemma(ctx, record.lemma);
			const lemmaId =
				canonical?._id ??
				(await ctx.db.insert("lemmas", {
					lemmaKey,
					language,
					family: requireString(lemma.family, "Lemma family"),
					kind: requireString(lemma.kind, "Lemma kind"),
					canonicalForm: requireString(
						lemma.canonicalForm,
						"Lemma canonicalForm",
					),
					coreFeatures: lemma.coreFeatures,
				}));
			await ctx.db.insert("dictionaryLemmas", { lemmaId });
			return true;
		}
		case "createReading": {
			const entry = requireRecord(change.entry, "Reading Entry");
			const reading = requireRecord(entry.reading, "Reading");
			const emojiDescription = requireString(
				reading.emojiDescription,
				"Reading emojiDescription",
			);
			const storedLemma = await findLemma(ctx, reading.lemma);
			if (!storedLemma || (await findReading(ctx, reading))) {
				return false;
			}
			const readingKey = readingFingerprint({
				lemma: reading.lemma,
				emojiDescription,
			} as Reading);
			const canonical = await findCanonicalReading(ctx, reading);
			if (
				canonical &&
				(canonical.lemmaId !== storedLemma.canonical._id ||
					canonical.emojiDescription !== emojiDescription)
			) {
				throw new Error(
					"Canonical Reading does not match its dictionary proposal.",
				);
			}
			const readingId =
				canonical?._id ??
				(await ctx.db.insert("readings", {
					readingKey,
					lemmaId: storedLemma.canonical._id,
					emojiDescription,
				}));
			await ctx.db.insert("readingEntries", {
				readingId,
				record: {
					...withoutKeys(entry, [
						"reading",
						"attestations",
						"knowledge",
					]),
					...(withoutSemanticRelations(entry.knowledge) === undefined
						? {}
						: {
								knowledge: withoutSemanticRelations(
									entry.knowledge,
								),
							}),
				},
			});
			await syncSemanticRelationsFromKnowledge(
				ctx,
				readingId,
				storedLemma.canonical._id,
				entry.knowledge,
			);
			const baseKnowledge = withoutSemanticRelations(entry.knowledge);
			if (baseKnowledge !== undefined) {
				await replaceAccumulatedKnowledge(
					ctx,
					readingKey,
					baseKnowledge,
				);
			} else if (entry.knowledge !== undefined) {
				await ensureAccumulatedKnowledgeStatus(ctx, readingKey);
			}
			return true;
		}
		case "createOwnedSurface": {
			const entry = requireRecord(change.entry, "Surface Entry");
			const surfaceKey = requireString(entry.id, "Surface Entry id");
			const storedLemma = await findLemma(ctx, entry.ownerLemma);
			if (!storedLemma || (await findSurface(ctx, surfaceKey))) {
				return false;
			}
			const surface = requireRecord(entry.surface, "Owned Surface value");
			const language = requireString(
				surface.language,
				"Surface language",
			);
			if (language !== "de" && language !== "he") {
				throw new Error("Unsupported Surface language.");
			}
			const spelling = requireString(
				surface.spelling,
				"Surface spelling",
			);
			if (spelling !== "Canonical" && spelling !== "Variant") {
				throw new Error("Unsupported Surface spelling.");
			}
			const surfaceKind = requireString(
				surface.surfaceKind,
				"Surface kind",
			);
			if (surfaceKind !== "Citation" && surfaceKind !== "Inflection") {
				throw new Error("Unsupported Surface kind.");
			}
			const canonical = await findCanonicalSurface(ctx, surfaceKey);
			if (canonical && canonical.lemmaId !== storedLemma.canonical._id) {
				throw new Error(
					"Canonical Surface does not match its dictionary proposal.",
				);
			}
			const surfaceId =
				canonical?._id ??
				(await ctx.db.insert("surfaces", {
					surfaceKey,
					lemmaId: storedLemma.canonical._id,
					language,
					normalizedSurface: requireString(
						surface.normalizedSurface,
						"normalizedSurface",
					),
					spelling,
					surfaceKind,
					surfaceFeatures: surface.surfaceFeatures,
					...(surface.inflectionalFeatures === undefined
						? {}
						: {
								inflectionalFeatures:
									surface.inflectionalFeatures,
							}),
				}));
			await ctx.db.insert("ownedSurfaces", {
				surfaceId,
				record: withoutKeys(entry, [
					"id",
					"ownerLemma",
					"surface",
					"attestations",
				]),
			});
			return true;
		}
		case "patchReading": {
			const stored = await findReading(ctx, change.reading);
			if (!stored) return false;
			if (
				!Array.isArray(change.ops) ||
				change.ops.length > MAX_PATCH_OPS
			) {
				throw new Error(
					`A Reading patch supports at most ${MAX_PATCH_OPS} operations.`,
				);
			}
			let entry = structuredClone(stored.entry) as CompactReadingEntry;
			for (const operationValue of change.ops) {
				const operation = requireRecord(
					operationValue,
					"Reading patch operation",
				);
				if (operation.kind === "addAttestation") {
					throw new Error(
						"tf-demo stores occurrence Attestations in its host graph, not in Dumdict Reading Entries.",
					);
				} else if (operation.kind === "applyKnowledgeChange") {
					const envelope = requireRecord(
						operation.envelope,
						"Reading Knowledge Change envelope",
					);
					const knowledgeChange = requireRecord(
						envelope.change,
						"Reading Knowledge Change value",
					);
					if (knowledgeChange.aspect === "semanticRelations") {
						await syncSemanticRelationChange(
							ctx,
							stored._id,
							stored.lemmaId,
							knowledgeChange,
						);
					}
					entry = applyReadingKnowledgeChange(
						entry,
						operation.envelope,
					);
				} else {
					throw new Error(
						`Unsupported Reading patch operation: ${String(operation.kind)}`,
					);
				}
			}
			await ctx.db.patch(stored.entryId, {
				record: {
					...withoutKeys(entry as unknown as AnyRecord, [
						"reading",
						"attestations",
						"knowledge",
					]),
					...(withoutSemanticRelations(entry.knowledge) === undefined
						? {}
						: {
								knowledge: withoutSemanticRelations(
									entry.knowledge,
								),
							}),
				},
			});
			const knowledgeChanges = change.ops.flatMap((operationValue) => {
				const operation = requireRecord(
					operationValue,
					"Reading patch operation",
				);
				if (operation.kind !== "applyKnowledgeChange") return [];
				const envelope = requireRecord(
					operation.envelope,
					"Reading Knowledge Change envelope",
				);
				return [
					requireRecord(
						envelope.change,
						"Reading Knowledge Change value",
					),
				];
			});
			const baseKnowledge = withoutSemanticRelations(entry.knowledge);
			if (baseKnowledge !== undefined) {
				await replaceAccumulatedKnowledge(
					ctx,
					stored.readingKey,
					baseKnowledge,
				);
			} else if (
				knowledgeChanges.some(
					(knowledgeChange) =>
						knowledgeChange.aspect !== "semanticRelations",
				)
			) {
				const replaced = await replaceAccumulatedKnowledge(
					ctx,
					stored.readingKey,
					undefined,
				);
				if (!replaced) {
					await ensureAccumulatedKnowledgeStatus(
						ctx,
						stored.readingKey,
					);
				}
			} else if (knowledgeChanges.length > 0) {
				await ensureAccumulatedKnowledgeStatus(ctx, stored.readingKey);
			}
			return true;
		}
		case "createPendingSemanticRelation": {
			const record = requireRecord(
				change.record,
				"Pending Semantic Relation",
			);
			const locator = requireRecord(record.locator, "Pending locator");
			const target = pendingShadowDescriptor(record);
			const locatorKey = pendingLocatorKey(record);
			if (
				(await findPending(ctx, record)) ||
				!(await findReading(ctx, record.sourceReading))
			) {
				return false;
			}
			const shadowId = await attachPendingShadowReference(ctx, record);
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey,
				sourceReadingKey: requireString(
					locator.sourceReadingKey,
					"sourceReadingKey",
				),
				targetCanonicalForm: target.canonicalForm,
				shadowId,
				record,
			});
			await ensureAccumulatedKnowledgeStatus(
				ctx,
				requireString(locator.sourceReadingKey, "sourceReadingKey"),
			);
			return true;
		}
		case "deletePendingSemanticRelation": {
			const stored = await findPending(ctx, change.record);
			if (!stored) return false;
			await ctx.db.delete(stored._id);
			return true;
		}
		default:
			throw new Error(
				`Unsupported Dumdict planned change: ${String(change.type)}`,
			);
	}
}

const commitResultValidator = v.union(
	v.object({ status: v.literal("committed"), nextRevision: v.string() }),
	v.object({
		status: v.literal("conflict"),
		code: v.union(
			v.literal("revisionConflict"),
			v.literal("semanticPreconditionFailed"),
		),
		latestRevision: v.optional(v.string()),
		message: v.optional(v.string()),
	}),
);

export async function applyDumdictPlanInTransaction(
	ctx: MutationCtx,
	args: { baseRevision: string; changes: readonly unknown[] },
) {
	if (args.changes.length > MAX_PLANNED_CHANGES) {
		throw new Error(
			`A commit supports at most ${MAX_PLANNED_CHANGES} planned changes.`,
		);
	}
	const state = await getState(ctx);
	const revision = revisionString(state?.revision ?? 0);
	if (args.changes.length === 0) {
		return { status: "committed" as const, nextRevision: revision };
	}
	if (args.baseRevision !== revision) {
		return {
			status: "conflict" as const,
			code: "revisionConflict" as const,
			latestRevision: revision,
		};
	}
	const shadow = createPreflightState();
	for (const changeValue of args.changes) {
		const change = requireRecord(changeValue, "Dumdict planned change");
		if (!Array.isArray(change.preconditions)) {
			throw new Error(
				"Every Dumdict planned change needs preconditions.",
			);
		}
		for (const precondition of change.preconditions) {
			if (await preconditionFails(ctx, precondition, revision, shadow)) {
				return {
					status: "conflict" as const,
					code: "semanticPreconditionFailed" as const,
					latestRevision: revision,
				};
			}
		}
		await advancePreflightState(ctx, change, shadow);
	}
	for (const change of args.changes) {
		if (!(await applyChange(ctx, change))) {
			throw new Error(
				"Dumdict preflight and transactional apply diverged.",
			);
		}
	}

	const nextNumber = (state?.revision ?? 0) + 1;
	if (state) await ctx.db.patch(state._id, { revision: nextNumber });
	else
		await ctx.db.insert("dictionaryState", {
			key: STATE_KEY,
			revision: nextNumber,
		});
	return {
		status: "committed" as const,
		nextRevision: revisionString(nextNumber),
	};
}

export const commitDumdictChanges = internalMutation({
	args: {
		baseRevision: v.string(),
		changes: v.array(dumdictPlannedChangeValidator),
	},
	returns: commitResultValidator,
	handler: applyDumdictPlanInTransaction,
});
