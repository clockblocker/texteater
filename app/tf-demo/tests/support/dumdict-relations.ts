import { type DumdictPlan, makeSurfaceId } from "dumdict";
import type * as Dumling from "dumling/types";
import type { Id, TableNames } from "../../convex/_generated/dataModel";
import {
	applyDumdictPlanInTransaction,
	createDumdictTransaction,
	type DumdictTransaction,
	dictionaryPlanResult,
	findReadingByKey,
	loadReadingEntryContextSlice,
	type ReadingEntryContextArgs,
} from "../../convex/model/dumdictTransaction";
import schema from "../../convex/schema";
import {
	emojiDescriptionOf,
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { createTestConvex, type TestConvexDb } from "./convex";

export const verbFeatures = {
	lexicallyReflexive: null,
	hasSepPrefix: null,
} as const;

export const gehenLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "gehen",
	coreFeatures: verbFeatures,
} as const;
export const laufenLemma = { ...gehenLemma, canonicalForm: "laufen" } as const;
export const springenLemma = {
	...gehenLemma,
	canonicalForm: "springen",
} as const;
export const gehenReading = {
	unitKind: "Reading",
	lemma: gehenLemma,
	emojiDescription: "🚶",
} as const;
export const laufenReading = {
	unitKind: "Reading",
	lemma: laufenLemma,
	emojiDescription: "🏃",
} as const;
export const springenReading = {
	unitKind: "Reading",
	lemma: springenLemma,
	emojiDescription: "🦘",
} as const;
/** An empty Reading note; tf-demo's host graph keeps its occurrences. */
export const note = {
	attestedTranslations: [],
	attestationLinks: [],
	notes: "",
};

/** An empty owned-Surface note. */
export const surfaceNote = {
	attestedTranslations: [],
	attestations: [],
	notes: "",
};

export function surface(normalizedSurface: string) {
	return {
		unitKind: "Surface" as const,
		inflectionalFeatures: null,
		language: "de" as const,
		normalizedSurface,
		spelling: { kind: "Canonical" as const },

		surfaceFeatures: null,
		lemma: gehenLemma,
	};
}

/** Stores a Lemma and its dictionary membership as the dictionary does. */
export async function insertDictionaryLemma(
	t: TestConvexDb,
	lemma: Dumling.Lemma<"de">,
): Promise<Id<"lemmas">> {
	const { unitKind: _, ...stored } = lemma;
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemma),
			...stored,
			foldedCanonicalForm: foldedCanonicalForm(lemma),
		});
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		return lemmaId;
	});
}

/** Stores a Reading and its empty Reading Entry as the dictionary does. */
export async function insertReading(
	t: TestConvexDb,
	lemmaId: Id<"lemmas">,
	reading: Dumling.Reading<"de">,
	record: Record<string, unknown> = note,
): Promise<Id<"readings">> {
	return t.run(async (ctx) => {
		const readingId = await ctx.db.insert("readings", {
			readingKey: readingIdentityKey(reading),
			lemmaId,
			emojiDescription: emojiDescriptionOf(reading),
		});
		await ctx.db.insert("readingEntries", { readingId, record });
		return readingId;
	});
}

/** The `gehen` Reading with two owned Surfaces. */
export async function seededDictionary(
	options: { readonly gehenRecord?: Record<string, unknown> } = {},
) {
	const t = createTestConvex();
	const gehenLemmaId = await insertDictionaryLemma(t, gehenLemma);
	const gehenReadingId = await insertReading(
		t,
		gehenLemmaId,
		gehenReading,
		options.gehenRecord,
	);
	await t.run(async (ctx) => {
		for (const { unitKind: _, lemma: __, ...stored } of [
			surface("gehen"),
			surface("ging"),
		]) {
			const surfaceId = await ctx.db.insert("surfaces", {
				surfaceKey: makeSurfaceId(
					"de",
					surface(stored.normalizedSurface),
				),
				lemmaId: gehenLemmaId,
				...stored,
			});
			await ctx.db.insert("ownedSurfaces", {
				surfaceId,
				record: surfaceNote,
			});
		}
	});
	return { t, gehenLemmaId, gehenReadingId };
}

