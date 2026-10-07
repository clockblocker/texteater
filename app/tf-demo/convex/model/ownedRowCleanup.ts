import type { GenericTableInfo, QueryInitializer } from "convex/server";
import { type Infer, type VLiteral, type VUnion, v } from "convex/values";
import type { DataModel, Doc, Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * The order in which a pruned Reading's or Lemma's rows are deleted, stated
 * once. Each owner's cleanup walks its phase list one item at a time, in
 * bounded batches; the cursor validators and phase order derive from these
 * lists, and `tests/post-reset-smoke.test.ts` checks the Reading list against
 * every Reading-owned table in the schema.
 */

/** The owner keys a uniform phase may look its rows up by. */
type OwnerKeys = {
	readingKey: string;
	readingId: Id<"readings">;
	lemmaId: Id<"lemmas">;
};

type OwnerKeyName = keyof OwnerKeys;

type TableIndexes<T extends TableNames> = DataModel[T]["indexes"];

/** The fields of `T` that hold an owner key of type `Key`. */
type FieldsHolding<T extends TableNames, Key> = {
	[F in keyof Doc<T>]: Key extends Doc<T>[F] ? F : never;
}[keyof Doc<T>] &
	string;

/** The indexes of `T` whose first field is `F`. */
type IndexLeadingWith<T extends TableNames, F extends string> = {
	[I in keyof TableIndexes<T>]: TableIndexes<T>[I] extends readonly [
		F,
		...unknown[],
	]
		? I
		: never;
}[keyof TableIndexes<T>] &
	string;

/** A phase that deletes the rows of one table found by an owner index. */
type OwnedRowsPhase<P extends string, K extends OwnerKeyName> = {
	readonly phase: P;
	readonly keyedBy: K;
	readonly table: TableNames;
	readonly field: string;
	readonly index: string;
};

/** A phase with its own code; `tables` names the tables it deletes from. */
type CustomPhase<P extends string> = {
	readonly phase: P;
	readonly tables?: readonly TableNames[];
};

type CleanupPhase = OwnedRowsPhase<string, OwnerKeyName> | CustomPhase<string>;

function ownedRows<
	const P extends string,
	K extends OwnerKeyName,
	T extends TableNames,
	F extends FieldsHolding<T, OwnerKeys[K]>,
>(
	phase: P,
	keyedBy: K,
	table: T,
	field: F,
	index: IndexLeadingWith<T, F>,
): OwnedRowsPhase<P, K> {
	return { phase, keyedBy, table, field, index };
}

/**
 * Reading cleanup phases, in order. Attempts go first: once an attempt is
 * gone its in-flight publication is rejected, so it cannot write Knowledge
 * back behind a later phase. The Reading goes last, because the phases keyed
 * by `readingId` find the Reading by its key.
 */
export const READING_CLEANUP_PHASES = [
	{
		phase: "GenerationAttempts",
		tables: ["knowledgeGenerationAttempts", "knowledgeProductionRuns"],
	},
	ownedRows(
		"PendingRelations",
		"readingKey",
		"pendingSemanticRelations",
		"sourceReadingKey",
		"by_source_reading_key",
	),
	ownedRows(
		"KnowledgeChanges",
		"readingKey",
		"knowledgeChanges",
		"ownerReadingKey",
		"by_owner_reading_key",
	),
	ownedRows(
		"StructuralReferences",
		"readingKey",
		"structuralShadowReferences",
		"ownerReadingKey",
		"by_owner_reading_key",
	),
	{ phase: "AccumulatedKnowledge", tables: ["accumulatedKnowledge"] },
	ownedRows(
		"GeneratedRelationRuns",
		"readingId",
		"generatedRelationRuns",
		"sourceReadingId",
		"by_source_reading_id",
	),
	ownedRows(
		"GeneratedRelationProposals",
		"readingId",
		"generatedRelationProposals",
		"sourceReadingId",
		"by_source_reading_id",
	),
	ownedRows(
		"PersonalAnnotations",
		"readingId",
		"personalAnnotations",
		"readingId",
		"by_reading_id",
	),
	ownedRows(
		"OutgoingSemanticEdges",
		"readingId",
		"semanticRelationEdges",
		"sourceReadingId",
		"by_source_reading_id_and_relation_and_target_lemma_id",
	),
	ownedRows(
		"IncomingSemanticEdges",
		"readingId",
		"semanticRelationEdges",
		"targetReadingId",
		"by_target_reading_id",
	),
	/** The Reading with its entry. */
	{ phase: "Reading", tables: ["readingEntries"] },
] as const satisfies readonly CleanupPhase[];

/** Reading-owned tables whose rows leave with something other than the sweep. */
export const READING_CLEANUP_EXEMPTIONS: Readonly<
	Partial<Record<TableNames, string>>
> = {
	readings: "the swept Reading itself",
	attestations: "a Reading with an Attestation is never pruned",
	definitionTexts: "removed with the Definition Text before pruning",
	resolutionSessions: "removed with their Sentence",
	visitorClicks: "a click's Reading is its Attestation's, so never pruned",
};

/**
 * Lemma cleanup phases, in order. Surfaces go first: a Surface with an
 * Attestation keeps its Lemma, and the sweep stops there before touching
 * anything else. The Lemma goes last, with its dictionary entry.
 */
export const LEMMA_CLEANUP_PHASES = [
	{ phase: "Surfaces" },
	ownedRows(
		"IncomingSemanticEdges",
		"lemmaId",
		"semanticRelationEdges",
		"targetLemmaId",
		"by_target_lemma_id",
	),
	{ phase: "Lemma" },
] as const satisfies readonly CleanupPhase[];

type PhaseOf<Phases extends readonly CleanupPhase[]> = Phases[number]["phase"];

function phaseValidator<const Phases extends readonly CleanupPhase[]>(
	phases: Phases,
): VUnion<PhaseOf<Phases>, VLiteral<PhaseOf<Phases>>[]> {
	return v.union(...phases.map(({ phase }) => v.literal(phase))) as VUnion<
		PhaseOf<Phases>,
		VLiteral<PhaseOf<Phases>>[]
	>;
}

export const readingCleanupCursorValidator = v.object({
	itemIndex: v.number(),
	phase: phaseValidator(READING_CLEANUP_PHASES),
});

export type ReadingCleanupCursor = Infer<typeof readingCleanupCursorValidator>;

export const lemmaCleanupCursorValidator = v.object({
	itemIndex: v.number(),
	phase: phaseValidator(LEMMA_CLEANUP_PHASES),
});

export type LemmaCleanupCursor = Infer<typeof lemmaCleanupCursorValidator>;

type CleanupCursor<P extends string> = { itemIndex: number; phase: P };

/** The cursor at the first phase of the first item. */
export function cleanupStart<Phases extends readonly CleanupPhase[]>(
	phases: Phases,
): CleanupCursor<PhaseOf<Phases>> {
	return { itemIndex: 0, phase: firstPhase(phases) };
}

/** The cursor at the first phase of the next item. */
export function nextItem<Phases extends readonly CleanupPhase[]>(
	phases: Phases,
	cursor: CleanupCursor<PhaseOf<Phases>>,
): CleanupCursor<PhaseOf<Phases>> {
	return { itemIndex: cursor.itemIndex + 1, phase: firstPhase(phases) };
}

/** The cursor at the phase after `cursor`'s, or the next item after the last. */
export function nextPhase<Phases extends readonly CleanupPhase[]>(
	phases: Phases,
	cursor: CleanupCursor<PhaseOf<Phases>>,
): CleanupCursor<PhaseOf<Phases>> {
	const index = phases.findIndex(({ phase }) => phase === cursor.phase);
	const next = phases[index + 1];
	return next
		? { itemIndex: cursor.itemIndex, phase: next.phase }
		: nextItem(phases, cursor);
}

/** The phase entry `phase` names in `phases`. */
export function cleanupPhase<
	Phases extends readonly CleanupPhase[],
	P extends PhaseOf<Phases>,
>(phases: Phases, phase: P): Extract<Phases[number], { phase: P }> {
	const found = phases.find((entry) => entry.phase === phase);
	if (!found) throw new Error(`Unknown cleanup phase ${phase}.`);
	return found as Extract<Phases[number], { phase: P }>;
}

function firstPhase<Phases extends readonly CleanupPhase[]>(
	phases: Phases,
): PhaseOf<Phases> {
	const first = phases[0];
	if (!first) throw new Error("A cleanup needs at least one phase.");
	return first.phase;
}

/** Deletes up to `limit` rows `phase` finds for `key`; returns how many. */
export async function deleteOwnedRows<K extends OwnerKeyName>(
	ctx: MutationCtx,
	phase: OwnedRowsPhase<string, K>,
	key: OwnerKeys[K],
	limit: number,
): Promise<number> {
	// `ownedRows` checked that the index leads with `field` and that the
	// field holds this owner key, which the generic query cannot express.
	const query = ctx.db.query(
		phase.table,
	) as unknown as QueryInitializer<GenericTableInfo>;
	const rows = await query
		.withIndex(phase.index, (q) => q.eq(phase.field, key))
		.take(limit);
	await Promise.all(
		rows.map((row) => ctx.db.delete(row._id as Id<TableNames>)),
	);
	return rows.length;
}
