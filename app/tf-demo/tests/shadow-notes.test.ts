import {
	afterEach,
	beforeEach,
	describe,
	expect,
	jest,
	spyOn,
	test,
} from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { createDumdictTransaction } from "../convex/model/dumdictTransaction";
import { attachPendingShadowReference } from "../convex/model/shadows";
import {
	auditPendingShadowReferencesPage,
	auditStructuralShadowReferencesPage,
	backfillPendingShadowReferencesPage,
	backfillStructuralShadowReferencesPage,
} from "../convex/shadows";
import { foldedCanonicalForm } from "../server/linguisticIdentity";
import { createPaginatedNoteLoader } from "../src/views/paginated-note-loading";
import { createTestConvex } from "./support/convex";
import {
	exportedArgs,
	registeredHandler,
} from "./support/convexRuntimeExports";
import {
	insertPendingRelation,
	insertSourceReading,
	nounShadow,
	pendingRecord,
	replaceKnowledge,
	rows,
	shadowNote,
	shadowReferences,
	shadowTree,
	structuralKnowledge,
	verbShadow,
} from "./support/shadows";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Shadow backfills and presentation", () => {
	test("keeps shadowId optional while page-level backfills and audits are runnable", async () => {
		const schemaSource = await Bun.file(
			new URL("../convex/model/tables/dictionary.ts", import.meta.url),
		).text();
		expect(schemaSource).toContain('shadowId: v.optional(v.id("shadows"))');
		for (const registered of [
			backfillPendingShadowReferencesPage,
			backfillStructuralShadowReferencesPage,
			auditPendingShadowReferencesPage,
			auditStructuralShadowReferencesPage,
		]) {
			expect(exportedArgs(registered)).toContain("paginationOpts");
		}
	});

	test("backfills pending and structural references idempotently and audits them in bounded pages", async () => {
		const t = createTestConvex();
		await t.run(async (ctx) => {
			await ctx.db.insert("pendingSemanticRelations", {
				locatorKey: '["reading-source","synonym","pending-1"]',
				sourceReadingKey: "reading-source",
				targetFoldedCanonicalForm: " Bank ",
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
		expect(await rows(t, "structuralShadowReferences")).toHaveLength(2);

		expect(await backfillPending()).toMatchObject({ changed: 0 });
		expect(await backfillStructural()).toMatchObject({ changed: 0 });
		expect(await auditPending()).toMatchObject({
			valid: 1,
			missing: 0,
			mismatched: 0,
			malformed: 0,
		});
		expect(await auditStructural()).toMatchObject({
			valid: 2,
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
			mismatched: 2,
		});
	});

	test("the structural audit counts unparseable Knowledge as malformed and lets a DB error propagate", async () => {
		const t = createTestConvex();
		await replaceKnowledge(t, "reading-source", structuralKnowledge());
		const args = { paginationOpts: { cursor: null, numItems: 50 } };
		const audit = registeredHandler(auditStructuralShadowReferencesPage);
		const databaseFailure = new Error("Database unavailable.");
		await expect(
			t.run((ctx) =>
				audit(
					{
						...ctx,
						db: new Proxy(ctx.db, {
							get(target, key) {
								if (key === "get") {
									return () =>
										Promise.reject(databaseFailure);
								}
								const member = Reflect.get(target, key);
								return typeof member === "function"
									? member.bind(target)
									: member;
							},
						}),
					},
					args,
				),
			),
		).rejects.toBe(databaseFailure);

		await t.run(async (ctx) => {
			const [knowledge] = await ctx.db
				.query("accumulatedKnowledge")
				.collect();
			if (!knowledge) throw new Error("Expected stored Knowledge.");
			await ctx.db.patch(knowledge._id, {
				knowledge: shadowTree({ family: "Lexeme" }),
			});
		});
		expect(
			await t.query(
				internal.shadows.auditStructuralShadowReferencesPage,
				args,
			),
		).toMatchObject({ valid: 0, malformed: 2 });
	});

	test("a Reading Note skips a malformed structural Shadow, keeps the rest, and logs the skip once", async () => {
		const t = createTestConvex();
		await replaceKnowledge(
			t,
			"reading-source",
			shadowTree(nounShadow, verbShadow),
		);
		const { readingId, malformedShadowId } = await t.run(async (ctx) => {
			const readingId = await insertSourceReading(ctx);
			const noun = (await ctx.db.query("shadows").collect()).find(
				({ kind }) => kind === "NOUN",
			);
			if (!noun) throw new Error("Expected the NOUN Shadow.");
			// The schema admits any string; only the parser rejects a blank one.
			await ctx.db.patch(noun._id, { canonicalForm: " " });
			return { readingId, malformedShadowId: noun._id };
		});

		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			const note = await t.query(api.readingNotes.get, {
				readingId,
				visitorId: "visitor-1",
			});
			expect(
				note?.structuralReferences.map(
					({ descriptor }) => descriptor.kind,
				),
			).toEqual(["VERB"]);
			const skips = warn.mock.calls.flatMap(([line]) =>
				typeof line === "string" && line.includes("MalformedStoredRow")
					? [JSON.parse(line)]
					: [],
			);
			expect(skips).toEqual([
				{
					event: "MalformedStoredRow",
					table: "shadows",
					id: malformedShadowId,
					reason: expect.stringContaining(
						"canonicalForm must not be empty",
					),
				},
			]);
		} finally {
			warn.mockRestore();
		}
	});

	test("groups exact pending and structural references by referring Unit Reading Note and hides dormancy", async () => {
		const t = createTestConvex();
		await replaceKnowledge(
			t,
			"reading-source",
			shadowTree(nounShadow, nounShadow),
		);
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
			["wrong-family", "de", "Bank", "Locution", "NOUN", "🧩"],
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
					foldedCanonicalForm: foldedCanonicalForm({
						language,
						canonicalForm,
					}),
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
