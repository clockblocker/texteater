import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import {
	type DefaultFunctionArgs,
	type FunctionReference,
	getFunctionName,
} from "convex/server";
import {
	createDumdictService,
	type DumdictPlan,
	makeSurfaceId,
	type StoreRevision,
} from "dumdict";
import { createDumgen } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import {
	executeOutput,
	rejectJudgment,
} from "../../../battery/dumgen/tests/execution-fixture.js";
import { internal } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import {
	createConvexDumdictStorage,
	dictionaryPlanResult,
} from "../convex/dumdictActionStorage";
import { applyDumdictPlanInTransaction } from "../convex/dumdictStorage/transaction";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import schema from "../convex/schema";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../server/linguisticIdentity";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
} from "../server/linguisticOrchestration";
import {
	actionContext,
	createTestConvex,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const verbFeatures = {
	verbType: null,
	lexicallyReflexive: null,
	hasSepPrefix: null,
} as const;

const gehenLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "gehen",
	coreFeatures: verbFeatures,
} as const;
const laufenLemma = { ...gehenLemma, canonicalForm: "laufen" } as const;
const springenLemma = { ...gehenLemma, canonicalForm: "springen" } as const;
const gehenReading = {
	unitKind: "Reading",
	lemma: gehenLemma,
	emojiDescription: "🚶",
} as const;
const laufenReading = {
	unitKind: "Reading",
	lemma: laufenLemma,
	emojiDescription: "🏃",
} as const;
const springenReading = {
	unitKind: "Reading",
	lemma: springenLemma,
	emojiDescription: "🦘",
} as const;
const note = {
	attestedTranslations: [],
	attestations: [],
	notes: "",
};

function surface(normalizedSurface: string) {
	return {
		unitKind: "Surface" as const,
		inflectionalFeatures: null,
		language: "de" as const,
		normalizedSurface,
		spelling: "Canonical" as const,

		surfaceFeatures: null,
		lemma: gehenLemma,
	};
}

/** Stores a Lemma and its dictionary membership as the dictionary does. */
async function insertDictionaryLemma(
	t: TestConvexDb,
	lemma: Dumling.Lemma<"de">,
): Promise<Id<"lemmas">> {
	const { unitKind: _, ...stored } = lemma;
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemma),
			...stored,
		});
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		return lemmaId;
	});
}

/** Stores a Reading and its empty Reading Entry as the dictionary does. */
async function insertReading(
	t: TestConvexDb,
	lemmaId: Id<"lemmas">,
	reading: Dumling.Reading<"de">,
	record: Record<string, unknown> = note,
): Promise<Id<"readings">> {
	return t.run(async (ctx) => {
		const readingId = await ctx.db.insert("readings", {
			readingKey: readingFingerprint(reading),
			lemmaId,
			emojiDescription: reading.emojiDescription,
		});
		await ctx.db.insert("readingEntries", { readingId, record });
		return readingId;
	});
}

/** The `gehen` Reading with two owned Surfaces, at dictionary revision 0. */
async function seededDictionary(
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
			await ctx.db.insert("ownedSurfaces", { surfaceId, record: note });
		}
	});
	return { t, gehenLemmaId, gehenReadingId };
}