export function locatorKey(locator: {
	sourceReadingKey: string;
	relation: string;
	targetPendingId: string;
}): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

/** Runs one Dictionary workflow the way a host mutation does. */
export function inTransaction<Result>(
	t: TestConvexDb,
	run: (dictionary: DumdictTransaction) => Promise<Result>,
) {
	return t.run((ctx) => run(createDumdictTransaction(ctx)));
}

export function readingEntryContext(
	t: TestConvexDb,
	request: ReadingEntryContextArgs,
) {
	return t.run((ctx) => loadReadingEntryContextSlice(ctx, request));
}

/** The stored Reading Entry a patch reads. */
export function readingEntry(
	t: TestConvexDb,
	reading: Parameters<typeof readingIdentityKey>[0],
) {
	return t.run(
		async (ctx) =>
			(await findReadingByKey(ctx, readingIdentityKey(reading)))?.entry,
	);
}

/** Commits a plan through the mutation-side applier in one transaction. */
export function commitInTransaction(t: TestConvexDb, plan: DumdictPlan<"de">) {
	return t.run((ctx) =>
		applyDumdictPlanInTransaction(ctx, dictionaryPlanResult(plan)),
	);
}

export function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/** Every stored row, by table, so a failed write can be shown to leave no trace. */
export function snapshot(t: TestConvexDb) {
	return t.run(async (ctx) =>
		Object.fromEntries(
			await Promise.all(
				(Object.keys(schema.tables) as TableNames[]).map(
					async (table) =>
						[table, await ctx.db.query(table).collect()] as const,
				),
			),
		),
	);
}

export async function readingIdFor(
	t: TestConvexDb,
	reading: Parameters<typeof readingIdentityKey>[0],
): Promise<Id<"readings">> {
	const row = await t.run((ctx) =>
		ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingIdentityKey(reading)),
			)
			.unique(),
	);
	if (!row) throw new Error("Expected a stored Reading.");
	return row._id;
}

export async function accumulatedKnowledgeFor(
	t: TestConvexDb,
	reading: Parameters<typeof readingIdentityKey>[0],
) {
	return t.run((ctx) =>
		ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", readingIdentityKey(reading)),
			)
			.unique(),
	);
}

/** A Reading's stored Knowledge with its direct Lemma-target edges folded in. */
export async function readingKnowledge(
	t: TestConvexDb,
	reading: Parameters<typeof readingIdentityKey>[0],
): Promise<
	| (Record<string, unknown> & {
			semanticRelations?: Record<string, unknown[]>;
	  })
	| undefined
> {
	const key = readingIdentityKey(reading);
	return t.run(async (ctx) => {
		const accumulated = (
			await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", key),
				)
				.unique()
		)?.knowledge as Record<string, unknown> | undefined;
		const row = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) => q.eq("readingKey", key))
			.unique();
		if (!row) return accumulated;
		const semanticRelations: Record<string, unknown[]> = {};
		for (const edge of await ctx.db
			.query("semanticRelationEdges")
			.withIndex(
				"by_source_reading_id_and_relation_and_target_lemma_id",
				(q) => q.eq("sourceReadingId", row._id),
			)
			.collect()) {
			const lemma = edge.targetLemmaId
				? await ctx.db.get(edge.targetLemmaId)
				: null;
			if (!lemma) continue;
			const targets = semanticRelations[edge.relation] ?? [];
			targets.push({
				unitKind: "Lemma",
				language: lemma.language,
				family: lemma.family,
				kind: lemma.kind,
				canonicalForm: lemma.canonicalForm,
				coreFeatures: lemma.coreFeatures,
			});
			semanticRelations[edge.relation] = targets;
		}
		return {
			...(accumulated ?? {}),
			...(Object.keys(semanticRelations).length > 0
				? { semanticRelations }
				: {}),
		};
	});
}
