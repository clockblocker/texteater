import { canonicalJson, isRecord } from "common-utils";
import {
	authoredReading,
	deriveGrammaticalComponent,
	type GrammaticalComponent,
	selectAuthoredArticle,
} from "dumcorpus/inventories";
import {
	applyDumdictKnowledgeChanges,
	type ChangePrecondition,
	impliedChangePreconditions,
	makeSurfaceId,
	ParsingError,
	type PlannedChangeOp,
	parseAsPlannedChangeOp,
	type ReadingEntry,
} from "dumdict/planning";
import type * as Dumling from "dumling/types";
import {
	emojiDescriptionOf,
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { parseUnitAs } from "../../server/operationalParsing";
import { SUPPORTED_TARGET_LANGUAGE_VALUES } from "../../shared/supported-target-language";
import type { MutationCtx } from "../_generated/server";
import { type AnyRecord, requireRecord } from "../model/readingKnowledge";
import {
	attachPendingShadowReference,
	ensureAccumulatedKnowledgeStatus,
	pendingShadowDescriptor,
	replaceAccumulatedKnowledge,
} from "../model/shadows";
import {
	DICTIONARY_REVISION,
	findCanonicalLemma,
	findCanonicalReading,
	findCanonicalSurface,
	findLemma,
	findPending,
	findReading,
	findSurface,
	MAX_PATCH_OPS,
	MAX_PLANNED_CHANGES,
	pendingLocatorKey,
	storedReadingEntry,
	withoutSemanticRelationTargets,
} from "./storage";

import {
	knowledgeRelationEdits,
	relationEdgeEdit,
	syncRelationEdges,
} from "./transactionRelations";

type PlannedChange = PlannedChangeOp<Dumling.Language>;
type GermanReadingEntry = ReadingEntry<Dumling.Language>;
/**
 * Parses one planned change at the write boundary. The Convex schema stores
 * Dumdict payloads as `v.any()`, so this is where they become typed; every
 * step after it reads the typed union.
 */
function parsePlannedChange(value: unknown): PlannedChange {
	const outcomes = SUPPORTED_TARGET_LANGUAGE_VALUES.map((language) =>
		parseAsPlannedChangeOp(value, language),
	);
	for (const parsed of outcomes)
		if (!(parsed instanceof ParsingError)) return parsed;
	throw outcomes[0];
}

function hostGraphOwnsAttestations(): Error {
	return new Error(
		"tf-demo stores occurrence Attestations in its host graph, not in Dumdict entries.",
	);
}

function assertNoAttestations(attestations: readonly string[]): void {
	if (attestations.length > 0) throw hostGraphOwnsAttestations();
}

function divergedFromPreflight(): Error {
	return new Error("Dumdict preflight and transactional apply diverged.");
}

type PreflightState = {
	lemmas: Map<string, boolean>;
	readings: Map<string, boolean>;
	readingEntries: Map<string, GermanReadingEntry | null>;
	surfaces: Map<string, boolean>;
	pendingRelations: Map<string, boolean>;
	/** Each Reading patch's entry before and after the preflight applied it. */
	patchedEntries: Map<PlannedChange, PatchedEntry>;
};

type PatchedEntry = {
	readonly from: GermanReadingEntry;
	readonly to: GermanReadingEntry;
};

function createPreflightState(): PreflightState {
	return {
		lemmas: new Map(),
		readings: new Map(),
		readingEntries: new Map(),
		surfaces: new Map(),
		pendingRelations: new Map(),
		patchedEntries: new Map(),
	};
}

async function preflightReadingEntry(
	ctx: MutationCtx,
	reading: Dumling.Reading<Dumling.Language>,
	shadow: PreflightState,
): Promise<GermanReadingEntry | null> {
	const key = readingIdentityKey(reading);
	if (shadow.readingEntries.has(key)) {
		return shadow.readingEntries.get(key) ?? null;
	}
	const stored = await findReading(ctx, reading);
	const entry = stored ? storedReadingEntry(stored) : null;
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
	precondition: ChangePrecondition<Dumling.Language>,
	shadow: PreflightState,
): Promise<boolean> {
	switch (precondition.kind) {
		// The transaction's own reads guard a plan, so no revision can be stale.
		case "revisionMatches":
			return false;
		case "lemmaExists":
		case "lemmaMissing": {
			const exists = await cachedPresence(
				shadow.lemmas,
				lemmaIdentityKey(precondition.lemma),
				() => findLemma(ctx, precondition.lemma),
			);
			return precondition.kind === "lemmaExists" ? !exists : exists;
		}
		case "readingExists":
		case "readingMissing": {
			const exists = await cachedPresence(
				shadow.readings,
				readingIdentityKey(precondition.reading),
				() => findReading(ctx, precondition.reading),
			);
			return precondition.kind === "readingExists" ? !exists : exists;
		}
		case "surfaceExists":
		case "surfaceMissing": {
			const { surfaceId } = precondition;
			const exists = await cachedPresence(
				shadow.surfaces,
				surfaceId,
				() => findSurface(ctx, surfaceId),
			);
			return precondition.kind === "surfaceExists" ? !exists : exists;
		}
		case "pendingRelationExists":
		case "pendingRelationMissing": {
			const exists = await cachedPresence(
				shadow.pendingRelations,
				pendingLocatorKey(precondition.record),
				() => findPending(ctx, precondition.record),
			);
			return precondition.kind === "pendingRelationExists"
				? !exists
				: exists;
		}
		case "readingAttestationMissing":
			throw hostGraphOwnsAttestations();
	}
}

/**
 * Applies a Reading patch's Knowledge Changes to its entry in one Dumdict
 * call, so the Knowledge is parsed once going in and once coming out. An
 * Attestation op throws, after the changes before it apply as they would one
 * by one.
 */
function applyPatchOps(
	entry: GermanReadingEntry,
	ops: Extract<PlannedChange, { type: "patchReading" }>["ops"],
): GermanReadingEntry {
	const attestationAt = ops.findIndex(
		(operation) => operation.kind === "addAttestation",
	);
	const applied = applyDumdictKnowledgeChanges(
		entry,
		ops
			.slice(0, attestationAt === -1 ? undefined : attestationAt)
			.flatMap((operation) =>
				operation.kind === "applyKnowledgeChange"
					? [operation.envelope]
					: [],
			),
	);
	if (attestationAt !== -1) throw hostGraphOwnsAttestations();
	return applied;
}

/**
 * The entry a Reading patch writes. When the stored entry is the one the
 * preflight patched, the preflight's result is it: the same changes applied
 * to the same entry, already parsed by Dumrel on the way out. Otherwise the
 * patch applies again to what is stored.
 */
function patchedEntry(
	stored: GermanReadingEntry,
	change: Extract<PlannedChange, { type: "patchReading" }>,
	preflighted: PatchedEntry | undefined,
): GermanReadingEntry {
	return preflighted &&
		canonicalJson(preflighted.from) === canonicalJson(stored)
		? preflighted.to
		: applyPatchOps(stored, change.ops);
}

async function advancePreflightState(
	ctx: MutationCtx,
	change: PlannedChange,
	shadow: PreflightState,
): Promise<void> {
	switch (change.type) {
		case "createLemma":
			shadow.lemmas.set(lemmaIdentityKey(change.record.lemma), true);
			return;
		case "createReading": {
			assertNoAttestations(change.entry.attestations);
			const entry = withAuthoredArticleKnowledge(change.entry);
			const key = readingIdentityKey(entry.reading);
			shadow.readings.set(key, true);
			shadow.readingEntries.set(key, structuredClone(entry));
			return;
		}
		case "createOwnedSurface":
			assertNoAttestations(change.entry.attestations);
			shadow.surfaces.set(change.entry.id, true);
			return;
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
			if (change.ops.length > MAX_PATCH_OPS) {
				throw new Error(
					`A Reading patch supports at most ${MAX_PATCH_OPS} operations.`,
				);
			}
			const entry = await preflightReadingEntry(
				ctx,
				change.reading,
				shadow,
			);
			if (!entry) throw divergedFromPreflight();
			const patched = applyPatchOps(entry, change.ops);
			shadow.patchedEntries.set(change, { from: entry, to: patched });
			shadow.readingEntries.set(
				readingIdentityKey(change.reading),
				patched,
			);
			return;
		}
	}
}

