import {
	afterEach,
	beforeEach,
	describe,
	expect,
	jest,
	spyOn,
	test,
} from "bun:test";
import { api } from "../convex/_generated/api";
import { createDumdictTransaction } from "../convex/model/dumdictTransaction";
import { attachPendingShadowReference } from "../convex/model/shadows";
import { foldedCanonicalForm } from "../server/linguisticIdentity";
import { createPaginatedNoteLoader } from "../src/views/paginated-note-loading";
import { createTestConvex } from "./support/convex";
import {
	insertPendingRelation,
	insertSourceReading,
	nounShadow,
	pendingRecord,
	replaceKnowledge,
	rows,
	shadowBreakdown,
	shadowNote,
	shadowReferences,
	verbShadow,
} from "./support/shadows";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Shadow presentation", () => {
	test("a Reading Note skips a malformed structural Shadow, keeps the rest, and logs the skip once", async () => {
		const t = createTestConvex();
		await replaceKnowledge(
			t,
			"reading-source",
			shadowBreakdown(nounShadow, verbShadow),
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
			shadowBreakdown(nounShadow, nounShadow),
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
					attestationLinks: [],
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
