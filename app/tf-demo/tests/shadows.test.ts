import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import { resetDemoTableNames } from "../convex/demoReset";
import { createDumdictTransaction } from "../convex/dumdictTransaction";
import {
	attachPendingShadowReference,
	collectStructuralShadowReferences,
	descriptorFromStoredShadow,
	normalizeShadowDescriptor,
	replaceAccumulatedKnowledge,
	shadowIsCompatible,
	shadowKeyFor,
} from "../convex/model/shadows";
import {
	auditPendingShadowReferencesPage,
	auditStructuralShadowReferencesPage,
	backfillPendingShadowReferencesPage,
	backfillStructuralShadowReferencesPage,
} from "../convex/shadows";
import { createPaginatedNoteLoader } from "../src/views/paginated-note-loading";
import { createTestConvex, type TestConvexDb } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const nounShadow = {
	language: "de",
	canonicalForm: " Bank ",
	family: "Lexeme",
	kind: "NOUN",
} as const;
const verbShadow = {
	language: "de",
	canonicalForm: "gehen",
	family: "Lexeme",
	kind: "VERB",
} as const;

function structuralKnowledge() {
	return {
		morphologicalTree: {
			root: {
				nodeKind: "structure",
				children: [
					{ nodeKind: "unitShadow", unitShadow: nounShadow },
					{
						nodeKind: "structure",
						children: [
							{ nodeKind: "unitShadow", unitShadow: nounShadow },
						],
					},
				],
			},
		},
		lexicalBreakdown: [nounShadow, nounShadow],
	};
}