/** The Reading Entry row's record: content, with relation targets kept as edges. */
function readingEntryRecord(entry: GermanReadingEntry): AnyRecord {
	const {
		reading: _reading,
		attestations: _attestations,
		knowledge,
		...content
	} = entry;
	const base = withoutSemanticRelationTargets(knowledge);
	return base === undefined ? content : { ...content, knowledge: base };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
async function applyChange(
	ctx: MutationCtx,
	change: PlannedChange,
	preflight?: PreflightState,
): Promise<void> {
	switch (change.type) {
		case "createLemma": {
			const { lemma } = change.record;
			if (await findLemma(ctx, lemma)) throw divergedFromPreflight();
			const canonical = await findCanonicalLemma(ctx, lemma);
			const lemmaId =
				canonical?._id ??
				(await ctx.db.insert("lemmas", {
					lemmaKey: lemmaIdentityKey(lemma),
					language: lemma.language,
					family: lemma.family,
					kind: lemma.kind,
					canonicalForm: lemma.canonicalForm,
					foldedCanonicalForm: foldedCanonicalForm(lemma),
					coreFeatures: lemma.coreFeatures,
				}));
			await ctx.db.insert("dictionaryLemmas", { lemmaId });
			return;
		}
		case "createReading": {
			const entry = withAuthoredArticleKnowledge(change.entry);
			// Stored and compared as Dumling parses it (ADR 0031).
			const reading = parseUnitAs(entry.reading, "Reading");
			const emojiDescription = emojiDescriptionOf(reading);
			const storedLemma = await findLemma(ctx, reading.lemma);
			if (!storedLemma || (await findReading(ctx, reading)))
				throw divergedFromPreflight();
			const readingKey = readingIdentityKey(reading);
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
					...(emojiDescription === undefined
						? {}
						: { emojiDescription }),
				}));
			await ctx.db.insert("readingEntries", {
				readingId,
				record: readingEntryRecord(entry),
			});
			const source = { readingId, lemmaId: storedLemma.canonical._id };
			for (const edit of knowledgeRelationEdits(entry.knowledge))
				await syncRelationEdges(ctx, source, edit);
			const baseKnowledge = withoutSemanticRelationTargets(
				entry.knowledge,
			);
			if (baseKnowledge !== undefined) {
				await replaceAccumulatedKnowledge(
					ctx,
					readingKey,
					baseKnowledge,
				);
			} else if (entry.knowledge !== undefined) {
				await ensureAccumulatedKnowledgeStatus(ctx, readingKey);
			}
			return;
		}
		case "createOwnedSurface": {
			const { entry } = change;
			const storedLemma = await findLemma(ctx, entry.ownerLemma);
			if (!storedLemma || (await findSurface(ctx, entry.id)))
				throw divergedFromPreflight();
			const surface = parseUnitAs(entry.surface, "Surface");
			if (entry.id !== makeSurfaceId(surface.language, surface))
				throw new Error(
					"Surface Entry key does not match its current value",
				);
			const reference = deriveGrammaticalComponent(surface);
			if (reference)
				await materializeGrammaticalComponent(ctx, reference);
			const canonical = await findCanonicalSurface(ctx, entry.id);
			if (canonical && canonical.lemmaId !== storedLemma.canonical._id) {
				throw new Error(
					"Canonical Surface does not match its dictionary proposal.",
				);
			}
			const surfaceId =
				canonical?._id ??
				(await ctx.db.insert("surfaces", {
					surfaceKey: entry.id,
					lemmaId: storedLemma.canonical._id,
					language: surface.language,
					normalizedSurface: surface.normalizedSurface,
					spelling: surface.spelling,
					surfaceFeatures: surface.surfaceFeatures,
					...("inflectionalFeatures" in surface &&
					surface.inflectionalFeatures !== undefined
						? { inflectionalFeatures: surface.inflectionalFeatures }
						: {}),
				}));
			const {
				id: _id,
				ownerLemma: _ownerLemma,
				surface: _surface,
				attestations: _attestations,
				...record
			} = entry;
			await ctx.db.insert("ownedSurfaces", { surfaceId, record });
			return;
		}
		case "patchReading": {
			const stored = await findReading(ctx, change.reading);
			if (!stored) throw divergedFromPreflight();
			const source = { readingId: stored._id, lemmaId: stored.lemmaId };
			const knowledgeChanges = change.ops.flatMap((operation) =>
				operation.kind === "applyKnowledgeChange"
					? [operation.envelope.change]
					: [],
			);
			for (const knowledgeChange of knowledgeChanges)
				if (knowledgeChange.aspect === "semanticRelations")
					await syncRelationEdges(
						ctx,
						source,
						relationEdgeEdit(knowledgeChange),
					);
			const entry = patchedEntry(
				storedReadingEntry(stored),
				change,
				preflight?.patchedEntries.get(change),
			);
			await ctx.db.patch(stored.entryId, {
				record: readingEntryRecord(entry),
			});
			const baseKnowledge = withoutSemanticRelationTargets(
				entry.knowledge,
			);
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
			return;
		}
		case "createPendingSemanticRelation": {
			const { record } = change;
			if (
				(await findPending(ctx, record)) ||
				!(await findReading(ctx, record.sourceReading))
			)
				throw divergedFromPreflight();
			const shadowId = await attachPendingShadowReference(ctx, record);
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey: pendingLocatorKey(record),
				sourceReadingKey: record.locator.sourceReadingKey,
				targetFoldedCanonicalForm: foldedCanonicalForm(
					pendingShadowDescriptor(record),
				),
				shadowId,
				record,
			});
			await ensureAccumulatedKnowledgeStatus(
				ctx,
				record.locator.sourceReadingKey,
			);
			return;
		}
		case "deletePendingSemanticRelation": {
			const stored = await findPending(ctx, change.record);
			if (!stored) throw divergedFromPreflight();
			await ctx.db.delete(stored._id);
			return;
		}
	}
}