function locatorKey(locator: {
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

function dictionaryFor(t: TestConvexDb) {
	return createDumdictService({
		language: "de",
		storage: createConvexDumdictStorage(actionContext(t) as never),
	});
}

function readingEntryContext(
	t: TestConvexDb,
	request: Parameters<
		typeof t.query<
			typeof internal.dumdictStorage.loadDumdictReadingEntryContext
		>
	>[1]["request"],
) {
	return t.query(internal.dumdictStorage.loadDumdictReadingEntryContext, {
		request,
	});
}

/** Commits a plan through the mutation-side applier in one transaction. */
function commitInTransaction(t: TestConvexDb, plan: DumdictPlan<"de">) {
	return t.run((ctx) =>
		applyDumdictPlanInTransaction(ctx, dictionaryPlanResult(plan)),
	);
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/** Every stored row, by table, so a failed write can be shown to leave no trace. */
function snapshot(t: TestConvexDb) {
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

async function revision(t: TestConvexDb) {
	return (await rows(t, "dictionaryState"))[0]?.revision;
}

async function readingIdFor(
	t: TestConvexDb,
	reading: Parameters<typeof readingFingerprint>[0],
): Promise<Id<"readings">> {
	const row = await t.run((ctx) =>
		ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingFingerprint(reading)),
			)
			.unique(),
	);
	if (!row) throw new Error("Expected a stored Reading.");
	return row._id;
}

async function accumulatedKnowledgeFor(
	t: TestConvexDb,
	reading: Parameters<typeof readingFingerprint>[0],
) {
	return t.run((ctx) =>
		ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", readingFingerprint(reading)),
			)
			.unique(),
	);
}

/** A Reading's stored Knowledge with its direct Lemma-target edges folded in. */
async function readingKnowledge(
	t: TestConvexDb,
	reading: Parameters<typeof readingFingerprint>[0],
): Promise<
	| (Record<string, unknown> & {
			semanticRelations?: Record<string, unknown[]>;
	  })
	| undefined
> {
	const key = readingFingerprint(reading);
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
			.withIndex("by_source_reading_id", (q) =>
				q.eq("sourceReadingId", row._id),
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

describe("tf-demo Dumdict relation storage", () => {
	test("rejects over-budget and duplicate-heavy slices before planning while admitting the exact transaction boundary", async () => {
		const { t } = await seededDictionary();
		const newNoteArgs = {
			intent: "addNewNote" as const,
			lemmaKey: lemmaIdentityKey(gehenLemma),
			proposedLemma: gehenLemma,
			readingKey: readingFingerprint(gehenReading),
			surfaceKeys: Array.from(
				{ length: 16 },
				(_, index) => `surface-${index}`,
			),
			explicitLemmaTargetKeys: Array.from(
				{ length: 16 },
				(_, index) => `reading-${index}`,
			),
			pendingLocatorKeys: Array.from(
				{ length: 16 },
				(_, index) => `pending-${index}`,
			),
		};
		await expect(
			readingEntryContext(t, newNoteArgs),
		).resolves.toMatchObject({ revision: "convex-0" });
		await expect(
			readingEntryContext(t, {
				...newNoteArgs,
				pendingLocatorKeys: [
					...newNoteArgs.pendingLocatorKeys,
					"overflow",
				],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);
		await expect(
			readingEntryContext(t, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(gehenLemma),
				proposedLemma: gehenLemma,
				readingKey: readingFingerprint(gehenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: Array.from({ length: 49 }, () =>
					lemmaIdentityKey(gehenLemma),
				),
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);

		await expect(
			t.query(
				internal.dumdictStorage.loadDumdictCleanupRelationsContext,
				{
					locatorKeys: Array.from(
						{ length: 16 },
						(_, index) => `locator-${index}`,
					),
				},
			),
		).resolves.toMatchObject({ revision: "convex-0" });
		await expect(
			t.query(
				internal.dumdictStorage.loadDumdictCleanupRelationsContext,
				{
					locatorKeys: Array.from(
						{ length: 51 },
						(_, index) => `locator-${index}`,
					),
				},
			),
		).rejects.toThrow(
			"Relations-cleanup context can produce at most 50 planned changes",
		);

		const { t: boundary } = await seededDictionary();
		const boundaryDict = dictionaryFor(boundary);
		const duplicateDirectRelation = {
			relation: "nearSynonym" as const,
			target: { kind: "existing" as const, lemma: gehenLemma },
		};
		expect(
			await Effect.runPromise(
				boundaryDict.addNewNote({
					draft: {
						reading: laufenReading,
						note,
						relations: Array.from(
							{ length: 48 },
							() => duplicateDirectRelation,
						),
					},
				}),
			),
		).toMatchObject({ status: "applied", nextRevision: "convex-1" });
		expect(await revision(boundary)).toBe(1);
		expect(
			(await readingKnowledge(boundary, gehenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
	});

	test("loads every requested owned Surface and explicit existing Lemma target", async () => {
		const { t } = await seededDictionary();
		const result = (await readingEntryContext(t, {
			intent: "addNewNote",
			lemmaKey: lemmaIdentityKey(gehenLemma),
			proposedLemma: gehenLemma,
			readingKey: readingFingerprint({
				unitKind: "Reading",
				lemma: gehenLemma,
				emojiDescription: "🥾",
			}),
			surfaceKeys: [
				makeSurfaceId("de", surface("gehen")),
				makeSurfaceId("de", surface("ging")),
			],
			explicitLemmaTargetKeys: [lemmaIdentityKey(gehenLemma)],
			pendingLocatorKeys: [],
		})) as {
			existingOwnedSurfaces: unknown[];
			explicitExistingLemmaTargets: unknown[];
		};

		expect(result.existingOwnedSurfaces).toHaveLength(2);
		expect(result.explicitExistingLemmaTargets).toEqual([
			{ lemma: gehenLemma },
		]);
	});

	test("loads every Reading Entry intent through one discriminated Convex query", async () => {
		const { t } = await seededDictionary();
		const queried: string[] = [];
		const storage = createConvexDumdictStorage({
			runQuery(
				reference: FunctionReference<"query", "internal">,
				args: DefaultFunctionArgs,
			) {
				queried.push(getFunctionName(reference));
				return t.query(reference, args);
			},
			async runMutation() {
				throw new Error("Unexpected Convex mutation.");
			},
		} as never);

		const contexts = await Effect.runPromise(
			Effect.all([
				storage.loadReadingEntryContext({
					intent: "addNewNote",
					reading: laufenReading,
					ownedSurfaces: [],
					relations: [],
				}),
				storage.loadReadingEntryContext({
					intent: "applyGeneratedKnowledge",
					reading: gehenReading,
					pendingRelations: [],
				}),
				storage.loadReadingEntryContext({
					intent: "ensureOwnedSurface",
					reading: gehenReading,
					surface: surface("gehen"),
				}),
				storage.loadReadingEntryContext({
					intent: "ensureReadingEntry",
					reading: gehenReading,
				}),
			]),
		);

		expect(queried).toEqual(
			Array.from({ length: 4 }, () =>
				getFunctionName(
					internal.dumdictStorage.loadDumdictReadingEntryContext,
				),
			),
		);
		expect(
			contexts.map(({ intent, revision }) => ({ intent, revision })),
		).toEqual([
			{ intent: "addNewNote", revision: "convex-0" },
			{
				intent: "applyGeneratedKnowledge",
				revision: "convex-0",
			},
			{ intent: "ensureOwnedSurface", revision: "convex-0" },
			{ intent: "ensureReadingEntry", revision: "convex-0" },
		]);
		expect(contexts[2]).not.toHaveProperty("relationLemmas");
		expect(contexts[3]).not.toHaveProperty("relationReadings");
		expect(contexts[1]).toHaveProperty("relationLemmas");
	});

	test("authors only direct Knowledge, deduplicates pending proposals, and survives a repeated encounter", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);

		expect(
			await Effect.runPromise(
				dict
					.addNewNote({
						draft: {
							reading: laufenReading,
							note,
							relations: [
								{
									relation: "nearSynonym",
									target: {
										kind: "existing",
										lemma: gehenLemma,
									},
								},
							],
						},
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({ status: "applied" });
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toEqual([gehenLemma]);
		expect(
			(await readingKnowledge(t, gehenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
		const gehenReadingId = await readingIdFor(t, gehenReading);
		expect(
			await t.run((ctx) => loadRelationProjections(ctx, gehenReadingId)),
		).toMatchObject({
			fingerprints: [
				{
					relation: "nearSynonym",
					targetCanonicalForm: "laufen",
					provenance: "inferred",
				},
			],
		});
		expect(
			(await rows(t, "accumulatedKnowledge"))
				.filter(({ ownerReadingKey }) =>
					[
						readingFingerprint(laufenReading),
						readingFingerprint(gehenReading),
					].includes(String(ownerReadingKey)),
				)
				.map(({ ownerReadingKey, status }) => ({
					ownerReadingKey,
					status,
				})),
		).toEqual(
			expect.arrayContaining([
				{
					ownerReadingKey: readingFingerprint(laufenReading),
					status: "Partial",
				},
			]),
		);

		const pending = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: "flitzen",
						family: "Lexeme" as const,
						kind: "VERB" as const,
					},
				},
			},
		};
		expect(
			await Effect.runPromise(
				dict.addNewNote({
					draft: {
						reading: springenReading,
						note,
						relations: [pending, pending],
					},
				}),
			),
		).toMatchObject({ status: "applied" });
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		expect(await accumulatedKnowledgeFor(t, springenReading)).toMatchObject(
			{ status: "Partial", knowledge: {} },
		);
		expect(
			await Effect.runPromise(
				dict
					.addNewNote({
						draft: {
							reading: springenReading,
							note,
							relations: [pending],
						},
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({
			_tag: "DumdictRejection",
			code: "readingAlreadyExists",
		});
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		expect(await revision(t)).toBe(2);
	});

	test("persists exact Reading targets and navigates to the target Reading Note", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		expect(
			await Effect.runPromise(
				dict.addNewNote({
					draft: { reading: laufenReading, note },
				}),
			),
		).toMatchObject({ status: "applied" });
		expect(
			await commitInTransaction(t, {
				baseRevision: "convex-1" as StoreRevision,
				changes: [
					{
						type: "patchReading",
						reading: laufenReading,
						ops: [
							{
								kind: "applyKnowledgeChange",
								envelope: {
									reading: laufenReading,
									change: {
										kind: "Contribute",
										aspect: "semanticRelations",
										relation: "synonym",
										targetKind: "reading",
										value: [gehenReading],
									},
								},
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: "convex-1" as StoreRevision,
							},
							{
								kind: "readingExists",
								reading: laufenReading,
							},
						],
					},
				],
			} satisfies DumdictPlan<"de">),
		).toMatchObject({ status: "committed" });

		const sourceId = await readingIdFor(t, laufenReading);
		const targetId = await readingIdFor(t, gehenReading);
		expect(await rows(t, "semanticRelationEdges")).toContainEqual(
			expect.objectContaining({
				sourceReadingId: sourceId,
				targetKind: "reading",
				targetReadingId: targetId,
				relation: "synonym",
			}),
		);
		expect(
			await t.query(internal.dumdictStorage.loadDumdictReadingForPatch, {
				readingKey: readingFingerprint(laufenReading),
			}),
		).toMatchObject({
			reading: {
				knowledge: {
					semanticRelations: {
						targetKind: "reading",
						synonym: [gehenReading],
					},
				},
			},
		});
		expect(
			await t.run((ctx) => loadRelationProjections(ctx, sourceId)),
		).toMatchObject({
			resolved: [
				{
					relation: "synonym",
					target: {
						kind: "Reading",
						readingId: targetId,
					},
				},
			],
		});
	});

	test("removing the last exact target preserves the Reading relation mode in storage", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		await Effect.runPromise(
			dict.addNewNote({ draft: { reading: laufenReading, note } }),
		);
		await Effect.runPromise(
			dict.applyGeneratedKnowledge({
				reading: laufenReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
						value: [gehenReading],
					},
				],
				pendingRelations: [],
			}),
		);
		await Effect.runPromise(
			dict.applyGeneratedKnowledge({
				reading: laufenReading,
				changes: [
					{
						kind: "Retract",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
					},
				],
				pendingRelations: [],
			}),
		);
		expect(await rows(t, "semanticRelationEdges")).toHaveLength(0);
		expect(
			await t.query(internal.dumdictStorage.loadDumdictReadingForPatch, {
				readingKey: readingFingerprint(laufenReading),
			}),
		).toMatchObject({
			reading: {
				knowledge: { semanticRelations: { targetKind: "reading" } },
			},
		});
		const before = await snapshot(t);
		await expect(
			Effect.runPromise(
				dict.applyGeneratedKnowledge({
					reading: laufenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "semanticRelations",
							relation: "nearSynonym",
							value: [gehenReading.lemma],
						},
					],
					pendingRelations: [],
				}),
			),
		).rejects.toThrow();
		expect(await snapshot(t)).toEqual(before);
	});

	test("applies graph-wide direct target conflicts atomically at the Convex seam", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		await Effect.runPromise(
			dict.addNewNote({
				draft: {
					reading: laufenReading,
					note,
					relations: [
						{
							relation: "nearSynonym",
							target: { kind: "existing", lemma: gehenLemma },
						},
					],
				},
			}),
		);
		expect(
			await Effect.runPromise(
				dict
					.applyGeneratedKnowledge({
						reading: laufenReading,
						changes: [],
						pendingRelations: [
							{
								relation: "synonym",
								target: {
									language: "de",
									canonicalForm: "gehen",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						],
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({ status: "applied" });
		const sourceId = await readingIdFor(t, laufenReading);
		expect(
			(await rows(t, "semanticRelationEdges"))
				.filter((edge) => edge.sourceReadingId === sourceId)
				.map(({ relation }) => relation),
		).toEqual(["synonym"]);

		expect(
			await Effect.runPromise(
				dict
					.applyGeneratedKnowledge({
						reading: laufenReading,
						changes: [
							{
								kind: "Contribute",
								aspect: "definition",
								value: "sich gehend fortbewegen",
							},
						],
						pendingRelations: [
							{
								relation: "antonym",
								target: {
									language: "de",
									canonicalForm: "gehen",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						],
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({ _tag: "DumdictRejection", code: "relationConflict" });
		expect(
			(await accumulatedKnowledgeFor(t, laufenReading))?.knowledge,
		).not.toMatchObject({ definition: "sich gehend fortbewegen" });
	});

	test("loads cleanup context and atomically resolves only the exact pending locator", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		await Effect.runPromise(
			dict.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "nearSynonym",
									target: {
										language: "de",
										canonicalForm: "laufen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
						{
							target: {
								kind: "pending",
								pending: {
									relation: "antonym",
									target: {
										language: "de",
										canonicalForm: "laufen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
					],
				},
			}),
		);
		// The target Lemma appears outside the dictionary workflow, leaving the
		// pending relations for cleanup to resolve.
		await insertReading(
			t,
			await insertDictionaryLemma(t, laufenLemma),
			laufenReading,
		);

		const info = await Effect.runPromise(
			dict.getInfoForRelationsCleanup({
				canonicalForm: " laufen ",
			}),
		);
		expect(info.candidateLemmas).toEqual([
			expect.objectContaining(laufenLemma),
		]);
		expect(info.pendingRelations).toHaveLength(2);
		const locator = info.pendingRelations.find(
			({ pending }) => pending.relation === "nearSynonym",
		)?.locator;
		if (!locator) throw new Error("Expected a pending relation.");
		expect(
			await Effect.runPromise(
				dict
					.cleanupRelations({
						baseRevision: info.revision,
						resolutions: [{ locator }],
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({ status: "applied" });
		expect(await rows(t, "pendingSemanticRelations")).toEqual([
			expect.objectContaining({
				record: expect.objectContaining({
					pending: expect.objectContaining({ relation: "antonym" }),
				}),
			}),
		]);
		expect(
			(await readingKnowledge(t, springenReading))?.semanticRelations
				?.nearSynonym,
		).toEqual([laufenLemma]);
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();

		expect(
			await Effect.runPromise(
				dict
					.cleanupRelations({
						baseRevision: info.revision,
						resolutions: [{ locator }],
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({ _tag: "DumdictRevisionConflict" });
		const latest = await Effect.runPromise(
			dict.getInfoForRelationsCleanup({
				canonicalForm: "laufen",
			}),
		);
		expect(
			await Effect.runPromise(
				dict
					.cleanupRelations({
						baseRevision: latest.revision,
						resolutions: [{ locator }],
					})
					.pipe(Effect.catchAll(Effect.succeed)),
			),
		).toMatchObject({
			_tag: "DumdictSemanticPreconditionFailure",
		});
	});

	test("resolves pending Shadows automatically when their exact Lemma appears", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		const relation = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: "laufen",
						family: "Lexeme" as const,
						kind: "VERB" as const,
					},
				},
			},
		};
		await Effect.runPromise(
			dict.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [relation],
				},
			}),
		);
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		expect(
			await Effect.runPromise(
				dict.addNewNote({ draft: { reading: laufenReading, note } }),
			),
		).toMatchObject({
			status: "applied",
		});
		expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
		expect(
			(await readingKnowledge(t, springenReading))?.semanticRelations
				?.nearSynonym,
		).toEqual([laufenLemma]);
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
	});

	test("keeps an ambiguous multi-Lemma Shadow pending and inert", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		const alternativeLemma = {
			...laufenLemma,
			coreFeatures: { ...verbFeatures, hasSepPrefix: "mit" },
		} as const;
		const alternativeReading = {
			unitKind: "Reading",
			lemma: alternativeLemma,
			emojiDescription: "🏃‍♀️",
		} as const;
		await Effect.runPromise(
			dict.addNewNote({ draft: { reading: laufenReading, note } }),
		);
		await Effect.runPromise(
			dict.addNewNote({ draft: { reading: alternativeReading, note } }),
		);

		const result = await Effect.runPromise(
			dict.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "nearSynonym",
									target: {
										language: "de",
										canonicalForm: "laufen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
					],
				},
			}),
		);
		expect(result).toMatchObject({ status: "applied" });
		expect(await rows(t, "pendingSemanticRelations")).toHaveLength(1);
		const forward = (await readingKnowledge(t, springenReading))
			?.semanticRelations?.nearSynonym as unknown[];
		expect(forward).toBeUndefined();
		expect(
			(await readingKnowledge(t, laufenReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
		expect(
			(await readingKnowledge(t, alternativeReading))?.semanticRelations
				?.nearSynonym,
		).toBeUndefined();
	});

	test("does not backfill an inverse edge when a later Reading joins the target Lemma", async () => {
		const { t } = await seededDictionary();
		const dict = dictionaryFor(t);
		await Effect.runPromise(
			dict.addNewNote({ draft: { reading: laufenReading, note } }),
		);
		await Effect.runPromise(
			dict.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [
						{
							relation: "hypernym",
							target: { kind: "existing", lemma: laufenLemma },
						},
					],
				},
			}),
		);
		const laterReading = {
			...laufenReading,
			emojiDescription: "🏃‍♀️",
		} as const;
		expect(
			await Effect.runPromise(
				dict.addNewNote({ draft: { reading: laterReading, note } }),
			),
		).toMatchObject({
			status: "applied",
		});
		expect(
			(await readingKnowledge(t, laterReading))?.semanticRelations
				?.hyponym,
		).toBeUndefined();
	});

	test("rolls relation-edge writes back when a later planned change fails", async () => {
		const { t } = await seededDictionary();
		const before = await snapshot(t);
		const missingLemma = {
			...laufenLemma,
			canonicalForm: "fehlen",
		} as const;
		const plan: DumdictPlan<"de"> = {
			baseRevision: "convex-0" as StoreRevision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: gehenReading,
								change: {
									kind: "Contribute",
									aspect: "semanticRelations",
									relation: "antonym",
									value: [missingLemma],
								},
							},
						},
					],
					preconditions: [
						{
							kind: "revisionMatches",
							revision: "convex-0" as StoreRevision,
						},
						{ kind: "readingExists", reading: gehenReading },
					],
				},
			],
		};
		await expect(
			t.mutation(
				internal.dumdictStorage.commitDumdictChanges,
				dictionaryPlanResult(plan),
			),
		).rejects.toThrow("target Lemma is missing");
		expect(await snapshot(t)).toEqual(before);
	});

	test("fails relation planning explicitly when the complete Lemma inventory overflows", async () => {
		const { t, gehenLemmaId } = await seededDictionary();
		await t.run(async (ctx) => {
			// The inventory counts membership rows, so 100 more make 101.
			for (let index = 0; index < 100; index += 1)
				await ctx.db.insert("dictionaryLemmas", {
					lemmaId: gehenLemmaId,
				});
		});
		await expect(
			readingEntryContext(t, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(laufenLemma),
				proposedLemma: laufenLemma,
				readingKey: readingFingerprint(laufenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: [],
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow("at most 100 dictionary Lemmas");
	});

	test("fails relation planning explicitly when the complete Reading inventory overflows", async () => {
		const { t, gehenLemmaId } = await seededDictionary();
		await t.run(async (ctx) => {
			// With the seeded gehen Reading, 200 more make 201.
			for (let index = 0; index < 200; index += 1)
				await ctx.db.insert("readings", {
					readingKey: `reading-key-overflow-${index}`,
					lemmaId: gehenLemmaId,
					emojiDescription: "overflow",
				});
		});
		await expect(
			readingEntryContext(t, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(laufenLemma),
				proposedLemma: laufenLemma,
				readingKey: readingFingerprint(laufenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: [],
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow("at most 200 dictionary Readings");
	});

	test("fails relation planning explicitly when one Reading's edge inventory overflows", async () => {
		const { t, gehenLemmaId, gehenReadingId } = await seededDictionary();
		await t.run(async (ctx) => {
			for (let index = 0; index < 201; index += 1)
				await ctx.db.insert("semanticRelationEdges", {
					sourceReadingId: gehenReadingId,
					targetLemmaId: gehenLemmaId,
					relation: "synonym",
				});
		});
		await expect(
			readingEntryContext(t, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(laufenLemma),
				proposedLemma: laufenLemma,
				readingKey: readingFingerprint(laufenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: [],
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow("at most 200 Semantic Relation edges");
	});

	test("preflights every Knowledge patch before writes and reports semantic conflicts without partial state", async () => {
		const { t } = await seededDictionary();
		const before = await snapshot(t);
		const revision = "convex-0" as StoreRevision;
		const badPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: gehenReading,
								change: {
									kind: "Contribute",
									aspect: "definition",
									value: "motion",
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
					],
				},
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: laufenReading,
								change: {
									kind: "Contribute",
									aspect: "definition",
									value: "must fail",
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
					],
				},
			],
		};

		await expect(commitInTransaction(t, badPlan)).rejects.toThrow(
			"Reading does not match",
		);
		expect(await snapshot(t)).toEqual(before);

		const conflictPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingMissing", reading: gehenReading },
					],
				},
			],
		};
		expect(await commitInTransaction(t, conflictPlan)).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(await snapshot(t)).toEqual(before);

		const forgedRecord = {
			sourceReading: gehenReading,
			pending: {
				relation: "synonym",
				target: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
			},
			locator: {
				sourceReadingKey: readingFingerprint(gehenReading),
				relation: "synonym",
				targetPendingId: "pending-entry:v2:de:Lexeme:VERB:forged",
			},
		} as const;
		const forgedPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createPendingSemanticRelation",
					record: forgedRecord,
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
						{
							kind: "pendingRelationMissing",
							record: forgedRecord,
						},
					],
				},
			],
		};
		await expect(commitInTransaction(t, forgedPlan)).rejects.toThrow(
			"wrong target Pending Entry ID",
		);
		expect(await snapshot(t)).toEqual(before);
	});

	test("repeated orchestration encounters through the real Convex adapter preserve direct and pending relations", async () => {
		const directKnowledge = {
			semanticRelations: { nearSynonym: [laufenReading.lemma] },
		};
		const { t, gehenReadingId } = await seededDictionary({
			gehenRecord: { ...note, knowledge: directKnowledge },
		});
		const pendingRecord = {
			sourceReading: gehenReading,
			pending: {
				relation: "antonym",
				target: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
			},
			locator: {
				sourceReadingKey: readingFingerprint(gehenReading),
				relation: "antonym",
				targetPendingId: "pending-entry:v2:de:Lexeme:VERB:laufen",
			},
		} as const;
		await t.run(async (ctx) => {
			await ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: readingFingerprint(gehenReading),
				knowledge: directKnowledge,
				status: "Partial",
				updatedAt: 1,
			});
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey: locatorKey(pendingRecord.locator),
				sourceReadingKey: readingFingerprint(gehenReading),
				targetCanonicalForm: "laufen",
				record: pendingRecord,
			});
		});
		const decisions: ("New" | "Reuse")[] = [];
		const citation = surface("gehen");
		const grammatical = {
			decision: "Resolved",
			language: "de",
			encounter: {
				sentence: {
					id: "segmented-1",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Wir" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "gehen" },
						{ kind: "Punctuation", text: "." },
					],
				},
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2],
				},
			},
			attestation: {
				unitKind: "Attestation",
				members: [{ attested: "gehen", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: citation,
			},
		} as const;
		const persistence: OrchestrationPersistence = {
			async persistSubmittedText() {
				throw new Error("Unexpected submission.");
			},
			async loadResolutionContext() {
				return {
					recorded: null,
					reusable: null,
					lemmaCandidates: [],
					sentence: {
						sentenceId: "sentence-1",
						textId: "text-1",
						segmentedSentenceId: "segmented-1",
						language: "de",
						stitchedText: "Wir gehen.",
						segments: [
							{ index: 0, kind: "ResolvableText", text: "Wir" },
							{ index: 1, kind: "Whitespace", text: " " },
							{ index: 2, kind: "ResolvableText", text: "gehen" },
							{ index: 3, kind: "Punctuation", text: "." },
						],
					},
				};
			},
			async persistResolvedClick(input) {
				decisions.push(input.readingDecision);
				return {
					status: "Committed",
					clickId: `click-${decisions.length}`,
					attestationId: `attestation-${decisions.length}`,
					readingId: gehenReadingId,
					deduplicated: false,
					occurrence: {
						attestationId: `attestation-${decisions.length}`,
						grammatical,
						reading: gehenReading,
					},
				};
			},
			async persistReusedResolvedClick() {
				throw new Error("Occurrences are intentionally distinct.");
			},
			async persistUnresolvedClick() {
				throw new Error("Expected a resolved click.");
			},
		};
		const orchestrator = createTfDemoOrchestrator({
			dumgen: {
				...createDumgen({
					judge: rejectJudgment,
					execute: executeOutput(async () => {
						throw new Error("Unexpected model execution.");
					}),
				}),
				classifyTarget: () =>
					Effect.succeed(grammatical.encounter.target),
				resolveGrammar: () => Effect.succeed(grammatical.attestation),
				resolveOrGenerateReadingEmojiDescription: () =>
					Effect.succeed({
						decision: "Reuse" as const,
						emojiDescription: gehenReading.emojiDescription,
					}),
			},
			dictionary: dictionaryFor(t),
			persistence,
		});

		for (const requestId of ["encounter-1", "encounter-2"]) {
			await Effect.runPromise(
				orchestrator.resolveSegment({
					requestId,
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					clickedSegmentIndex: 2,
				}),
			);
		}

		expect(decisions).toEqual(["Reuse", "Reuse"]);
		expect((await rows(t, "readingEntries"))[0]?.record).toMatchObject({
			knowledge: directKnowledge,
		});
		expect(await rows(t, "pendingSemanticRelations")).toEqual([
			expect.objectContaining({ record: pendingRecord }),
		]);
	});
});