function pendingRecord(
	sourceReadingKey = "reading-source",
	targetPendingId = "pending-1",
) {
	return {
		sourceReading: {},
		pending: { relation: "synonym", target: nounShadow },
		locator: {
			sourceReadingKey,
			relation: "synonym",
			targetPendingId,
		},
	};
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

function replaceKnowledge(
	t: TestConvexDb,
	ownerReadingKey: string,
	knowledge: unknown,
) {
	return t.run((ctx) =>
		replaceAccumulatedKnowledge(ctx, ownerReadingKey, knowledge),
	);
}

/** Interns the pending target's Shadow and stores the Pending Semantic Relation. */
function insertPendingRelation(
	ctx: MutationCtx,
	record: ReturnType<typeof pendingRecord>,
	shadowId: Id<"shadows">,
) {
	return ctx.db.insert("pendingSemanticRelations", {
		locatorKey: JSON.stringify([
			record.locator.sourceReadingKey,
			record.locator.relation,
			record.locator.targetPendingId,
		]),
		sourceReadingKey: record.locator.sourceReadingKey,
		targetCanonicalForm: "Bank",
		shadowId,
		record,
	});
}

/** A dictionary Lemma and its Reading, owner of `readingKey`. */
async function insertSourceReading(
	ctx: MutationCtx,
	readingKey = "reading-source",
) {
	const lemmaId = await ctx.db.insert("lemmas", {
		lemmaKey: `lemma:${readingKey}`,
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "laufen",
		coreFeatures: {},
	});
	return ctx.db.insert("readings", {
		readingKey,
		lemmaId,
		emojiDescription: "🏃",
	});
}

function shadowNote(t: TestConvexDb, shadowId: Id<"shadows">) {
	return t.query(api.shadowNotes.get, { shadowId });
}

function shadowReferences(
	t: TestConvexDb,
	shadowId: Id<"shadows">,
	cursor = "",
) {
	return t.query(api.shadowNotes.references, { shadowId, cursor });
}

describe("Shadow descriptor and storage seam", () => {
	test("normalizes stable descriptors and preserves every exact structural path", () => {
		expect(normalizeShadowDescriptor(nounShadow)).toEqual({
			...nounShadow,
			canonicalForm: "Bank",
		});
		expect(shadowKeyFor(nounShadow)).toBe('["de","Bank","Lexeme","NOUN"]');
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, extra: true }),
		).toThrow("exactly language");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, kind: "VERBISH" }),
		).toThrow("not a supported Dumling Lemma route");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, language: " de " }),
		).toThrow("Unsupported Unit Shadow language");
		expect(
			normalizeShadowDescriptor({ ...nounShadow, family: " Lexeme " })
				.family,
		).toBe("Lexeme");
		expect(
			normalizeShadowDescriptor({ ...nounShadow, kind: " NOUN " }).kind,
		).toBe("NOUN");
		const stored = {
			_id: "shadow_realistic",
			_creationTime: 1,
			shadowKey: shadowKeyFor(nounShadow),
			...normalizeShadowDescriptor(nounShadow),
		};
		expect(descriptorFromStoredShadow(stored)).toEqual(
			normalizeShadowDescriptor(nounShadow),
		);
		expect(shadowIsCompatible(stored, nounShadow)).toBe(true);
		expect(() =>
			normalizeShadowDescriptor({
				...nounShadow,
				language: "he",
				family: "Phraseme",
				kind: "Collocation",
			}),
		).toThrow("not a supported Dumling Lemma route");
		expect(
			collectStructuralShadowReferences(structuralKnowledge()).map(
				({ aspect, path }) => `${aspect}:${path}`,
			),
		).toEqual([
			"morphologicalTree:root.children[0]",
			"morphologicalTree:root.children[1].children[0]",
			"lexicalBreakdown:[0]",
			"lexicalBreakdown:[1]",
		]);
	});

	test("atomically replaces structural projection, keeps dormant rows, and reuses the same Shadow ID", async () => {
		const t = createTestConvex();
		await replaceKnowledge(t, "reading-source", structuralKnowledge());
		expect(await rows(t, "structuralShadowReferences")).toHaveLength(4);
		const shadows = await rows(t, "shadows");
		expect(shadows).toHaveLength(1);
		const shadowId = shadows[0]?._id;
		const referenceIds = (await rows(t, "structuralShadowReferences")).map(
			({ _id }) => _id,
		);

		await replaceKnowledge(t, "reading-source", structuralKnowledge());
		expect(
			(await rows(t, "structuralShadowReferences")).map(({ _id }) => _id),
		).toEqual(referenceIds);

		await replaceKnowledge(t, "reading-source", undefined);
		expect(await rows(t, "structuralShadowReferences")).toEqual([]);
		expect((await rows(t, "shadows")).map(({ _id }) => _id)).toEqual([
			shadowId,
		]);

		await replaceKnowledge(t, "reading-source", {
			lexicalBreakdown: [nounShadow, verbShadow],
		});
		expect(
			(await rows(t, "shadows")).find(
				({ shadowKey }) => shadowKey === shadowKeyFor(nounShadow),
			)?._id,
		).toBe(shadowId);
	});

	test("rejects a malformed replacement before changing authoritative or projected state", async () => {
		const t = createTestConvex();
		await replaceKnowledge(t, "reading-source", {
			lexicalBreakdown: [nounShadow, verbShadow],
		});
		const snapshot = async () => ({
			accumulatedKnowledge: await rows(t, "accumulatedKnowledge"),
			definitionTexts: await rows(t, "definitionTexts"),
			shadows: await rows(t, "shadows"),
			structuralShadowReferences: await rows(
				t,
				"structuralShadowReferences",
			),
		});
		const before = await snapshot();

		// The failure is caught inside the transaction, so any write made
		// before validation would commit and show up in the snapshot.
		const failure = await t.run(async (ctx) => {
			try {
				await replaceAccumulatedKnowledge(ctx, "reading-source", {
					lexicalBreakdown: [nounShadow, { family: "Lexeme" }],
				});
				return null;
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		});
		expect(failure).toContain("exactly language");
		expect(await snapshot()).toEqual(before);
	});
});