/**
 * Applies one Dumdict plan inside the caller's transaction. Each change is
 * parsed once, then a preflight checks its stated and implied preconditions
 * against the transaction's reads and the changes before it, so a conflict
 * returns before any write and the writes that follow cannot fail on state.
 */
export async function applyDumdictPlanInTransaction(
	ctx: MutationCtx,
	args: { readonly changes: readonly unknown[] },
) {
	if (args.changes.length > MAX_PLANNED_CHANGES) {
		throw new Error(
			`A commit supports at most ${MAX_PLANNED_CHANGES} planned changes.`,
		);
	}
	const changes = args.changes.map(parsePlannedChange);
	const shadow = createPreflightState();
	for (const change of changes) {
		for (const precondition of [
			...change.preconditions,
			...impliedChangePreconditions(change),
		]) {
			if (await preconditionFails(ctx, precondition, shadow)) {
				return {
					status: "conflict" as const,
					code: "semanticPreconditionFailed" as const,
				};
			}
		}
		await advancePreflightState(ctx, change, shadow);
	}
	for (const change of changes) await applyChange(ctx, change, shadow);

	return { status: "committed" as const, nextRevision: DICTIONARY_REVISION };
}

/** Materializes the grammatical component without creating another occurrence. */
export async function materializeGrammaticalComponent(
	ctx: MutationCtx,
	reference: GrammaticalComponent,
) {
	const { reading, surface } = reference;
	const empty = { notes: "", attestedTranslations: [], attestations: [] };
	if (!(await findLemma(ctx, reading.lemma)))
		await applyChange(ctx, {
			type: "createLemma",
			record: { lemma: reading.lemma },
			preconditions: [],
		});
	if (!(await findReading(ctx, reading)))
		await applyChange(ctx, {
			type: "createReading",
			entry: { reading, ...empty },
			preconditions: [],
		});
	await completeAuthoredComponentKnowledge(ctx, reading);
	const id = makeSurfaceId(surface.language, surface);
	if (!(await findSurface(ctx, id)))
		await applyChange(ctx, {
			type: "createOwnedSurface",
			entry: { id, ownerLemma: surface.lemma, surface, ...empty },
			preconditions: [],
		});
}

