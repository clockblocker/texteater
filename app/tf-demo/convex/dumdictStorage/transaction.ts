import { canonicalJson, isRecord } from "common-utils";
import {
	authoredReading,
	deriveGrammaticalComponent,
	type GrammaticalComponent,
	selectAuthoredArticle,
} from "dumcorpus/inventories";
import {
	applyDumdictKnowledgeChange,
	type ChangePrecondition,
	impliedChangePreconditions,
	makeSurfaceId,
	ParsingError,
	type PlannedChangeOp,
	parseAsPlannedChangeOp,
	type ReadingEntry,
	type ReadingKnowledgeChange,
} from "dumdict/planning";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import {
	emojiDescriptionOf,
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { parseUnitAs } from "../../server/operationalParsing";
import type { Doc, Id } from "../_generated/dataModel";
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
	MAX_RELATIONS_PER_READING,
	pendingLocatorKey,
	storedReadingEntry,
	withoutSemanticRelationTargets,
} from "./storage";

type PlannedChange = PlannedChangeOp<"de">;
type GermanReadingEntry = ReadingEntry<"de">;
type SemanticRelationChange = Extract<
	ReadingKnowledgeChange<"de">["change"],
	{ aspect: "semanticRelations" }
>;

/** One edit to a source Reading's direct Semantic Relation edges. */
type RelationEdgeEdit = {
	readonly kind: SemanticRelationChange["kind"];
	readonly relation: Dumrel.DirectSemanticRelation;
	readonly targetKind: "lemma" | "reading";
	readonly targets: readonly unknown[];
};

/**
 * Parses one planned change at the write boundary. The Convex schema stores
 * Dumdict payloads as `v.any()`, so this is where they become typed; every
 * step after it reads the typed union.
 */
function parsePlannedChange(value: unknown): PlannedChange {
	const parsed = parseAsPlannedChangeOp(value, "de");
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
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
	reading: Dumling.Reading<"de">,
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
	precondition: ChangePrecondition<"de">,
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
			let entry = await preflightReadingEntry(
				ctx,
				change.reading,
				shadow,
			);
			if (!entry) throw divergedFromPreflight();
			for (const operation of change.ops) {
				if (operation.kind === "addAttestation")
					throw hostGraphOwnsAttestations();
				entry = applyDumdictKnowledgeChange(entry, operation.envelope);
			}
			shadow.readingEntries.set(
				readingIdentityKey(change.reading),
				entry,
			);
			return;
		}
	}
}

function edgeTargetKind(edge: Doc<"semanticRelationEdges">) {
	return edge.targetKind === "reading" || edge.targetReadingId !== undefined
		? "reading"
		: "lemma";
}

/** Resolves direct relation targets to their row IDs, deduplicated in order. */
async function relationTargetIds(
	ctx: MutationCtx,
	edit: RelationEdgeEdit,
	source: { readingId: Id<"readings">; lemmaId: Id<"lemmas"> },
): Promise<Array<Id<"readings"> | Id<"lemmas">>> {
	if (edit.targetKind === "reading") {
		const targets = await Promise.all(
			edit.targets.map((target) => findReading(ctx, target)),
		);
		const ids = [
			...new Set(
				targets.map((target) => {
					if (!target)
						throw new Error(
							"A Semantic Relation target Reading is missing.",
						);
					return target._id;
				}),
			),
		];
		if (ids.includes(source.readingId))
			throw new Error("A Reading cannot relate directly to itself.");
		return ids;
	}
	const targets = await Promise.all(
		edit.targets.map((target) => findLemma(ctx, target)),
	);
	const ids = [
		...new Set(
			targets.map((target) => {
				if (!target)
					throw new Error(
						"A Semantic Relation target Lemma is missing.",
					);
				return target.canonical._id;
			}),
		),
	];
	if (ids.includes(source.lemmaId))
		throw new Error("A Reading cannot relate directly to its own Lemma.");
	return ids;
}

/**
 * Stores one relation edit as edges whose creation order is the relation's
 * target order: Contribute appends the targets it lacks, Correct replaces
 * the targets in its own order, and Retract removes the relation.
 */