describe("Shadow backfills and presentation", () => {
	test("keeps shadowId optional while page-level backfills and audits are runnable", async () => {
		const schemaSource = await Bun.file(
			new URL("../convex/schema.ts", import.meta.url),
		).text();
		expect(schemaSource).toContain('shadowId: v.optional(v.id("shadows"))');
		for (const registered of [
			backfillPendingShadowReferencesPage,
			backfillStructuralShadowReferencesPage,
			auditPendingShadowReferencesPage,
			auditStructuralShadowReferencesPage,
		]) {
			expect(registered.exportArgs()).toContain("paginationOpts");
		}
	});

	test("backfills pending and structural references idempotently and audits them in bounded pages", async () => {
		const t = createTestConvex();
		await t.run(async (ctx) => {
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey: '["reading-source","synonym","pending-1"]',
				sourceReadingKey: "reading-source",
				targetCanonicalForm: " Bank ",
				record: pendingRecord(),
			});
			await ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: "reading-source",
				knowledge: structuralKnowledge(),
				status: "Partial",
				updatedAt: 1,
			});
		});
		const paginationOpts = { cursor: null, numItems: 50 };
		const structuralPaginationOpts = { cursor: null, numItems: 8 };
		const backfillPending = () =>
			t.mutation(internal.shadows.backfillPendingShadowReferencesPage, {
				paginationOpts,
			});
		const backfillStructural = () =>
			t.mutation(
				internal.shadows.backfillStructuralShadowReferencesPage,
				{
					paginationOpts: structuralPaginationOpts,
				},
			);
		const auditPending = () =>
			t.query(internal.shadows.auditPendingShadowReferencesPage, {
				paginationOpts,
			});
		const auditStructural = () =>
			t.query(internal.shadows.auditStructuralShadowReferencesPage, {
				paginationOpts,
			});

		await expect(
			t.mutation(
				internal.shadows.backfillStructuralShadowReferencesPage,
				{
					paginationOpts: { cursor: null, numItems: 9 },
				},
			),
		).rejects.toThrow("at most 8 Reading owners");
		expect(await backfillPending()).toMatchObject({
			changed: 1,
			malformed: 0,
		});
		expect(await backfillStructural()).toMatchObject({
			changed: 1,
			malformed: 0,
		});
		expect(await rows(t, "shadows")).toHaveLength(1);
		expect(await rows(t, "structuralShadowReferences")).toHaveLength(4);

		expect(await backfillPending()).toMatchObject({ changed: 0 });
		expect(await backfillStructural()).toMatchObject({ changed: 0 });
		expect(await auditPending()).toMatchObject({
			valid: 1,
			missing: 0,
			mismatched: 0,
			malformed: 0,
		});
		expect(await auditStructural()).toMatchObject({
			valid: 4,
			missing: 0,
			mismatched: 0,
			malformed: 0,
		});
		const [shadow] = await rows(t, "shadows");
		if (!shadow) throw new Error("Expected a Shadow row.");
		await t.run((ctx) => ctx.db.patch(shadow._id, { kind: "VERB" }));
		expect(await auditPending()).toMatchObject({ valid: 0, mismatched: 1 });
		expect(await auditStructural()).toMatchObject({
			valid: 0,
			mismatched: 4,
		});
	});

	test("groups exact pending and structural references by referring Unit Reading Note and hides dormancy", async () => {
		const t = createTestConvex();
		await replaceKnowledge(t, "reading-source", {
			lexicalBreakdown: [nounShadow, nounShadow],
		});
		const shadowId = await t.run(async (ctx) => {
			await insertSourceReading(ctx);
			const record = pendingRecord();
			const id = await attachPendingShadowReference(ctx, record);
			await insertPendingRelation(ctx, record, id);
			return id;
		});

		const note = await shadowNote(t, shadowId);
		if (!note) throw new Error("Expected a Shadow Note.");
		expect(note.kind).toBe("Shadow");
		expect(note.references.page).toHaveLength(1);
		expect(note.references.page[0]?.pendingRelations).toHaveLength(1);
		expect(note.references.page[0]?.structuralReferences).toHaveLength(0);
		const structuralPage = await shadowReferences(
			t,
			shadowId,
			note.references.continueCursor,
		);
		expect(structuralPage?.page[0]?.structuralReferences).toHaveLength(2);

		await t.run(async (ctx) => {
			for (const row of await ctx.db
				.query("pendingSemanticRelations")
				.collect()) {
				await ctx.db.delete(row._id);
			}
		});
		await replaceKnowledge(t, "reading-source", undefined);
		expect(await shadowNote(t, shadowId)).toBeNull();
		expect(
			(await rows(t, "shadows")).some(({ _id }) => _id === shadowId),
		).toBe(true);
	});

	test("pages every admitted incoming reference through indexed Shadow lookups", async () => {
		const t = createTestConvex();
		const shadowId = await t.run(async (ctx) => {
			await insertSourceReading(ctx);
			const id = await attachPendingShadowReference(ctx, pendingRecord());
			for (let index = 0; index < 51; index += 1) {
				await insertPendingRelation(
					ctx,
					pendingRecord("reading-source", `pending-${index}`),
					id,
				);
			}
			return id;
		});

		const first = await shadowNote(t, shadowId);
		expect(first?.references.page[0]?.pendingRelations).toHaveLength(50);
		expect(first?.references.isDone).toBe(false);
		const second = await shadowReferences(
			t,
			shadowId,
			first?.references.continueCursor,
		);
		expect(second?.page[0]?.pendingRelations).toHaveLength(1);
		expect(second?.isDone).toBe(true);
	});

	test("keeps a Shadow Note and its loaded pages while an unrelated Knowledge batch commits", async () => {
		const t = createTestConvex();
		const shadowId = await t.run(async (ctx) => {
			await insertSourceReading(ctx);
			const id = await attachPendingShadowReference(ctx, pendingRecord());
			for (let index = 0; index < 51; index += 1) {
				await insertPendingRelation(
					ctx,
					pendingRecord("reading-source", `pending-${index}`),
					id,
				);
			}
			return id;
		});
		const gehenReading = {
			unitKind: "Reading",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "gehen",
				coreFeatures: {
					verbType: null,
					lexicallyReflexive: null,
					hasSepPrefix: null,
				},
			},
			emojiDescription: "🚶",
		} as const;
		await t.run((ctx) =>
			createDumdictTransaction(ctx).ensureReadingEntry({
				entry: {
					reading: gehenReading,
					attestedTranslations: [],
					attestations: [],
					notes: "",
				},
			}),
		);
		const note = await shadowNote(t, shadowId);
		if (!note) throw new Error("Expected a Shadow Note.");
		const loader = createPaginatedNoteLoader(note, async (cursor) =>
			shadowReferences(t, shadowId, cursor),
		);
		await loader.loadMore();
		expect(
			loader.current().note.references.page[0]?.pendingRelations,
		).toHaveLength(51);

		expect(
			await t.run((ctx) =>
				createDumdictTransaction(ctx).applyGeneratedKnowledge({
					reading: gehenReading,
					changes: [
						{
							kind: "Contribute",
							aspect: "definition",
							value: "sich zu Fuß fortbewegen",
						},
					],
					pendingRelations: [],
				}),
			),
		).toMatchObject({ status: "committed" });

		// The Note is keyed by its Shadow alone, so an unchanged Note keeps
		// its mounted container and the pages it loaded.
		const refreshed = await shadowNote(t, shadowId);
		expect(refreshed).toEqual(note);
		if (!refreshed) throw new Error("Expected a Shadow Note.");
		loader.refresh(refreshed);
		expect(
			loader.current().note.references.page[0]?.pendingRelations,
		).toHaveLength(51);
	});

	test("inspects zero, one, or many dictionary-backed candidates by the exact normalized descriptor", async () => {
		const t = createTestConvex();
		const lemmaRows = [
			["candidate-1", "de", "Bank", "Lexeme", "NOUN", "🏦"],
			["candidate-2", "de", "Bank", "Lexeme", "NOUN", "🏦"],
			["wrong-language", "en", "Bank", "Lexeme", "NOUN", "🇬🇧"],
			["wrong-form", "de", "Banken", "Lexeme", "NOUN", "🏦"],
			["wrong-family", "de", "Bank", "Phraseme", "NOUN", "🧩"],
			["wrong-kind", "de", "Bank", "Lexeme", "VERB", "🏦"],
		] as const;
		const { shadowId, candidates } = await t.run(async (ctx) => {
			await insertSourceReading(ctx);
			const stored = [];
			for (const [
				id,
				language,
				canonicalForm,
				family,
				kind,
				emoji,
			] of lemmaRows) {
				const lemmaId = await ctx.db.insert("lemmas", {
					lemmaKey: id,
					language,
					canonicalForm,
					family,
					kind,
					coreFeatures: id.startsWith("candidate-")
						? { sense: id }
						: {},
				});
				const readingId = await ctx.db.insert("readings", {
					readingKey: id,
					lemmaId,
					emojiDescription: emoji,
				});
				await ctx.db.insert("readingEntries", {
					readingId,
					record: {},
				});
				const dictionaryLemmaId = await ctx.db.insert(
					"dictionaryLemmas",
					{ lemmaId },
				);
				stored.push({ lemmaId, dictionaryLemmaId });
			}
			const record = pendingRecord();
			const id = await attachPendingShadowReference(ctx, record);
			await insertPendingRelation(ctx, record, id);
			return { shadowId: id, candidates: stored.slice(0, 2) };
		});
		const [first, second] = candidates;
		if (!first || !second) throw new Error("Expected two candidates.");

		const note = await shadowNote(t, shadowId);
		expect(
			note?.inspection.candidates.map(({ lemmaId }) => lemmaId),
		).toEqual([first.lemmaId, second.lemmaId]);
		expect(
			note?.inspection.candidates.map(({ coreFeatures }) => coreFeatures),
		).toEqual([
			[{ name: "sense", value: "candidate-1" }],
			[{ name: "sense", value: "candidate-2" }],
		]);

		await t.run((ctx) => ctx.db.delete(second.dictionaryLemmaId));
		const one = await shadowNote(t, shadowId);
		expect(one?.inspection.candidates).toHaveLength(1);
		await t.run((ctx) => ctx.db.delete(first.dictionaryLemmaId));
		const zero = await shadowNote(t, shadowId);
		expect(zero?.inspection.candidates).toEqual([]);
	});
});