/**
 * Completes reviewed component entries outside a planned commit, without
 * replacing existing Knowledge or creating encounters.
 */
export async function completeAuthoredComponentKnowledge(
	ctx: MutationCtx,
	reading: unknown,
) {
	const authored = authoredReading(reading);
	if (!authored) return false;
	const stored = await findReading(ctx, authored.reading);
	if (!stored) return false;
	const accumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", stored.readingKey),
		)
		.unique();
	const entry = await ctx.db.get(stored.entryId);
	if (!entry) return false;
	const record = requireRecord(entry.record, "Reading Entry record");
	const knowledge = {
		...optionalRecord(withoutSemanticRelationTargets(authored.knowledge)),
		...optionalRecord(record.knowledge),
		...accumulated?.knowledge,
	};
	const knowledgeJson = canonicalJson(knowledge);
	if (
		record.knowledge !== undefined &&
		canonicalJson(record.knowledge) === knowledgeJson &&
		accumulated !== null &&
		canonicalJson(accumulated.knowledge) === knowledgeJson
	)
		return false;
	await ctx.db.patch(entry._id, { record: { ...record, knowledge } });
	// An authored member stores all its Knowledge (ADR 0021).
	await replaceAccumulatedKnowledge(ctx, stored.readingKey, knowledge, {
		status: "Full",
	});
	return true;
}

function optionalRecord(value: unknown): AnyRecord | null {
	return isRecord(value) ? value : null;
}

/** A reviewed article's Reading Entry starts with its authored Knowledge. */
function withAuthoredArticleKnowledge(
	entry: GermanReadingEntry,
): GermanReadingEntry {
	const authored = selectAuthoredArticle(entry.reading);
	if (!authored) return entry;
	return {
		...entry,
		// Authored Knowledge is Dumdict Knowledge for its own Reading.
		knowledge: {
			...optionalRecord(
				withoutSemanticRelationTargets(authored.knowledge),
			),
			...entry.knowledge,
		} as GermanReadingEntry["knowledge"],
	};
}
