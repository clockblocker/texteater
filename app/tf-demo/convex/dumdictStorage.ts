import { v } from "convex/values";
import { type Reading, readingFingerprint } from "dumling/reading";

import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { lemmaKeyFor } from "./model/linguisticKeys";
import {
	lemmaValue,
	readingValue,
	surfaceValue,
} from "./model/occurrenceAttestations";
import { dumdictPlannedChangeValidator } from "./model/validators";

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

function withoutKeys(record: AnyRecord, keys: readonly string[]): AnyRecord {
	const result = { ...record };
	for (const key of keys) delete result[key];
	return result;
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

async function findCanonicalLemma(ctx: ServerCtx, lemma: unknown) {
	return ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKeyFor(lemma)))
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
	if (!canonical) return null;
	const [entry, lemma] = await Promise.all([
		ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) => q.eq("readingId", canonical._id))
			.unique(),
		ctx.db.get(canonical.lemmaId),
	]);
	if (!entry || !lemma) return null;
	return {
		...canonical,
		entry: {
			...requireRecord(entry.record, "Reading Entry record"),
			reading: readingValue(canonical, lemma),
			attestations: [],
		},
		entryId: entry._id,
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
				.take(MAX_READING_CANDIDATES),
		]);
		if (!dictionaryLemma) return { revision, candidates: [] };
		const entries = await Promise.all(
			readings.map((reading) =>
				ctx.db
					.query("readingEntries")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", reading._id),
					)
					.unique(),
			),
		);
		return {
			revision,
			candidates: readings.flatMap((reading, index) => {
				const entry = entries[index];
				return entry
					? [
							{
								reading: {
									...requireRecord(
										entry.record,
										"Reading Entry record",
									),
									reading: readingValue(reading, lemma),
									attestations: [],
								},
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
		readingKey: v.string(),
		surfaceKey: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const [revision, lemma, reading, surface] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("lemmas")
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
						.query("surfaces")
						.withIndex("by_surface_key", (q) =>
							q.eq("surfaceKey", args.surfaceKey as string),
						)
						.unique()
				: null,
		]);
		const [dictionaryLemma, readingEntry, surfaceEntry] = await Promise.all(
			[
				lemma
					? ctx.db
							.query("dictionaryLemmas")
							.withIndex("by_lemma_id", (q) =>
								q.eq("lemmaId", lemma._id),
							)
							.unique()
					: null,
				reading
					? ctx.db
							.query("readingEntries")
							.withIndex("by_reading_id", (q) =>
								q.eq("readingId", reading._id),
							)
							.unique()
					: null,
				surface
					? ctx.db
							.query("ownedSurfaces")
							.withIndex("by_surface_id", (q) =>
								q.eq("surfaceId", surface._id),
							)
							.unique()
					: null,
			],
		);
		return {
			revision,
			...(lemma && dictionaryLemma
				? { existingLemma: { lemma: lemmaValue(lemma) } }
				: {}),
			...(reading && readingEntry && lemma
				? {
						existingReading: {
							...requireRecord(
								readingEntry.record,
								"Reading Entry record",
							),
							reading: readingValue(reading, lemma),
							attestations: [],
						},
					}
				: {}),
			existingOwnedSurfaces:
				surface && surfaceEntry && lemma
					? [
							{
								...requireRecord(
									surfaceEntry.record,
									"Owned Surface record",
								),
								id: surface.surfaceKey,
								ownerLemma: lemmaValue(lemma),
								surface: surfaceValue(surface, lemma),
								attestations: [],
							},
						]
					: [],
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
		const [entry, lemma] = reading
			? await Promise.all([
					ctx.db
						.query("readingEntries")
						.withIndex("by_reading_id", (q) =>
							q.eq("readingId", reading._id),
						)
						.unique(),
					ctx.db.get(reading.lemmaId),
				])
			: [null, null];
		return {
			revision,
			...(reading && entry && lemma
				? {
						reading: {
							...requireRecord(
								entry.record,
								"Reading Entry record",
							),
							reading: readingValue(reading, lemma),
							attestations: [],
						},
					}
				: {}),
		};
	},
});

type PreflightState = {
	lemmas: Map<string, boolean>;
	readings: Map<string, boolean>;
	surfaces: Map<string, boolean>;
	pendingRelations: Map<string, boolean>;
};

function createPreflightState(): PreflightState {
	return {
		lemmas: new Map(),
		readings: new Map(),
		surfaces: new Map(),
		pendingRelations: new Map(),
	};
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
			shadow.lemmas.set(lemmaKeyFor(record.lemma), true);
			return;
		}
		case "createReading": {
			const entry = requireRecord(change.entry, "Reading Entry");
			const key = readingIdentityKey(entry.reading);
			shadow.readings.set(key, true);
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
			for (const operationValue of change.ops) {
				const operation = requireRecord(
					operationValue,
					"Reading patch operation",
				);
				if (operation.kind === "addAttestation") {
					throw new Error(
						"tf-demo stores occurrence Attestations in its host graph, not in Dumdict Reading Entries.",
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
			const lemma = requireRecord(record.lemma, "Lemma");
			const lemmaKey = lemmaKeyFor(lemma);
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
				record: withoutKeys(entry, ["reading", "attestations"]),
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
			const entry: AnyRecord = requireRecord(
				stored.entry,
				"Stored Reading Entry",
			);
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
					throw new Error(
						"Dumdict Reading knowledge patches must be validated in the Node action and persisted through persistKnowledgeContribution.",
					);
				} else {
					throw new Error(
						`Unsupported Reading patch operation: ${String(operation.kind)}`,
					);
				}
			}
			await ctx.db.patch(stored.entryId, {
				record: withoutKeys(entry, ["reading", "attestations"]),
			});
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