describe("Shadow reset lifecycle", () => {
	async function lifecycleDb() {
		const t = createTestConvex();
		await replaceKnowledge(t, "reading-doomed", {
			lexicalBreakdown: [nounShadow, nounShadow],
		});
		await replaceKnowledge(t, "reading-survivor", {
			lexicalBreakdown: [nounShadow, nounShadow],
		});
		const { activeShadowId, dormantShadowId } = await t.run(async (ctx) => {
			const pending = pendingRecord("reading-doomed");
			const active = await attachPendingShadowReference(ctx, pending);
			await insertPendingRelation(ctx, pending, active);
			const dormant = await attachPendingShadowReference(ctx, {
				...pending,
				pending: { relation: "synonym", target: verbShadow },
			});
			return { activeShadowId: active, dormantShadowId: dormant };
		});
		return { t, activeShadowId, dormantShadowId };
	}

	test("analysis stripping removes doomed references, preserves survivor activity, and visitor reset leaves Shadows", async () => {
		const { t, activeShadowId, dormantShadowId } = await lifecycleDb();
		await t.mutation(internal.demoReset.clearReadingDataBatch, {
			readingKeys: ["reading-doomed"],
		});
		expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
		const references = await rows(t, "structuralShadowReferences");
		expect(
			references.every(
				({ ownerReadingKey }) => ownerReadingKey === "reading-survivor",
			),
		).toBe(true);
		expect(
			references.some(({ shadowId }) => shadowId === activeShadowId),
		).toBe(true);
		expect((await rows(t, "shadows")).map(({ _id }) => _id).sort()).toEqual(
			[activeShadowId, dormantShadowId].sort(),
		);

		await t.mutation(internal.demoReset.clearVisitorDataBatch, {
			visitorId: "visitor-1",
		});
		expect((await rows(t, "shadows")).map(({ _id }) => _id).sort()).toEqual(
			[activeShadowId, dormantShadowId].sort(),
		);
	});

	test("shared reset removes active and dormant Shadow rows", async () => {
		const { t } = await lifecycleDb();
		let tableIndex = 0;
		for (
			let batch = 0;
			batch < 100 && tableIndex < resetDemoTableNames.length;
			batch += 1
		) {
			const result = await t.mutation(
				internal.demoReset.clearSharedDataBatch,
				{ tableIndex },
			);
			tableIndex = result.nextTableIndex;
			if (!result.hasMore) break;
		}
		expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
		expect(await rows(t, "structuralShadowReferences")).toEqual([]);
		expect(await rows(t, "shadows")).toEqual([]);
	});
});

