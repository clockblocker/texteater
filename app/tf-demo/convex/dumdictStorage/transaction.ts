import { v } from "convex/values";
import { type Reading, readingFingerprint } from "dumling/reading";

import { lemmaIdentityKey } from "../../server/linguisticIdentity";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
	attachPendingShadowReference,
	ensureAccumulatedKnowledgeStatus,
	pendingShadowDescriptor,
	replaceAccumulatedKnowledge,
} from "../model/shadows";
import { dumdictPlannedChangeValidator } from "../model/validators";
import {
	type AnyRecord,
	applyReadingKnowledgeChange,
	assertLemmaRecordHasNoKnowledge,
	type CompactReadingEntry,
	findCanonicalLemma,
	findCanonicalReading,
	findCanonicalSurface,
	findLemma,
	findPending,
	findReading,
	findSurface,
	getState,
	MAX_PATCH_OPS,
	MAX_PLANNED_CHANGES,
	MAX_RELATIONS_PER_READING,
	pendingLocatorKey,
	readingIdentityKey,
	requireArray,
	requireChangeKind,
	requireDirectSemanticRelation,
	requireRecord,
	requireString,
	revisionString,
	STATE_KEY,
	withoutKeys,
	withoutSemanticRelations,
} from "./storage";

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
