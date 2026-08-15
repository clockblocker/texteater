import { v } from "convex/values";

import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { lemmaKeyFor, readingKeyFor } from "./model/linguisticKeys";

const STATE_KEY = "global" as const;
const MAX_PLANNED_CHANGES = 50;
const MAX_PATCH_OPS = 50;
const MAX_READING_CANDIDATES = 40;

type ServerCtx = QueryCtx | MutationCtx;
type AnyRecord = Record<string, unknown>;

function revisionString(revision: number): string {
	return `convex-${revision}`;
}

async function getState(ctx: ServerCtx) {
	return ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", STATE_KEY))
		.unique();
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

function requireString(value: unknown, context: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} must be a non-empty string.`);
	}
	return value;
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

async function findLemma(ctx: ServerCtx, lemma: unknown) {
	return ctx.db
		.query("dictionaryLemmas")
		.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKeyFor(lemma)))
		.unique();
}

async function findReading(ctx: ServerCtx, readingValue: unknown) {
	const reading = requireRecord(readingValue, "Reading");
	const emojiDescription = requireString(
		reading.emojiDescription,
		"Reading emojiDescription",
	);
	return ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) =>
			q.eq(
				"readingKey",
				readingKeyFor({ lemma: reading.lemma, emojiDescription }),
			),
		)
		.unique();
}

async function findSurface(ctx: ServerCtx, surfaceKey: string) {
	return ctx.db
		.query("ownedSurfaces")
		.withIndex("by_surface_key", (q) => q.eq("surfaceKey", surfaceKey))
		.unique();
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
		const [revision, lemma, readings] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
				.unique(),
			ctx.db
				.query("readings")
				.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
				.take(MAX_READING_CANDIDATES),
		]);
		return {
			revision,
			candidates: lemma
				? readings.map(({ entry }) => ({
						reading: entry,
						lemma: lemma.record,
					}))
				: [],
		};
	},
});

export const loadDumdictNewNoteContext = internalQuery({
	args: {
		lemmaKey: v.string(),
		readingKey: v.string(),
		surfaceKey: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const [revision, lemma, reading, surface] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.lemmaKey),
				)
				.unique(),
			ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", args.readingKey),
				)
				.unique(),
			args.surfaceKey
				? ctx.db
						.query("ownedSurfaces")
						.withIndex("by_surface_key", (q) =>
							q.eq("surfaceKey", args.surfaceKey as string),
						)
						.unique()
				: null,
		]);
		return {
			revision,
			...(lemma ? { existingLemma: lemma.record } : {}),
			...(reading ? { existingReading: reading.entry } : {}),
			existingOwnedSurfaces: surface ? [surface.entry] : [],
			explicitExistingReadingTargets: [],
			existingPendingRelationsForProposedPendingTargets: [],
		};
	},
});

export const loadDumdictReadingForPatch = internalQuery({
	args: { readingKey: v.string() },
	returns: v.any(),
	handler: async (ctx, { readingKey }) => {
		const [revision, reading] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingKey),
				)
				.unique(),
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
	surfaces: Map<string, boolean>;
	pendingRelations: Map<string, boolean>;
	readingAttestations: Map<string, Set<string>>;
};

function createPreflightState(): PreflightState {
	return {
		lemmas: new Map(),
		readings: new Map(),
		surfaces: new Map(),
		pendingRelations: new Map(),
		readingAttestations: new Map(),
	};
}

function readingIdentityKey(value: unknown): string {
	const reading = requireRecord(value, "Reading");
	return readingKeyFor({
		lemma: reading.lemma,
		emojiDescription: requireString(
			reading.emojiDescription,
			"Reading emojiDescription",
		),
	});
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
			const key = lemmaKeyFor(precondition.lemma);
			return !(await cachedPresence(shadow.lemmas, key, () =>
				findLemma(ctx, precondition.lemma),
			));
		}
		case "lemmaMissing": {
			const key = lemmaKeyFor(precondition.lemma);
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
			const key = readingIdentityKey(precondition.reading);
			let attestations = shadow.readingAttestations.get(key);
			if (!attestations) {
				const reading = await findReading(ctx, precondition.reading);
				attestations = new Set(
					Array.isArray(reading?.entry.attestations)
						? reading.entry.attestations.filter(
								(value: unknown): value is string =>
									typeof value === "string",
							)
						: [],
				);
				shadow.readingAttestations.set(key, attestations);
			}
			return attestations.has(
				requireString(precondition.value, "attestation"),
			);
		}
		default:
			throw new Error(
				`Unsupported Dumdict precondition: ${String(precondition.kind)}`,
			);
	}
}

async function advancePreflightState(
	ctx: MutationCtx,
	changeValue: unknown,
	shadow: PreflightState,
): Promise<void> {
	const change = requireRecord(changeValue, "Dumdict planned change");
	switch (change.type) {
		case "createLemma": {
			const record = requireRecord(change.record, "Lemma Record");
			shadow.lemmas.set(lemmaKeyFor(record.lemma), true);
			return;
		}
		case "createReading": {
			const entry = requireRecord(change.entry, "Reading Entry");
			const key = readingIdentityKey(entry.reading);
			shadow.readings.set(key, true);
			shadow.readingAttestations.set(
				key,
				new Set(
					Array.isArray(entry.attestations)
						? entry.attestations.filter(
								(value): value is string =>
									typeof value === "string",
							)
						: [],
				),
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
			const key = readingIdentityKey(change.reading);
			let attestations = shadow.readingAttestations.get(key);
			if (!attestations) {
				const reading = await findReading(ctx, change.reading);
				attestations = new Set(
					Array.isArray(reading?.entry.attestations)
						? reading.entry.attestations.filter(
								(value: unknown): value is string =>
									typeof value === "string",
							)
						: [],
				);
				shadow.readingAttestations.set(key, attestations);
			}
			for (const operationValue of change.ops) {
				const operation = requireRecord(
					operationValue,
					"Reading patch operation",
				);
				if (operation.kind === "addAttestation") {
					attestations.add(
						requireString(operation.value, "Reading attestation"),
					);
				} else if (operation.kind !== "applyKnowledgeChange") {
					throw new Error(
						`Unsupported Reading patch operation: ${String(operation.kind)}`,
					);
				}
			}
			return;
		}
		default:
			throw new Error(
				`Unsupported Dumdict planned change: ${String(change.type)}`,
			);
	}
}

async function syncAccumulatedKnowledge(
	ctx: MutationCtx,
	ownerKind: "Lemma" | "Reading",
	ownerKey: string,
	knowledge: unknown,
): Promise<void> {
	const existing = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_kind_and_owner_key", (q) =>
			q.eq("ownerKind", ownerKind).eq("ownerKey", ownerKey),
		)
		.unique();
	if (knowledge === undefined) {
		if (existing) await ctx.db.delete(existing._id);
		return;
	}
	const value = { ownerKind, ownerKey, knowledge, updatedAt: Date.now() };
	if (existing) await ctx.db.replace(existing._id, value);
	else await ctx.db.insert("accumulatedKnowledge", value);
}

async function applyChange(
	ctx: MutationCtx,
	changeValue: unknown,
): Promise<boolean> {
	const change = requireRecord(changeValue, "Dumdict planned change");
	switch (change.type) {
		case "createLemma": {
			const record = requireRecord(change.record, "Lemma Record");
			const lemmaKey = lemmaKeyFor(record.lemma);
			if (await findLemma(ctx, record.lemma)) return false;
			await ctx.db.insert("dictionaryLemmas", { lemmaKey, record });
			await syncAccumulatedKnowledge(
				ctx,
				"Lemma",
				lemmaKey,
				record.knowledge,
			);
			return true;
		}
		case "createReading": {
			const entry = requireRecord(change.entry, "Reading Entry");
			const reading = requireRecord(entry.reading, "Reading");
			const emojiDescription = requireString(
				reading.emojiDescription,
				"Reading emojiDescription",
			);
			const lemmaKey = lemmaKeyFor(reading.lemma);
			if (
				!(await findLemma(ctx, reading.lemma)) ||
				(await findReading(ctx, reading))
			) {
				return false;
			}
			const readingKey = readingKeyFor({
				lemma: reading.lemma,
				emojiDescription,
			});
			await ctx.db.insert("readings", {
				readingKey,
				lemmaKey,
				emojiDescription,
				entry,
			});
			await syncAccumulatedKnowledge(
				ctx,
				"Reading",
				readingKey,
				entry.knowledge,
			);
			return true;
		}
		case "createOwnedSurface": {
			const entry = requireRecord(change.entry, "Surface Entry");
			const surfaceKey = requireString(entry.id, "Surface Entry id");
			if (
				!(await findLemma(ctx, entry.ownerLemma)) ||
				(await findSurface(ctx, surfaceKey))
			) {
				return false;
			}
			await ctx.db.insert("ownedSurfaces", {
				surfaceKey,
				lemmaKey: lemmaKeyFor(entry.ownerLemma),
				entry,
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
			let entry = stored.entry;
			for (const operationValue of change.ops) {
				const operation = requireRecord(
					operationValue,
					"Reading patch operation",
				);
				if (operation.kind === "addAttestation") {
					const value = requireString(
						operation.value,
						"Reading attestation",
					);
					entry = {
						...entry,
						attestations: [...entry.attestations, value],
					};
				} else if (operation.kind === "applyKnowledgeChange") {
					throw new Error(
						"Dumdict Reading knowledge patches must be validated in the Node action and persisted through persistKnowledgeContribution.",
					);
				} else {
					throw new Error(
						`Unsupported Reading patch operation: ${String(operation.kind)}`,
					);
				}
			}
			await ctx.db.patch(stored._id, { entry });
			await syncAccumulatedKnowledge(
				ctx,
				"Reading",
				stored.readingKey,
				entry.knowledge,
			);
			return true;
		}
		case "createPendingSemanticRelation": {
			const record = requireRecord(
				change.record,
				"Pending Semantic Relation",
			);
			const locator = requireRecord(record.locator, "Pending locator");
			const pending = requireRecord(
				record.pending,
				"Pending relation value",
			);
			const target = requireRecord(
				pending.target,
				"Pending relation target",
			);
			const locatorKey = pendingLocatorKey(record);
			if (
				(await findPending(ctx, record)) ||
				!(await findReading(ctx, record.sourceReading))
			) {
				return false;
			}
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey,
				sourceReadingKey: requireString(
					locator.sourceReadingKey,
					"sourceReadingKey",
				),
				targetCanonicalForm: requireString(
					target.canonicalForm,
					"target canonicalForm",
				),
				record,
			});
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
		latestRevision: v.string(),
	}),
);

export const commitDumdictChanges = internalMutation({
	args: { baseRevision: v.string(), changes: v.array(v.any()) },
	returns: commitResultValidator,
	handler: async (ctx, args) => {
		if (args.changes.length > MAX_PLANNED_CHANGES) {
			throw new Error(
				`A commit supports at most ${MAX_PLANNED_CHANGES} planned changes.`,
			);
		}
		const state = await getState(ctx);
		const revision = revisionString(state?.revision ?? 0);
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
				if (
					await preconditionFails(ctx, precondition, revision, shadow)
				) {
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
	},
});
