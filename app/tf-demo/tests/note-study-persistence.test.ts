import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import {
	assertPendingSemanticRelationRecordIdentity,
	type PendingSemanticRelationRecord,
} from "dumdict/pending";
import { createDumdictService } from "dumdict/runtime";
import * as Effect from "effect/Effect";
import { api } from "../convex/_generated/api";
import type { TableNames } from "../convex/_generated/dataModel";
import { createConvexDumdictStorage } from "../convex/dumdictActionStorage";
import schema from "../convex/schema";
import {
	NOTE_STUDY_DATABASE,
	NOTE_STUDY_RELATED_DATABASE,
	NOTE_STUDY_VISITOR_ID,
} from "../shared/notes-study/note-study-dummy-database";
import {
	actionContext,
	createPlaygroundConvex,
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
	playgroundFixtures,
	type TestConvexDb,
} from "./support/convex";

async function loadedFixtures() {
	const t = createPlaygroundConvex();
	await t.mutation(playgroundFixtures.load, {});
	return t;
}

function dictionaryFor(t: TestConvexDb) {
	return createDumdictService({
		language: "de",
		storage: createConvexDumdictStorage(actionContext(t) as never),
	});
}

async function tableCounts(t: TestConvexDb) {
	return t.run(async (ctx) =>
		Object.fromEntries(
			await Promise.all(
				(Object.keys(schema.tables) as TableNames[]).map(
					async (table) =>
						[
							table,
							(await ctx.db.query(table).collect()).length,
						] as const,
				),
			),
		),
	);
}

beforeEach(() => {
	// Seeded Definition Texts may schedule work; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test(
	"seeded fixtures allow an unrelated new Reading to be planned through the Convex adapter",
	async () => {
		const t = await loadedFixtures();
		const prepared = await Effect.runPromise(
			dictionaryFor(t).prepare.addNewNote({
				draft: {
					reading: {
						unitKind: "Reading",
						lemma: {
							unitKind: "Lemma",
							language: "de",
							family: "Lexeme",
							kind: "NOUN",
							canonicalForm: "Aufstieg",
							coreFeatures: { gender: "Masc", hyph: null },
						},
						emojiDescription: "🥾⛰️",
					},
					note: {
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				},
			}),
		);
		expect(
			prepared.plan.changes.some(
				(change) => change.type === "createReading",
			),
		).toBe(true);
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);

test(
	"every seeded primary and related Reading can be opened through readingNotes.get",
	async () => {
		const t = await loadedFixtures();
		for (const unit of [
			...NOTE_STUDY_DATABASE,
			...NOTE_STUDY_RELATED_DATABASE,
		]) {
			const reading = await t.run((ctx) =>
				ctx.db
					.query("readings")
					.withIndex("by_reading_key", (q) =>
						q.eq("readingKey", unit.readingKey),
					)
					.unique(),
			);
			if (!reading)
				throw new Error(`Missing ${unit.reading.lemma.canonicalForm}`);
			const note = await t.query(api.readingNotes.get, {
				readingId: reading._id,
				visitorId: NOTE_STUDY_VISITOR_ID,
			});
			expect(note).toMatchObject({
				kind: "Reading",
				personalAnnotation: unit.personalAnnotation,
				reading: {
					lemma: { canonicalForm: unit.reading.lemma.canonicalForm },
				},
			});
		}
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);

test(
	"the playground catalog exposes its fixture Visitor",
	async () => {
		const t = await loadedFixtures();
		expect(await t.query(playgroundFixtures.playground, {})).toMatchObject({
			visitorId: NOTE_STUDY_VISITOR_ID,
		});
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);

test(
	"seeded pending relations use Dumdict identities and source-aware targets",
	async () => {
		const t = await loadedFixtures();
		const rows = await t.run((ctx) =>
			ctx.db.query("pendingSemanticRelations").collect(),
		);
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			const record = row.record as PendingSemanticRelationRecord<"de">;
			expect(() =>
				assertPendingSemanticRelationRecordIdentity(record),
			).not.toThrow();
			expect(record.pending.target.family).toBe(
				record.sourceReading.lemma.family,
			);
		}
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);

test(
	"reloading fixtures preserves note content and does not duplicate records",
	async () => {
		const t = await loadedFixtures();
		const editedRecord = {
			notes: "My annotation",
			attestedTranslations: ["my translation"],
		};
		const entryId = await t.run(async (ctx) => {
			const entry = await ctx.db.query("readingEntries").first();
			if (!entry) throw new Error("Missing seeded entry");
			await ctx.db.patch(entry._id, { record: editedRecord });
			return entry._id;
		});
		const counts = await tableCounts(t);

		await t.mutation(playgroundFixtures.load, {});

		expect(await tableCounts(t)).toEqual(counts);
		expect(await t.run((ctx) => ctx.db.get(entryId))).toMatchObject({
			record: editedRecord,
		});
		const dictionary = dictionaryFor(t);
		for (const unit of [
			...NOTE_STUDY_DATABASE,
			...NOTE_STUDY_RELATED_DATABASE,
		]) {
			const prepared = await Effect.runPromise(
				dictionary.prepare.ensureOwnedSurface({
					reading: unit.reading,
					ownedSurface: {
						surface: unit.citationSurface,
						note: {
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					},
				}),
			);
			expect(prepared.plan.changes).toEqual([]);
		}
	},
	PLAYGROUND_FIXTURE_TIMEOUT_MS,
);