async function syncRelationEdges(
	ctx: MutationCtx,
	source: { readingId: Id<"readings">; lemmaId: Id<"lemmas"> },
	edit: RelationEdgeEdit,
): Promise<void> {
	if (edit.targetKind === "reading" && edit.relation !== "synonym")
		throw new Error(
			"Reading-targeted direct claims currently support Synonym only.",
		);
	const existing = await ctx.db
		.query("semanticRelationEdges")
		.withIndex(
			"by_source_reading_id_and_relation_and_target_lemma_id",
			(q) =>
				q
					.eq("sourceReadingId", source.readingId)
					.eq("relation", edit.relation),
		)
		.take(MAX_RELATIONS_PER_READING + 1);
	if (existing.length > MAX_RELATIONS_PER_READING) {
		throw new Error(
			`A Reading supports at most ${MAX_RELATIONS_PER_READING} Semantic Relation edges.`,
		);
	}
	if (existing.some((edge) => edgeTargetKind(edge) !== edit.targetKind))
		throw new Error(
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	existing.sort((a, b) => a._creationTime - b._creationTime);
	if (edit.kind === "Retract") {
		await Promise.all(existing.map((edge) => ctx.db.delete(edge._id)));
		return;
	}
	const targetIds = await relationTargetIds(ctx, edit, source);
	const storedIds = existing.map((edge) =>
		edit.targetKind === "reading"
			? edge.targetReadingId
			: edge.targetLemmaId,
	);
	let inserted: readonly (Id<"readings"> | Id<"lemmas">)[];
	if (edit.kind === "Correct") {
		if (
			storedIds.length === targetIds.length &&
			storedIds.every((id, index) => id === targetIds[index])
		)
			return;
		await Promise.all(existing.map((edge) => ctx.db.delete(edge._id)));
		inserted = targetIds;
	} else {
		const stored = new Set<string | undefined>(storedIds);
		inserted = targetIds.filter((id) => !stored.has(id));
	}
	// Sequential inserts give the edges their target order (read by creation time).
	for (const targetId of inserted)
		await ctx.db.insert(
			"semanticRelationEdges",
			edit.targetKind === "reading"
				? {
						sourceReadingId: source.readingId,
						targetKind: "reading",
						targetReadingId: targetId as Id<"readings">,
						relation: edit.relation,
					}
				: {
						sourceReadingId: source.readingId,
						targetKind: "lemma",
						targetLemmaId: targetId as Id<"lemmas">,
						relation: edit.relation,
					},
		);
}

function relationEdgeEdit(change: SemanticRelationChange): RelationEdgeEdit {
	return {
		kind: change.kind,
		relation: change.relation,
		targetKind: change.targetKind === "reading" ? "reading" : "lemma",
		targets: "value" in change ? change.value : [],
	};
}

/** The edges a new Reading's Knowledge names, as Contribute edits. */
function knowledgeRelationEdits(
	knowledge: GermanReadingEntry["knowledge"],
): RelationEdgeEdit[] {
	const relations = knowledge?.semanticRelations;
	if (!relations) return [];
	const targetKind = relations.targetKind === "reading" ? "reading" : "lemma";
	return Object.entries(relations).flatMap(([relation, targets]) =>
		relation === "targetKind" || !Array.isArray(targets)
			? []
			: [
					{
						kind: "Contribute" as const,
						// Every key beside targetKind names a direct relation.
						relation: relation as Dumrel.DirectSemanticRelation,
						targetKind,
						targets,
					},
				],
	);
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
			const reading = parseUnitAs(entry.reading, "Reading", "de");
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
			const surface = parseUnitAs(entry.surface, "Surface", "de");
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
			let entry = storedReadingEntry(stored);
			const knowledgeChanges: ReadingKnowledgeChange<"de">["change"][] =
				[];
			for (const operation of change.ops) {
				if (operation.kind === "addAttestation")
					throw hostGraphOwnsAttestations();
				const knowledgeChange = operation.envelope.change;
				knowledgeChanges.push(knowledgeChange);
				if (knowledgeChange.aspect === "semanticRelations")
					await syncRelationEdges(
						ctx,
						source,
						relationEdgeEdit(knowledgeChange),
					);
				entry = applyDumdictKnowledgeChange(entry, operation.envelope);
			}
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
	for (const change of changes) await applyChange(ctx, change);

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
	const id = makeSurfaceId("de", surface);
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
