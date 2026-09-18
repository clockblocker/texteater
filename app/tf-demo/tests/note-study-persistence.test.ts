import { expect, test } from "bun:test";
import {
	assertPendingSemanticRelationRecordIdentity,
	type PendingSemanticRelationRecord,
} from "dumdict/pending";
import { createDumdictService } from "dumdict/runtime";
import * as Effect from "effect/Effect";
import { get } from "../convex/readingNotes";
import {
	NOTE_STUDY_DATABASE,
	NOTE_STUDY_RELATED_DATABASE,
	NOTE_STUDY_VISITOR_ID,
} from "../shared/notes-study/note-study-dummy-database";
import { load, playground } from "../tooling/playground-fixtures";
import { createTestConvexDumdictStorage } from "./support/dumdict-storage";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

test("seeded fixtures allow an unrelated new Reading to be planned through the Convex adapter", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	const dictionary = createDumdictService({
		language: "de",
		storage: createTestConvexDumdictStorage({
			runQuery: (fn, args) => runTestQuery(db, fn, args),
			runMutation: (fn, args) => runTestMutation(db, fn, args),
		}),
	});
	const prepared = await Effect.runPromise(
		dictionary.prepare.addNewNote({
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
				note: { attestedTranslations: [], attestations: [], notes: "" },
			},
		}),
	);
	expect(
		prepared.plan.changes.some((change) => change.type === "createReading"),
	).toBe(true);
});

test("every seeded primary and related Reading can be opened through readingNotes.get", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	for (const unit of [
		...NOTE_STUDY_DATABASE,
		...NOTE_STUDY_RELATED_DATABASE,
	]) {
		const reading = db
			.rows("readings")
			.find((row) => row.readingKey === unit.readingKey);
		if (!reading)
			throw new Error(`Missing ${unit.reading.lemma.canonicalForm}`);
		const note = await runTestQuery(db, get, {
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
});

test("the playground catalog exposes its fixture Visitor", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	const catalog = await runTestQuery(db, playground, {});
	expect(catalog).toMatchObject({ visitorId: NOTE_STUDY_VISITOR_ID });
});

test("seeded pending relations use Dumdict identities and source-aware targets", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	for (const row of db.rows("pendingSemanticRelations")) {
		const record = row.record as PendingSemanticRelationRecord<"de">;
		expect(() =>
			assertPendingSemanticRelationRecordIdentity(record),
		).not.toThrow();
		expect(record.pending.target.family).toBe(
			record.sourceReading.lemma.family,
		);
	}
});

test("reloading fixtures preserves note content and does not duplicate records", async () => {
	const db = new IndexedTestDb();
	await runTestMutation(db, load, {});
	const entry = db.rows("readingEntries")[0];
	if (!entry) throw new Error("Missing seeded entry");
	await db.patch(entry._id, {
		record: {
			notes: "My annotation",
			attestedTranslations: ["my translation"],
		},
	});
	const counts = Object.fromEntries(
		Object.entries(db.snapshot()).map(([table, rows]) => [
			table,
			rows.length,
		]),
	);
	await runTestMutation(db, load, {});
	expect(
		Object.fromEntries(
			Object.entries(db.snapshot()).map(([table, rows]) => [
				table,
				rows.length,
			]),
		),
	).toEqual(counts);
	expect(await db.get(entry._id)).toMatchObject({
		record: {
			notes: "My annotation",
			attestedTranslations: ["my translation"],
		},
	});
	const dictionary = createDumdictService({
		language: "de",
		storage: createTestConvexDumdictStorage({
			runQuery: (fn, args) => runTestQuery(db, fn, args),
			runMutation: (fn, args) => runTestMutation(db, fn, args),
		}),
	});
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
});