test("Reading deletion removes outgoing edges and preserves incoming edges until the target Lemma dies", async () => {
	const t = createTestConvex();
	const { doomedLemmaId, doomedReadingId, incomingEdgeId } = await t.run(
		async (ctx) => {
			const insertOwner = async (
				key: string,
				canonicalForm: string,
				emojiDescription: string,
			) => {
				const lemmaId = await ctx.db.insert("lemmas", {
					lemmaKey: key,
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm,
					coreFeatures: {},
				});
				await ctx.db.insert("dictionaryLemmas", { lemmaId });
				const readingId = await ctx.db.insert("readings", {
					readingKey: `reading-${key}`,
					lemmaId,
					emojiDescription,
				});
				await ctx.db.insert("readingEntries", {
					readingId,
					record: {},
				});
				return { lemmaId, readingId };
			};
			const doomed = await insertOwner("doomed", "Ziel", "🎯");
			const survivor = await insertOwner("survivor", "Quelle", "➡️");
			await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: doomed.readingId,
				relation: "hypernym",
				targetLemmaId: survivor.lemmaId,
			});
			const incoming = await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: survivor.readingId,
				relation: "holonym",
				targetLemmaId: doomed.lemmaId,
			});
			return {
				doomedLemmaId: doomed.lemmaId,
				doomedReadingId: doomed.readingId,
				incomingEdgeId: incoming,
			};
		},
	);

	for (let attempt = 0; attempt < 3; attempt += 1) {
		await t.mutation(internal.demoReset.clearReadingDataBatch, {
			readingKeys: ["reading-doomed"],
		});
	}
	expect(
		(await rows(t, "semanticRelationEdges")).map(({ _id }) => _id),
	).toEqual([incomingEdgeId]);
	expect((await rows(t, "readings")).map(({ _id }) => _id)).not.toContain(
		doomedReadingId,
	);

	await t.mutation(internal.demoReset.clearLemmaDataBatch, {
		lemmaIds: [doomedLemmaId],
	});
	expect(await rows(t, "semanticRelationEdges")).toEqual([]);
	await t.mutation(internal.demoReset.clearLemmaDataBatch, {
		lemmaIds: [doomedLemmaId],
	});
	expect((await rows(t, "lemmas")).map(({ _id }) => _id)).not.toContain(
		doomedLemmaId,
	);
});
